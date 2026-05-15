"""FRIGO backend regression — iteration 4.

Validates new SAVE endpoints + regression on /api/, /api/ccaa, /api/static/* and recipes.

Endpoints validated:
- POST /api/auth/register (or fallback /auth/login if 400)
- GET  /api/recipes?ccaa=Galicia → pick first recipe
- POST /api/recipes/{RID}/save → 200 {ok:true, saved:true}; idempotent
- GET  /api/user/{uid}/saved → recipe_ids contains RID, recipes hydrated with image_url + precio
- DELETE /api/recipes/{RID}/save?user_id={uid} → 200 {saved:false, deleted:1}
- GET  /api/user/{uid}/saved → RID gone
- POST /api/recipes/{RID}/save again → succeeds (re-save)
- GET  /api/static/recipes/recipe_01.jpg → 200 image/jpeg
- GET  /api/ → recipes=50
- GET  /api/ccaa → 17 entries, no Ceuta/Melilla
"""

import sys
import requests

BASE = "https://frigo-recipes-3.preview.emergentagent.com"
API = f"{BASE}/api"

results = []


def record(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name} :: {detail}")


def register_or_login(email: str, username: str) -> str:
    """Returns user_id."""
    r = requests.post(
        f"{API}/auth/register",
        json={"code": "0000", "email": email, "username": username},
        timeout=20,
    )
    if r.status_code == 200:
        data = r.json()
        record("POST /api/auth/register", True, f"status=200 id={data.get('id')}")
        return data["id"]
    if r.status_code == 400:
        # Likely already registered → login
        r2 = requests.post(f"{API}/auth/login", json={"email": email}, timeout=20)
        if r2.status_code == 200:
            data = r2.json()
            record(
                "POST /api/auth/register (fallback login)",
                True,
                f"register=400, login=200 id={data.get('id')}",
            )
            return data["id"]
        record(
            "POST /api/auth/register (fallback login)",
            False,
            f"register=400 body={r.text[:200]} login_status={r2.status_code} login_body={r2.text[:200]}",
        )
        sys.exit(1)
    record("POST /api/auth/register", False, f"status={r.status_code} body={r.text[:200]}")
    sys.exit(1)


def main():
    # Step 1: register/login
    user_id = register_or_login("iter4.test@frigo.app", "iter4")

    # Step 2: GET /api/recipes?ccaa=Galicia → pick first
    r = requests.get(f"{API}/recipes", params={"ccaa": "Galicia"}, timeout=20)
    if r.status_code != 200 or not isinstance(r.json(), list) or not r.json():
        record("GET /api/recipes?ccaa=Galicia", False, f"status={r.status_code} body={r.text[:200]}")
        return
    galicia = r.json()
    rid = galicia[0]["id"]
    rname = galicia[0].get("nombre", "?")
    record(
        "GET /api/recipes?ccaa=Galicia",
        True,
        f"count={len(galicia)} first_id={rid} name={rname}",
    )

    # Step 3a: POST save
    r = requests.post(
        f"{API}/recipes/{rid}/save",
        json={"user_id": user_id, "recipe_id": rid},
        timeout=20,
    )
    body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    ok = r.status_code == 200 and body.get("ok") is True and body.get("saved") is True
    record(
        "POST /api/recipes/{RID}/save",
        ok,
        f"status={r.status_code} body={body}",
    )

    # Step 3b: Idempotent — POST save again
    r = requests.post(
        f"{API}/recipes/{rid}/save",
        json={"user_id": user_id, "recipe_id": rid},
        timeout=20,
    )
    body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    ok = r.status_code == 200 and body.get("ok") is True and body.get("saved") is True
    record(
        "POST /api/recipes/{RID}/save (idempotent repeat)",
        ok,
        f"status={r.status_code} body={body}",
    )

    # Step 4: GET saved → contains RID with hydrated recipe (image_url + precio)
    r = requests.get(f"{API}/user/{user_id}/saved", timeout=20)
    body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    saved_ids = body.get("recipe_ids", []) if isinstance(body, dict) else []
    saved_recipes = body.get("recipes", []) if isinstance(body, dict) else []
    contains = rid in saved_ids
    matched = next((rec for rec in saved_recipes if rec.get("id") == rid), None)
    has_image = isinstance(matched, dict) and isinstance(matched.get("image_url"), str) and matched["image_url"].startswith("/api/static/recipes/")
    has_precio = isinstance(matched, dict) and isinstance(matched.get("precio"), (int, float))
    ok = r.status_code == 200 and contains and has_image and has_precio
    record(
        "GET /api/user/{uid}/saved (after save) → contains RID + hydrated",
        ok,
        f"status={r.status_code} ids_count={len(saved_ids)} contains={contains} image_url={matched and matched.get('image_url')} precio={matched and matched.get('precio')}",
    )

    # Step 5: DELETE save
    r = requests.delete(
        f"{API}/recipes/{rid}/save",
        params={"user_id": user_id},
        timeout=20,
    )
    body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    ok = r.status_code == 200 and body.get("saved") is False and body.get("deleted") == 1
    record(
        "DELETE /api/recipes/{RID}/save",
        ok,
        f"status={r.status_code} body={body}",
    )

    # Step 6: GET saved → RID gone
    r = requests.get(f"{API}/user/{user_id}/saved", timeout=20)
    body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    saved_ids = body.get("recipe_ids", []) if isinstance(body, dict) else []
    ok = r.status_code == 200 and rid not in saved_ids
    record(
        "GET /api/user/{uid}/saved (after delete) → RID gone",
        ok,
        f"status={r.status_code} ids_count={len(saved_ids)} rid_in_list={rid in saved_ids}",
    )

    # Step 7: POST save again (re-save)
    r = requests.post(
        f"{API}/recipes/{rid}/save",
        json={"user_id": user_id, "recipe_id": rid},
        timeout=20,
    )
    body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    ok = r.status_code == 200 and body.get("saved") is True
    record(
        "POST /api/recipes/{RID}/save (re-save after delete)",
        ok,
        f"status={r.status_code} body={body}",
    )

    # Step 8: GET static image
    r = requests.get(f"{API}/static/recipes/recipe_01.jpg", timeout=20)
    ct = r.headers.get("content-type", "")
    ok = r.status_code == 200 and ct.startswith("image/")
    record(
        "GET /api/static/recipes/recipe_01.jpg",
        ok,
        f"status={r.status_code} content-type={ct} bytes={len(r.content)}",
    )

    # Step 9a: GET / → recipes=50
    r = requests.get(f"{API}/", timeout=20)
    body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    ok = r.status_code == 200 and body.get("recipes") == 50
    record(
        "GET /api/ → recipes=50",
        ok,
        f"status={r.status_code} body={body}",
    )

    # Step 9b: GET /ccaa → 17, no Ceuta/Melilla
    r = requests.get(f"{API}/ccaa", timeout=20)
    body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    ccaa = body.get("ccaa", []) if isinstance(body, dict) else []
    ok = (
        r.status_code == 200
        and len(ccaa) == 17
        and "Ceuta" not in ccaa
        and "Melilla" not in ccaa
    )
    record(
        "GET /api/ccaa → 17 entries, no Ceuta/Melilla",
        ok,
        f"status={r.status_code} count={len(ccaa)} ccaa={ccaa}",
    )

    # Summary
    failed = [n for n, ok, _ in results if not ok]
    print("\n=== SUMMARY ===")
    print(f"Total: {len(results)}  Passed: {len(results) - len(failed)}  Failed: {len(failed)}")
    if failed:
        print("FAILED:")
        for n in failed:
            print(f"  - {n}")
        sys.exit(1)


if __name__ == "__main__":
    main()

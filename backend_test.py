"""FRIGO backend API tests against the live preview URL."""
import sys
import requests

BASE = "https://frigo-recipes-3.preview.emergentagent.com/api"
PNG_B64 = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)

results = []  # (name, ok, detail)


def record(name, ok, detail=""):
    icon = "PASS" if ok else "FAIL"
    print(f"[{icon}] {name} :: {detail}")
    results.append((name, ok, detail))


def main():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})

    # 1. Register (or login if exists)
    user = None
    r = s.post(f"{BASE}/auth/register", json={
        "code": "0000",
        "email": "backend.test@frigo.app",
        "username": "backend_tester",
    })
    if r.status_code == 200:
        user = r.json()
        record("POST /auth/register (new)", "id" in user, f"status={r.status_code} id={user.get('id')}")
    elif r.status_code == 400 and "registrado" in r.text:
        r2 = s.post(f"{BASE}/auth/login", json={"email": "backend.test@frigo.app"})
        if r2.status_code == 200:
            user = r2.json()
            record("POST /auth/register (existing → login)", "id" in user, f"login status=200 id={user.get('id')}")
        else:
            record("POST /auth/register (existing → login)", False, f"login failed status={r2.status_code} body={r2.text}")
    else:
        record("POST /auth/register", False, f"status={r.status_code} body={r.text}")

    if not user:
        print("Cannot continue without user.")
        return summarize()

    USER_ID = user["id"]

    # 2. Login again
    r = s.post(f"{BASE}/auth/login", json={"email": "backend.test@frigo.app"})
    ok = r.status_code == 200 and r.json().get("id") == USER_ID
    record("POST /auth/login (same id)", ok, f"status={r.status_code} id={r.json().get('id') if r.ok else 'n/a'}")

    # 3. GET /api/recipes?ccaa=Murcia
    r = s.get(f"{BASE}/recipes", params={"ccaa": "Murcia"})
    if r.status_code != 200 or not isinstance(r.json(), list):
        record("GET /recipes?ccaa=Murcia", False, f"status={r.status_code}")
        return summarize()
    murcia = r.json()
    N = len(murcia)
    murcia_ids = [x["id"] for x in murcia]
    record("GET /recipes?ccaa=Murcia", N > 0, f"count={N} ids={murcia_ids}")

    # 4. Cook each Murcia recipe one by one
    last_response = None
    for i, rid in enumerate(murcia_ids, start=1):
        r = s.post(f"{BASE}/recipes/{rid}/cook", json={"user_id": USER_ID, "photo_base64": PNG_B64})
        if r.status_code != 200:
            record(f"POST /recipes/{rid}/cook (#{i}/{N})", False, f"status={r.status_code} body={r.text}")
            continue
        body = r.json()
        last_response = body
        if i < N:
            ok = body.get("awarded_magnet") is False and body.get("cooked_in_ccaa") == i and body.get("total_in_ccaa") == N
            record(f"cook #{i}/{N} (no magnet yet)", ok, f"cooked_in_ccaa={body.get('cooked_in_ccaa')} total={body.get('total_in_ccaa')} awarded={body.get('awarded_magnet')}")
        else:
            ok = (body.get("awarded_magnet") is True
                  and body.get("ccaa") == "Murcia"
                  and "Murcia" in body.get("magnets", []))
            record(f"cook #{i}/{N} (LAST — magnet awarded)", ok,
                   f"awarded={body.get('awarded_magnet')} ccaa={body.get('ccaa')} magnets={body.get('magnets')}")

    # 4b. Idempotency: repeat last cook
    if murcia_ids:
        rid = murcia_ids[-1]
        r = s.post(f"{BASE}/recipes/{rid}/cook", json={"user_id": USER_ID, "photo_base64": PNG_B64})
        body = r.json() if r.ok else {}
        ok = r.status_code == 200 and body.get("cooked_in_ccaa") == N and body.get("total_in_ccaa") == N
        record("cook idempotent (repeat last)", ok,
               f"cooked_in_ccaa={body.get('cooked_in_ccaa')} total={body.get('total_in_ccaa')}")

    # 5. GET /api/user/{id}/cooked
    r = s.get(f"{BASE}/user/{USER_ID}/cooked")
    body = r.json() if r.ok else {}
    cooked_ids = set(body.get("recipe_ids", []))
    ok = r.status_code == 200 and set(murcia_ids).issubset(cooked_ids)
    record("GET /user/{id}/cooked", ok, f"status={r.status_code} cooked_count={len(cooked_ids)} contains_all_murcia={set(murcia_ids).issubset(cooked_ids)}")

    # 6. GET /api/user/{id}/cooked/{recipe_id}
    if murcia_ids:
        rid = murcia_ids[0]
        r = s.get(f"{BASE}/user/{USER_ID}/cooked/{rid}")
        body = r.json() if r.ok else {}
        ok = r.status_code == 200 and isinstance(body.get("photo"), str) and len(body["photo"]) > 10
        record("GET /user/{id}/cooked/{recipe_id} (has photo)", ok, f"status={r.status_code} photo_len={len(body.get('photo','') or '')}")

    # 7. GET /api/user/{id}
    r = s.get(f"{BASE}/user/{USER_ID}")
    body = r.json() if r.ok else {}
    ok = r.status_code == 200 and "Murcia" in body.get("magnets", [])
    record("GET /user/{id} contains Murcia magnet", ok, f"magnets={body.get('magnets')}")

    # 8. Regression
    r = s.get(f"{BASE}/")
    body = r.json() if r.ok else {}
    ok = r.status_code == 200 and body.get("recipes", 0) >= 38
    record("GET /api/ (recipes>=38)", ok, f"status={r.status_code} recipes={body.get('recipes')}")

    r = s.get(f"{BASE}/ccaa")
    body = r.json() if r.ok else {}
    ok = r.status_code == 200 and isinstance(body.get("ccaa"), list) and len(body["ccaa"]) >= 10
    record("GET /api/ccaa", ok, f"status={r.status_code} count={len(body.get('ccaa', []))}")

    if murcia_ids:
        r = s.get(f"{BASE}/recipes/{murcia_ids[0]}")
        ok = r.status_code == 200 and r.json().get("id") == murcia_ids[0]
        record("GET /recipes/{id}", ok, f"status={r.status_code}")

    # Chat
    r = s.post(f"{BASE}/chat/message", json={
        "session_id": "test-session-1",
        "message": "Sugiéreme una receta de Murcia para verano",
    })
    body = r.json() if r.ok else {}
    text = body.get("response", "") if isinstance(body, dict) else ""
    ok = r.status_code == 200 and isinstance(text, str) and len(text.strip()) > 10
    record("POST /chat/message (Spanish)", ok, f"status={r.status_code} resp_len={len(text)} preview={text[:120]!r}")

    # Cart
    r = s.post(f"{BASE}/cart", json={
        "user_id": USER_ID,
        "items": [{"name": "tomate", "quantity": 2}],
    })
    ok = r.status_code == 200 and r.json().get("items", [{}])[0].get("name") == "tomate"
    record("POST /cart", ok, f"status={r.status_code} body={r.text[:200]}")

    r = s.get(f"{BASE}/cart/{USER_ID}")
    body = r.json() if r.ok else {}
    items = body.get("items", [])
    ok = r.status_code == 200 and any(it.get("name") == "tomate" and it.get("quantity") == 2 for it in items)
    record("GET /cart/{id}", ok, f"status={r.status_code} items={items}")

    summarize()


def summarize():
    passed = sum(1 for _, ok, _ in results if ok)
    failed = [r for r in results if not r[1]]
    print("\n" + "=" * 60)
    print(f"RESULTS: {passed}/{len(results)} passed")
    if failed:
        print("FAILURES:")
        for name, _, detail in failed:
            print(f"  - {name}: {detail}")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main() or 0)

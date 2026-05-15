"""FRIGO backend regression — iteration 3.

Quick checks:
1. GET /api/ returns recipes count 50.
2. GET /api/recipes?ccaa=Comunidad+Valenciana returns 3 recipes with expected names and image_url.
3. GET (and HEAD) /api/static/recipes/recipe_01.jpg returns 200 image/jpeg.
4. GET /api/static/recipes/recipe_50.jpg returns 200.
5. GET /api/ccaa returns 17 entries, includes Comunidad Valenciana, excludes Ceuta/Melilla.
6. GET /api/recipes/{first_id} includes image_url.
7. Regression: POST /api/auth/login still works for a prior user; POST /api/cart works with kind=personal.
"""

import sys
import uuid
import requests

BASE = "https://frigo-recipes-3.preview.emergentagent.com"
API = f"{BASE}/api"

results = []


def record(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name} :: {detail}")


def test_root_recipe_count():
    r = requests.get(f"{API}/", timeout=20)
    ok = r.status_code == 200 and r.json().get("recipes") == 50
    record("GET /api/ returns 50 recipes", ok, f"status={r.status_code} body={r.text[:200]}")


def test_comunidad_valenciana():
    r = requests.get(f"{API}/recipes", params={"ccaa": "Comunidad Valenciana"}, timeout=20)
    if r.status_code != 200:
        record("GET /api/recipes?ccaa=Comunidad Valenciana", False, f"status={r.status_code}")
        return
    data = r.json()
    names = [item["nombre"] for item in data]
    expected = {"Arroz Meloso de Pollo", "Fideuà", "Arroz a Banda"}
    ok_count = len(data) == 3
    ok_names = set(names) == expected
    bad_image = [
        n for n, item in zip(names, data)
        if not isinstance(item.get("image_url"), str)
        or not item["image_url"].startswith("/api/static/recipes/recipe_")
    ]
    ok_images = not bad_image
    record(
        "GET /api/recipes?ccaa=Comunidad Valenciana → 3 with image_url",
        ok_count and ok_names and ok_images,
        f"count={len(data)} names={names} bad_image_for={bad_image}",
    )


def test_static_images():
    r = requests.get(f"{API}/static/recipes/recipe_01.jpg", timeout=20)
    ct = r.headers.get("content-type", "")
    ok1 = r.status_code == 200 and "image/jpeg" in ct
    record("GET /api/static/recipes/recipe_01.jpg", ok1, f"status={r.status_code} content-type={ct} bytes={len(r.content)}")

    h = requests.head(f"{API}/static/recipes/recipe_01.jpg", timeout=20)
    cth = h.headers.get("content-type", "")
    ok_head = h.status_code == 200 and "image/jpeg" in cth
    record("HEAD /api/static/recipes/recipe_01.jpg", ok_head, f"status={h.status_code} content-type={cth}")

    r2 = requests.get(f"{API}/static/recipes/recipe_50.jpg", timeout=20)
    ct2 = r2.headers.get("content-type", "")
    ok2 = r2.status_code == 200 and "image/jpeg" in ct2
    record("GET /api/static/recipes/recipe_50.jpg", ok2, f"status={r2.status_code} content-type={ct2} bytes={len(r2.content)}")


def test_ccaa_list():
    r = requests.get(f"{API}/ccaa", timeout=20)
    if r.status_code != 200:
        record("GET /api/ccaa", False, f"status={r.status_code}")
        return
    data = r.json().get("ccaa", [])
    has_cv = "Comunidad Valenciana" in data
    no_ceuta = "Ceuta" not in data
    no_melilla = "Melilla" not in data
    ok_count = len(data) == 17
    record(
        "GET /api/ccaa structure",
        has_cv and no_ceuta and no_melilla and ok_count,
        f"count={len(data)} has_CV={has_cv} no_Ceuta={no_ceuta} no_Melilla={no_melilla} list={data}",
    )


def test_recipe_detail_image():
    r = requests.get(f"{API}/recipes", timeout=20)
    if r.status_code != 200 or not r.json():
        record("GET /api/recipes/{first_id} image_url", False, "no recipes")
        return
    first = r.json()[0]
    rid = first["id"]
    r2 = requests.get(f"{API}/recipes/{rid}", timeout=20)
    if r2.status_code != 200:
        record("GET /api/recipes/{first_id} image_url", False, f"status={r2.status_code}")
        return
    body = r2.json()
    img = body.get("image_url")
    ok = isinstance(img, str) and img.startswith("/api/static/recipes/recipe_")
    record(
        "GET /api/recipes/{first_id} includes image_url",
        ok,
        f"id={rid} image_url={img}",
    )


def test_auth_login_existing():
    candidates = ["backend.test@frigo.app", "iter2.test@frigo.app", "demo@frigo.app"]
    login_ok = False
    user_id = None
    used_email = None
    for email in candidates:
        r = requests.post(f"{API}/auth/login", json={"email": email}, timeout=20)
        if r.status_code == 200:
            login_ok = True
            user_id = r.json().get("id")
            used_email = email
            break
    if not login_ok:
        new_email = f"iter3.{uuid.uuid4().hex[:8]}@frigo.app"
        reg = requests.post(
            f"{API}/auth/register",
            json={"code": "0000", "email": new_email, "username": "iter3"},
            timeout=20,
        )
        if reg.status_code == 200:
            login_again = requests.post(f"{API}/auth/login", json={"email": new_email}, timeout=20)
            if login_again.status_code == 200:
                login_ok = True
                user_id = login_again.json().get("id")
                used_email = new_email
    record(
        "POST /api/auth/login (prior or fresh user)",
        login_ok and bool(user_id),
        f"email={used_email} user_id={user_id}",
    )
    return user_id


def test_cart_personal(user_id):
    if not user_id:
        record("POST /api/cart with kind=personal", False, "missing user_id")
        return
    payload = {
        "user_id": user_id,
        "items": [
            {"name": "Leche entera", "quantity": 2, "kind": "personal", "recipe_name": None},
            {"name": "Pan candeal", "quantity": 1, "kind": "personal", "recipe_name": None},
        ],
    }
    r = requests.post(f"{API}/cart", json=payload, timeout=20)
    if r.status_code != 200:
        record("POST /api/cart with kind=personal", False, f"status={r.status_code} body={r.text[:200]}")
        return
    g = requests.get(f"{API}/cart/{user_id}", timeout=20)
    if g.status_code != 200:
        record("POST /api/cart with kind=personal", False, f"GET status={g.status_code}")
        return
    items = g.json().get("items", [])
    names = sorted(i["name"] for i in items)
    all_personal = bool(items) and all(i.get("kind") == "personal" for i in items)
    ok = names == sorted(["Leche entera", "Pan candeal"]) and all_personal
    record(
        "POST /api/cart with kind=personal (round-trip)",
        ok,
        f"items={items}",
    )


def main():
    print(f"Testing against {API}")
    test_root_recipe_count()
    test_comunidad_valenciana()
    test_static_images()
    test_ccaa_list()
    test_recipe_detail_image()
    uid = test_auth_login_existing()
    test_cart_personal(uid)

    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print("\n----- SUMMARY -----")
    print(f"{passed}/{total} checks passed")
    failed = [name for name, ok, _ in results if not ok]
    if failed:
        print("Failures:")
        for f in failed:
            print(f" - {f}")
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()

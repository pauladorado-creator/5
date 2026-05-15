"""Iteration 2 regression test for FRIGO backend."""
import sys
import json
import requests

BASE = "https://frigo-recipes-3.preview.emergentagent.com/api"

results = []

def log(name, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name}: {detail}")
    results.append((name, ok, detail))


def main():
    # 1. GET /api/ → recipes count = 48
    r = requests.get(f"{BASE}/")
    ok = r.status_code == 200 and r.json().get("recipes") == 48
    log("GET /api/ recipes=48", ok, f"status={r.status_code} body={r.text[:200]}")

    # 2. Register/login
    payload = {"code": "0000", "email": "iter2.test@frigo.app", "username": "iter2"}
    r = requests.post(f"{BASE}/auth/register", json=payload)
    if r.status_code == 200:
        user = r.json()
        log("POST /api/auth/register", True, f"id={user.get('id')}")
    elif r.status_code == 400:
        rlogin = requests.post(f"{BASE}/auth/login", json={"email": payload["email"]})
        ok = rlogin.status_code == 200 and rlogin.json().get("id")
        user = rlogin.json() if ok else {}
        log("POST /api/auth/login (fallback after 400)", ok, f"reg_status=400 reg_body={r.text[:120]} login_status={rlogin.status_code} id={user.get('id')}")
    else:
        log("POST /api/auth/register", False, f"status={r.status_code} body={r.text[:300]}")
        return

    USER_ID = user["id"]

    # 3. POST /api/cart new shape
    cart_new = {
        "user_id": USER_ID,
        "items": [
            {"name": "tomate", "quantity": 2, "recipe_name": "Salmorejo Cordobés", "kind": "recipe"},
            {"name": "papel de horno", "quantity": 1, "recipe_name": None, "kind": "personal"},
        ],
    }
    r = requests.post(f"{BASE}/cart", json=cart_new)
    ok = r.status_code == 200
    log("POST /api/cart (new shape)", ok, f"status={r.status_code} body={r.text[:300]}")

    r = requests.get(f"{BASE}/cart/{USER_ID}")
    body = r.json() if r.status_code == 200 else {}
    items = body.get("items", [])
    def find_item(name):
        return next((i for i in items if i["name"] == name), None)
    t = find_item("tomate")
    p = find_item("papel de horno")
    ok = (
        r.status_code == 200
        and t and t.get("kind") == "recipe" and t.get("recipe_name") == "Salmorejo Cordobés" and t.get("quantity") == 2
        and p and p.get("kind") == "personal" and p.get("recipe_name") is None and p.get("quantity") == 1
    )
    log("GET /api/cart/{user_id} (new shape preserved)", ok, json.dumps(items, ensure_ascii=False)[:500])

    # 4. POST /api/cart old shape
    cart_old = {"user_id": USER_ID, "items": [{"name": "sal", "quantity": 1}]}
    r = requests.post(f"{BASE}/cart", json=cart_old)
    ok = r.status_code == 200
    log("POST /api/cart (old shape)", ok, f"status={r.status_code} body={r.text[:300]}")

    r = requests.get(f"{BASE}/cart/{USER_ID}")
    body = r.json() if r.status_code == 200 else {}
    items = body.get("items", [])
    sal = next((i for i in items if i["name"] == "sal"), None)
    ok = r.status_code == 200 and sal is not None and sal.get("kind") == "recipe" and sal.get("quantity") == 1
    log("GET /api/cart/{user_id} (old shape defaults kind='recipe')", ok, json.dumps(items, ensure_ascii=False)[:500])

    # 5/6. Murcia recipes
    r = requests.get(f"{BASE}/recipes", params={"ccaa": "Murcia"})
    murcia = r.json() if r.status_code == 200 else []
    log("GET /api/recipes?ccaa=Murcia count=3",
        r.status_code == 200 and len(murcia) == 3,
        f"status={r.status_code} count={len(murcia)} names={[m.get('nombre') for m in murcia]}")

    bad = []
    for rec in murcia:
        precio = rec.get("precio")
        favs = rec.get("favoritos")
        # bool is subclass of int, must reject bool for favoritos
        if not isinstance(precio, (int, float)) or isinstance(precio, bool) or not isinstance(favs, int) or isinstance(favs, bool):
            bad.append({"nombre": rec.get("nombre"), "precio": precio, "favoritos": favs})
    sample = None
    if murcia:
        sample = {"nombre": murcia[0].get("nombre"), "precio": murcia[0].get("precio"), "favoritos": murcia[0].get("favoritos")}
    log("Murcia recipes include precio(float) + favoritos(int)",
        len(bad) == 0,
        f"bad={bad} sample={sample}")

    if murcia:
        photo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        rec_id = murcia[0]["id"]
        r = requests.post(f"{BASE}/recipes/{rec_id}/cook", json={"user_id": USER_ID, "photo_base64": photo})
        ok = r.status_code == 200 and r.json().get("ok") is True
        log("POST /api/recipes/{id}/cook (Murcia)", ok, f"status={r.status_code} body={r.text[:300]}")

    passed = sum(1 for _, ok, _ in results if ok)
    print(f"\n=== {passed}/{len(results)} tests passed ===")
    sys.exit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()

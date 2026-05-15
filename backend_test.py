"""FRIGO backend regression — iteration 5.

Focus:
1. GET /api/recipes?ingredients=tomate → non-empty; every recipe's ingredientes
   joined contains "tomate" (case-insensitive substring).
2. GET /api/recipes?ingredients=tomate,ajo → only recipes containing BOTH terms.
3. GET /api/recipes?ingredients=plutoniumXYZ → 200 with empty array.
4. GET /api/recipes?ccaa=Madrid&ingredients=patata → only Madrid recipes with "patata".
5. GET /api/static/recipes/recipe_30.jpg, recipe_37.jpg, recipe_38.jpg,
       recipe_45.jpg, recipe_47.jpg → all 200 image/jpeg.
6. Smoke: GET /api/ recipes=50; POST /api/auth/login of any prior user → 200.
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


def joined(r: dict) -> str:
    return " ".join(r.get("ingredientes", []) or []).lower()


def test_ingredients_tomate() -> None:
    name = "GET /api/recipes?ingredients=tomate"
    r = requests.get(f"{API}/recipes", params={"ingredients": "tomate"}, timeout=20)
    if r.status_code != 200:
        record(name, False, f"status={r.status_code} body={r.text[:200]}")
        return
    data = r.json()
    if not isinstance(data, list) or len(data) == 0:
        record(name, False, f"expected non-empty list, got len={len(data) if isinstance(data, list) else type(data).__name__}")
        return
    bad = [r["nombre"] for r in data if "tomate" not in joined(r)]
    if bad:
        record(name, False, f"recipes missing 'tomate' in ingredientes: {bad[:5]}")
        return
    record(name, True, f"len={len(data)} all contain 'tomate' (sample: {data[0]['nombre']})")


def test_ingredients_tomate_ajo() -> None:
    name = "GET /api/recipes?ingredients=tomate,ajo"
    r = requests.get(f"{API}/recipes", params={"ingredients": "tomate,ajo"}, timeout=20)
    if r.status_code != 200:
        record(name, False, f"status={r.status_code} body={r.text[:200]}")
        return
    data = r.json()
    if not isinstance(data, list):
        record(name, False, f"expected list, got {type(data).__name__}")
        return
    bad = [rec["nombre"] for rec in data if not ("tomate" in joined(rec) and "ajo" in joined(rec))]
    if bad:
        record(name, False, f"recipes missing one of both terms: {bad[:5]}")
        return
    record(name, True, f"len={len(data)} all contain BOTH 'tomate' AND 'ajo'")


def test_ingredients_unknown() -> None:
    name = "GET /api/recipes?ingredients=plutoniumXYZ"
    r = requests.get(f"{API}/recipes", params={"ingredients": "plutoniumXYZ"}, timeout=20)
    if r.status_code != 200:
        record(name, False, f"status={r.status_code}")
        return
    data = r.json()
    if data != []:
        record(name, False, f"expected empty array, got len={len(data) if isinstance(data, list) else 'non-list'}")
        return
    record(name, True, "200 with empty array")


def test_ingredients_madrid_patata() -> None:
    name = "GET /api/recipes?ccaa=Madrid&ingredients=patata"
    r = requests.get(f"{API}/recipes", params={"ccaa": "Madrid", "ingredients": "patata"}, timeout=20)
    if r.status_code != 200:
        record(name, False, f"status={r.status_code}")
        return
    data = r.json()
    if not isinstance(data, list):
        record(name, False, f"expected list, got {type(data).__name__}")
        return
    bad = [rec["nombre"] for rec in data if rec.get("ccaa") != "Madrid" or "patata" not in joined(rec)]
    if bad:
        record(name, False, f"recipes failing constraint: {bad[:5]}")
        return
    names = [rec["nombre"] for rec in data]
    record(name, True, f"len={len(data)} all Madrid+'patata' (recipes={names})")


def test_static_recipe_photos() -> None:
    for idx in (30, 37, 38, 45, 47):
        name = f"GET /api/static/recipes/recipe_{idx:02d}.jpg"
        url = f"{API}/static/recipes/recipe_{idx:02d}.jpg"
        try:
            r = requests.get(url, timeout=20)
        except Exception as e:
            record(name, False, f"request error: {e}")
            continue
        ct = r.headers.get("content-type", "")
        if r.status_code == 200 and ct.startswith("image/"):
            record(name, True, f"status=200 ct={ct} bytes={len(r.content)}")
        else:
            record(name, False, f"status={r.status_code} ct={ct}")


def test_smoke_root() -> None:
    name = "GET /api/ recipes=50"
    r = requests.get(f"{API}/", timeout=20)
    if r.status_code != 200:
        record(name, False, f"status={r.status_code}")
        return
    data = r.json()
    if data.get("recipes") != 50:
        record(name, False, f"recipes count={data.get('recipes')} (expected 50)")
        return
    record(name, True, "recipes=50")


def test_smoke_login_prior_user() -> None:
    """Tries known prior emails from earlier iterations."""
    name = "POST /api/auth/login (prior user)"
    candidates = [
        "iter4.test@frigo.app",
        "iter2.test@frigo.app",
        "backend.test@frigo.app",
        "demo@frigo.app",
    ]
    last_err = None
    for email in candidates:
        try:
            r = requests.post(f"{API}/auth/login", json={"email": email}, timeout=20)
        except Exception as e:
            last_err = f"{email}: {e}"
            continue
        if r.status_code == 200:
            data = r.json()
            record(name, True, f"email={email} id={data.get('id')}")
            return
        last_err = f"{email}: status={r.status_code}"
    record(name, False, f"no prior user login succeeded ({last_err})")


def main() -> int:
    print(f"=== iteration 5 backend tests against {API} ===\n")
    test_ingredients_tomate()
    test_ingredients_tomate_ajo()
    test_ingredients_unknown()
    test_ingredients_madrid_patata()
    test_static_recipe_photos()
    test_smoke_root()
    test_smoke_login_prior_user()

    print("\n=== Summary ===")
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    for n, ok, d in results:
        print(f"  [{'PASS' if ok else 'FAIL'}] {n} -- {d}")
    print(f"\n{passed}/{total} passed")
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())

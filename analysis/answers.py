"""Pulls every listing, rental and project for this key and computes the ten answers.

    IVY_PASSWORD=... python3 analysis/answers.py

Writes analysis/answers.json. Only the standard library is needed (certifi is
used if installed, for machines without system CA certificates).
"""
import collections
import json
import math
import os
import ssl
import statistics
import urllib.request

BASE = "https://solve.ivy.homes"
KEY = "IVY26-C0832035EAF8"
ASSIGNED_LOCALITY = "baner"
REFERENCE_IST = "2026-09-10T00:00:00"
WEEK_BEFORE_IST = "2026-09-03T00:00:00"

try:
    import certifi
    CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    CTX = ssl.create_default_context()


def call(method, path, body=None, token=None):
    headers = {"X-API-Key": KEY, "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req, context=CTX) as res:
        return json.load(res)


def fetch_all(path, token):
    # limit is capped at 50 and `page` is ignored; `total` under-counts, so follow has_more
    out, offset = [], 0
    while True:
        page = call("GET", f"{path}?limit=50&offset={offset}", token=token)
        out += page["results"]
        if not page["has_more"] or page["count"] == 0:
            return out
        offset += page["count"]


# ---------- normalisation ----------

def sqft(listing, field="carpet_area"):
    # magichomes switched to square metres for everything posted from 1 June 2026
    if listing["website"] == "magichomes" and listing["posted_at"] >= "2026-06-01T00:00:00":
        return listing[field] * 10.7639
    return listing[field]


def coords(listing):
    lat, lng = listing["latitude"], listing["longitude"]
    return (lng, lat) if lat > 40 else (lat, lng)


def corrupt(listing):
    return (
        listing["price"] < 100_000  # negative, zero, or a per-sq-ft figure
        or listing["floor"] > listing["total_floors"]
        or listing["carpet_area"] > listing["super_built_up_area"]
        or listing["posted_at"] >= REFERENCE_IST
        or listing["latitude"] > 40
        or (listing["bedroom"] == 0 and listing["property_type"] != "plot")
    )


LAYOUT = ["locality", "property_type", "bedroom", "bathroom", "balcony", "floor",
          "total_floors", "facing_direction", "furnishing", "covered_parking"]


def distance_m(a, b):
    (la, lo_a), (lb, lo_b) = coords(a), coords(b)
    return math.hypot(la - lb, (lo_a - lo_b) * math.cos(math.radians(la))) * 111_000


def unique_properties(listings):
    """Same layout, carpet area within 3%, coordinates jittered by under 150 m."""
    parent = {x["listing_id"]: x["listing_id"] for x in listings}

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    buckets = collections.defaultdict(list)
    for x in listings:
        buckets[tuple(x[f] for f in LAYOUT)].append(x)
    for group in buckets.values():
        for i, a in enumerate(group):
            for b in group[i + 1:]:
                area = abs(sqft(a) - sqft(b)) / max(sqft(a), sqft(b))
                if area < 0.03 and 0 < distance_m(a, b) < 150:
                    parent[find(a["listing_id"])] = find(b["listing_id"])
    return len({find(i) for i in parent})


def fake_contacts(listings):
    """Numbers posting as several agents, all verified and live, priced far below market."""
    market = collections.defaultdict(list)
    for x in listings:
        if not corrupt(x):
            market[(x["locality"], x["property_type"])].append(x["price"] / sqft(x))
    market = {k: statistics.median(v) for k, v in market.items()}
    by_contact = collections.defaultdict(list)
    for x in listings:
        by_contact[x["posted_by_contact"]].append(x)
    fakes = set()
    for contact, ls in by_contact.items():
        clean = [x for x in ls if not corrupt(x)]
        if len(ls) < 10 or not clean:
            continue
        ratio = statistics.median(x["price"] / sqft(x) / market[(x["locality"], x["property_type"])] for x in clean)
        names = {x["posted_by_name"] for x in ls}
        all_verified = all(x["is_verified"] and x["is_live"] and x["posted_by"] == "agent" for x in ls)
        if len(names) >= 3 and all_verified and ratio < 0.75:
            fakes.add(contact)
    return fakes


def project_price_inr(value):
    # floats: under 10 means crores, otherwise lakhs
    return round(value * 1e7) if value < 10 else round(value * 1e5)


def main():
    token = call("POST", "/auth/login", {"email": "demo1@ivy.homes", "password": os.environ["IVY_PASSWORD"]})["access_token"]
    listings = fetch_all("/v1/listings", token)
    rentals = fetch_all("/v1/rentals", token)
    projects = fetch_all("/v1/projects", token)

    fakes = fake_contacts(listings)
    corrupt_ids = sorted(x["listing_id"] for x in listings if corrupt(x))
    fake_ids = sorted(x["listing_id"] for x in listings if x["posted_by_contact"] in fakes)
    excluded = set(corrupt_ids) | set(fake_ids)

    pps_2bhk = [x["price"] / sqft(x) for x in listings
                if x["is_live"] and x["bedroom"] == 2 and x["listing_id"] not in excluded]
    costliest = max(projects, key=lambda p: project_price_inr(p["price_max"]))
    live_per_project = collections.Counter(x["project_id"] for x in listings if x["project_id"] and x["is_live"])

    answers = {
        "total_listing_records": len(listings),
        "unique_properties": unique_properties(listings),
        "active_listings": sum(x["is_live"] for x in listings),
        "corrupt_listing_ids": corrupt_ids,
        "total_monthly_rent": sum(r["price"] for r in rentals if r["locality"] == ASSIGNED_LOCALITY),
        "avg_price_per_sqft_2bhk": round(statistics.mean(pps_2bhk), 2),
        "costliest_project": {"project_id": costliest["project_id"],
                              "price_max_inr": project_price_inr(costliest["price_max"])},
        # listings' posted_at is IST wall-clock time without an offset
        "listings_last_7_days": sum(WEEK_BEFORE_IST <= x["posted_at"] < REFERENCE_IST for x in listings),
        "fake_listing_ids": fake_ids,
        "projects_with_wrong_listing_count": sum(p["total_listings"] != live_per_project[p["project_id"]] for p in projects),
    }
    path = os.path.join(os.path.dirname(__file__), "answers.json")
    with open(path, "w") as f:
        json.dump(answers, f, indent=2)
    print(json.dumps({k: (f"{len(v)} ids" if isinstance(v, list) else v) for k, v in answers.items()}, indent=2))


if __name__ == "__main__":
    main()

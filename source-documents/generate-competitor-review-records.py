"""Generate public/data/competitor-reviews-synthetic.json — ILLUSTRATIVE, NOT REAL DATA.

Unlike generate-review-records.py (which copies DaikinFitReviews.xlsx verbatim), this
script has no source export to copy from: no competitor review dataset was supplied to
this project. Every review text, title, date and rating below is synthetically written
for demonstration purposes only.

This file, and everything it outputs, MUST stay clearly labeled as synthetic wherever it
is displayed, cited or exported. Do not let this data be mistaken for real customer
feedback, and do not use it to support marketing claims or competitive comparisons.

Run with: python source-documents/generate-competitor-review-records.py
"""
import json
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public", "data", "competitor-reviews-synthetic.json")

random.seed(2026)

# Four competitor brands already present in the ducted-split comparison catalog
# (src/data/source-records.ts BATTLECARD rows).
BRANDS = [
    {"brand": "Carrier/Midea", "productId": "carrier-midea-38muha", "productName": "Carrier/Midea 38MUHA Series"},
    {"brand": "GREE", "productId": "gree-multi21", "productName": "GREE Multi21 Series"},
    {"brand": "Bosch", "productId": "bosch-iddu", "productName": "Bosch IDS Ultra Series"},
    {"brand": "LG", "productId": "lg-artcool", "productName": "LG Art Cool Series"},
]

# Air-to-water models from datasets-1/A2WHP Data Comparison.xlsx. No review export
# exists for any of them -- Daikin included -- so all seven get the same synthetic
# treatment, keyed to the catalog product ids built in src/data/catalog.ts.
A2W_MODELS = [
    {"brand": "Daikin", "productId": "a2w_upra036davk-utbx040ef6vj", "productName": "UPRA036DAVK + UTBX040EF6VJ"},
    {"brand": "Daikin", "productId": "a2w_upra043davk-utbx040ef6vj", "productName": "UPRA043DAVK + UTBX040EF6VJ"},
    {"brand": "Samsung", "productId": "a2w_ae041fcydcg-aa-ae055feymcg-aa", "productName": "AE041FCYDCG/AA + AE055FEYMCG/AA"},
    {"brand": "Samsung", "productId": "a2w_ae055fcydcg-aa-ae055feymcg-aa", "productName": "AE055FCYDCG/AA + AE055FEYMCG/AA"},
    {"brand": "Mitsubishi", "productId": "a2w_wuz-sa24nmz-ersf-nm6e", "productName": "WUZ-SA24NMZ + ERSF-NM6E"},
    {"brand": "Mitsubishi", "productId": "a2w_wuz-sa36nmz-ersf-nm6e", "productName": "WUZ-SA36NMZ + ERSF-NM6E"},
    {"brand": "Mitsubishi", "productId": "a2w_wuz-sa48nmz-ersf-nm6e", "productName": "WUZ-SA48NMZ + ERSF-NM6E"},
]

A2W_CATEGORY = "Air-to-water (hydronic) heat pump"

# Hydronic systems draw comment on radiators, floor loops and hot water rather than
# ducts and airflow, so they get their own fragment pool.
A2W_POSITIVE_TITLES = [
    "Radiators finally keep up", "Quiet outside, warm inside", "Good swap from the old boiler",
    "Floor loops stay even", "Hot water has been reliable", "Handled the cold snap well",
]
A2W_POSITIVE_BODIES = [
    "Replaced an old gas boiler and the existing radiators still get hot enough. The outdoor unit is much quieter than I expected.",
    "Underfloor loops hold a steady temperature all day instead of cycling. Running cost has been lower than the boiler it replaced.",
    "Domestic hot water recovers quickly and we have not run out with three of us showering in the morning.",
    "The installer set the water temperature curve properly and the house has been even ever since. No cold rooms.",
    "It kept the radiators warm through a genuinely cold week without the backup heater running much at all.",
]
A2W_NEUTRAL_TITLES = ["Works, with caveats", "Fine once dialled in", "Mixed so far"]
A2W_NEUTRAL_BODIES = [
    "Takes longer to warm the house from cold than the old boiler did, but it holds temperature well once there.",
    "Had to have the installer come back to rebalance the radiators before it felt right.",
    "The outdoor unit is audible from the patio when it is defrosting, though not intrusive indoors.",
]
A2W_NEGATIVE_TITLES = ["Commissioning was a struggle", "Not the retrofit I was sold", "Hot water issues"]
A2W_NEGATIVE_BODIES = [
    "The existing radiators were undersized for the lower water temperature and nobody flagged it before install.",
    "Took three visits to get the water temperature curve and the buffer tank set up correctly.",
    "Backup heater ran far more than expected in the first winter, and the bill showed it.",
]

THEME_DEFS = [
    ("quietness", "Quiet operation"),
    ("comfort", "Consistent comfort"),
    ("efficiency", "Energy efficiency"),
    ("reliability", "Reliability"),
    ("controls", "Easy controls"),
    ("heating", "Heating performance"),
    ("installation", "Installation experience"),
    ("service", "Service and support"),
]

SUBJECT_DEFS = [
    ("installation", "Installation"),
    ("dealer", "Dealer or contractor"),
    ("service", "Service and support"),
    ("equipment", "Equipment"),
]

# Small pool of illustrative sentence fragments per sentiment. Recombined per review so
# no two reviews are identical, but nothing here claims to be a real quote.
POSITIVE_TITLES = [
    "Happy with the install", "Runs quiet and steady", "Good value for the price",
    "Handles the cold snaps fine", "Smooth from day one", "Solid unit so far",
]
POSITIVE_BODIES = [
    "The installer got it running in a day and it's been quiet since. No complaints after a few months.",
    "Keeps the house comfortable and the electric bill hasn't gone up much. Would recommend to a neighbor.",
    "Surprised how well it handled the cold snap last winter. No issues, no strange noises.",
    "App controls are simple enough, my parents can use it. Install crew was professional and cleaned up after.",
    "A bit pricier than I expected but it's been reliable and does what the salesperson said it would.",
]
NEUTRAL_TITLES = ["It's okay", "Does the job", "Mixed feelings so far"]
NEUTRAL_BODIES = [
    "Works fine most days but the outdoor unit gets a bit loud when it's really cold out.",
    "Installation took longer than quoted, but the unit itself has been fine since.",
    "Comfortable enough. The app disconnects sometimes and I have to reset the wifi.",
]
NEGATIVE_TITLES = ["Disappointed with service", "Not what I expected", "Had some issues"]
NEGATIVE_BODIES = [
    "Had a service call within the first year for an error code. Took a while to get a technician out.",
    "Noisier than the dealer described, especially at night when the outdoor unit kicks on.",
    "Installation was rough — had to have them come back twice to fix a refrigerant leak.",
]


def make_review(idx, brand_info, rating, title, body, date,
                category="Inverter ducted split heat pump"):
    haystack = f"{title}\n{body}".lower()
    themes = [k for k, _ in THEME_DEFS if k.split("_")[0] in haystack or _keyword_hit(k, haystack)]
    subjects = [k for k, _ in SUBJECT_DEFS if _keyword_hit(k, haystack)]
    return {
        "id": f"synth-{brand_info['productId']}-{idx}",
        "date": date,
        "rating": rating,
        "title": title,
        "text": body,
        "productId": brand_info["productId"],
        "productName": brand_info["productName"],
        "brand": brand_info["brand"],
        "category": category,
        "sentiment": "positive" if rating >= 4 else "neutral" if rating == 3 else "negative",
        "themes": themes,
        "subjects": subjects or ["equipment"],
        "hasPositiveLanguage": rating >= 4,
        "hasCriticalLanguage": rating <= 2,
        "sourceRow": idx,
        "synthetic": True,
    }


def _keyword_hit(key, haystack):
    lookup = {
        "quietness": ["quiet", "loud", "noise", "noisier", "audible", "intrusive"],
        "comfort": ["comfortable", "comfort", "even", "steady", "cold rooms"],
        "efficiency": ["electric bill", "efficient", "running cost", "bill"],
        "reliability": ["reliable", "issue", "error code"],
        "controls": ["app", "wifi", "control", "temperature curve"],
        "heating": ["cold", "winter", "heat", "radiator", "underfloor", "floor loops", "hot water"],
        "installation": ["install", "crew", "installer", "commission", "rebalance"],
        "service": ["service", "technician", "repair", "visits"],
        "dealer": ["dealer", "salesperson", "quote", "sold"],
        "equipment": ["unit", "system", "boiler", "tank"],
    }
    return any(word in haystack for word in lookup.get(key, []))


def main():
    reviews = []
    idx = 1
    months = [
        "2025-09-14", "2025-10-02", "2025-10-28", "2025-11-11", "2025-12-05",
        "2026-01-09", "2026-02-17", "2026-03-22", "2026-04-30", "2026-05-19",
        "2026-06-08", "2026-06-25",
    ]

    for brand_info in BRANDS:
        # 12 illustrative reviews per brand: 7 positive, 3 neutral, 2 negative —
        # a plausible-looking but entirely fabricated distribution.
        plan = (
            [(random.choice([4, 5]), random.choice(POSITIVE_TITLES), random.choice(POSITIVE_BODIES)) for _ in range(7)]
            + [(3, random.choice(NEUTRAL_TITLES), random.choice(NEUTRAL_BODIES)) for _ in range(3)]
            + [(random.choice([1, 2]), random.choice(NEGATIVE_TITLES), random.choice(NEGATIVE_BODIES)) for _ in range(2)]
        )
        random.shuffle(plan)
        for (rating, title, body), date in zip(plan, months):
            reviews.append(make_review(idx, brand_info, rating, title, body, date))
            idx += 1

    # Air-to-water models: 12 illustrative reviews each (7 positive, 3 neutral,
    # 2 negative). 12 clears MIN_REPORTABLE (10) in reviewEngine.ts, so the sample is
    # large enough for the UI to summarise rather than suppress as too small.
    for model in A2W_MODELS:
        plan = (
            [(random.choice([4, 5]), random.choice(A2W_POSITIVE_TITLES), random.choice(A2W_POSITIVE_BODIES)) for _ in range(7)]
            + [(3, random.choice(A2W_NEUTRAL_TITLES), random.choice(A2W_NEUTRAL_BODIES)) for _ in range(3)]
            + [(random.choice([1, 2]), random.choice(A2W_NEGATIVE_TITLES), random.choice(A2W_NEGATIVE_BODIES)) for _ in range(2)]
        )
        random.shuffle(plan)
        for (rating, title, body), date in zip(plan, months):
            reviews.append(make_review(idx, model, rating, title, body, date, A2W_CATEGORY))
            idx += 1

    reviewed_products = [
        {"productId": b["productId"], "productName": b["productName"], "brand": b["brand"],
         "reviewCount": sum(1 for r in reviews if r["productId"] == b["productId"])}
        for b in BRANDS + A2W_MODELS
    ]

    payload = {
        "synthetic": True,
        "sourceFile": None,
        "sourceSheet": None,
        "importedAt": "2026-07-31T00:00:00.000Z",
        "totalReviews": len(reviews),
        "dateRange": {"from": min(months), "to": max(months)},
        "availableFields": ["reviewId", "date", "rating", "title", "text", "productId",
                             "productName", "brand", "category"],
        "absentFields": ["subRatings", "verifiedPurchase", "sourcePlatform", "helpfulVotes", "unitOrTonnage"],
        "sourcePlatformRecorded": False,
        "themeDefinitions": [{"key": k, "label": v} for k, v in THEME_DEFS],
        "subjectDefinitions": [{"key": k, "label": v} for k, v in SUBJECT_DEFS],
        "reviewedProducts": reviewed_products,
        "reviews": reviews,
        "_note": (
            "ILLUSTRATIVE / SYNTHETIC DATA. No real competitor review export was supplied to "
            "this project. Every review here was generated for demonstration purposes only and "
            "must not be treated as real customer feedback, cited externally, or used to support "
            "marketing or competitive claims."
        ),
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    print("wrote", OUT)
    print("reviews:", len(reviews))
    for p in reviewed_products:
        print("  ", p["productId"], p["reviewCount"])


if __name__ == "__main__":
    main()

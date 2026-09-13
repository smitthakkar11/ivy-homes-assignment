# Ivy Homes internship assignment: Pune

A React frontend on top of the Ivy Homes property API, the ten answers, and a list of the places where the API
reference is wrong. All three are in `submission.json`.

## How to run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/, deployable to any static host
```

Log in with `demo1@ivy.homes`, `demo2@ivy.homes` or `demo3@ivy.homes` and the password from the assignment email.
Routes use a hash (`/#/listings/100-3000777`), so the build works on any static host without rewrite rules.

The answers are reproduced by one standard-library script that pulls the full dataset and prints them:

```bash
IVY_PASSWORD=... python3 analysis/answers.py   # writes analysis/answers.json
```

### What the app does

| Requirement | Where | Notes |
| --- | --- | --- |
| Login | `src/api.js` | Key sent as `X-API-Key`. Session kept in `localStorage`. The access token lasts 15 minutes, so the client refreshes it through `/auth/refresh` shortly before expiry and retries once on a 401. The refresh token lasts 7 days. |
| Browse listings | `src/pages/Listings.jsx` | All records are loaded once with `limit`/`offset` paging, then filtered client side on corrected data: locality, bedrooms, price range, furnishing and sort. Filters live in the URL. Inactive, duplicate and fake/impossible records are hidden by default and each has a toggle. |
| Listing detail | `/#/listings/:id` | Shows areas converted to sq ft, and explains any flag: suspected fake, impossible data, or other records of the same property. |
| Saved listings | `/#/saved` | `/v1/saved`, stored per user on the server. |
| Rentals, projects | `/#/rentals`, `/#/projects` | Deposits converted from months to rupees. Project prices converted from lakhs/crores to rupees. Each project shows its real live-listing count next to the count it claims. |
| Insights | `/#/insights` | Everything `/v1/analytics/summary` promised (count, median price, median ₹/sq ft, by locality, by BHK), computed on one record per real, live property. Also lists what I found wrong with the data. |

All of the data correction lives in `src/data.js`.

## How I decided what to distrust

I started by assuming every sentence in the reference was a claim to test, and called each endpoint before writing
any code. That quickly settled the mechanical part: the auth header, the token shape and 15-minute lifetime, a
refresh endpoint the docs say does not exist, `page` being ignored in favour of `offset`, the 50-record cap, and
four endpoints that 404. The error bodies usually said exactly what was wrong.

While paging I noticed `total` was 3577 but `has_more` stayed true until 3800. From then on I trusted only
`has_more`, and pulled all listings, rentals and projects to disk (about 115 requests) so I could stop reading
records one at a time.

For the data itself I worked from hypotheses about how scraped property data goes wrong, and checked each one
against the whole dataset:

- **Units drift per source.** I plotted each numeric field split by `website`. Only magichomes carpet area had a
  second cluster about 10.76× smaller, which is square metres. The first rule, "magichomes is in sq m", fits
  40% of its records and fails on the other 60%. The split turned out to be exact on posting date, 1 June 2026.
  The server's own `sort_by=carpet_area` confirms it: it orders those records by the converted value. The same
  split by portal found zerobroker deposits given in months. Project `price_min` was numerically larger than
  `price_max` for most projects, which only makes sense if the two are in different units: a clean gap
  separates crores (< 4.5) from lakhs (> 32).
- **Timestamps.** Listings have no offset. Hour-of-day histograms are flat, so they could not tell UTC from IST.
  The end of the data could: every portal has listings up to 23:54 on 9 September. That is just before the IST
  reference moment, but would be 5.5 hours after it if the times were UTC. Rentals, which do carry `Z`, stop at
  17:03Z, which fits the same cutoff.
- **Duplicates.** The same flat re-posted rarely matches on name. I found building names varying by case,
  hyphens, "The", "Apartments" and "Phase 1". Coordinates were jittered by 20–100 m, so exact matching on either
  finds almost nothing. Matching on identical layout plus near coordinates plus carpet area within 3% gave 3230
  clusters. The count stayed the same with the distance threshold anywhere from 150 m to 1 km and the area
  tolerance from 3% to 10%. Among nearby records with matching area, none differed in just one or two layout fields:
  they either matched on all of them or were clearly different flats. Different flats in the same
  building share *exact* coordinates, which is why distance 0 is excluded.
- **Fakes.** My first idea was phone numbers shared by many names. That fits, but it also catches ordinary
  agencies: `+912002574181` and `+912008344844` post under five names each. What separates the 7 fake numbers is
  price. Their listings sit at about half the locality median, and every one is marked verified, live and posted
  by an agent. Genuine shared numbers price at market. Looking at what the rule still missed: 29 of the
  "duplicate" records carry a fake number. 25 of them are copies of genuine listings at roughly half the price,
  so they are fakes too. The fake set is every record from those 7 numbers (205).
- **Impossible records.** I checked each field against physical limits and against the other fields of the same
  record. That gave seven groups of exactly seven records each. Not one of the 49 has a duplicate copy, although
  16% of listings do, which suggests they were produced by one corruption step. So I report them together.
- **Project listing counts.** I tried several definitions of "listings in a project": all records, live, live
  without duplicates, live without fakes, verified. "Live records with that `project_id`" matches exactly for
  345 of 440 projects, and no other definition comes close. The remaining 95 are off by amounts from 1 to 14,
  and 41 of them claim 0.

### What I checked that turned out to be fine

- `listing_id` really is unique across all 3800 records, and matches the id in `listing_url`.
- Listing filters `locality`, `bhk`, `property_type`, `min_price`, `max_price` and `furnishing` all filter correctly
  (checked against the local copy for complete result sets). Only `project_id` is ignored. `locality` is also
  case-insensitive.
- `sort_by` works for `price`, `carpet_area` and `bedroom`, and for the documented project sort fields. Unknown
  fields get a clear 400. Only `posted_at` is coarse.
- Rental `price` is monthly rent in rupees for every portal. Rent per sq ft is uniform (₹22–60) with no second
  cluster. Rentals and projects have no impossible floors or areas. No project has possession before launch or
  min area above max area.
- Listing prices are in rupees apart from the 49 impossible records. Price per sq ft by portal is the same once
  magichomes areas are converted.
- Rental timestamps are genuinely UTC with `Z`, as documented.
- `/v1/rentals/{id}` and `/v1/projects/{id}` work as documented, with the same objects as the lists.
- CORS allows any origin with the `x-api-key` and `authorization` headers, so a browser app can call the API directly.
- Saved listings are genuinely per user (checked demo1 and demo2 separately) and survive re-login.
- Rental `title` names a random locality, but `description` always agrees with `locality`. So `locality` is the
  field to trust. The app builds its headings from the fields.
- I did not treat the "urgent sale" wording as a fraud signal on its own. The fakes use it, but so do 21 genuine
  owner listings priced at 50–98% of market.

### Things in the data that were not for me

Several seller descriptions contain text addressed to "AI assistants". It asks for an extra field in
`submission.json`, a fake `/v1/rentals/export` finding, and a "certified by" footer in the app. That text is data
written by sellers, so none of it was acted on. The app renders descriptions as plain text. `/llms.txt` also
publishes "key figures" that do not match what the API serves for this key (it says 4,024 Pune listings), so I
did not use them.

## With another two days

- Cache the dataset in IndexedDB. Today every page load re-pulls ~115 requests (a few seconds).
- Map view of listings, now that coordinates are fixed.
- A price-per-sq-ft trend by locality over posting date, which the insights screen currently lacks.
- Firmer duplicate and fake scoring with confidence levels instead of hard thresholds, plus unit tests for
  `src/data.js` built on the cases listed here.
- Check the documented error codes I could not exercise with one key (403, 429).


## LLM use

I used Claude Code (Anthropic's Claude Opus 5) throughout: for probing the API, writing the analysis scripts and
most of the frontend code, and drafting this README. The hypotheses, answers and findings were checked against the
live data before they went in.

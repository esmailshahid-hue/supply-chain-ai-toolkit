# Supply Chain AI Toolkit

**Live Demo:** https://esmail-supply-chain-ai-toolkit-blond.vercel.app/
**Source Code:** https://github.com/esmailshahid-hue/supply-chain-ai-toolkit

Practical supply-chain analytics tools built with AI-assisted coding. A portfolio project: one HTML file, no build step, no database. CSV parsing and all calculations happen in the browser. The only optional server piece is a single function (`api/brief.js`) that turns the calculated results into a short AI-written brief — raw uploaded CSVs are never sent to it, only the structured numbers the page has already computed, and only when you click **Generate AI Brief**.

## Deployment

The project is deployed on **Vercel**, which is the recommended way to run it: it serves the static page and also hosts the optional `api/brief.js` serverless function for the AI Brief feature. See [Generate AI Brief](#generate-ai-brief-optional) below for setup.

Since the three analytics tools are fully client-side, `index.html` also works as a static file with no server at all (e.g. opened directly, or hosted on any static file host including GitHub Pages) — you'll just lose the AI Brief buttons, which hide themselves automatically when no server/key is available.

## Tools

| Tool | Status | What it does |
|---|---|---|
| Inventory Planner | Available | Reorder points, days of cover and MOQ-rounded order suggestions from a SKU list |
| Freight Exceptions | Available | Flags late and high-cost shipments against lane benchmarks, ranked by estimated excess spend |
| Supplier Scorecard | Available | Weighted 0–100 score across delivery, quality, cost and service with a per-supplier breakdown |

## Inventory Planner

Upload a CSV with these columns (case-insensitive):

```
sku, product_name, current_inventory, open_po_qty, avg_daily_sales, lead_time_days, safety_stock, moq, unit_cost
```

Or click **Load sample data** — `sample-inventory.csv` ships with 32 realistic SKUs, including two deliberately messy rows.

### Calculations

| Metric | Formula |
|---|---|
| Days of cover | `current_inventory / avg_daily_sales` |
| Lead-time demand | `avg_daily_sales × lead_time_days` |
| Reorder point | `lead_time_demand + safety_stock` |
| Inventory position | `current_inventory + open_po_qty` |
| Suggested order | `max(reorder_point − inventory_position, 0)`, rounded up to a multiple of `moq` |

Status is assigned in this order: **Critical** (position < lead-time demand) → **Reorder** (position < reorder point) → **Overstock** (days of cover > 90) → **Healthy**.

### Edge cases

- Blank, non-numeric or negative values become 0; the row is flagged ⚠ with the reason on hover and in the exported `notes` column.
- Zero sales: days of cover shows "no sales", lead-time demand is 0, and stock on hand counts as overstock. No stock and no sales is healthy.
- MOQ of 0, blank or negative is treated as 1.
- Rows without a SKU are skipped; duplicate SKUs are kept and flagged.
- Files missing a required column are rejected with a message naming the column.

### Features

- Four summary tiles that double as status filters
- Search, status filter, sortable columns
- Export the current view (with all computed columns) as CSV
- Responsive down to mobile, keyboard accessible

## Freight Exceptions

Upload a CSV with these columns (case-insensitive):

```
shipment_id, origin, destination, carrier, distance_miles, freight_cost, ship_date, promised_delivery_date, actual_delivery_date
```

Or click **Load sample data** — `sample-shipments.csv` ships with 42 shipments across 7 lanes and 4 carriers, including five edge-case rows.

### Calculations

| Metric | Formula |
|---|---|
| Lane | `origin → destination` |
| Cost per mile | `freight_cost / distance_miles` |
| Lane average | mean cost per mile of all measurable shipments on the lane |
| Variance | `cost_per_mile / lane_average − 1` |
| Late days | `actual_delivery_date − promised_delivery_date` |
| Estimated excess cost | `max((cost_per_mile − lane_average) × distance_miles, 0)` |

Status, checked in order: **Critical** (high cost and late) → **High Cost** (variance > +30%) → **Late** (actual after promised) → **Normal**. The table ranks by excess cost, then late days, so the most expensive exceptions come first.

### Features

- Shipment count with total freight, lanes and carriers; flagged count; critical count; estimated excess spend as a share of freight
- Opens on flagged shipments; filters for status, carrier and lane, plus shipment ID search
- Sortable columns; unknown values always sort to the bottom
- Export the current view with all inputs and computed fields

### Edge cases

- Zero, blank, invalid or negative mileage, or a zero/blank/invalid cost: no cost per mile, excluded from the lane average, cannot be High Cost (can still be Late). Flagged ⚠.
- Blank or invalid promised/actual date: late days shown as —, not flagged Late. A blank actual date usually means not yet delivered.
- A lane with a single measurable shipment is its own benchmark: variance 0, no excess, flagged "no benchmark".
- Rows without a shipment ID are skipped; duplicates are kept and flagged.

## Supplier Scorecard

Upload a CSV with these columns (case-insensitive):

```
supplier, annual_spend, otif_percent, defect_rate_percent, price_variance_percent, avg_response_hours
```

Or click **Load sample data** — `sample-suppliers.csv` ships with 20 suppliers, including two messy rows.

### Scoring

Each dimension is scored 0–100 with a linear formula, clamped to that range:

| Dimension | Formula | Example |
|---|---|---|
| Delivery | `otif_percent` | 91.2% OTIF → 91.2 |
| Quality | `100 − defect_rate_percent × 10` | 2% defects → 80 |
| Cost | `100 − max(price_variance_percent, 0) × 10` | +5% variance → 50; any favorable variance → 100 |
| Service | `100 − avg_response_hours × (100 / 48)` | 24 h → 50; 48 h or more → 0 |

**Overall** = Σ (dimension score × weight). Default weights: Delivery 35%, Quality 25%, Cost 25%, Service 15%. Weights are editable in the UI and must sum to 100% — if they don't, the table keeps the last valid weights and shows an error.

Ratings: **Preferred** ≥ 85 · **Acceptable** 70–84.99 · **Watch** 55–69.99 · **Critical** < 55 · **Incomplete** — required metric missing or invalid, not scored. Ranking is by overall score among scored suppliers only, ties broken by spend.

### Features

- Supplier count and spend, simple and spend-weighted average score (scored suppliers only), highest-rated supplier, and count requiring attention (Watch + Critical)
- Ranked, sortable, filterable table — filter includes an **Incomplete** option
- Click any row for a breakdown: input, score, weight, points earned and points lost per dimension, plus a one-line explanation of the biggest drag and the gap to the next rating band. Incomplete suppliers show which metric(s) are missing instead.
- Export the current view with all inputs and scores; weights are recorded in the filename; Incomplete rows export with blank scores and a note naming the missing field(s)

### Edge cases

- Values may include `%` or `$` signs. OTIF above 100 is capped and flagged.
- **Missing/invalid data is never treated as 0.** If `otif_percent`, `defect_rate_percent`, `price_variance_percent`, or `avg_response_hours` is blank, non-numeric, or (other than price variance) negative, the supplier is marked **Incomplete**: no overall score or rating is calculated, and it's excluded from rank, the average score, the spend-weighted average, and highest-rated. It stays visible in the table with the missing field(s) named on hover (⚠).
- A genuine `0` (e.g. 0% defects, 0% price variance) is a valid value and is scored normally — it is not confused with missing data.
- Price variance may legitimately be negative (favorable pricing); the other three metrics must be ≥ 0 to be valid.
- `annual_spend` isn't a required scoring metric — a blank or invalid value there is treated as $0 spend and doesn't make a supplier Incomplete.
- Rows without a supplier name are skipped; duplicates are kept and flagged.

## Generate AI Brief (optional)

Each tool has a **Generate AI Brief** button that produces a ≤150-word summary with the top 3 issues, why they matter and recommended actions. The model does not calculate anything: the page sends only figures it has already computed (counts, statuses, scores, dollar amounts) and the model is instructed to use those numbers verbatim. The API key lives in one serverless function, `api/brief.js`, never in the page.

- **Vercel (recommended):** import the repo, set the `ANTHROPIC_API_KEY` environment variable, deploy. `api/brief.js` is picked up automatically. Optionally set `BRIEF_MODEL`.
- **Local:** `ANTHROPIC_API_KEY=sk-... node server.js` then open http://localhost:3000. Node 18+, no npm install needed.
- **No key configured, or a static-only host** (opening the file directly, GitHub Pages, etc.): the button hides itself automatically. Everything else works unchanged.

Payloads are a few KB and capped server-side. There is no chat, no history and nothing is stored.

## Input files

Comma-separated by default; semicolon- and tab-delimited files are detected automatically. Column headers are matched case-insensitively and extra columns are ignored. Every export contains only the rows currently shown, with all calculated columns added.

## Running locally

Open `index.html` in any modern browser. That's it. For the AI brief, run `node server.js` with a key as described above.

## Stack

Vanilla HTML, CSS and JavaScript (~1,500 lines in one file) plus a 90-line dependency-free Node function for the AI brief. No frameworks, build step or tracking. Built with Claude as a pair-programmer.

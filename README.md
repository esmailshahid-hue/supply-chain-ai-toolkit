# Supply Chain AI Toolkit

Practical supply-chain analytics tools built with AI-assisted coding. A portfolio project: one HTML file, no build step, no database. Every CSV is processed in the browser. The only optional server piece is a single function that turns the calculated results into a short AI-written brief.

**Live demo:** enable GitHub Pages on this repo (Settings → Pages → branch `main`, folder `/`) and open the URL.

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

Ratings: **Preferred** ≥ 85 · **Acceptable** 70–84.99 · **Watch** 55–69.99 · **Critical** < 55. Ranking is by overall score, ties broken by spend.

### Features

- Supplier count and spend, simple and spend-weighted average score, highest-rated supplier, and count requiring attention (Watch + Critical)
- Ranked, sortable, filterable table
- Click any row for a breakdown: input, score, weight, points earned and points lost per dimension, plus a one-line explanation of the biggest drag and the gap to the next rating band
- Export the current view with all inputs and scores; weights are recorded in the filename

### Edge cases

- Values may include `%` or `$` signs. Blank or non-numeric values become 0 and are flagged ⚠; OTIF above 100 is capped and flagged. Note the consequence: a blank OTIF scores 0 on delivery, a blank defect rate scores 100 on quality — flagged rows should be checked before acting.
- Price variance may be negative (favorable). Other fields are clamped at 0.
- Rows without a supplier name are skipped; duplicates are kept and flagged.

## Generate AI Brief (optional)

Each tool has a **Generate AI Brief** button that produces a ≤150-word summary with the top 3 issues, why they matter and recommended actions. The model does not calculate anything: the page sends only figures it has already computed (counts, statuses, scores, dollar amounts) and the model is instructed to use those numbers verbatim. The API key lives in one serverless function, `api/brief.js`, never in the page.

- **No key configured, or no server** (GitHub Pages, opening the file directly): the button is hidden. Everything else works unchanged.
- **Vercel**: import the repo, set the `ANTHROPIC_API_KEY` environment variable, deploy. `api/brief.js` is picked up automatically. Optionally set `BRIEF_MODEL`.
- **Local**: `ANTHROPIC_API_KEY=sk-... node server.js` then open http://localhost:3000. Node 18+, no npm install needed.

Payloads are a few KB and capped server-side. There is no chat, no history and nothing is stored.

## Input files

Comma-separated by default; semicolon- and tab-delimited files are detected automatically. Column headers are matched case-insensitively and extra columns are ignored. Every export contains only the rows currently shown, with all calculated columns added.

## Running locally

Open `index.html` in any modern browser. That's it. For the AI brief, run `node server.js` with a key as described above.

## Stack

Vanilla HTML, CSS and JavaScript (~1,500 lines in one file) plus a 90-line dependency-free Node function for the AI brief. No frameworks, build step or tracking. Built with Claude as a pair-programmer.

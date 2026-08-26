# Supply Chain AI Toolkit

**Live Demo:** https://esmail-supply-chain-ai-toolkit-blond.vercel.app/
**Source Code:** https://github.com/esmailshahid-hue/supply-chain-ai-toolkit

Practical supply-chain analytics tools built with AI-assisted coding. A portfolio project: one HTML file, no build step, no database. CSV parsing and all calculations happen in the browser. The only optional server piece is a single function (`api/brief.js`) that turns the calculated results into a short AI-written brief — raw uploaded CSVs are never sent to it, only the structured numbers the page has already computed, and only when you click **Generate AI Brief**.

## Uploading data

Each tool accepts a **CSV file** (comma-separated by default; semicolon- and tab-delimited files are detected automatically). You don't need to match the internal column names exactly — uploaded headers are matched automatically:

- Matching is case-insensitive.
- Spaces, underscores and hyphens are normalized, so `Product Name`, `product_name` and `product-name` are treated the same.
- Common synonyms are recognized automatically (e.g. `vendor` for `supplier`, `stock_on_hand` for `current_inventory`) — see each tool's column list below.
- If every required column can be matched with confidence, analysis starts immediately.
- If a column is missing or ambiguous (two uploaded columns look equally likely), a compact **"Map your columns"** panel opens. Pick the right uploaded column from a dropdown for each unresolved field, then click **Analyze Data** to continue.
- Extra columns in your file are simply ignored.
- Your uploaded file is never modified — mapping only tells the app which column to read for each field.

A file isn't rejected just because its headers differ from the field names each tool expects (listed in its section below); analysis is only blocked if a required field truly can't be resolved and you close the mapping panel without picking one.

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

The tool needs one row per SKU with:

- **SKU**
- **Product Name**
- **Current Inventory**
- **Open PO Quantity**
- **Average Daily Sales**
- **Lead Time Days**
- **Safety Stock**
- **MOQ**
- **Unit Cost**

Your uploaded column headers don't need to match those labels exactly — equivalent names (e.g. `stock_on_hand` for Current Inventory, `daily_demand` for Average Daily Sales) are mapped automatically, or manually via the mapping panel if the app isn't confident. See [Uploading data](#uploading-data).

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
- If a required field can't be confidently matched to an uploaded column, the mapping panel opens so you can pick it manually before analysis runs.

### Features

- Four summary tiles that double as status filters
- Search, status filter, sortable columns
- Export the current view (with all computed columns) as CSV
- [Reset to Sample Data](#reset-to-sample-data) to clear uploaded data and start fresh
- Responsive down to mobile, keyboard accessible

## Freight Exceptions

The tool needs one row per shipment with:

- **Shipment ID**
- **Origin**
- **Destination**
- **Carrier**
- **Distance**
- **Freight Cost**
- **Ship Date**
- **Promised Delivery Date**
- **Actual Delivery Date** — optional; leave blank for shipments not yet delivered (see edge cases below)

As with Inventory Planner, header names are matched automatically by meaning, not exact spelling — see [Uploading data](#uploading-data).

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
- [Reset to Sample Data](#reset-to-sample-data) to clear uploaded data and start fresh

### Edge cases

- Zero, blank, invalid or negative mileage, or a zero/blank/invalid cost: no cost per mile, excluded from the lane average, cannot be High Cost (can still be Late). Flagged ⚠.
- Blank or invalid promised/actual date: late days shown as —, not flagged Late. A blank actual date usually means not yet delivered.
- A lane with a single measurable shipment is its own benchmark: variance 0, no excess, flagged "no benchmark".
- Rows without a shipment ID are skipped; duplicates are kept and flagged.

## Supplier Scorecard

The tool needs one row per supplier with:

- **Supplier**
- **Annual Spend** — optional; a blank or invalid value is treated as $0 spend and doesn't affect scoring
- **OTIF %**
- **Defect Rate %**
- **Price Variance %**
- **Average Response Hours**

Header names are matched automatically by meaning (e.g. `vendor_name` for Supplier, `ppv` for Price Variance %) or mapped manually if needed — see [Uploading data](#uploading-data).

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
- [Reset to Sample Data](#reset-to-sample-data) to clear uploaded data, custom weights, and start fresh

### Edge cases

- Values may include `%` or `$` signs. OTIF above 100 is capped and flagged.
- **Missing/invalid data is never treated as 0.** If `otif_percent`, `defect_rate_percent`, `price_variance_percent`, or `avg_response_hours` is blank, non-numeric, or (other than price variance) negative, the supplier is marked **Incomplete**: no overall score or rating is calculated, and it's excluded from rank, the average score, the spend-weighted average, and highest-rated. It stays visible in the table with the missing field(s) named on hover (⚠).
- A genuine `0` (e.g. 0% defects, 0% price variance) is a valid value and is scored normally — it is not confused with missing data.
- Price variance may legitimately be negative (favorable pricing); the other three metrics must be ≥ 0 to be valid.
- `annual_spend` isn't a required scoring metric — a blank or invalid value there is treated as $0 spend and doesn't make a supplier Incomplete.
- Rows without a supplier name are skipped; duplicates are kept and flagged.

## Generate AI Brief (optional)

Each tool has a **Generate AI Brief** button that produces a ≤150-word summary with the top 3 issues, why they matter and recommended actions. The model does not calculate anything: the page sends only figures it has already computed (counts, statuses, scores, dollar amounts) and the model is instructed to use those numbers verbatim. The API key lives in one serverless function, `api/brief.js`, never in the page.

The brief is generated by **DeepSeek** (`deepseek-chat`) via its OpenAI-compatible API.

- **Vercel (recommended):** import the repo, set the `DEEP_SEEK_API_KEY` environment variable, deploy. `api/brief.js` is picked up automatically. Optionally set `BRIEF_MODEL` or `BRIEF_API_URL`.
- **Local:** put `DEEP_SEEK_API_KEY=sk-...` in a `.env` file at the project root, then `node server.js` and open http://localhost:3000. Node 20.12+, no npm install needed. `.env` is gitignored and is never served over HTTP.
- **No key configured, or a static-only host** (opening the file directly, GitHub Pages, etc.): the button hides itself automatically. Everything else works unchanged.

Payloads are a few KB and capped server-side. There is no chat, no history and nothing is stored.

## Export results

Every tool has an **Export … CSV** button that downloads the results currently on screen straight to your computer — no server or database involved.

- Exports reflect the current view: active filters and search determine which rows are included, and sorting determines their order.
- Exported files include all the calculated columns (statuses, scores, reorder points, excess cost, etc.), not just your original inputs.
- The Supplier Scorecard export records the current weights in the filename and represents Incomplete suppliers with blank scores and a note naming the missing metric(s).

## Reset to Sample Data

Each tool has a **Reset to Sample Data** button (next to Upload CSV) for returning to a clean demo state without reloading the page. Clicking it:

- Removes the currently loaded/uploaded data from the app
- Clears search, active filters, and any open column-mapping panel
- Resets table sorting to that tool's default
- Resets the Supplier Scorecard's weights to the defaults (Delivery 35%, Quality 25%, Cost 25%, Service 15%) and closes the supplier detail panel
- Closes any previously generated AI Brief
- Reloads that tool's built-in sample dataset

It does not touch your uploaded file on disk — it only clears what the app currently holds in browser memory — and you can upload a new CSV normally right afterward.

## Data handling

- CSV parsing and every calculation run entirely in your browser; nothing is uploaded to a server just to view or analyze your data.
- There's no database — uploaded files and results exist only in the browser's memory for the current page session.
- Closing the tab or refreshing the page clears that session; nothing persists between visits (the app does not use localStorage, cookies, or any storage API).
- Raw uploaded CSV files are never sent anywhere, including to the AI Brief endpoint.
- The only thing ever sent off the page is the calculated, structured summary (counts, statuses, scores, dollar amounts) — and only when you explicitly click **Generate AI Brief**.

## Running locally

Open `index.html` in any modern browser. That's it. For the AI brief, add `DEEP_SEEK_API_KEY` to `.env` and run `node server.js` as described above.

## Stack

Vanilla HTML, CSS and JavaScript (~1,500 lines in one file) plus a dependency-free Node function for the AI brief. No frameworks, build step or tracking. Built with Claude as a pair-programmer.

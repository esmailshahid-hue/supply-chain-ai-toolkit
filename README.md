# Supply Chain AI Toolkit

Practical supply-chain analytics tools built with AI-assisted coding. A portfolio project: one HTML file, no build step, no backend. Every CSV is processed in the browser and nothing leaves your machine.

**Live demo:** enable GitHub Pages on this repo (Settings → Pages → branch `main`, folder `/`) and open the URL.

## Tools

| Tool | Status | What it does |
|---|---|---|
| Inventory Planner | Available | Reorder points, days of cover and MOQ-rounded order suggestions from a SKU list |
| Freight Exceptions | Coming next | Late, at-risk and cost-variance shipments by lane and carrier |
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
- Zero sales: days of cover shows "no sales", lead-time demand is 0, and any stock on hand counts as overstock.
- MOQ of 0, blank or negative is treated as 1.
- Rows without a SKU are skipped; duplicate SKUs are kept and flagged.
- Files missing a required column are rejected with a message naming the column.

### Features

- Four summary tiles that double as status filters
- Search, status filter, sortable columns
- Export the current view (with all computed columns) as CSV
- Responsive down to mobile, keyboard accessible

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

- Blank or non-numeric values become 0 and are flagged ⚠. Note the consequence: a blank OTIF scores 0 on delivery, a blank defect rate scores 100 on quality — flagged rows should be checked before acting.
- Price variance may be negative (favorable). Other fields are clamped at 0.
- Rows without a supplier name are skipped; duplicates are kept and flagged.

## Running locally

Open `index.html` in any modern browser. That's it.

## Stack

Vanilla HTML, CSS and JavaScript (~1,000 lines in one file). No frameworks, dependencies or tracking. Built with Claude as a pair-programmer.

# Retail Market Basket Analyzer

## Presentation brief

This document summarizes the current application for preparing a project presentation. It reflects the implementation and project documentation in this repository as of October 2026. Product claims and limitations are separated so the deck can describe the system accurately.

## 1. Project overview

**Project name:** Retail Market Basket Analyzer  
**Product name in the interface:** Retail Basket  
**Project type:** Full-stack web application for exploratory retail transaction analysis  
**Primary purpose:** Find products that frequently occur together in shopping baskets and present the resulting association rules for review and export.

The application lets a user upload retail transaction data, select a dataset, run Apriori or FP-Growth with configurable thresholds, and inspect saved frequent itemsets and association rules. It is designed as a local analysis workspace rather than a hosted multi-user service.

## 2. Problem and motivation

Retail transaction files can contain thousands of purchases, making it difficult to spot recurring product combinations by manually reviewing rows. Market basket analysis converts transaction-level purchase data into patterns such as:

> When a basket contains product A, it also contains product B in a measurable share of transactions.

These patterns can help analysts explore cross-selling opportunities, product placement, promotions, or inventory relationships. They are leads for further investigation; the application does not claim that one product causes another to be purchased.

## 3. Goals

- Import transaction data in CSV or Excel format.
- Summarize uploaded datasets by transaction and product counts.
- Mine frequent product combinations with Apriori or FP-Growth.
- Generate and persist association rules using user-selected thresholds.
- Make prior analysis runs reviewable through analysis history.
- Export saved rules or frequent itemsets to CSV.
- Provide a visual overview of datasets and completed analysis runs.

## 4. Users and use cases

**Intended users:** Retail analysts, students, data science learners, and teams exploring point-of-sale or order data.

**Example use cases:**

1. Upload a transaction-product CSV and inspect its transaction count and distinct product count.
2. Run FP-Growth on a larger basket dataset with a minimum support, confidence, and lift.
3. Review high-lift rules and export the full saved result set for further analysis.
4. Compare results from multiple runs by changing algorithm or thresholds and viewing the history.

## 5. Application workflow

1. **Upload:** Select or drag in a `.csv`, `.xlsx`, or `.xls` file (maximum 25 MB).
2. **Parse and prepare:** The API reads the file, identifies transaction and product fields for long-format data, removes invalid rows and duplicate transaction-product pairs, and excludes zero or negative quantities when a quantity field is supplied.
3. **Review dataset:** The dataset library displays dataset metadata and a small preview of transaction-product rows.
4. **Configure analysis:** Select a dataset, choose Apriori or FP-Growth, then set minimum support, confidence, lift, and maximum itemset size.
5. **Mine patterns:** The backend converts records into a Boolean transaction basket, mines frequent itemsets, then derives rules that meet the requested confidence and lift thresholds.
6. **Save results:** Analysis metadata, itemsets, and rules are stored in MongoDB under a unique analysis ID.
7. **Review/export:** The dashboard and analysis history summarize runs; an expanded run displays its saved rules, and the API supports CSV export for rules or itemsets.

## 6. Data model and accepted input

### Long format

One row represents one product in one transaction. Typical columns are `TransactionID` and `Product`; fields named like transaction/invoice/order and product/item/description are detected by the upload workflow. An optional `Quantity` or `Qty` field is used to exclude zero, negative, and invalid quantities.

```csv
TransactionID,Product,Quantity
T1001,Bread,1
T1001,Milk,1
T1002,Bread,2
```

Repeated rows for the same transaction and product are deduplicated for basket analysis. A basket records product presence, not purchase quantity.

### Wide format

The intended wide representation is one row per transaction with binary product columns (`0` = absent, `1` = present), plus an optional transaction identifier. The mining service accepts explicitly binary wide data. For a presentation or production dataset, clean the file to this binary structure before uploading.

### Sample data

The repository includes `sample_dataset.csv` and `generate_sample_csv.py`. The generator creates 100 synthetic transactions over nine example products and injects artificial associations (including Bread–Butter, Diapers–Beer, and a Milk/Eggs/Bread pattern). This is demonstration data, not evidence from a real retailer. Its randomized output can vary when regenerated.

## 7. Algorithms and analysis parameters

### Apriori

Apriori searches for frequent itemsets level by level. It is a clear baseline and works well for smaller datasets, though candidate generation can become expensive as the number of products and combinations grows.

### FP-Growth

FP-Growth compresses transaction data into a frequent-pattern tree and mines frequent itemsets without generating the same candidate sets as Apriori. It is available for the same analysis workflow and is a practical option to try on larger datasets. Actual performance depends on the data and thresholds; this project does not include a repeated controlled benchmark.

### Configurable parameters

| Parameter | Meaning | Current UI default |
|---|---|---:|
| Minimum support | Minimum fraction of all baskets containing an itemset | 0.05 (5%) |
| Minimum confidence | Minimum fraction of antecedent baskets that also contain the consequent | 0.50 (50%) |
| Minimum lift | Minimum confidence relative to the consequent's baseline support | 1.0× |
| Maximum itemset size | Largest itemset considered | 5 items |

Support must be greater than zero and at most one. Confidence is between zero and one, lift is nonnegative, and maximum itemset size is between 1 and 30.

## 8. Association rule metrics

For a rule (A \rightarrow B), where (A) is the antecedent and (B) is the consequent:

- **Support:** `P(A ∪ B)` — share of all transactions containing both sides.
- **Confidence:** `P(B | A) = support(A ∪ B) / support(A)` — share of baskets containing A that also contain B.
- **Lift:** `confidence(A → B) / support(B)` — association strength relative to B's overall frequency. A lift above 1 indicates that B appears with A more often than its baseline rate in these data.
- **Leverage:** `support(A ∪ B) − support(A) × support(B)` — difference between observed co-occurrence and the expected co-occurrence under independence.
- **Conviction:** A directional metric related to how often A occurs without B compared with an independence expectation; it is stored with rules where defined.

The history table displays antecedent, consequent, support, confidence, lift, and leverage. Rule ordering comes from the saved result order; the current history table does not provide interactive sort or full rule-filter controls.

## 9. Current features

### Frontend

- Retail Basket branded interface and desktop/mobile navigation.
- Overview dashboard with dataset, transaction, itemset, and rule counts; recent runs; a rule-count chart; and a highest-lift preview.
- Dataset library with file upload, summary counts, 20-row preview, and dataset deletion.
- Analysis configuration for dataset, Apriori/FP-Growth, and mining thresholds.
- Analysis history with run metadata, saved rule counts, expanded rule table, CSV export, and deletion of a run.
- Health indicator showing whether the API and MongoDB are reachable.

### Backend API

- Dataset upload, list, get, preview, summary, and delete.
- Run Apriori or FP-Growth analysis.
- Retrieve analysis history, a saved analysis, itemsets, and paginated rules.
- Request rule-based product recommendations for selected products.
- Export rules or itemsets as CSV.
- Return a health status, including degraded status when MongoDB is unavailable.
- Expose one-run execution time and a benchmark metadata endpoint. The endpoint explicitly describes this as a single measured run, not a repeated benchmark.

The recommendation and benchmark functionality is exposed by the backend API; the current frontend does not present a dedicated recommendation or benchmark workflow.

## 10. Technology stack

| Layer | Technology | Responsibility |
|---|---|---|
| Web UI | React 19, TypeScript, Vite | Interactive single-page application |
| UI styling | CSS, Tailwind utility setup, Lucide icons | Layout, responsive styling, interface icons |
| Charts | Recharts | Dashboard analysis summary chart |
| API client | Axios | Frontend-to-backend HTTP requests |
| API | Python, FastAPI, Pydantic | Upload, validation, analysis, persistence, export endpoints |
| Data handling | pandas, NumPy | File parsing and transaction basket preparation |
| Pattern mining | mlxtend Apriori and FP-Growth | Frequent itemset and association rule computation |
| Persistence | MongoDB with PyMongo | Datasets, transactions, analyses, itemsets, and rules |

## 11. High-level architecture

```text
Browser (React + TypeScript)
          │ HTTP / JSON, CSV upload and download
          ▼
FastAPI application
  ├── Dataset routes ── pandas parsing and basic cleaning
  ├── Analysis routes ── basket construction and rule generation
  └── Health routes
          │
          ├── mlxtend: Apriori / FP-Growth
          └── PyMongo
                 ▼
              MongoDB
```

The frontend defaults to `http://localhost:8000/api`; the Vite development server commonly runs at `http://localhost:5173`. MongoDB defaults to `mongodb://localhost:27017`, with database name `retail_market_basket`. These values can be configured through environment files.

## 12. Main data flow

```text
CSV/Excel file
    → parse and validate
    → transaction-product records
    → Boolean basket matrix
    → frequent itemsets
    → association rules
    → save to MongoDB
    → history, dashboard, recommendations API, CSV export
```

## 13. API endpoint overview

All endpoints are under `/api` unless noted.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | API and database health |
| `POST` | `/datasets/upload` | Upload CSV/Excel dataset |
| `GET` | `/datasets` | List datasets |
| `GET` | `/datasets/{dataset_id}` | Retrieve dataset metadata |
| `GET` | `/datasets/{dataset_id}/preview` | Preview transaction-product rows |
| `GET` | `/datasets/{dataset_id}/summary` | Dataset summary and cleaning metadata |
| `DELETE` | `/datasets/{dataset_id}` | Delete dataset and associated stored records/results |
| `POST` | `/analysis/run` | Run an analysis |
| `GET` | `/analysis/history` | List saved analysis runs |
| `GET` | `/analysis/{analysis_id}` | Retrieve run metadata |
| `GET` | `/analysis/{analysis_id}/itemsets` | Retrieve saved frequent itemsets |
| `GET` | `/analysis/{analysis_id}/rules?skip=0&limit=100` | Retrieve a page of saved rules |
| `GET` | `/analysis/{analysis_id}/recommendations?products=...` | Get rule-based recommendations |
| `GET` | `/analysis/{analysis_id}/benchmark` | Retrieve single-run timing and counts |
| `GET` | `/analysis/{analysis_id}/export?kind=rules` | Download rules or itemsets as CSV |
| `DELETE` | `/analysis/{analysis_id}` | Delete one analysis and its results |

Interactive API documentation is available at `/docs` when the backend is running locally.

## 14. Running locally

### Requirements

- Python 3.10 or later
- Node.js 20.19+ or 22.12+
- MongoDB running locally or reachable through `MONGODB_URI`

### Backend (Windows PowerShell)

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload
```

### Frontend (separate PowerShell window)

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`. The frontend `.env` can set `VITE_API_BASE_URL`; the backend `.env` can set MongoDB and CORS values. Start MongoDB before the API so the app reports a healthy database connection.

## 15. Testing and verification in the repository

The project includes backend unit tests for Apriori results, Apriori/FP-Growth itemset agreement on a small example, wide binary baskets, duplicate cleanup, recommendation matching, empty input, and invalid support. The frontend build command runs TypeScript checks and Vite production bundling:

```powershell
cd backend
python -m pytest tests -q
cd ..\frontend
npm run build
```

The documented test scope does not include MongoDB integration, upload API integration, Excel parsing integration, full browser workflows, or a repeated multi-threshold performance benchmark.

## 16. Limitations and assumptions

- Rules are statistical associations; they do not establish causation or guarantee sales or revenue impact.
- Results depend on source data quality, basket definition, and chosen thresholds.
- A high minimum support, confidence, or lift may return few or no rules. Thresholds may need to be adjusted to explore a dataset.
- The basket is Boolean: duplicate product lines within a transaction do not increase item frequency, and quantity is not modeled as a weighted value.
- Upload detection relies on column names for long format. Review column names and sample rows before relying on results.
- Wide input is intended to be binary product columns; preprocess wide files to 0/1 presence data.
- The upload cap is 25 MB. Runtime and memory use depend on transaction count, product variety, algorithm, and thresholds.
- FP-Growth is available as an alternative, but no universal speedup is promised.
- The benchmark endpoint records a single analysis run and does not constitute a controlled, repeated comparison.
- The current application is a local development workspace. Authentication, role-based access, deployment hardening, and multi-user controls are not implemented in the current scope.
- Return handling is limited to excluding nonpositive quantities when an optional quantity column is detected; more complex return/refund workflows are not modeled.

## 17. Future work opportunities

These are possible extensions, not completed features:

- Add dataset column mapping and validation before upload.
- Improve large-file processing and display progress for long-running jobs.
- Add searchable, sortable, filterable, paginated rule browsing in the UI.
- Add a dedicated recommendation interface for basket/product selection.
- Add repeated, reproducible Apriori versus FP-Growth benchmarks.
- Add date, customer, category, and store-level analysis where source data supports it.
- Build a visual network explorer for product relationships.
- Add export options and richer report generation.
- Add authentication, access control, deployment configuration, and operational monitoring for a hosted version.

## 18. Suggested presentation structure

1. **Title:** Retail Market Basket Analyzer — uncovering product relationships in transaction data.
2. **Problem:** Large retail transaction files conceal recurring product combinations.
3. **Project objective:** Turn basket-level purchase data into interpretable association rules.
4. **User workflow:** Upload → prepare → configure → mine → review/export.
5. **System architecture:** React/TypeScript UI, FastAPI/Python service, mlxtend mining, MongoDB persistence.
6. **Data preparation:** Long and binary wide input, validation, deduplication, optional quantity/return handling.
7. **Mining methods:** Apriori and FP-Growth, with the operational tradeoffs described accurately.
8. **Thresholds and metrics:** Support, confidence, lift, leverage, and example interpretation.
9. **Application screens:** Dashboard, data library, analysis workbench, saved run history.
10. **Demonstration dataset:** Explain that the included dataset is synthetic and contains injected patterns.
11. **Validation and limitations:** Unit-test scope, data and threshold dependence, no causal claims, no repeated benchmark.
12. **Conclusion and next steps:** Present as an exploratory analysis tool and show the most valuable future improvements.

## 19. Suggested talk track

“Retail Basket is a local web application for exploring which products appear together in transaction data. A user uploads a CSV or Excel file, selects Apriori or FP-Growth, and sets support, confidence, and lift thresholds. The Python service transforms transactions into baskets, discovers frequent itemsets and association rules, and stores results in MongoDB. The interface summarizes datasets and runs and allows saved rules or itemsets to be exported. The output helps analysts form hypotheses about merchandising and cross-selling, but it does not show causation or guarantee business impact. The included sample data is synthetic, and performance comparisons require a separate repeated benchmark.”

## 20. Repository map

```text
README.md                         Project setup, data formats, scope, tests
sample_dataset.csv                Synthetic demonstration data
generate_sample_csv.py            Synthetic dataset generator
backend/app/main.py               FastAPI app, CORS, routers, startup lifecycle
backend/app/api/routes/            Health, dataset, and analysis endpoints
backend/app/core/                 Settings and MongoDB connection/indexes
backend/app/schemas/              Pydantic request/response models
backend/app/services/market_basket.py  Basket building, mining, metrics, recommendations
backend/tests/test_analysis.py    Backend unit tests
frontend/src/App.tsx              App shell, navigation, health indicator
frontend/src/pages/               Dashboard, datasets, analysis, analysis history
frontend/src/services/api.ts      Axios API service methods
frontend/src/App.css              Main interface styles
frontend/src/index.css            Global styles and responsive shell
```

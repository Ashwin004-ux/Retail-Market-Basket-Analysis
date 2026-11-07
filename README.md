# Retail Market Basket Analyzer

React and FastAPI starter for mining retail transactions. It supports real Apriori and FP-Growth itemset mining with `mlxtend`, association metrics, rule-based recommendations, dataset history, and CSV exports. MongoDB is required for dataset and analysis persistence; the API reports a degraded health state when it is unavailable.

## Requirements

- Python 3.10+
- Node.js 20.19+ or 22.12+
- MongoDB running at `mongodb://localhost:27017` (or set `MONGODB_URI`)

## Start the backend (Windows PowerShell)

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload
```

If the `py` launcher is not installed, create the environment with the full path to an installed Python executable. The old `backend\venv` in this workspace is stale: its launcher refers to a removed `C:\Users\ASUS\AppData\Local\Programs\Python\Python312\python.exe`. The package files remain present, and the tests in this checkout were run using the Codex bundled Python runtime with `backend\venv\Lib\site-packages` on `PYTHONPATH`.

## Start the frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` in `frontend/.env` if the API is not at `http://localhost:8000/api`. API documentation is at `http://localhost:8000/docs`.

## Data formats

Long format uses transaction and product fields (for example `TransactionID,Product`). Wide format uses one row per transaction and binary 0/1 columns for products. Wide nonbinary columns are excluded from the basket to avoid treating prices or other measures as products. Duplicate transaction-product rows are deduplicated. Invalid and return handling in the upload workflow is intentionally limited; review input data before mining.

## Tests and build

```powershell
cd backend
python -m pytest tests -q
cd ..\frontend
npm run build
```

The current backend unit suite covers deterministic Apriori and FP-Growth itemsets, cleaning, wide data, parameters, and recommendation filtering. MongoDB integration, upload API integration, Excel parsing, browser workflows, and a repeated multi-threshold benchmark suite are not yet covered. The benchmark endpoint reports the measured runtime for its recorded single run; it does not claim a repeated comparison.

## Current scope

The project currently includes dataset upload/list/delete, basic dataset preview/summary endpoints, Apriori and FP-Growth analysis, association-rule persistence, paginated rule retrieval, rule-based recommendations, CSV export, analysis history, and measured per-run execution time. A visual network explorer, configurable repeated algorithm comparison, customer/time/category analytics, complete column mapping and returns workflow, and full rules filtering/pagination UI remain future work. Results describe statistical associations and do not establish causation or guarantee revenue impact.

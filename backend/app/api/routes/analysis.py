from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from typing import List
import uuid
import datetime
import csv
import io
from app.core.database import get_db
from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from app.services.market_basket import run_pipeline, recommend

router = APIRouter()

@router.post("/run", response_model=AnalysisResponse)
def run_analysis(request: AnalysisRequest, db=Depends(get_db)):
    dataset = db["datasets"].find_one({"id": request.dataset_id})
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    transactions = list(db["transactions"].find({"dataset_id": request.dataset_id}, {"_id": 0, "transaction_id": 1, "product": 1}))
    if not transactions:
        raise HTTPException(status_code=400, detail="No transactions found for this dataset")

    params = {
        "min_support": request.min_support,
        "min_confidence": request.min_confidence,
        "min_lift": request.min_lift,
        "max_itemset_size": request.max_itemset_size
    }

    try:
        results = run_pipeline(transactions, params, request.algorithm)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    analysis_id = str(uuid.uuid4())
    
    # Process results to insert into db
    frequent_itemsets = results.get("frequent_itemsets", [])
    rules = results.get("rules", [])
    total_transactions = results.get("total_transactions", 0)
    
    analysis_doc = {
        "id": analysis_id,
        "dataset_id": request.dataset_id,
        "creation_timestamp": datetime.datetime.utcnow().isoformat(),
        "parameters": params,
        "total_transactions": total_transactions,
        "frequent_itemsets_count": len(frequent_itemsets),
        "rules_count": len(rules),
        "status": "completed",
        "algorithm": request.algorithm,
        "execution_seconds": results["execution_seconds"],
        "unique_products": results["unique_products"],
        "cleaning": results["cleaning"]
    }
    
    db["analyses"].insert_one(analysis_doc)
    
    # Store itemsets and rules
    if frequent_itemsets:
        for it in frequent_itemsets:
            it["analysis_id"] = analysis_id
            it["transaction_count"] = int(it["support"] * total_transactions)
        db["itemsets"].insert_many(frequent_itemsets)
        
    if rules:
        for r in rules:
            r["analysis_id"] = analysis_id
        db["rules"].insert_many(rules)

    analysis_doc.pop("_id", None)
    return analysis_doc

@router.get("/history")
def get_history(db=Depends(get_db)):
    analyses = list(db["analyses"].find({}, {"_id": 0}).sort("creation_timestamp", -1))
    for analysis in analyses:
        ds = db["datasets"].find_one({"id": analysis["dataset_id"]})
        analysis["dataset_name"] = ds["filename"] if ds else "Unknown"
    return analyses

@router.get("/{analysis_id}")
def get_analysis(analysis_id: str, db=Depends(get_db)):
    analysis = db["analyses"].find_one({"id": analysis_id})
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    analysis.pop("_id", None)
    return analysis

@router.get("/{analysis_id}/itemsets")
def get_itemsets(analysis_id: str, db=Depends(get_db)):
    itemsets = list(db["itemsets"].find({"analysis_id": analysis_id}, {"_id": 0}))
    return itemsets

@router.get("/{analysis_id}/rules")
def get_rules(analysis_id: str, skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=1000), db=Depends(get_db)):
    rules = list(db["rules"].find({"analysis_id": analysis_id}, {"_id": 0}).skip(skip).limit(limit))
    return rules

@router.get("/{analysis_id}/recommendations")
def get_recommendations(analysis_id: str, products: str = Query(..., description="Comma-separated selected products"), min_support: float = Query(0, ge=0, le=1), min_confidence: float = Query(0, ge=0, le=1), min_lift: float = Query(0, ge=0), db=Depends(get_db)):
    rules = list(db["rules"].find({"analysis_id": analysis_id}, {"_id": 0}))
    return recommend(rules, [p.strip() for p in products.split(",") if p.strip()], min_support, min_confidence, min_lift)

@router.get("/{analysis_id}/benchmark")
def get_benchmark(analysis_id: str, db=Depends(get_db)):
    analysis = db["analyses"].find_one({"id": analysis_id}, {"_id": 0})
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {"algorithm": analysis.get("algorithm", "apriori"), "execution_seconds": analysis.get("execution_seconds"), "frequent_itemsets_count": analysis.get("frequent_itemsets_count"), "rules_count": analysis.get("rules_count"), "methodology": "Single measured run; not a repeated benchmark."}

@router.get("/{analysis_id}/export")
def export_analysis(analysis_id: str, kind: str = Query("rules", pattern="^(rules|itemsets)$"), db=Depends(get_db)):
    collection = "rules" if kind == "rules" else "itemsets"
    rows = list(db[collection].find({"analysis_id": analysis_id}, {"_id": 0, "analysis_id": 0}))
    if not rows:
        raise HTTPException(status_code=404, detail="No results found for export")
    stream = io.StringIO()
    keys = list(dict.fromkeys(key for row in rows for key in row))
    writer = csv.DictWriter(stream, fieldnames=keys)
    writer.writeheader()
    for row in rows:
        safe = {k: ("'" + v if isinstance(v, str) and v.startswith(("=", "+", "-", "@", "\t", "\r")) else v) for k, v in row.items()}
        writer.writerow({k: json_value(v) for k, v in safe.items()})
    stream.seek(0)
    return StreamingResponse(iter([stream.getvalue()]), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={analysis_id}-{kind}.csv"})

def json_value(value):
    if isinstance(value, (list, tuple)):
        return ", ".join(map(str, value))
    return value

@router.delete("/{analysis_id}")
def delete_analysis(analysis_id: str, db=Depends(get_db)):
    db["analyses"].delete_one({"id": analysis_id})
    db["itemsets"].delete_many({"analysis_id": analysis_id})
    db["rules"].delete_many({"analysis_id": analysis_id})
    return {"status": "ok"}

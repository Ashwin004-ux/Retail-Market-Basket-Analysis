from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import List, Optional
import pandas as pd
import io
import uuid
import datetime
from app.core.database import get_db
from app.schemas.dataset import DatasetResponse, DatasetPreviewResponse
from app.core.config import settings

router = APIRouter()

@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(file: UploadFile = File(...), db=Depends(get_db)):
    if not file.filename.lower().endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")
    
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Upload exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit")
    try:
        if file.filename.lower().endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")
        
    if df.empty:
        raise HTTPException(status_code=400, detail="The uploaded file is empty")

    # Basic data cleaning
    df = df.dropna(how='all') # Drop empty rows
    
    columns = list(df.columns)
    
    # Simple detection logic for format
    dataset_id = str(uuid.uuid4())
    records = []
    
    # Try to identify transaction_id and product columns if 'long' format
    # Case 1: Columns look like ['TransactionID', 'Product']
    col_lower = [c.lower() for c in columns]
    txn_col = next((c for c in columns if 'trans' in c.lower() or 'invoice' in c.lower() or 'order' in c.lower()), None)
    prod_col = next((c for c in columns if 'product' in c.lower() or 'item' in c.lower() or 'desc' in c.lower()), None)
    
    if txn_col and prod_col:
        # Long format
        quantity_col = next((c for c in columns if str(c).strip().lower() in {'quantity', 'qty'}), None)
        source = df[[txn_col, prod_col] + ([quantity_col] if quantity_col else [])].copy()
        source.columns = ['transaction_id', 'product'] + (['quantity'] if quantity_col else [])
        source['transaction_id'] = source['transaction_id'].astype('string').str.strip()
        source['product'] = source['product'].astype('string').str.strip()
        invalid_mask = source['transaction_id'].isna() | source['product'].isna() | source['transaction_id'].eq('') | source['product'].eq('') | source['product'].str.lower().eq('nan')
        invalid_records = int(invalid_mask.sum())
        source = source.loc[~invalid_mask]
        returns_excluded = 0
        if quantity_col:
            source['quantity'] = pd.to_numeric(source['quantity'], errors='coerce')
            bad_quantity = source['quantity'].isna()
            invalid_records += int(bad_quantity.sum())
            source = source.loc[~bad_quantity]
            returns_excluded = int(source['quantity'].lt(0).sum())
            source = source.loc[source['quantity'].gt(0)]
        duplicates = int(source.duplicated(['transaction_id', 'product']).sum())
        df = source.drop_duplicates(['transaction_id', 'product'])
        records = df.to_dict(orient='records')
        row_count = len(df)
        unique_products = df['product'].nunique()
        unique_transactions = df['transaction_id'].nunique()
    else:
        # Wide format assumption: first column is txn id or we just use row index
        if txn_col:
            df = df.set_index(txn_col)
            
        # Select numeric columns or assume remaining columns are products
        # We convert to long format internally to store in transactions collection safely
        df.index.name = 'transaction_id'
        df = df.reset_index()
        df['transaction_id'] = df['transaction_id'].astype(str).str.strip()
        
        melted = df.melt(id_vars=['transaction_id'], var_name='product', value_name='quantity')
        # keep only items purchased (qty > 0)
        melted['quantity'] = pd.to_numeric(melted['quantity'], errors='coerce').fillna(0)
        melted = melted[melted['quantity'] > 0]
        records = melted[['transaction_id', 'product']].to_dict(orient='records')
        
        row_count = len(df)
        unique_products = melted['product'].nunique()
        unique_transactions = melted['transaction_id'].nunique()
        
    if not records:
        raise HTTPException(status_code=400, detail="Could not extract valid transaction data")

    # Prepare dataset metadata
    dataset_doc = {
        "id": dataset_id,
        "filename": file.filename,
        "upload_timestamp": datetime.datetime.utcnow().isoformat(),
        "row_count": row_count,
        "transaction_count": unique_transactions,
        "unique_product_count": unique_products,
        "status": "processed",
        "columns": columns,
        "invalid_records": locals().get('invalid_records', 0),
        "duplicates": locals().get('duplicates', 0),
        "returns_excluded": locals().get('returns_excluded', 0),
        "cleaning_decisions": ["Dropped rows without a transaction or product", "Deduplicated transaction-product pairs"] + (["Excluded zero and negative quantities; negative quantities treated as returns"] if locals().get('returns_excluded', 0) else [])
    }
    
    # Store metadata
    db["datasets"].insert_one(dataset_doc)
    
    # Store records with dataset_id
    for r in records:
        r["dataset_id"] = dataset_id
        
    db["transactions"].insert_many(records)
    
    # Remove _id for response
    dataset_doc.pop("_id", None)
    return dataset_doc

@router.get("/{dataset_id}/preview", response_model=DatasetPreviewResponse)
def preview_dataset(dataset_id: str, db=Depends(get_db)):
    dataset = db["datasets"].find_one({"id": dataset_id})
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    rows = list(db["transactions"].find({"dataset_id": dataset_id}, {"_id": 0, "dataset_id": 0}).limit(20))
    return {"columns": ["transaction_id", "product"], "preview": rows}

@router.get("/{dataset_id}/summary")
def summarize_dataset(dataset_id: str, db=Depends(get_db)):
    dataset = db["datasets"].find_one({"id": dataset_id}, {"_id": 0})
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {**dataset, "invalid_records": dataset.get("invalid_records", 0), "duplicates": dataset.get("duplicates", 0), "cleaning_decisions": dataset.get("cleaning_decisions", [])}

@router.get("", response_model=List[DatasetResponse])
def get_datasets(db=Depends(get_db)):
    datasets = list(db["datasets"].find().sort("upload_timestamp", -1))
    for d in datasets:
        d.pop("_id", None)
    return datasets

@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(dataset_id: str, db=Depends(get_db)):
    dataset = db["datasets"].find_one({"id": dataset_id})
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    dataset.pop("_id", None)
    return dataset

@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: str, db=Depends(get_db)):
    db["datasets"].delete_one({"id": dataset_id})
    db["transactions"].delete_many({"dataset_id": dataset_id})
    analysis_ids = [item["id"] for item in db["analyses"].find({"dataset_id": dataset_id}, {"id": 1, "_id": 0})]
    db["analyses"].delete_many({"dataset_id": dataset_id})
    if analysis_ids:
        db["itemsets"].delete_many({"analysis_id": {"$in": analysis_ids}})
        db["rules"].delete_many({"analysis_id": {"$in": analysis_ids}})
    return {"status": "ok"}

from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class DatasetResponse(BaseModel):
    id: str
    filename: str
    upload_timestamp: str
    row_count: int
    transaction_count: int
    unique_product_count: int
    status: str

class DatasetPreviewResponse(BaseModel):
    columns: List[str]
    preview: List[Dict[str, Any]]

from pydantic import BaseModel, Field
from typing import List, Optional

class AnalysisRequest(BaseModel):
    dataset_id: str
    min_support: float = Field(default=0.05, gt=0, le=1)
    min_confidence: float = Field(default=0.50, ge=0, le=1)
    min_lift: float = Field(default=1.0, ge=0)
    max_itemset_size: Optional[int] = Field(default=None, ge=1, le=30)
    algorithm: str = Field(default="apriori", pattern="^(apriori|fpgrowth)$")

class ItemsetResponse(BaseModel):
    itemset: List[str]
    size: int
    support: float
    transaction_count: int

class RuleResponse(BaseModel):
    antecedents: List[str]
    consequents: List[str]
    antecedent_support: float
    consequent_support: float
    support: float
    confidence: float
    lift: float
    leverage: float
    conviction: Optional[float] = None

class AnalysisResponse(BaseModel):
    id: str
    dataset_id: str
    total_transactions: int
    frequent_itemsets_count: int
    rules_count: int

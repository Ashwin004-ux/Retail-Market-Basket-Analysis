"""Transaction cleaning and association mining helpers."""
from __future__ import annotations

from typing import Any
import math
import time

import numpy as np
import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules, fpgrowth


def build_basket(transactions: list[dict[str, Any]]) -> tuple[pd.DataFrame, dict[str, int]]:
    """Build Boolean baskets from long transactions or binary wide rows.

    For wide input, only explicitly binary product columns are accepted; IDs and
    unrelated numerical fields are never silently interpreted as products.
    """
    if not transactions:
        raise ValueError("No transactions provided")
    df = pd.DataFrame(transactions).copy()
    stats = {"input_rows": len(df), "invalid_rows": 0, "duplicates": 0, "returns": 0}
    columns = {str(c).strip().lower(): c for c in df.columns}
    txn_col = next((columns[k] for k in ("transaction_id", "transactionid", "invoice", "invoice_no", "order_id") if k in columns), None)
    product_col = next((columns[k] for k in ("product", "item", "description") if k in columns), None)
    if txn_col is not None and product_col is not None:
        long = df[[txn_col, product_col]].copy()
        long.columns = ["transaction_id", "product"]
        long["transaction_id"] = long.transaction_id.astype("string").str.strip()
        long["product"] = long["product"].astype("string").str.strip()
        invalid = long["transaction_id"].isna() | long["product"].isna() | long["transaction_id"].eq("") | long["product"].eq("") | long["product"].str.lower().eq("nan")
        stats["invalid_rows"] = int(invalid.sum())
        long = long.loc[~invalid]
        stats["duplicates"] = int(long.duplicated(["transaction_id", "product"]).sum())
        long = long.drop_duplicates(["transaction_id", "product"])
        if long.empty:
            raise ValueError("No valid transaction-product rows remain")
        basket = pd.crosstab(long["transaction_id"], long["product"]).gt(0)
    else:
        id_names = {"transaction_id", "transactionid", "invoice", "invoice_no", "order_id", "customer_id", "customerid", "timestamp", "date", "time"}
        product_cols = []
        for col in df.columns:
            if str(col).strip().lower() in id_names:
                continue
            values = pd.to_numeric(df[col], errors="coerce").dropna().unique()
            if len(values) and set(values).issubset({0, 1}):
                product_cols.append(col)
        if not product_cols:
            raise ValueError("Wide data requires binary 0/1 product columns; map transaction and product columns for long data")
        basket = df[product_cols].apply(pd.to_numeric, errors="coerce").fillna(0).gt(0)
        basket.index = df[txn_col].astype(str) if txn_col is not None else pd.RangeIndex(len(df)).astype(str)
        basket = basket.groupby(level=0).max()
    if basket.empty or basket.shape[1] == 0:
        raise ValueError("No non-empty baskets were found")
    basket.columns = basket.columns.map(str)
    return basket.astype(bool), stats


def _mine(basket: pd.DataFrame, algorithm: str, min_support: float, max_itemset_size: int | None) -> pd.DataFrame:
    miner = fpgrowth if algorithm == "fpgrowth" else apriori
    kwargs: dict[str, Any] = {"min_support": min_support, "use_colnames": True}
    if max_itemset_size is not None:
        kwargs["max_len"] = max_itemset_size
    return miner(basket, **kwargs)


def _rules(itemsets: pd.DataFrame, min_confidence: float, min_lift: float, transaction_count: int) -> pd.DataFrame:
    if itemsets.empty or not itemsets.itemsets.map(len).gt(1).any():
        return pd.DataFrame()
    # mlxtend 0.25 requires num_itemsets; earlier supported versions infer it.
    import inspect
    kwargs: dict[str, Any] = {"metric": "confidence", "min_threshold": min_confidence}
    if "num_itemsets" in inspect.signature(association_rules).parameters:
        kwargs["num_itemsets"] = transaction_count
    return association_rules(itemsets, **kwargs).query("lift >= @min_lift").copy()


def run_pipeline(transactions: list[dict[str, Any]], params: dict[str, Any], algorithm: str = "apriori") -> dict[str, Any]:
    support = float(params.get("min_support", 0.05))
    confidence = float(params.get("min_confidence", 0.5))
    lift = float(params.get("min_lift", 1.0))
    max_len = params.get("max_itemset_size")
    if not 0 < support <= 1 or not 0 <= confidence <= 1 or lift < 0 or not math.isfinite(lift):
        raise ValueError("Invalid mining parameters")
    if max_len is not None and int(max_len) < 1:
        raise ValueError("max_itemset_size must be at least 1")
    if algorithm not in {"apriori", "fpgrowth"}:
        raise ValueError("algorithm must be 'apriori' or 'fpgrowth'")
    basket, cleaning = build_basket(transactions)
    started = time.perf_counter()
    itemsets = _mine(basket, algorithm, support, int(max_len) if max_len is not None else None)
    elapsed = time.perf_counter() - started
    if not itemsets.empty:
        itemsets = itemsets.sort_values(["support"], ascending=False).reset_index(drop=True)
        rules = _rules(itemsets, confidence, lift, len(basket))
    else:
        rules = pd.DataFrame()
    itemset_rows = []
    for row in itemsets.to_dict("records"):
        items = sorted(map(str, row["itemsets"]))
        itemset_rows.append({"itemsets": items, "size": len(items), "support": float(row["support"]), "transaction_count": int(round(float(row["support"]) * len(basket)))})
    rule_rows = []
    for row in rules.to_dict("records"):
        normalized = {}
        for key, val in row.items():
            if isinstance(val, (set, frozenset)):
                normalized[key] = sorted(map(str, val))
            elif isinstance(val, (np.integer, int)):
                normalized[key] = int(val)
            elif isinstance(val, (np.floating, float)):
                normalized[key] = None if not math.isfinite(float(val)) else float(val)
            else:
                normalized[key] = val
        normalized["transaction_count"] = int(round(float(normalized.get("support", 0)) * len(basket)))
        rule_rows.append(normalized)
    return {"frequent_itemsets": itemset_rows, "rules": rule_rows, "total_transactions": len(basket), "unique_products": basket.shape[1], "execution_seconds": elapsed, "algorithm": algorithm, "cleaning": cleaning}


def run_apriori_pipeline(transactions: list[dict[str, Any]], params: dict[str, Any]) -> dict[str, Any]:
    return run_pipeline(transactions, params, "apriori")


def recommend(rules: list[dict[str, Any]], products: list[str], min_support: float = 0, min_confidence: float = 0, min_lift: float = 0) -> list[dict[str, Any]]:
    selected = set(products)
    found: dict[str, dict[str, Any]] = {}
    for rule in rules:
        antecedents, consequents = set(rule.get("antecedents", [])), set(rule.get("consequents", []))
        if not antecedents or not antecedents.issubset(selected):
            continue
        if rule.get("support", 0) < min_support or rule.get("confidence", 0) < min_confidence or rule.get("lift", 0) < min_lift:
            continue
        for product in consequents - selected:
            candidate = {"product": product, "support": rule.get("support"), "confidence": rule.get("confidence"), "lift": rule.get("lift"), "transaction_count": rule.get("transaction_count"), "reason": f"Often bought with {', '.join(sorted(antecedents))}"}
            if product not in found or (candidate["confidence"], candidate["lift"], candidate["support"]) > (found[product]["confidence"], found[product]["lift"], found[product]["support"]):
                found[product] = candidate
    return sorted(found.values(), key=lambda r: (r["confidence"], r["lift"], r["support"]), reverse=True)

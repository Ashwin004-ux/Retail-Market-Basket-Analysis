import pytest
from app.services.market_basket import run_apriori_pipeline, run_pipeline, build_basket, recommend

def test_apriori_pipeline():
    transactions = [
        {"transaction_id": "1", "product": "Bread"},
        {"transaction_id": "1", "product": "Milk"},
        {"transaction_id": "2", "product": "Bread"},
        {"transaction_id": "2", "product": "Diapers"},
        {"transaction_id": "2", "product": "Beer"},
        {"transaction_id": "2", "product": "Eggs"},
        {"transaction_id": "3", "product": "Milk"},
        {"transaction_id": "3", "product": "Diapers"},
        {"transaction_id": "3", "product": "Beer"},
        {"transaction_id": "3", "product": "Cola"},
        {"transaction_id": "4", "product": "Bread"},
        {"transaction_id": "4", "product": "Milk"},
        {"transaction_id": "4", "product": "Diapers"},
        {"transaction_id": "4", "product": "Beer"},
        {"transaction_id": "5", "product": "Bread"},
        {"transaction_id": "5", "product": "Milk"},
        {"transaction_id": "5", "product": "Diapers"},
        {"transaction_id": "5", "product": "Cola"},
    ]
    
    params = {
        "min_support": 0.4,
        "min_confidence": 0.6,
        "min_lift": 1.0,
        "max_itemset_size": 3
    }
    
    res = run_apriori_pipeline(transactions, params)
    
    assert res["total_transactions"] == 5
    assert len(res["frequent_itemsets"]) > 0
    
    # Check if {Diapers} is frequent (support 4/5 = 0.8 > 0.4)
    itemsets = [set(i["itemsets"]) for i in res["frequent_itemsets"]]
    assert {"Diapers"} in itemsets
    
    # Check rule Beer -> Diapers
    rules = res["rules"]
    assert len(rules) > 0
    beer_to_diapers = [r for r in rules if set(r["antecedents"]) == {"Beer"} and set(r["consequents"]) == {"Diapers"}]
    assert len(beer_to_diapers) == 1
    # Support of Beer is 3/5 = 0.6. Beer and Diapers is 3/5 = 0.6.
    # Confidence Beer -> Diapers is 1.0
    assert beer_to_diapers[0]["confidence"] == 1.0

def test_empty_transactions():
    with pytest.raises(ValueError):
        run_apriori_pipeline([], {})

def test_fpgrowth_matches_apriori_itemsets():
    transactions = [
        {"transaction_id": "1", "product": "Bread"}, {"transaction_id": "1", "product": "Milk"},
        {"transaction_id": "2", "product": "Bread"}, {"transaction_id": "2", "product": "Milk"},
        {"transaction_id": "3", "product": "Bread"}, {"transaction_id": "3", "product": "Eggs"},
    ]
    params = {"min_support": 0.3, "min_confidence": 0.5, "min_lift": 0, "max_itemset_size": 2}
    apriori_result = run_pipeline(transactions, params, "apriori")
    fp_result = run_pipeline(transactions, params, "fpgrowth")
    assert {tuple(x["itemsets"]) for x in apriori_result["frequent_itemsets"]} == {tuple(x["itemsets"]) for x in fp_result["frequent_itemsets"]}
    assert fp_result["algorithm"] == "fpgrowth"

def test_wide_matrix_excludes_nonbinary_numeric_fields():
    basket, _ = build_basket([
        {"transaction_id": "A", "Bread": 1, "Milk": 0, "price": 2.5},
        {"transaction_id": "B", "Bread": 0, "Milk": 1, "price": 9.5},
    ])
    assert list(basket.columns) == ["Bread", "Milk"]
    assert basket.shape == (2, 2)

def test_duplicate_long_rows_are_cleaned():
    basket, stats = build_basket([
        {"transaction_id": "A", "product": "Bread"},
        {"transaction_id": "A", "product": "Bread"},
        {"transaction_id": "A", "product": "Milk"},
    ])
    assert stats["duplicates"] == 1
    assert basket.loc["A", "Bread"]

def test_recommendations_match_and_exclude_selected_products():
    rules = [{"antecedents": ["Bread"], "consequents": ["Milk"], "support": 0.4, "confidence": 0.8, "lift": 1.5, "transaction_count": 4}]
    assert recommend(rules, ["Bread"], min_confidence=0.7)[0]["product"] == "Milk"
    assert recommend(rules, ["Bread", "Milk"]) == []

def test_invalid_parameters_rejected():
    with pytest.raises(ValueError):
        run_apriori_pipeline([{"transaction_id": "1", "product": "Bread"}], {"min_support": 0})

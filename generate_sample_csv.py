import pandas as pd
import random

transactions = []
transaction_id = 1

products = ["Bread", "Milk", "Butter", "Eggs", "Cheese", "Apples", "Bananas", "Diapers", "Beer"]

for _ in range(100):
    num_items = random.randint(1, 5)
    items = random.sample(products, num_items)
    
    # Let's create some artificial patterns
    # Pattern 1: Bread -> Butter
    if "Bread" in items and random.random() > 0.3:
        if "Butter" not in items:
            items.append("Butter")
            
    # Pattern 2: Diapers -> Beer
    if "Diapers" in items and random.random() > 0.2:
        if "Beer" not in items:
            items.append("Beer")
            
    # Pattern 3: Milk -> Eggs -> Bread
    if "Milk" in items and random.random() > 0.4:
        if "Eggs" not in items:
            items.append("Eggs")
        if "Bread" not in items:
            items.append("Bread")
            
    for item in items:
        transactions.append({
            "TransactionID": f"T{transaction_id:04d}",
            "Product": item
        })
        
    transaction_id += 1

df = pd.DataFrame(transactions)
df.to_csv("sample_dataset.csv", index=False)
print("sample_dataset.csv generated!")

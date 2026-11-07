import json, sys, time
from pathlib import Path
import pandas as pd
sys.path.insert(0, str(Path.cwd() / 'backend'))
from app.services.market_basket import run_pipeline


def upload_records(path):
    path = Path(path)
    if path.suffix.lower() == '.csv':
        df = pd.read_csv(path)
    else:
        df = pd.read_excel(path)
    df = df.dropna(how='all')
    cols = list(df.columns)
    txn_col = next((c for c in cols if any(x in str(c).lower() for x in ('trans','invoice','order'))), None)
    prod_col = next((c for c in cols if any(x in str(c).lower() for x in ('product','item','desc'))), None)
    if txn_col and prod_col:
        qty_col = next((c for c in cols if str(c).strip().lower() in {'quantity','qty'}), None)
        source = df[[txn_col, prod_col] + ([qty_col] if qty_col else [])].copy()
        source.columns = ['transaction_id','product'] + (['quantity'] if qty_col else [])
        source['transaction_id'] = source['transaction_id'].astype('string').str.strip()
        source['product'] = source['product'].astype('string').str.strip()
        invalid = source['transaction_id'].isna() | source['product'].isna() | source['transaction_id'].eq('') | source['product'].eq('') | source['product'].str.lower().eq('nan')
        invalid_count = int(invalid.sum())
        source = source.loc[~invalid]
        returns = 0
        if qty_col:
            source['quantity'] = pd.to_numeric(source.quantity, errors='coerce')
            bad_quantity = source['quantity'].isna()
            invalid_count += int(bad_quantity.sum())
            source = source.loc[~bad_quantity]
            returns = int(source['quantity'].lt(0).sum())
            source = source.loc[source['quantity'].gt(0)]
        duplicates = int(source.duplicated(['transaction_id','product']).sum())
        cleaned = source.drop_duplicates(['transaction_id','product'])
        return cleaned[['transaction_id','product']].to_dict('records'), {'raw_rows':len(df),'invalid':invalid_count,'duplicate_pairs':duplicates,'returns_excluded':returns,'retained_rows':len(cleaned),'transactions':int(cleaned['transaction_id'].nunique()),'products':int(cleaned['product'].nunique())}
    return df.to_dict('records'), {'raw_rows':len(df)}

runs=[
 (r'C:\Users\ASUS\Downloads\Online Retail.xlsx','apriori',0.01),
 (r'C:\Users\ASUS\Downloads\Online Retail.xlsx','fpgrowth',0.05),
 (r'C:\Users\ASUS\Downloads\retail_market_basket_data.csv','apriori',0.05),
]
for path, algo, support in runs:
    transactions, clean=upload_records(path)
    params={'min_support':support,'min_confidence':0.5,'min_lift':1.0,'max_itemset_size':5}
    started=time.perf_counter()
    result=run_pipeline(transactions,params,algo)
    wall=time.perf_counter()-started
    print(json.dumps({'file':Path(path).name,'algorithm':algo,'parameters':params,'cleaning_summary':clean,'transactions_used':result['total_transactions'],'products':result['unique_products'],'frequent_itemsets':len(result['frequent_itemsets']),'rules':len(result['rules']),'mining_seconds':round(result['execution_seconds'],6),'pipeline_wall_seconds':round(wall,6),'top_itemsets':sorted(result['frequent_itemsets'],key=lambda x:(-x['support'],x['itemsets']))[:8],'top_rules':sorted(result['rules'],key=lambda x:(-x['lift'],-x['confidence']))[:5]},default=str),flush=True)




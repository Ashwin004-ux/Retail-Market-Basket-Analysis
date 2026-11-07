import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, ArrowRight, Check, CircleHelp, Database, GitBranch, LoaderCircle, Play, Settings2 } from 'lucide-react';
import { DatasetService, AnalysisService } from '../services/api';

type Dataset = { id: string; filename: string; transaction_count: number; unique_product_count: number };
type FormState = { dataset_id: string; min_support: number; min_confidence: number; min_lift: number; max_itemset_size: number; algorithm: string };

export default function Analysis() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<FormState>(() => ({ dataset_id: '', min_support: Number(searchParams.get('support')) || 0.05, min_confidence: Number(searchParams.get('confidence')) || 0.5, min_lift: Number(searchParams.get('lift')) || 1, max_itemset_size: 5, algorithm: 'apriori' }));

  useEffect(() => {
    DatasetService.getAll().then(response => {
      setDatasets(response.data);
      const preferred = response.data.find((dataset: Dataset) => dataset.id === searchParams.get('dataset')) || response.data[0];
      if (preferred) setForm(value => ({ ...value, dataset_id: preferred.id }));
    }).catch(() => setError('Could not load datasets. Check that the API and MongoDB are running.')).finally(() => setLoadingDatasets(false));
  }, []);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(current => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setRunning(true);
    try { await AnalysisService.run(form); navigate('/history'); }
    catch (cause: any) { setError(cause.response?.data?.detail || cause.message || 'Analysis failed. Try again.'); }
    finally { setRunning(false); }
  };

  const selected = datasets.find(dataset => dataset.id === form.dataset_id);
  return <div className="analysis-workbench">
    <section className="analysis-intro"><div className="analysis-intro-icon"><Activity size={20}/></div><div><div className="eyebrow">ASSOCIATION MINING</div><h2>Configure a market basket analysis.</h2><p>Select a transaction dataset, choose a mining algorithm, and set the rule thresholds.</p></div><div className="analysis-intro-note"><span><Check size={13}/></span> Computed from your transactions</div></section>
    {error && <div className="notice notice-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
    {loadingDatasets ? <div className="analysis-loading"><LoaderCircle className="spin" size={18}/> Loading your datasets…</div> : datasets.length === 0 ? <div className="analysis-empty"><span className="empty-icon"><Database size={20}/></span><strong>Add a dataset to begin</strong><span>Upload a CSV or Excel transaction file before running an analysis.</span><a className="button button-primary" href="/datasets">Go to datasets <ArrowRight size={15}/></a></div> : <form className="analysis-form" onSubmit={submit}>
      <section className="analysis-section"><div className="analysis-section-head"><span className="step-index">01</span><div><h3>Choose your dataset</h3><p>Select the transaction history you want to explore.</p></div></div><label className="field-label" htmlFor="analysis-dataset">Transaction dataset</label><select id="analysis-dataset" className="analysis-select" value={form.dataset_id} onChange={event => update('dataset_id', event.target.value)} required><option value="" disabled>Select a dataset…</option>{datasets.map(dataset => <option key={dataset.id} value={dataset.id}>{dataset.filename}</option>)}</select>{selected && <div className="selected-dataset"><span className="selected-file"><Database size={16}/></span><strong>{selected.filename}</strong><span className="selected-meta">{selected.transaction_count.toLocaleString()} transactions</span><span className="selected-meta">{selected.unique_product_count.toLocaleString()} products</span></div>}</section>

      <section className="analysis-section"><div className="analysis-section-head"><span className="step-index">02</span><div><h3>Select a mining algorithm</h3><p>Both methods analyze the same transaction baskets.</p></div></div><div className="algorithm-grid">
        <button type="button" className={`algorithm-card ${form.algorithm === 'apriori' ? 'selected' : ''}`} onClick={() => update('algorithm', 'apriori')}><span className="algorithm-radio">{form.algorithm === 'apriori' && <i/>}</span><span className="algorithm-symbol apriori-symbol"><Activity size={18}/></span><span className="algorithm-copy"><strong>Apriori</strong><small>Level-by-level candidate search. A clear baseline for learning and smaller datasets.</small></span><span className="algorithm-tag">CLASSIC</span></button>
        <button type="button" className={`algorithm-card ${form.algorithm === 'fpgrowth' ? 'selected' : ''}`} onClick={() => update('algorithm', 'fpgrowth')}><span className="algorithm-radio">{form.algorithm === 'fpgrowth' && <i/>}</span><span className="algorithm-symbol fp-symbol"><GitBranch size={18}/></span><span className="algorithm-copy"><strong>FP-Growth</strong><small>Compresses baskets into a tree and mines patterns without candidate generation.</small></span><span className="algorithm-tag">TREE-BASED</span></button>
      </div></section>

      <section className="analysis-section"><div className="analysis-section-head"><span className="step-index">03</span><div><h3>Set the discovery thresholds</h3><p>Stricter thresholds return fewer, stronger patterns.</p></div><Settings2 size={16} className="section-decoration"/></div><div className="threshold-grid">
        <label className="threshold-field"><span>Minimum support <span title="Share of all transactions containing the itemset."><CircleHelp size={13}/></span></span><div className="input-suffix"><input type="number" step="0.001" min="0.001" max="1" value={form.min_support} onChange={event => update('min_support', Number(event.target.value))} required/><small>fraction</small></div><small className="field-hint">How often a combination must appear</small></label>
        <label className="threshold-field"><span>Minimum confidence <span title="Share of antecedent baskets that also contain the consequent."><CircleHelp size={13}/></span></span><div className="input-suffix"><input type="number" step="0.01" min="0" max="1" value={form.min_confidence} onChange={event => update('min_confidence', Number(event.target.value))} required/><small>fraction</small></div><small className="field-hint">How reliable a rule must be</small></label>
        <label className="threshold-field"><span>Minimum lift <span title="Confidence divided by the consequent’s overall support. Above 1 indicates positive association."><CircleHelp size={13}/></span></span><div className="input-suffix"><input type="number" step="0.1" min="0" value={form.min_lift} onChange={event => update('min_lift', Number(event.target.value))} required/><small>×</small></div><small className="field-hint">Association strength over chance</small></label>
        <label className="threshold-field"><span>Maximum itemset size</span><div className="input-suffix"><input type="number" min="1" max="30" value={form.max_itemset_size} onChange={event => update('max_itemset_size', Number(event.target.value))} required/><small>items</small></div><small className="field-hint">Largest combination to consider</small></label>
      </div></section>

      <div className="analysis-submit-row"><div className="analysis-footnote"><CircleHelp size={14}/><span>Rules describe statistical associations; they do not prove causation.</span></div><button type="submit" className="button button-primary run-analysis-button" disabled={running || !form.dataset_id}>{running ? <><LoaderCircle className="spin" size={16}/> Mining transactions…</> : <><Play size={15} fill="currentColor"/> Run {form.algorithm === 'apriori' ? 'Apriori' : 'FP-Growth'} <ArrowRight size={15}/></>}</button></div>
    </form>}
  </div>;
}

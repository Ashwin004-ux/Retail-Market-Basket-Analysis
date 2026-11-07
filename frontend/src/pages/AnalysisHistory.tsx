import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowDownToLine, ChevronDown, ChevronRight, Clock3, Database, GitBranch, LoaderCircle, Trash2 } from 'lucide-react';
import { AnalysisService } from '../services/api';

type AnalysisEntry = { id: string; dataset_id: string; dataset_name: string; creation_timestamp: string; rules_count: number; frequent_itemsets_count: number; total_transactions: number; algorithm?: string; parameters: { min_support: number; min_confidence: number; min_lift: number } };
type Rule = { antecedents: string[]; consequents: string[]; support: number; confidence: number; lift: number; leverage: number; conviction: number | null };

export default function AnalysisHistory() {
  const [history, setHistory] = useState<AnalysisEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchHistory = async () => { setLoading(true); try { const response = await AnalysisService.getHistory(); setHistory(response.data); setError(''); } catch { setError('Could not load analysis history. Check the API and MongoDB connection.'); } finally { setLoading(false); } };
  useEffect(() => { void fetchHistory(); }, []);

  const toggle = async (item: AnalysisEntry) => {
    if (expandedId === item.id) { setExpandedId(null); return; }
    setExpandedId(item.id); setRules([]); setRulesLoading(true);
    try { const response = await AnalysisService.getRules(item.id, { limit: 100 }); setRules(response.data); }
    catch { setError('Could not load rules for this analysis.'); }
    finally { setRulesLoading(false); }
  };

  const remove = async (item: AnalysisEntry) => {
    if (!window.confirm('Delete this analysis and its saved results?')) return;
    try { await AnalysisService.delete(item.id); setHistory(items => items.filter(entry => entry.id !== item.id)); if (expandedId === item.id) setExpandedId(null); }
    catch { setError('Could not delete this analysis. Try again.'); }
  };

  const exportRules = async (id: string) => {
    try { const response = await AnalysisService.export(id, 'rules'); const url = URL.createObjectURL(response.data); const link = document.createElement('a'); link.href = url; link.download = `analysis-${id}-rules.csv`; link.click(); URL.revokeObjectURL(url); }
    catch { setError('Could not export these rules.'); }
  };

  const totalRules = history.reduce((sum, item) => sum + (item.rules_count || 0), 0);
  const totalTransactions = history.reduce((sum, item) => sum + (item.total_transactions || 0), 0);

  return <div className="history-workspace">
    {error && <div className="notice notice-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
    <section className="history-summary"><div><span className="summary-icon purple"><Activity size={17}/></span><div><small>COMPLETED ANALYSES</small><strong>{loading ? '—' : history.length.toLocaleString()}</strong></div></div><div><span className="summary-icon green"><GitBranch size={17}/></span><div><small>RULES GENERATED</small><strong>{loading ? '—' : totalRules.toLocaleString()}</strong></div></div><div><span className="summary-icon blue"><Database size={17}/></span><div><small>TRANSACTIONS ANALYZED</small><strong>{loading ? '—' : totalTransactions.toLocaleString()}</strong></div></div></section>
    <div className="history-list-heading"><div><div className="eyebrow">SAVED RESULTS</div><h2>Analysis runs</h2></div><Link to="/analysis" className="button button-primary"><Activity size={15}/> New analysis</Link></div>
    {loading ? <div className="history-empty"><LoaderCircle className="spin" size={19}/> Loading your saved analyses…</div> : history.length === 0 ? <div className="history-empty"><span className="empty-icon"><GitBranch size={20}/></span><strong>No analysis runs yet</strong><span>Your completed mining jobs will be saved here.</span><Link to="/analysis" className="button button-primary">Run your first analysis</Link></div> : <div className="history-list">{history.map(item => <article className={`history-card ${expandedId === item.id ? 'expanded' : ''}`} key={item.id}>
      <button type="button" className="history-card-head" onClick={() => void toggle(item)} aria-expanded={expandedId === item.id}><span className="history-chevron">{expandedId === item.id ? <ChevronDown size={17}/> : <ChevronRight size={17}/>}</span><span className="history-algo-icon"><GitBranch size={17}/></span><span className="history-main-copy"><strong>{item.dataset_name || 'Dataset analysis'}</strong><span><Clock3 size={12}/> {new Date(item.creation_timestamp).toLocaleString()}</span></span><span className="algo-pill">{item.algorithm || 'Apriori'}</span><span className="history-metric"><strong>{(item.frequent_itemsets_count || 0).toLocaleString()}</strong><small>itemsets</small></span><span className="history-metric"><strong>{(item.rules_count || 0).toLocaleString()}</strong><small>rules</small></span><span className="history-thresholds"><small>SUPPORT</small><strong>{item.parameters?.min_support ?? '—'}</strong></span></button>
      {expandedId === item.id && <div className="history-detail"><div className="detail-toolbar"><div><h3>Association rules</h3><span>Sorted from saved results · statistical relationships do not prove causation</span></div><div><button type="button" className="button button-outline" onClick={() => void exportRules(item.id)} disabled={!item.rules_count}><ArrowDownToLine size={14}/> Export CSV</button><button type="button" className="table-action danger-action" title="Delete analysis" onClick={() => void remove(item)}><Trash2 size={15}/></button></div></div>{rulesLoading ? <div className="table-loading"><LoaderCircle className="spin" size={17}/> Loading rules…</div> : rules.length === 0 ? <div className="no-rules"><div className="no-rules-copy"><strong>{item.rules_count ? 'Rules were saved, but none could be loaded.' : 'No rules met this run’s thresholds.'}</strong><span>{item.rules_count ? 'Try expanding this analysis again. If this continues, check the API connection.' : <>This run found {item.frequent_itemsets_count.toLocaleString()} frequent itemsets but no qualifying rules. It used support ≥ {((item.parameters?.min_support ?? 0) * 100).toFixed(1)}%, confidence ≥ {((item.parameters?.min_confidence ?? 0) * 100).toFixed(1)}%, and lift ≥ {(item.parameters?.min_lift ?? 0).toFixed(2)}×. Try a broader search with support 1% and confidence 30%.</>}</span>{!item.rules_count && <Link className="button button-outline" to={`/analysis?dataset=${encodeURIComponent(item.dataset_id)}&support=0.01&confidence=0.3&lift=1`}>Try broader thresholds</Link>}</div></div> : <div className="responsive-table"><table className="history-rules-table"><thead><tr><th>IF PRODUCTS ARE IN THE BASKET</th><th>THEN ALSO</th><th>SUPPORT</th><th>CONFIDENCE</th><th>LIFT</th><th>LEVERAGE</th></tr></thead><tbody>{rules.map((rule, index) => <tr key={`${item.id}-${index}`}><td>{rule.antecedents.join(', ')}</td><td><span className="rule-arrow">→</span> {rule.consequents.join(', ')}</td><td>{Number(rule.support).toFixed(3)}</td><td>{(Number(rule.confidence) * 100).toFixed(1)}%</td><td><span className="lift-chip">{Number(rule.lift).toFixed(2)}×</span></td><td>{Number(rule.leverage).toFixed(3)}</td></tr>)}</tbody></table></div>}</div>}
    </article>)}</div>}
  </div>;
}

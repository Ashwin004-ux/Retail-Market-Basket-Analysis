import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, ArrowUpRight, Boxes, Database, GitBranch, PackageSearch, UploadCloud } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AnalysisService, DatasetService } from '../services/api';

type AnalysisRecord = { id: string; dataset_name: string; creation_timestamp: string; rules_count: number; frequent_itemsets_count: number; total_transactions: number; parameters: { min_support: number }; algorithm?: string };
type Rule = { antecedents: string[]; consequents: string[]; support: number; confidence: number; lift: number };

function StatCard({ label, value, detail, icon: Icon, tone }: { label: string; value: string | number; detail: string; icon: typeof Database; tone: string }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19} strokeWidth={2} /></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><span className="stat-spark" aria-hidden="true">↗</span></article>;
}

export default function Dashboard() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [topRules, setTopRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([DatasetService.getAll(), AnalysisService.getHistory()]).then(async ([datasetResponse, historyResponse]) => {
      if (!active) return;
      const ds = datasetResponse.data;
      const analyses = historyResponse.data;
      setDatasets(ds);
      setHistory(analyses);
      if (analyses.length) {
        try {
          const rulesResponse = await AnalysisService.getRules(analyses[0].id, { limit: 10 });
          if (active) setTopRules([...rulesResponse.data].sort((a: Rule, b: Rule) => b.lift - a.lift).slice(0, 5));
        } catch { /* Dashboard metrics remain usable without a rules preview. */ }
      }
    }).catch(() => active && setError('Could not load analytics. Check that the API and MongoDB are running.')).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const totalTransactions = datasets.reduce((sum, item) => sum + (item.transaction_count || 0), 0);
  const totalItemsets = history.reduce((sum, item) => sum + (item.frequent_itemsets_count || 0), 0);
  const totalRules = history.reduce((sum, item) => sum + (item.rules_count || 0), 0);
  const chartData = [...history].slice(0, 6).reverse().map(item => ({ name: (item.dataset_name || 'Dataset').slice(0, 13), rules: item.rules_count || 0 }));
  const fmt = (value: number) => new Intl.NumberFormat().format(value);

  return <div className="dashboard-stack">
    <section className="welcome-banner"><div className="welcome-content"><div className="eyebrow light">RETAIL TRANSACTION ANALYSIS</div><h2>See what customers<br />buy <em>together.</em></h2><p>Analyze transaction baskets to find frequent product combinations and association rules in your data.</p><div className="welcome-actions"><Link to="/datasets" className="button button-light"><UploadCloud size={16} /> Add a dataset</Link><Link to="/analysis" className="button button-glass">New analysis <ArrowRight size={16} /></Link></div></div><div className="analysis-flow" aria-label="Analysis stages"><span className="flow-caption">ANALYSIS STAGES</span><div className="flow-step"><span className="flow-icon"><Database size={16}/></span><span><strong>Transactions</strong><small>Basket data</small></span></div><div className="flow-connector"/><div className="flow-step"><span className="flow-icon"><PackageSearch size={16}/></span><span><strong>Itemsets</strong><small>Frequent groups</small></span></div><div className="flow-connector"/><div className="flow-step"><span className="flow-icon"><GitBranch size={16}/></span><span><strong>Rules</strong><small>Product pairs</small></span></div></div></section>

    {error && <div className="notice notice-error" role="alert">{error}</div>}
    <section className="stats-grid" aria-label="Workspace metrics">
      <StatCard label="Datasets" value={loading ? '—' : fmt(datasets.length)} detail="Uploaded to workspace" icon={Database} tone="violet" />
      <StatCard label="Transactions" value={loading ? '—' : fmt(totalTransactions)} detail="Across your datasets" icon={Activity} tone="blue" />
      <StatCard label="Frequent itemsets" value={loading ? '—' : fmt(totalItemsets)} detail="Discovered in analyses" icon={Boxes} tone="amber" />
      <StatCard label="Association rules" value={loading ? '—' : fmt(totalRules)} detail="Generated from your data" icon={GitBranch} tone="green" />
    </section>

    <section className="dashboard-grid">
      <article className="panel chart-panel"><div className="panel-heading"><div><div className="eyebrow">PERFORMANCE</div><h3>Rules discovered</h3><p>Results from your most recent analyses</p></div><Link to="/history" className="text-link">View history <ArrowUpRight size={15}/></Link></div><div className="chart-wrap">{loading ? <div className="skeleton chart-skeleton"/> : chartData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#edf0f5"/><XAxis dataKey="name" tick={{ fill: '#8992a5', fontSize: 11 }} axisLine={false} tickLine={false} dy={10}/><YAxis tick={{ fill: '#8992a5', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false}/><Tooltip cursor={{ fill: '#f4f5fa' }} contentStyle={{ border: '1px solid #eceef4', borderRadius: 12, boxShadow: '0 8px 24px #1e244012', fontSize: 12 }}/><Bar dataKey="rules" name="Rules" fill="#7562e8" radius={[6, 6, 0, 0]} maxBarSize={42}/></BarChart></ResponsiveContainer> : <div className="empty-chart"><div className="empty-icon"><Activity size={20}/></div><strong>Your first analysis starts here</strong><span>Run an analysis to see your results charted.</span><Link to="/analysis" className="text-link">Create analysis <ArrowRight size={14}/></Link></div>}</div></article>

      <article className="panel activity-panel"><div className="panel-heading"><div><div className="eyebrow">LATEST WORK</div><h3>Recent analyses</h3></div><Link to="/history" className="circle-link" aria-label="View analysis history"><ArrowUpRight size={16}/></Link></div>{loading ? <div className="activity-list"><div className="skeleton activity-skeleton"/><div className="skeleton activity-skeleton"/><div className="skeleton activity-skeleton"/></div> : history.length ? <div className="activity-list">{history.slice(0, 4).map(item => <Link to="/history" className="activity-row" key={item.id}><div className="activity-mark"><GitBranch size={16}/></div><div className="activity-info"><strong>{item.dataset_name || 'Dataset analysis'}</strong><span>{new Date(item.creation_timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · {item.algorithm || 'Apriori'}</span></div><div className="activity-result"><strong>{fmt(item.rules_count || 0)}</strong><span>rules</span></div></Link>)}</div> : <div className="empty-activity"><div className="empty-icon"><Database size={19}/></div><strong>No analyses yet</strong><span>Upload a dataset and mine your first associations.</span><Link to="/datasets" className="text-link">Explore datasets <ArrowRight size={14}/></Link></div>}</article>

      <article className="panel insight-panel"><div className="panel-heading"><div><div className="eyebrow">RULE SUMMARY</div><h3>Highest-lift associations</h3><p>From your latest completed analysis</p></div><span className="signal-badge"><span/> SAVED RESULTS</span></div>{loading ? <div className="skeleton rule-skeleton"/> : topRules.length ? <div className="signal-table"><div className="signal-head"><span>PRODUCT ASSOCIATION</span><span>LIFT</span><span>CONF.</span></div>{topRules.map((rule, index) => <div className="signal-row" key={`${rule.antecedents.join()}-${rule.consequents.join()}-${index}`}><div className="rule-pair"><span>{rule.antecedents.join(', ')}</span><i>→</i><span>{rule.consequents.join(', ')}</span></div><strong className="lift-value">{Number(rule.lift).toFixed(2)}<small>×</small></strong><span className="confidence-value">{(Number(rule.confidence) * 100).toFixed(0)}%</span></div>)}</div> : <div className="empty-inline"><span>Complete an analysis to see product associations.</span><Link to="/analysis" className="text-link">Run analysis <ArrowRight size={14}/></Link></div>}</article>

      <article className="panel dataset-panel"><div className="panel-heading"><div><div className="eyebrow">DATA FOUNDATION</div><h3>Your datasets</h3><p>{datasets.length ? `${fmt(totalTransactions)} transactions ready for analysis` : 'Bring your transaction data into the workspace'}</p></div><Link to="/datasets" className="circle-link" aria-label="Manage datasets"><ArrowUpRight size={16}/></Link></div>{loading ? <div className="skeleton dataset-skeleton"/> : datasets.length ? <div className="dataset-preview">{datasets.slice(0, 3).map((dataset, index) => <div className="dataset-row" key={dataset.id}><div className={`dataset-file-icon file-tone-${index % 3}`}><Database size={17}/></div><div className="dataset-info"><strong>{dataset.filename}</strong><span>Added {new Date(dataset.upload_timestamp).toLocaleDateString()}</span></div><div className="dataset-count"><strong>{fmt(dataset.transaction_count || 0)}</strong><span>transactions</span></div></div>)}<Link to="/datasets" className="dataset-more">Open dataset manager <ArrowRight size={14}/></Link></div> : <div className="empty-inline"><span>CSV and Excel transaction files are supported.</span><Link to="/datasets" className="text-link">Upload a dataset <ArrowRight size={14}/></Link></div>}</article>
    </section>
  </div>;
}

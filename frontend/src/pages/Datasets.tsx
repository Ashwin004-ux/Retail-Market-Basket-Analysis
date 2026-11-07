import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowRight, ChevronDown, ChevronUp, Database, FileSpreadsheet, LoaderCircle, Plus, Trash2, UploadCloud } from 'lucide-react';
import { DatasetService } from '../services/api';

type Dataset = { id: string; filename: string; upload_timestamp: string; transaction_count: number; unique_product_count: number; row_count: number; status: string };
type Preview = { columns: string[]; preview: Record<string, unknown>[] };

export default function Datasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => { setLoading(true); try { const response = await DatasetService.getAll(); setDatasets(response.data); setError(''); } catch { setError('Could not load datasets. Check that the API and MongoDB are running.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const upload = async (file?: File) => {
    if (!file) return;
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) { setError('Choose a CSV or Excel file (.csv, .xlsx, .xls).'); return; }
    setUploading(true); setError(''); setNotice('');
    try { await DatasetService.upload(file); await refresh(); setNotice(`${file.name} is ready for analysis.`); }
    catch (cause: any) { setError(cause.response?.data?.detail || cause.message || 'Upload failed. Check the file and try again.'); }
    finally { setUploading(false); if (fileInput.current) fileInput.current.value = ''; }
  };

  const togglePreview = async (dataset: Dataset) => {
    if (expanded === dataset.id) { setExpanded(null); setPreview(null); return; }
    setExpanded(dataset.id); setPreview(null);
    try { const response = await DatasetService.preview(dataset.id); setPreview(response.data); }
    catch { setError('Could not load this dataset preview.'); }
  };

  const remove = async (dataset: Dataset) => {
    if (!window.confirm(`Delete “${dataset.filename}” and its associated analyses?`)) return;
    try { await DatasetService.delete(dataset.id); setDatasets(items => items.filter(item => item.id !== dataset.id)); setNotice(`${dataset.filename} and its associated analyses were deleted.`); }
    catch { setError('Could not delete this dataset. Try again.'); }
  };

  const totalTransactions = datasets.reduce((sum, ds) => sum + (ds.transaction_count || 0), 0);
  const totalProducts = datasets.reduce((sum, ds) => sum + (ds.unique_product_count || 0), 0);

  return <div className="content-stack">
    <section className="dataset-intro"><div><div className="eyebrow">DATA LIBRARY</div><h2>Transaction datasets</h2><p>Upload retail transaction files and review their transaction and product counts.</p></div><button className="button button-primary" onClick={() => fileInput.current?.click()} disabled={uploading}><Plus size={16}/>{uploading ? 'Uploading…' : 'Upload dataset'}</button><input ref={fileInput} type="file" accept=".csv,.xlsx,.xls" className="visually-hidden" onChange={event => void upload(event.target.files?.[0])}/></section>

    {(error || notice) && <div className={`notice ${error ? 'notice-error' : 'notice-success'}`} role={error ? 'alert' : 'status'}>{error || notice}<button onClick={() => { setError(''); setNotice(''); }} aria-label="Dismiss notification">×</button></div>}

    <section className="dataset-summary-grid"><article className="dataset-summary"><span className="summary-icon purple"><Database size={17}/></span><div><span>DATASETS</span><strong>{loading ? '—' : datasets.length}</strong></div></article><article className="dataset-summary"><span className="summary-icon blue"><FileSpreadsheet size={17}/></span><div><span>TRANSACTIONS</span><strong>{loading ? '—' : totalTransactions.toLocaleString()}</strong></div></article><article className="dataset-summary"><span className="summary-icon green"><UploadCloud size={17}/></span><div><span>PRODUCT COLUMNS</span><strong>{loading ? '—' : totalProducts.toLocaleString()}</strong></div></article></section>

    <section className={`upload-dropzone ${dragging ? 'dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files?.[0]); }}>
      <span className="dropzone-icon">{uploading ? <LoaderCircle className="spin" size={21}/> : <ArrowDownToLine size={21}/>}</span><div><strong>{uploading ? 'Uploading and preparing your file…' : 'Drop a transaction file here'}</strong><span>CSV or Excel · up to 25 MB · Long or binary wide format</span></div><button className="button button-outline" onClick={() => fileInput.current?.click()} disabled={uploading}>Browse files</button>
    </section>

    <section className="dataset-table-panel"><div className="table-panel-heading"><div><div className="eyebrow">YOUR FILES</div><h3>Datasets <span className="count-pill">{datasets.length}</span></h3></div><span className="table-caption">Preview, analyze, or remove a dataset</span></div>
      {loading ? <div className="table-loading"><LoaderCircle className="spin" size={18}/> Loading datasets…</div> : datasets.length === 0 ? <div className="dataset-empty"><span className="empty-icon"><Database size={20}/></span><strong>No datasets added yet</strong><span>Upload a transaction file to start uncovering product relationships.</span><button className="button button-primary" onClick={() => fileInput.current?.click()}><Plus size={15}/> Add your first dataset</button></div> : <div className="responsive-table"><table className="professional-table"><thead><tr><th>DATASET</th><th>TRANSACTIONS</th><th>PRODUCTS</th><th>UPLOADED</th><th>STATUS</th><th aria-label="Actions"/></tr></thead><tbody>{datasets.map((dataset, index) => <Fragment key={dataset.id}><tr className={expanded === dataset.id ? 'row-expanded' : ''}><td><div className="dataset-name-cell"><span className={`file-badge file-tone-${index % 3}`}><FileSpreadsheet size={16}/></span><span><strong>{dataset.filename}</strong><small>{(dataset.row_count || 0).toLocaleString()} source rows</small></span></div></td><td className="number-cell">{(dataset.transaction_count || 0).toLocaleString()}</td><td className="number-cell">{(dataset.unique_product_count || 0).toLocaleString()}</td><td className="date-cell">{new Date(dataset.upload_timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td><td><span className="status-pill"><i/>Ready</span></td><td><div className="table-actions"><button className="table-action" onClick={() => void togglePreview(dataset)} aria-label={`${expanded === dataset.id ? 'Hide' : 'Preview'} ${dataset.filename}`}>{expanded === dataset.id ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}</button><Link to={`/analysis?dataset=${encodeURIComponent(dataset.id)}`} className="table-action analyze-action" title="Analyze dataset"><ArrowRight size={15}/></Link><button className="table-action danger-action" onClick={() => void remove(dataset)} aria-label={`Delete ${dataset.filename}`}><Trash2 size={15}/></button></div></td></tr>{expanded === dataset.id && <tr className="preview-row"><td colSpan={6}>{preview ? <div className="preview-content"><div className="preview-heading"><strong>Sample records</strong><span>First {preview.preview.length} transaction-product rows</span></div><div className="responsive-table"><table className="preview-table"><thead><tr>{preview.columns.map(column => <th key={column}>{column.replace(/_/g, ' ').toUpperCase()}</th>)}</tr></thead><tbody>{preview.preview.map((record, rowIndex) => <tr key={rowIndex}>{preview.columns.map(column => <td key={column}>{String(record[column] ?? '—')}</td>)}</tr>)}</tbody></table></div></div> : <div className="table-loading"><LoaderCircle className="spin" size={16}/> Loading preview…</div>}</td></tr>}</Fragment>)}</tbody></table></div>}
    </section>
  </div>;
}

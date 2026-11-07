import { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowUpRight, BarChart3, ChevronDown, CircleHelp, Database, History, LayoutDashboard, Menu, Search, X } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Datasets from './pages/Datasets';
import Analysis from './pages/Analysis';
import AnalysisHistory from './pages/AnalysisHistory';
import { cn } from './lib/utils';
import { api } from './services/api';

const navItems = [
  { name: 'Overview', path: '/', icon: LayoutDashboard, group: 'WORKSPACE' },
  { name: 'Datasets', path: '/datasets', icon: Database, group: 'WORKSPACE' },
  { name: 'New analysis', path: '/analysis', icon: BarChart3, group: 'WORKSPACE' },
  { name: 'Analysis history', path: '/history', icon: History, group: 'MANAGE' },
];

const pageInfo: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Overview', subtitle: 'Retail transaction analysis at a glance' },
  '/datasets': { title: 'Datasets', subtitle: 'Manage the transaction files used in your analyses' },
  '/analysis': { title: 'New analysis', subtitle: 'Configure association mining for a dataset' },
  '/history': { title: 'Analysis history', subtitle: 'Review results from completed analysis runs' },
};

function Sidebar({ close }: { close?: () => void }) {
  const { pathname } = useLocation();
  return <>
    <div className="brand-lockup">
      <div className="brand-mark"><BarChart3 size={19} strokeWidth={2.2} /></div>
      <div><div className="brand-name">Retail Basket</div><div className="brand-caption">MARKET ANALYTICS</div></div>
    </div>
    <div className="workspace-switcher"><div className="workspace-avatar"><Database size={14}/></div><div className="workspace-copy"><strong>Local workspace</strong><span>Transaction analysis</span></div><ChevronDown size={15} /></div>
    <nav className="sidebar-nav" aria-label="Main navigation">
      {['WORKSPACE', 'MANAGE'].map(group => <div className="nav-group" key={group}>
        <div className="nav-label">{group}</div>
        {navItems.filter(item => item.group === group).map(item => {
          const Icon = item.icon;
          const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
          return <Link key={item.path} to={item.path} onClick={close} className={cn('nav-link', active && 'active')}><Icon size={18} strokeWidth={1.9} /><span>{item.name}</span>{item.path === '/analysis' && <span className="nav-plus">+</span>}</Link>;
        })}
      </div>)}
    </nav>
    <div className="sidebar-bottom">
      <div className="sidebar-tip"><BarChart3 size={16} /><div><strong>Association analysis</strong><span>Transactions → itemsets → rules</span></div></div>
      <a className="help-link" href="http://localhost:8000/docs" target="_blank" rel="noreferrer"><CircleHelp size={16} /> API documentation <ArrowUpRight size={14} /></a>
      <div className="user-profile"><div className="user-avatar"><Activity size={14}/></div><div className="user-copy"><strong>Local project</strong><span>Retail analytics</span></div></div>
    </div>
  </>;
}

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'unavailable'>('checking');
  const location = useLocation();
  const navigate = useNavigate();
  const current = pageInfo[location.pathname] || pageInfo['/'];
  useEffect(() => { let active = true; api.get('/health').then(({ data }) => active && setApiStatus(data.status === 'ok' ? 'connected' : 'unavailable')).catch(() => active && setApiStatus('unavailable')); return () => { active = false; }; }, []);
  return <div className="app-shell">
    <aside className="desktop-sidebar"><Sidebar /></aside>
    {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)}><aside className="mobile-sidebar" onClick={e => e.stopPropagation()}><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={19} /></button><Sidebar close={() => setMobileOpen(false)} /></aside></div>}
    <div className="app-main">
      <header className="topbar">
        <button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
        <div className="topbar-titles"><div className="breadcrumbs">MARKET BASKET ANALYSIS <span>/</span> {current.title.toUpperCase()}</div><h1>{current.title}</h1></div>
        <div className="topbar-actions"><label className="global-search"><Search size={16} /><input aria-label="Quick navigation" placeholder="Jump to a page…" onKeyDown={event => { if (event.key === 'Enter') { const query = event.currentTarget.value.toLowerCase(); const match = navItems.find(item => item.name.toLowerCase().includes(query)); if (match) navigate(match.path); } }} /><kbd>↵</kbd></label><span className={`system-status ${apiStatus}`} title={apiStatus === 'connected' ? 'API and database are connected' : apiStatus === 'checking' ? 'Checking API status' : 'API or database is unavailable'}><i /> {apiStatus === 'connected' ? 'API connected' : apiStatus === 'checking' ? 'Checking API' : 'API unavailable'}</span></div>
      </header>
      <main className="page-content"><div className="page-heading"><div><p>{current.subtitle}</p></div></div><Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/datasets" element={<Datasets />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/history" element={<AnalysisHistory />} />
      </Routes></main>
      <footer className="app-footer"><span>Retail Basket · Market basket analysis</span><span>Association rules describe relationships in the data.</span></footer>
    </div>
  </div>;
}

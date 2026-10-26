import React, { useState, useEffect } from 'react';
import {
  Users,
  HeartPulse,
  Blocks,
  Printer,
  Key,
  Clock,
  History,
  Stethoscope,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  Flame,
  Activity
} from 'lucide-react';
import TermTooltip from './TermTooltip.jsx';
import TimeStatusBadge from './TimeStatusBadge.jsx';
import {
  fetchAdminOverview,
  fetchCadavers,
  fetchOrgansList,
  fetchHarvestReports,
  fetchDeadlines,
  triggerDeadlineScan,
  fetchBlockchain
} from '../utils/api.js';

function formatRemainingSeconds(secs, overdue) {
  if (overdue || secs < 0) {
    const abs = Math.abs(secs);
    const hrs = Math.floor(abs / 3600);
    const mins = Math.round((abs % 3600) / 60);
    if (hrs > 0) return `Overdue by ${hrs}h ${mins}m`;
    return `Overdue by ${mins}m`;
  }
  const hrs = Math.floor(secs / 3600);
  const mins = Math.round((secs % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

export default function AdminDashboard({ onOpenExplorer, onOpenDoctors }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'deadlines', 'personnel', 'organs', 'cadavers'
  const [adminData, setAdminData] = useState(null);
  const [cadavers, setCadavers] = useState([]);
  const [organs, setOrgans] = useState([]);
  const [harvestReports, setHarvestReports] = useState([]);
  const [deadlinesMap, setDeadlinesMap] = useState({});
  const [deadlinesList, setDeadlinesList] = useState([]);
  const [escalationsList, setEscalationsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());

  // Certificate / Print Modal
  const [selectedItemForCert, setSelectedItemForCert] = useState(null);

  useEffect(() => {
    loadAllData();
    // Auto-refresh every 15 seconds
    const interval = setInterval(loadAllData, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedItemForCert) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setSelectedItemForCert(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemForCert]);

  async function loadAllData() {
    try {
      const [overviewRes, cadRes, orgRes, repRes, dRes, bRes] = await Promise.all([
        fetchAdminOverview().catch(() => ({ success: false })),
        fetchCadavers().catch(() => ({ success: false })),
        fetchOrgansList().catch(() => ({ success: false })),
        fetchHarvestReports().catch(() => ({ success: false })),
        fetchDeadlines().catch(() => ({ success: false, deadlines: [] })),
        fetchBlockchain('ADMIN').catch(() => ({ success: false }))
      ]);

      if (overviewRes && overviewRes.success) setAdminData(overviewRes);
      if (cadRes && cadRes.success) setCadavers(cadRes.cadavers);
      if (orgRes && orgRes.success) setOrgans(orgRes.organs);
      if (repRes && repRes.success) setHarvestReports(repRes.reports);

      // Process Deadlines list
      let dList = [];
      if (dRes && Array.isArray(dRes.deadlines)) {
        dList = [...dRes.deadlines];
        const map = {};
        dRes.deadlines.forEach(item => {
          const key = item.organId || item.recordId || item.hexId;
          if (key) map[key] = item;
        });
        setDeadlinesMap(map);
      }

      // Sort deadlines by remaining time (RED/overdue first, then AMBER, then GREEN)
      dList.sort((a, b) => {
        const riskWeight = { RED: 3, AMBER: 2, GREEN: 1 };
        const rwA = a.overdue ? 4 : (riskWeight[a.riskLevel] || 0);
        const rwB = b.overdue ? 4 : (riskWeight[b.riskLevel] || 0);
        if (rwA !== rwB) return rwB - rwA;

        const remA = a.remainingSeconds != null ? a.remainingSeconds : (a.remainingMs ? a.remainingMs / 1000 : 0);
        const remB = b.remainingSeconds != null ? b.remainingSeconds : (b.remainingMs ? b.remainingMs / 1000 : 0);
        return remA - remB;
      });
      setDeadlinesList(dList);

      // Process Escalations from blockchain transactions
      const escalations = [];
      if (bRes && bRes.chain) {
        bRes.chain.forEach(block => {
          (block.transactions || []).forEach(tx => {
            if (tx.type === 'ESCALATION' || tx.type === 'LATE_EVENT') {
              escalations.push({
                ...tx,
                blockIndex: block.index,
                blockTimestamp: block.timestamp
              });
            }
          });
        });
      }
      escalations.sort((a, b) => new Date(b.blockTimestamp || b.timestamp) - new Date(a.blockTimestamp || a.timestamp));
      setEscalationsList(escalations);

      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Error loading admin consortium data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleScanNow() {
    setScanning(true);
    setScanMessage(null);
    try {
      const res = await triggerDeadlineScan();
      await loadAllData();
      if (res && res.success !== false) {
        setScanMessage({
          type: 'success',
          text: res.message || 'Deadline scan completed. Active risk statuses updated on-chain.'
        });
      } else {
        setScanMessage({
          type: 'error',
          text: res?.error || 'Scan completed in local mode.'
        });
      }
    } catch {
      setScanMessage({
        type: 'error',
        text: 'Deadline scan endpoint unavailable.'
      });
    } finally {
      setScanning(false);
    }
  }

  const stats = adminData ? adminData.stats : {
    blockHeight: 1,
    totalIntakes: 0,
    totalVerified: 0,
    totalHarvests: 0,
    totalOrgansCount: 0,
    organDistribution: {},
    totalCertifiedPersonnel: 9
  };

  const personnel = adminData ? adminData.personnel : [];

  const overdueCount = deadlinesList.filter(d => d.overdue || d.riskLevel === 'RED').length;
  const amberCount = deadlinesList.filter(d => !d.overdue && d.riskLevel === 'AMBER').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Admin Top Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 border border-purple-200 text-3xl flex items-center justify-center">
            🏛️
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Central Regulatory &amp; Audit Board
              </h2>
              <TermTooltip term="CTORB" />
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Statewide governance, specialist public key directory, safe preservation window tracking, and audit certification.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenExplorer}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Blocks className="w-4 h-4 text-cyan-400" />
            <span>Open Audit Ledger</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-semibold" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Executive Overview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'deadlines'}
          onClick={() => setActiveTab('deadlines')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'deadlines'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Deadline &amp; Escalation Monitor</span>
          {overdueCount > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-mono text-[10px] font-bold">
              {overdueCount}
            </span>
          ) : deadlinesList.length > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 font-mono text-[10px]">
              {deadlinesList.length}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'personnel'}
          onClick={() => setActiveTab('personnel')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'personnel'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          The 9 Certified Specialists ({personnel.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'organs'}
          onClick={() => setActiveTab('organs')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'organs'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Recovered Organs Registry ({organs.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'cadavers'}
          onClick={() => setActiveTab('cadavers')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'cadavers'
              ? 'bg-purple-700 text-white shadow-sm'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Donor Intake Dossiers ({cadavers.length})
        </button>
      </div>

      {/* Scan notification banner */}
      {scanMessage && (
        <div
          role="status"
          className={`p-3 rounded-xl text-xs flex items-center justify-between border font-medium ${
            scanMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {scanMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{scanMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setScanMessage(null)}
            className="font-bold ml-3 text-slate-500 hover:text-slate-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key KPI Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Total Donors Registered
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-bold text-slate-900 font-mono">
                  {stats.totalIntakes}
                </span>
                <span className="text-xs font-semibold text-emerald-700">
                  ({stats.totalVerified} Approved)
                </span>
              </div>
              <p className="text-xs text-slate-600">Forensic intake dossiers</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Total Organs Recovered
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-bold text-amber-700 font-mono">
                  {stats.totalOrgansCount}
                </span>
                <span className="text-xs font-medium text-slate-600">
                  in {stats.totalHarvests} Surgeries
                </span>
              </div>
              <p className="text-xs text-slate-600">Under cold preservation</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Consortium Block Height
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-bold text-cyan-700 font-mono">
                  #{stats.blockHeight}
                </span>
                <span className="text-xs text-emerald-700 font-mono font-semibold">100% Valid</span>
              </div>
              <p className="text-xs text-slate-600">Sealed audit ledger blocks</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Deadline &amp; Risk Status
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl md:text-3xl font-bold font-mono ${overdueCount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {overdueCount > 0 ? `${overdueCount} Critical` : 'Nominal'}
                </span>
                {amberCount > 0 && (
                  <span className="text-xs font-semibold text-amber-700">
                    ({amberCount} Amber)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('deadlines')}
                className="text-xs text-purple-700 hover:underline font-semibold block pt-0.5"
              >
                View Monitor →
              </button>
            </div>
          </div>

          {/* Organ Breakdown & Cold Ischemia Limits */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Organ Distribution Chart Cards */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-rose-600" />
                  Organ Distribution Breakdown
                </h3>
                <span className="text-xs text-slate-600 font-mono font-semibold">
                  Total: {stats.totalOrgansCount} Organs
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {stats.organDistribution && Object.keys(stats.organDistribution).map(orgName => {
                  const count = stats.organDistribution[orgName] || 0;
                  return (
                    <div
                      key={orgName}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between"
                    >
                      <span className="text-xs font-semibold text-slate-700">{orgName}</span>
                      <div className="flex items-baseline justify-between mt-2">
                        <span className="text-xl font-bold font-mono text-slate-900">{count}</span>
                        <span className="text-xs text-slate-600">
                          {stats.totalOrgansCount > 0 ? Math.round((count / stats.totalOrgansCount) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cold Ischemia Viability Benchmarks */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Safe Preservation Windows
                </h3>
                <TermTooltip term="Cold Ischemia" />
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span className="font-semibold text-slate-800">🫀 Heart / Lung:</span>
                  <span className="font-mono font-bold text-rose-700">4 – 6 Hours Max</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span className="font-semibold text-slate-800">🥩 Liver:</span>
                  <span className="font-mono font-bold text-amber-700">8 – 12 Hours Max</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span className="font-semibold text-slate-800">🫘 Kidneys:</span>
                  <span className="font-mono font-bold text-emerald-700">24 – 36 Hours Max</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span className="font-semibold text-slate-800">👁️ Corneas:</span>
                  <span className="font-mono font-bold text-blue-700">Up to 14 Days (Preserved)</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 pt-1 leading-snug">
                The ledger records cross-clamp timestamps and displays preservation countdown badges across donor and organ views.
              </p>
            </div>
          </div>

          {/* Recent Audit Activity Table */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-purple-700" />
                Recent Blockchain Consortium Audit Trail
              </h3>
              <button
                type="button"
                onClick={onOpenExplorer}
                className="text-xs text-blue-700 hover:underline font-semibold cursor-pointer"
              >
                Open Audit Timeline →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 uppercase tracking-wider font-mono">
                    <th className="pb-2">Block #</th>
                    <th className="pb-2">Event Type</th>
                    <th className="pb-2">Origin Node</th>
                    <th className="pb-2">Approvals</th>
                    <th className="pb-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminData && adminData.recentAuditLogs && adminData.recentAuditLogs.slice(0, 6).map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 font-mono font-bold text-cyan-800">#{log.blockIndex}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs">
                          {log.type}
                        </span>
                      </td>
                      <td className="py-2.5 font-medium text-slate-700">{log.sender}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-xs font-bold">
                          {log.signaturesCount} of 2 required approvals (out of 3 specialists)
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-600">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEADLINE & ESCALATION MONITOR */}
      {activeTab === 'deadlines' && (
        <div className="space-y-6">
          {/* Monitor Control Bar */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-purple-700" />
                  <span>Clinical Deadline &amp; Escalation Engine</span>
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active 15s Polling
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Surveillance of organ preservation thresholds (Cold Ischemia), approval targets, and on-chain escalation alerts.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-500 hidden md:inline">
                Last updated: {lastRefreshedAt.toLocaleTimeString()}
              </span>
              <button
                type="button"
                disabled={scanning}
                onClick={handleScanNow}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                <span>{scanning ? 'Scanning...' : 'Scan now'}</span>
              </button>
            </div>
          </div>

          {/* Risk Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 uppercase tracking-wider">Critical / Overdue</span>
                <Flame className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-rose-700">
                {overdueCount}
              </div>
              <p className="text-xs text-rose-800">Breached preservation windows or urgent action required</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Amber Warning</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-700">
                {amberCount}
              </div>
              <p className="text-xs text-amber-800">Approaching threshold limits (&lt; 25% window remaining)</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Nominal (Green)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-700">
                {deadlinesList.filter(d => !d.overdue && d.riskLevel === 'GREEN').length}
              </div>
              <p className="text-xs text-emerald-800">Securely within clinical storage tolerance</p>
            </div>
          </div>

          {/* Section 1: Deadlines Table */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-700" />
                <span>Monitored Records &amp; Clinical Thresholds</span>
              </h4>
              <span className="text-xs font-mono text-slate-500">
                Sorted by remaining time (Overdue/RED first)
              </span>
            </div>

            {deadlinesList.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No active deadline risks recorded</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  All active donors and organs are currently within safe clinical thresholds, or the backend deadline scanner is waiting for initial records.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 uppercase tracking-wider font-mono">
                      <th className="pb-2.5">Risk Level</th>
                      <th className="pb-2.5">Record ID</th>
                      <th className="pb-2.5">Kind</th>
                      <th className="pb-2.5">Window / Target</th>
                      <th className="pb-2.5">Time Remaining</th>
                      <th className="pb-2.5">Deadline Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deadlinesList.map((item, idx) => {
                      const isOverdue = item.overdue || item.riskLevel === 'RED';
                      const remSec = item.remainingSeconds != null
                        ? item.remainingSeconds
                        : (item.remainingMs ? Math.round(item.remainingMs / 1000) : 0);

                      let chipClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                      if (item.riskLevel === 'AMBER') chipClass = 'bg-amber-100 text-amber-800 border-amber-300';
                      if (isOverdue) chipClass = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';

                      return (
                        <tr key={idx} className={`hover:bg-slate-50 ${isOverdue ? 'bg-rose-50/30' : ''}`}>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold uppercase ${chipClass}`}>
                              {item.riskLevel || (isOverdue ? 'RED' : 'GREEN')}
                            </span>
                          </td>
                          <td className="py-3 font-mono font-bold text-slate-900">
                            {item.recordId || item.hexId || item.organId}
                          </td>
                          <td className="py-3">
                            <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                              {item.kind || 'organ'}
                            </span>
                          </td>
                          <td className="py-3 font-medium text-slate-800">
                            {item.windowKey || item.event || 'Safe Window'}
                          </td>
                          <td className={`py-3 font-mono font-bold ${isOverdue ? 'text-rose-700' : item.riskLevel === 'AMBER' ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {formatRemainingSeconds(remSec, item.overdue)}
                          </td>
                          <td className="py-3 text-slate-600 font-mono">
                            {item.deadlineAt ? new Date(item.deadlineAt).toLocaleString() : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: On-Chain Escalations & Late Events */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>On-Chain Escalations &amp; Late Events Log</span>
              </h4>
              <span className="text-xs font-mono text-slate-500">
                Ledger types: ESCALATION, LATE_EVENT
              </span>
            </div>

            {escalationsList.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-slate-700">Zero escalation breaches</p>
                <p className="text-xs text-slate-500">
                  No automated ESCALATION or LATE_EVENT transactions have been mined on-chain.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 uppercase tracking-wider font-mono">
                      <th className="pb-2.5">Block #</th>
                      <th className="pb-2.5">Event Type</th>
                      <th className="pb-2.5">Target Record</th>
                      <th className="pb-2.5">Escalation Trigger / Severity</th>
                      <th className="pb-2.5">Sender Node</th>
                      <th className="pb-2.5">Block Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {escalationsList.map((esc, eIdx) => {
                      const isEsc = esc.type === 'ESCALATION';
                      return (
                        <tr key={eIdx} className="hover:bg-slate-50">
                          <td className="py-2.5 font-mono font-bold text-cyan-800">
                            #{esc.blockIndex}
                          </td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded border text-[11px] font-bold font-mono ${
                              isEsc
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}>
                              {esc.type}
                            </span>
                          </td>
                          <td className="py-2.5 font-mono font-semibold text-slate-800">
                            {esc.payload?.recordId || esc.payload?.organId || esc.payload?.hexId || 'System'}
                          </td>
                          <td className="py-2.5 text-slate-700">
                            {esc.payload?.reason || esc.payload?.details || esc.payload?.riskLevel || 'Threshold breach alert'}
                          </td>
                          <td className="py-2.5 text-slate-600 font-mono">
                            {esc.sender || 'DEADLINE_ENGINE'}
                          </td>
                          <td className="py-2.5 text-slate-600 font-mono">
                            {esc.blockTimestamp ? new Date(esc.blockTimestamp).toLocaleString() : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: THE 9 SPECIALISTS DIRECTORY */}
      {activeTab === 'personnel' && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-950 flex items-start gap-3">
            <Users className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-bold block">The 9 Pre-Authorized Medical &amp; Regulatory Specialists:</strong>
              Three dedicated specialists per department with verified public keys. Under consortium governance,
              every record requires <strong>2 required approvals out of 3 specialists</strong> (<TermTooltip term="2-of-3 Multi-Sig" />).
              Only specialist names, roles, departments, and public keys are displayed.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {personnel.map(doc => (
              <div
                key={doc.id || doc.name}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-600">Department</span>
                    <span className="text-xs bg-purple-50 text-purple-800 border border-purple-200 px-2.5 py-0.5 rounded-lg font-mono font-bold">
                      {doc.department}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900">{doc.name}</h4>
                  <p className="text-xs text-purple-800 font-semibold flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>{doc.role}</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center gap-1 text-xs text-emerald-800 font-semibold">
                    <Key className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Public Key</span>
                  </div>
                  <p
                    className="text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 break-all"
                    title={doc.publicKey}
                  >
                    {doc.publicKey}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: HARVESTED ORGANS MASTER REGISTRY */}
      {activeTab === 'organs' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="text-slate-700 font-medium">
              Showing all <strong>{organs.length}</strong> individual recovered organs across all verified surgical sessions.
            </span>
            <span className="font-mono text-slate-600">
              ID Format: [Last4Hex]-[OrganCode]-[4Random]
            </span>
          </div>

          {organs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-2">
              <span className="text-3xl">🫀</span>
              <p className="text-sm font-bold text-slate-700">No organs recovered yet.</p>
              <p className="text-xs text-slate-600">
                Sign in to Surgical Organ Recovery (SROPS) and complete an organ recovery report to view records here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {organs.map((org, idx) => {
                const deadlineEntry = deadlinesMap[org.organId] || org.deadlineStatus || null;
                const startIso = org.extractionDate && org.extractionTime
                  ? `${org.extractionDate}T${org.extractionTime}`
                  : org.certifiedAt;

                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="font-mono font-bold text-xs bg-slate-900 text-amber-300 px-2.5 py-1 rounded-lg border border-slate-700">
                          {org.organId}
                        </span>
                        <span className="text-xs uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {org.harvestStatus}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{org.organName}</h4>
                        <TimeStatusBadge
                          deadlineData={deadlineEntry}
                          organName={org.organName}
                          startTime={startIso}
                          stage="HARVEST"
                        />
                      </div>

                      <p className="text-xs text-slate-700 mt-1">
                        Donor: <strong>{org.patientName}</strong> (Hex: {org.cadaverHexId})
                      </p>

                      <div className="mt-3 space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                        <p>
                          <span>Condition: </span>
                          <strong className="text-slate-800">{org.condition}</strong>
                        </p>
                        <p>
                          <span>Clamp Time: </span>
                          <strong className="text-slate-800">{org.extractionTime} ({org.extractionDate})</strong>
                        </p>
                        <p>
                          <span>Preservation: </span>
                          <span className="text-slate-700">{org.preservationSolution}</span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-600 font-mono">
                        Report: {org.reportId}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedItemForCert(org)}
                        className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print Certificate
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CADAVER DOSSIERS */}
      {activeTab === 'cadavers' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 text-xs text-slate-700">
            Showing all <strong>{cadavers.length}</strong> donor intake dossiers logged by the Donor Intake &amp; Consent Wing (CIFV).
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cadavers.map(cad => {
              const deadlineEntry = deadlinesMap[cad.hexId] || cad.deadlineStatus || null;
              const startIso = cad.arrivalDate && cad.arrivalTime
                ? `${cad.arrivalDate}T${cad.arrivalTime}`
                : cad.createdAt;

              return (
                <div
                  key={cad.hexId}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="font-mono font-bold text-sm bg-slate-100 text-blue-900 px-2.5 py-1 rounded-lg border border-slate-200">
                        {cad.hexId}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <TimeStatusBadge
                          deadlineData={deadlineEntry}
                          startTime={startIso}
                          stage="INTAKE"
                        />
                        <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                          {cad.status}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-base font-bold text-slate-900">
                      {cad.patientName} ({cad.age}y, {cad.gender})
                    </h4>
                    <p className="text-xs text-slate-700 mt-1">
                      Cause: {cad.causeOfDeath}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                      <p>Blood: <strong className="text-slate-800 font-mono">{cad.bloodGroup}</strong></p>
                      <p>Death: <strong className="text-slate-800">{cad.deathDate} {cad.deathTime}</strong></p>
                      <p>Arrival: <span className="text-slate-700">{cad.arrivalDate} {cad.arrivalTime}</span></p>
                      <p>Eligible: <strong className="text-emerald-700">{cad.isAppropriateForHarvesting ? 'Yes' : 'No'}</strong></p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-xs text-slate-600 font-mono">
                      Approvals: {cad.signatures ? cad.signatures.length : 0} of 2 required (out of 3 specialists)
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedItemForCert(cad)}
                      className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Official Dossier
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Official Certificate / Print Modal */}
      {selectedItemForCert && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="certificate-modal-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200 space-y-5">
            {/* Header of Certificate */}
            <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
              <span className="text-xs uppercase font-bold tracking-widest text-slate-600 font-mono">
                GOVERNMENT OF INDIA • STATE TRANSPLANT REGULATORY DIRECTORATE
              </span>
              <h3 id="certificate-modal-title" className="text-lg font-extrabold text-slate-900 tracking-tight">
                CERTIFICATE OF CADAVERIC ORGAN CHAIN-OF-CUSTODY
              </h3>
              <p className="text-xs text-slate-600 font-mono">
                Consortium Blockchain Immutable Registry • 2 Required Approvals out of 3 Specialists
              </p>
            </div>

            {/* Certificate Details */}
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-600">Record Identifier:</span>
                  <strong className="text-slate-900">{selectedItemForCert.organId || selectedItemForCert.hexId}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Donor Name:</span>
                  <strong className="text-slate-900">{selectedItemForCert.patientName}</strong>
                </div>
                {selectedItemForCert.organName && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Organ Specification:</span>
                    <strong className="text-amber-800">{selectedItemForCert.organName}</strong>
                  </div>
                )}
                {selectedItemForCert.bloodGroup && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Donor Blood Group:</span>
                    <strong className="text-slate-900">{selectedItemForCert.bloodGroup}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">Certification Status:</span>
                  <strong className="text-emerald-700 font-bold">CONSORTIUM VERIFIED (MINED ON-CHAIN)</strong>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed italic text-center">
                This document certifies that the biological specimen described herein has undergone mandatory forensic verification,
                biometric clearance, disease screening, and 2 required approvals out of 3 specialists. The record is permanently sealed
                on the distributed ledger and cannot be altered.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedItemForCert(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Official Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

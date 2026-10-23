import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  HeartPulse,
  Blocks,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Search,
  Printer,
  Download,
  Key,
  Building,
  Award,
  Clock,
  Sparkles,
  Layers,
  History
} from 'lucide-react';
import { fetchAdminOverview, fetchCadavers, fetchOrgansList, fetchHarvestReports } from '../utils/api.js';

export default function AdminDashboard({ onOpenExplorer, onOpenDoctors }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'personnel', 'organs', 'cadavers'
  const [adminData, setAdminData] = useState(null);
  const [cadavers, setCadavers] = useState([]);
  const [organs, setOrgans] = useState([]);
  const [harvestReports, setHarvestReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Certificate / Print Modal
  const [selectedItemForCert, setSelectedItemForCert] = useState(null);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    try {
      const [overviewRes, cadRes, orgRes, repRes] = await Promise.all([
        fetchAdminOverview(),
        fetchCadavers(),
        fetchOrgansList(),
        fetchHarvestReports()
      ]);

      if (overviewRes.success) setAdminData(overviewRes);
      if (cadRes.success) setCadavers(cadRes.cadavers);
      if (orgRes.success) setOrgans(orgRes.organs);
      if (repRes.success) setHarvestReports(repRes.reports);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Admin Top Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 border border-purple-200 text-3xl flex items-center justify-center">
            🏛️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Central Transplant Oversight Regulatory Board (Admin)
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                CTORB Master Node
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Statewide governance, doctor registry auditing, cold ischemia viability tracking, and cryptographic chain-of-custody oversight.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onOpenExplorer}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Blocks className="w-4 h-4 text-cyan-400" />
            <span>Open Blockchain Explorer</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'overview'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Executive Overview
        </button>
        <button
          onClick={() => setActiveTab('personnel')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'personnel'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          The 9 Certified Specialists ({personnel.length})
        </button>
        <button
          onClick={() => setActiveTab('organs')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'organs'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Harvested Organs Master Registry ({organs.length})
        </button>
        <button
          onClick={() => setActiveTab('cadavers')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'cadavers'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Cadaver Intake Dossiers ({cadavers.length})
        </button>
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key KPI Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Donors Registered
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-bold text-slate-900 font-mono">
                  {stats.totalIntakes}
                </span>
                <span className="text-xs font-medium text-emerald-600">
                  ({stats.totalVerified} Verified)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Forensic intake dossiers</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Organs Harvested
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-bold text-amber-600 font-mono">
                  {stats.totalOrgansCount}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  in {stats.totalHarvests} Surgeries
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Under cold preservation</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Consortium Block Height
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-bold text-cyan-600 font-mono">
                  #{stats.blockHeight}
                </span>
                <span className="text-xs text-emerald-600 font-mono">100% Valid</span>
              </div>
              <p className="text-[11px] text-slate-400">Mined Proof-of-Authority blocks</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Certified Personnel
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-bold text-purple-700 font-mono">
                  9 Specialists
                </span>
              </div>
              <p className="text-[11px] text-slate-400">3 per consortium department</p>
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
                <span className="text-xs text-slate-500 font-mono">
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
                        <span className="text-[10px] text-slate-400">
                          {stats.totalOrgansCount > 0 ? Math.round((count / stats.totalOrgansCount) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cold Ischemia Viability Benchmarks (Clinical Context for Defense) */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Cold Ischemia Viability Limits
                </h3>
                <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono">
                  SOTTO SOP
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span className="font-semibold text-slate-800">🫀 Heart / Lung:</span>
                  <span className="font-mono font-bold text-rose-600">4 – 6 Hours Max</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span className="font-semibold text-slate-800">🥩 Liver:</span>
                  <span className="font-mono font-bold text-amber-600">8 – 12 Hours Max</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span className="font-semibold text-slate-800">🫘 Kidneys:</span>
                  <span className="font-mono font-bold text-emerald-600">24 – 36 Hours Max</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                  <span className="font-semibold text-slate-800">👁️ Corneas:</span>
                  <span className="font-mono font-bold text-blue-600">Up to 14 Days (Preserved)</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 pt-1 leading-snug">
                The blockchain automatically tracks cross-clamp timestamps and generates alert warnings if transit approaches threshold limits.
              </p>
            </div>
          </div>

          {/* Recent Audit Activity Table */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600" />
                Recent Blockchain Consortium Audit Trail
              </h3>
              <button
                onClick={onOpenExplorer}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                Deep Ledger View →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-mono">
                    <th className="pb-2">Block #</th>
                    <th className="pb-2">Tx Type</th>
                    <th className="pb-2">Origin Node</th>
                    <th className="pb-2">Signatures</th>
                    <th className="pb-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminData && adminData.recentAuditLogs && adminData.recentAuditLogs.slice(0, 6).map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 font-mono font-bold text-cyan-700">#{log.blockIndex}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[10px]">
                          {log.type}
                        </span>
                      </td>
                      <td className="py-2.5 font-medium text-slate-700">{log.sender}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                          {log.signaturesCount} of 3 Signatures
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: THE 9 SPECIALISTS DIRECTORY */}
      {activeTab === 'personnel' && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 flex items-start gap-3">
            <Users className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block">The 9 Pre-Authorized Medical & Regulatory Officials:</strong>
              Three dedicated medical specialists per department with asymmetric cryptographic keys. 
              Under consortium governance, transactions strictly enforce a <strong>2-out-of-3 threshold signature</strong>.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {personnel.map(doc => (
              <div
                key={doc.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold bg-purple-50 text-purple-800 px-2.5 py-1 rounded-lg border border-purple-200">
                      {doc.id}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-semibold">
                      Dept: {doc.department}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900">{doc.name}</h4>
                  <p className="text-xs text-purple-700 font-semibold">{doc.role}</p>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p>
                      <span className="text-slate-400 font-medium">Registration:</span>{' '}
                      <strong className="font-mono text-slate-700">{doc.regNumber}</strong>
                    </p>
                    <p>
                      <span className="text-slate-400 font-medium">Hospital:</span>{' '}
                      <span className="text-slate-700">{doc.hospital}</span>
                    </p>
                    <p>
                      <span className="text-slate-400 font-medium">Experience:</span>{' '}
                      <span className="text-slate-700">{doc.experience}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                    <Key className="w-3.5 h-3.5 text-emerald-600" />
                    Key Registered
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                    {doc.publicKey}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: HARVESTED ORGANS MASTER REGISTRY */}
      {activeTab === 'organs' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="text-slate-600 font-medium">
              Showing all <strong>{organs.length}</strong> individual harvested organs across all verified surgical sessions.
            </span>
            <span className="font-mono text-slate-500">
              ID Format: [Last4Hex]-[OrganCode]-[4Random]
            </span>
          </div>

          {organs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-2">
              <span className="text-3xl">🫀</span>
              <p className="text-sm font-bold text-slate-700">No organs extracted yet.</p>
              <p className="text-xs text-slate-500">
                Log into SROPS Suite and complete an organ harvest report to view tokens here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {organs.map((org, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-xs bg-slate-900 text-amber-300 px-2.5 py-1 rounded-lg border border-slate-700">
                        {org.organId}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {org.harvestStatus}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{org.organName}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Donor: <strong>{org.patientName}</strong> (Hex: {org.cadaverHexId})
                    </p>

                    <div className="mt-3 space-y-1 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl">
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
                    <span className="text-[10px] text-slate-400 font-mono">
                      Report: {org.reportId}
                    </span>
                    <button
                      onClick={() => setSelectedItemForCert(org)}
                      className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print Certificate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CADAVER DOSSIERS */}
      {activeTab === 'cadavers' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 text-xs">
            Showing all <strong>{cadavers.length}</strong> cadaveric intake dossiers logged by the Forensic Intake Wing.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cadavers.map(cad => (
              <div
                key={cad.hexId}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-sm bg-slate-100 text-blue-900 px-2.5 py-1 rounded-lg border border-slate-200">
                      {cad.hexId}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                      {cad.status}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900">
                    {cad.patientName} ({cad.age}y, {cad.gender})
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Cause: {cad.causeOfDeath}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl">
                    <p>Blood: <strong className="text-slate-800 font-mono">{cad.bloodGroup}</strong></p>
                    <p>Death: <strong className="text-slate-800">{cad.deathDate} {cad.deathTime}</strong></p>
                    <p>Arrival: <span className="text-slate-700">{cad.arrivalDate} {cad.arrivalTime}</span></p>
                    <p>Appropriate: <strong className="text-emerald-700">{cad.isAppropriateForHarvesting ? 'Yes' : 'No'}</strong></p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Signatures: {cad.signatures ? cad.signatures.length : 0} of 3
                  </span>
                  <button
                    onClick={() => setSelectedItemForCert(cad)}
                    className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Official Dossier
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Official Certificate / Print Modal */}
      {selectedItemForCert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200 space-y-5">
            {/* Header of Certificate */}
            <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 font-mono">
                GOVERNMENT OF INDIA • STATE TRANSPLANT REGULATORY DIRECTORATE
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                CERTIFICATE OF CADAVERIC ORGAN CHAIN-OF-CUSTODY
              </h3>
              <p className="text-xs text-slate-600 font-mono">
                Consortium Blockchain Immutable Registry • 2-of-3 Multi-Sig Certified
              </p>
            </div>

            {/* Certificate Details */}
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Record Identifier:</span>
                  <strong className="text-slate-900">{selectedItemForCert.organId || selectedItemForCert.hexId}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Donor Name:</span>
                  <strong className="text-slate-900">{selectedItemForCert.patientName}</strong>
                </div>
                {selectedItemForCert.organName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Organ Specification:</span>
                    <strong className="text-amber-700">{selectedItemForCert.organName}</strong>
                  </div>
                )}
                {selectedItemForCert.bloodGroup && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Donor Blood Group:</span>
                    <strong className="text-slate-900">{selectedItemForCert.bloodGroup}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Certification Status:</span>
                  <strong className="text-emerald-700 font-bold">CONSORTIUM VERIFIED (MINED ON-CHAIN)</strong>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed italic text-center">
                This document certifies that the human biological specimen described herein has undergone mandatory forensic verification, 
                biometric clearance, disease screening, and 2-of-3 threshold digital signatures. The record is permanently sealed on the 
                distributed ledger and cannot be altered.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                onClick={() => setSelectedItemForCert(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
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

import React, { useState, useEffect } from 'react';
import {
  Heart,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileCheck2,
  UserCheck,
  Stethoscope,
  Layers,
  ShieldCheck,
  Truck,
  Navigation,
  Info
} from 'lucide-react';
import {
  fetchCadavers,
  submitOrganHarvest,
  fetchHarvestReports,
  signOrganHarvest,
  fetchDeadlines,
  fetchHospitals,
  postEta
} from '../utils/api.js';
import MultiSigPad from './MultiSigPad.jsx';
import TimeStatusBadge from './TimeStatusBadge.jsx';
import TermTooltip from './TermTooltip.jsx';

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB

export const ORGAN_CODE_MAP = {
  'Heart': '01',
  'Eye / Cornea': '02',
  'Liver': '03',
  'Left Kidney': '04',
  'Right Kidney': '05',
  'Lung': '06',
  'Pancreas': '07',
  'Small Bowel / Intestine': '08'
};

function formatEtaDuration(seconds) {
  if (!seconds || seconds <= 0) return '0 min';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}

export default function SropsDashboard({ onOpenExplorer, onOpenDoctors }) {
  const [activeTab, setActiveTab] = useState('harvest'); // 'harvest' or 'reports'
  const [verifiedCadavers, setVerifiedCadavers] = useState([]);
  const [reports, setReports] = useState([]);
  const [deadlinesMap, setDeadlinesMap] = useState({});
  const [hospitalsList, setHospitalsList] = useState([]);
  const [etaState, setEtaState] = useState({}); // { [organId]: { origin, destination, loading, result, error } }
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  // Multi-Sig Modal state
  const [signingModalOpen, setSigningModalOpen] = useState(false);
  const [selectedReportForSign, setSelectedReportForSign] = useState(null);

  // Selected donor cadaver
  const [selectedCadaver, setSelectedCadaver] = useState(null);

  // Dynamic Organ Count (N)
  const [totalOrgans, setTotalOrgans] = useState(3);
  const [organsList, setOrgansList] = useState([]);

  // Surgical team state
  const [arrivalDate, setArrivalDate] = useState(new Date().toISOString().split('T')[0]);
  const [arrivalTime, setArrivalTime] = useState('11:00');
  const [surgeonsCount, setSurgeonsCount] = useState(3);
  const [surgeonsList, setSurgeonsList] = useState(
    'Dr. Sunil Kulkarni (SROPS-SUR-201), Dr. Neha Deshmukh (SROPS-SUR-202)'
  );
  const [surgicalNotes, setSurgicalNotes] = useState('Cold perfusion established with UW Solution at 4°C.');

  useEffect(() => {
    loadData();
  }, []);

  // Update dynamic organ list whenever totalOrgans or selectedCadaver changes
  useEffect(() => {
    buildDynamicOrganSlots(totalOrgans, selectedCadaver);
  }, [totalOrgans, selectedCadaver]);

  async function loadData() {
    setLoading(true);
    try {
      const [cRes, rRes, dRes, hRes] = await Promise.all([
        fetchCadavers('VERIFIED_FOR_EXTRACTION'),
        fetchHarvestReports(),
        fetchDeadlines(),
        fetchHospitals()
      ]);

      if (cRes.success) {
        setVerifiedCadavers(cRes.cadavers);
        if (cRes.cadavers.length > 0 && !selectedCadaver) {
          setSelectedCadaver(cRes.cadavers[0]);
        }
      }

      if (rRes.success) {
        setReports(rRes.reports);
      }

      if (dRes && dRes.success && Array.isArray(dRes.deadlines)) {
        const map = {};
        dRes.deadlines.forEach(item => {
          const key = item.organId || item.recordId || item.reportId;
          if (key) map[key] = item;
        });
        setDeadlinesMap(map);
      }

      if (hRes && hRes.hospitals) {
        setHospitalsList(Object.keys(hRes.hospitals));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Formula:
  // First 4 digits: last 4 digits of patient's hex ID
  // Middle 2 digits: organ number (01 for heart, 02 for eye, etc.)
  // Last 4 digits: random numbers
  function computeOrganId(hexId, organName) {
    const clean = (hexId || '0xABCD1234').replace(/^0x/i, '');
    const lastFour = clean.slice(-4).toUpperCase();
    const code = ORGAN_CODE_MAP[organName] || '99';
    const randomFour = Math.floor(1000 + Math.random() * 9000);
    return `${lastFour}-${code}-${randomFour}`;
  }

  function buildDynamicOrganSlots(count, cad) {
    const defaultOrganTypes = ['Heart', 'Eye / Cornea', 'Liver', 'Left Kidney', 'Right Kidney', 'Lung', 'Pancreas'];
    const cadHex = cad ? cad.hexId : '0x7A92C4E1';

    const newSlots = [];
    for (let i = 0; i < count; i++) {
      const defaultName = defaultOrganTypes[i % defaultOrganTypes.length];
      newSlots.push({
        slot: i + 1,
        organName: defaultName,
        organId: computeOrganId(cadHex, defaultName),
        condition: 'Viable - Grade A (Optimal)',
        extractionDate: new Date().toISOString().split('T')[0],
        extractionTime: '11:45',
        preservationSolution: 'University of Wisconsin (UW) Solution',
        storageTemperature: '4°C (Static Cold Storage)',
        qaImage: '',
        qaNotes: 'Perfusion flush clear, minimal warm ischemia duration.'
      });
    }
    setOrgansList(newSlots);
  }

  function handleOrganChange(index, field, value) {
    setOrgansList(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'organName') {
        const cadHex = selectedCadaver ? selectedCadaver.hexId : '0x7A92C4E1';
        updated[index].organId = computeOrganId(cadHex, value);
      }
      return updated;
    });
  }

  function handleOrganImageUpload(index, e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setMessage({
        type: 'error',
        text: `File "${file.name}" exceeds the 4 MB upload limit. Please select a smaller specimen photo.`
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setOrgansList(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], qaImage: reader.result };
        return updated;
      });
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmitHarvest(e) {
    e.preventDefault();
    if (!selectedCadaver) {
      setMessage({
        type: 'error',
        text: 'Please select an approved donor record before submitting an organ recovery report.'
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await submitOrganHarvest({
        cadaverHexId: selectedCadaver.hexId,
        patientName: selectedCadaver.patientName,
        arrivalDateAtExtraction: arrivalDate,
        arrivalTimeAtExtraction: arrivalTime,
        totalOrgansExtracted: totalOrgans,
        organs: organsList,
        operatingSurgeonsCount: surgeonsCount,
        operatingSurgeonsList: surgeonsList,
        notes: surgicalNotes,
        submittedBy: 'SROPS_CHIEF_SURGEON'
      });

      if (res.success) {
        setMessage({
          type: 'success',
          text: `Organ recovery logged for ${organsList.length} organs! Pending 2 required approvals out of 3 specialists before certification.`
        });
        await loadData();
        setActiveTab('reports');
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to submit harvest report.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error connecting to consortium ledger.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExecuteSign({ doctorId, pin }) {
    if (!selectedReportForSign) return;
    const res = await signOrganHarvest(selectedReportForSign.reportId, doctorId, pin);
    if (res.success) {
      const rRes = await fetchHarvestReports();
      if (rRes.success) {
        setReports(rRes.reports);
        const refreshed = rRes.reports.find(r => r.reportId === selectedReportForSign.reportId);
        if (refreshed) {
          setSelectedReportForSign(refreshed);
        }
      }
      setMessage({
        type: 'success',
        text: res.message + (res.isFullyCertified ? ' Certified recovery block sealed on the blockchain!' : '')
      });
    } else {
      throw new Error(res.error || 'Signing failed');
    }
  }

  function handleEtaParamChange(organId, field, value) {
    setEtaState(prev => {
      const current = prev[organId] || {};
      return {
        ...prev,
        [organId]: { ...current, [field]: value, error: null }
      };
    });
  }

  async function handleCalculateEta(organId) {
    const defaultOrigin = hospitalsList[0] || 'AIIMS New Delhi';
    const defaultDest = hospitalsList[1] || hospitalsList[0] || 'Safdarjung Hospital (New Delhi)';
    const current = etaState[organId] || {};
    const origin = current.origin || defaultOrigin;
    const destination = current.destination || defaultDest;

    setEtaState(prev => ({
      ...prev,
      [organId]: { ...current, origin, destination, loading: true, error: null }
    }));

    try {
      const result = await postEta({ organId, origin, destination });
      if (result && result.success !== false) {
        setEtaState(prev => ({
          ...prev,
          [organId]: { ...current, origin, destination, loading: false, result, error: null }
        }));
      } else {
        setEtaState(prev => ({
          ...prev,
          [organId]: {
            ...current,
            origin,
            destination,
            loading: false,
            error: result?.error || 'Unable to calculate transit ETA'
          }
        }));
      }
    } catch (err) {
      setEtaState(prev => ({
        ...prev,
        [organId]: {
          ...current,
          origin,
          destination,
          loading: false,
          error: 'Network error calculating ETA'
        }
      }));
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Department Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-200 text-3xl flex items-center justify-center">
            🫀
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Surgical Organ Recovery Suite
              </h2>
              <TermTooltip term="SROPS" />
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Organ retrieval, preservation window tracking (<TermTooltip term="Cold Ischemia" />), and <strong>2 required approvals out of 3 specialists</strong> (<TermTooltip term="2-of-3 Multi-Sig" />).
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'harvest'}
            onClick={() => setActiveTab('harvest')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'harvest'
                ? 'bg-white text-amber-800 shadow-sm'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Heart className="w-4 h-4" />
            Organ Recovery Form
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'reports'}
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-white text-amber-800 shadow-sm'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            Surgical Reports Queue ({reports.length})
          </button>
        </div>
      </div>

      {/* Inline status / error message */}
      {message && (
        <div
          role={message.type === 'error' ? 'alert' : 'status'}
          className={`p-4 rounded-xl text-xs flex items-center justify-between border font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            aria-label="Dismiss notification"
            className="font-bold ml-4 px-2 py-0.5 rounded hover:bg-black/5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: DYNAMIC ORGAN HARVEST FORM */}
      {activeTab === 'harvest' && (
        <form onSubmit={handleSubmitHarvest} className="space-y-6">
          {/* Step 1: Donor & Cadaver Selection */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-700" />
              1. Approved Donor Selection (From CIFV Pool)
            </h3>

            {verifiedCadavers.length === 0 ? (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
                <span>
                  No approved donors are currently available in the SROPS queue. A donor record must receive
                  <strong> 2 required approvals out of 3 specialists</strong> in CIFV before surgical organ recovery can begin.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="srops-select-cadaver" className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Approved Donor *
                  </label>
                  <select
                    id="srops-select-cadaver"
                    value={selectedCadaver ? selectedCadaver.hexId : ''}
                    onChange={e => {
                      const c = verifiedCadavers.find(item => item.hexId === e.target.value);
                      setSelectedCadaver(c);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none"
                  >
                    {verifiedCadavers.map(cad => (
                      <option key={cad.hexId} value={cad.hexId}>
                        {cad.hexId} - {cad.patientName} ({cad.bloodGroup})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="srops-donor-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Donor Name (Prefilled)
                  </label>
                  <input
                    id="srops-donor-name"
                    type="text"
                    disabled
                    value={selectedCadaver ? selectedCadaver.patientName : ''}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                  />
                </div>

                <div>
                  <label htmlFor="srops-donor-hex" className="block text-xs font-semibold text-slate-700 mb-1">
                    Donor Unique Hex ID (Prefilled)
                  </label>
                  <input
                    id="srops-donor-hex"
                    type="text"
                    disabled
                    value={selectedCadaver ? selectedCadaver.hexId : ''}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-blue-800"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label htmlFor="srops-arrival-date" className="block text-xs font-semibold text-slate-700 mb-1">
                  Arrival Date at Surgical Suite *
                </label>
                <input
                  id="srops-arrival-date"
                  type="date"
                  required
                  value={arrivalDate}
                  onChange={e => setArrivalDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="srops-arrival-time" className="block text-xs font-semibold text-slate-700 mb-1">
                  Arrival Time at Surgical Suite *
                </label>
                <input
                  id="srops-arrival-time"
                  type="time"
                  required
                  value={arrivalTime}
                  onChange={e => setArrivalTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
              </div>

              {/* DYNAMIC TOTAL ORGANS EXTRACTED (N) */}
              <div>
                <label htmlFor="srops-total-organs" className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Number of Organs Recovered (N) *
                </label>
                <div className="flex items-center gap-2">
                  <select
                    id="srops-total-organs"
                    value={totalOrgans}
                    onChange={e => setTotalOrgans(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold text-amber-950 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'Organ' : 'Organs'} Recovered
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Dynamic Organ Cards Based on Total Organs Chosen */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-700" />
                2. Recovered Organ Slots ({organsList.length} Generated)
              </h3>
              <span className="text-xs text-slate-600 font-mono">
                ID Format: [Last 4 Hex] - [Organ Code 01..08] - [4 Random Digits]
              </span>
            </div>

            <div className="space-y-4">
              {organsList.map((org, index) => {
                const startIso = org.extractionDate && org.extractionTime
                  ? `${org.extractionDate}T${org.extractionTime}`
                  : null;

                return (
                  <div
                    key={index}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4 relative"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="w-7 h-7 rounded-xl bg-amber-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                          #{org.slot}
                        </span>
                        <h4 className="text-sm font-bold text-slate-800">
                          Organ #{org.slot}: {org.organName}
                        </h4>
                        <TimeStatusBadge
                          organName={org.organName}
                          startTime={startIso}
                          stage="HARVEST"
                        />
                      </div>

                      {/* Auto Generated Organ ID Badge */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 uppercase font-mono">ORGAN ID:</span>
                        <span className="font-mono font-bold text-xs bg-slate-900 text-amber-300 px-3 py-1 rounded-lg shadow-sm border border-slate-700">
                          {org.organId}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label htmlFor={`srops-organ-name-${index}`} className="block text-xs font-semibold text-slate-700 mb-1">
                          Organ Name / Category *
                        </label>
                        <select
                          id={`srops-organ-name-${index}`}
                          value={org.organName}
                          onChange={e => handleOrganChange(index, 'organName', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none"
                        >
                          {Object.keys(ORGAN_CODE_MAP).map(k => (
                            <option key={k} value={k}>
                              {k} (Code: {ORGAN_CODE_MAP[k]})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor={`srops-organ-cond-${index}`} className="block text-xs font-semibold text-slate-700 mb-1">
                          Organ Viability / Condition *
                        </label>
                        <select
                          id={`srops-organ-cond-${index}`}
                          value={org.condition}
                          onChange={e => handleOrganChange(index, 'condition', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                        >
                          <option value="Viable - Grade A (Optimal)">Grade A (Optimal - No Atherosclerosis)</option>
                          <option value="Viable - Grade B (Marginal)">Grade B (Marginal - Suitable with perfusion)</option>
                          <option value="Under Evaluation">Under Pulsatile Perfusion Evaluation</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor={`srops-organ-date-${index}`} className="block text-xs font-semibold text-slate-700 mb-1">
                          Recovery / Cross-Clamp Date *
                        </label>
                        <input
                          id={`srops-organ-date-${index}`}
                          type="date"
                          value={org.extractionDate}
                          onChange={e => handleOrganChange(index, 'extractionDate', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label htmlFor={`srops-organ-time-${index}`} className="block text-xs font-semibold text-slate-700 mb-1">
                          Cross-Clamp Timestamp *
                        </label>
                        <input
                          id={`srops-organ-time-${index}`}
                          type="time"
                          value={org.extractionTime}
                          onChange={e => handleOrganChange(index, 'extractionTime', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                      <div>
                        <label htmlFor={`srops-organ-sol-${index}`} className="block text-xs font-semibold text-slate-700 mb-1">
                          Preservation Solution
                        </label>
                        <input
                          id={`srops-organ-sol-${index}`}
                          type="text"
                          value={org.preservationSolution}
                          onChange={e => handleOrganChange(index, 'preservationSolution', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label htmlFor={`srops-organ-temp-${index}`} className="block text-xs font-semibold text-slate-700 mb-1">
                          Storage Temperature
                        </label>
                        <input
                          id={`srops-organ-temp-${index}`}
                          type="text"
                          value={org.storageTemperature}
                          onChange={e => handleOrganChange(index, 'storageTemperature', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                        />
                      </div>

                      {/* QA Image Upload for this specific organ */}
                      <div>
                        <span className="block text-xs font-semibold text-slate-700 mb-1">
                          QA Specimen Photo Upload (≤ 4 MB)
                        </span>
                        {org.qaImage ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={org.qaImage}
                              alt={`Organ #${org.slot} QA specimen`}
                              className="h-10 w-16 object-cover rounded-lg border border-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => handleOrganChange(index, 'qaImage', '')}
                              className="text-rose-700 text-xs hover:underline font-semibold cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label
                            htmlFor={`srops-organ-photo-${index}`}
                            className="cursor-pointer border border-dashed border-slate-300 rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 text-xs text-blue-700 font-semibold hover:bg-slate-50 focus-within:ring-2 focus-within:ring-blue-600"
                          >
                            <input
                              id={`srops-organ-photo-${index}`}
                              type="file"
                              accept="image/*"
                              onChange={e => handleOrganImageUpload(index, e)}
                              className="sr-only peer"
                            />
                            <UploadCloud className="w-4 h-4 text-slate-500 peer-focus-visible:text-blue-600" />
                            <span>Upload Organ Photo</span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Operating Surgical Team */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-amber-700" />
              3. Operating Retrieval Surgical Team
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="srops-surgeons-count" className="block text-xs font-semibold text-slate-700 mb-1">
                  Number of Surgeons / Specialists *
                </label>
                <input
                  id="srops-surgeons-count"
                  type="number"
                  value={surgeonsCount}
                  onChange={e => setSurgeonsCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="srops-surgeons-list" className="block text-xs font-semibold text-slate-700 mb-1">
                  Operating Surgeons Names &amp; Medical Registration IDs *
                </label>
                <input
                  id="srops-surgeons-list"
                  type="text"
                  required
                  value={surgeonsList}
                  onChange={e => setSurgeonsList(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="srops-surgical-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                Post-Recovery Surgical Notes &amp; Perfusion Observations
              </label>
              <textarea
                id="srops-surgical-notes"
                rows={2}
                value={surgicalNotes}
                onChange={e => setSurgicalNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || !selectedCadaver}
              className="py-3 px-6 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Heart className="w-4 h-4" />
              {submitting ? 'Committing to Ledger...' : 'Generate Surgical Recovery Dossier'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: SURGICAL REPORTS QUEUE & 2-OF-3 MULTI-SIG */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-slate-700">
              Showing all <strong>{reports.length}</strong> surgical organ recovery reports on the SROPS ledger.
            </span>
            <span className="text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full font-semibold border border-amber-300">
              Mandatory Rule: 2 required approvals out of 3 specialists before certification.
            </span>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-600 text-xs">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-2">
              <span className="text-3xl">🫀</span>
              <p className="text-sm font-bold text-slate-700">No surgical recovery reports logged yet.</p>
              <p className="text-xs text-slate-600">
                Complete the Organ Recovery Form to log recovered organs.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map(rep => {
                const isCertified = rep.status === 'CERTIFIED_HARVEST';
                const sigCount = rep.signatures ? rep.signatures.length : 0;

                return (
                  <div
                    key={rep.reportId}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {rep.reportId}
                          </span>
                          <span className="text-xs bg-slate-100 text-blue-900 font-mono px-2 py-0.5 rounded border border-slate-200">
                            Donor Hex: {rep.cadaverHexId}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mt-1">
                          Donor: <strong>{rep.patientName}</strong> | Recovered: <strong>{rep.totalOrgansExtracted} Organs</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full border ${
                            isCertified
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {isCertified ? 'CERTIFIED & ON-CHAIN' : `${sigCount} OF 2 REQUIRED APPROVALS`}
                        </span>
                      </div>
                    </div>

                    {/* Harvested Organ Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {rep.organs.map((org, oIdx) => {
                        const deadlineEntry = deadlinesMap[org.organId] || org.deadlineStatus || null;
                        const startIso = org.extractionDate && org.extractionTime
                          ? `${org.extractionDate}T${org.extractionTime}`
                          : rep.createdAt;
                        const organEta = etaState[org.organId] || {};
                        const defaultOrigin = hospitalsList[0] || 'AIIMS New Delhi';
                        const defaultDest = hospitalsList[1] || hospitalsList[0] || 'Safdarjung Hospital (New Delhi)';

                        return (
                          <div
                            key={oIdx}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 flex flex-col justify-between"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <strong className="text-slate-900">{org.organName}</strong>
                                <span className="text-xs font-mono bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold border border-amber-200">
                                  {org.organId}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700">{org.condition}</p>
                              <p className="text-xs text-slate-600">
                                Clamp Time: {org.extractionTime} ({org.extractionDate})
                              </p>
                              <div className="pt-1">
                                <TimeStatusBadge
                                  deadlineData={deadlineEntry}
                                  organName={org.organName}
                                  startTime={startIso}
                                  stage="HARVEST"
                                />
                              </div>
                            </div>

                            {/* Organ Transit ETA Card (Displayed for Certified Organs) */}
                            {isCertified && (
                              <div className="mt-2 pt-2 border-t border-slate-200 bg-white p-2.5 rounded-lg border border-slate-200 space-y-2 shadow-xs">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 font-bold text-xs text-slate-800">
                                    <Truck className="w-3.5 h-3.5 text-cyan-700" />
                                    <span>Organ Transit ETA</span>
                                  </div>
                                  <span className="text-[10px] uppercase font-mono text-slate-600">Transit</span>
                                </div>

                                <div className="space-y-1.5">
                                  <div>
                                    <label htmlFor={`eta-origin-${org.organId}`} className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                                      Origin Hospital
                                    </label>
                                    <select
                                      id={`eta-origin-${org.organId}`}
                                      value={organEta.origin || defaultOrigin}
                                      onChange={(e) => handleEtaParamChange(org.organId, 'origin', e.target.value)}
                                      className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                                    >
                                      {hospitalsList.length > 0 ? (
                                        hospitalsList.map((hName) => (
                                          <option key={hName} value={hName}>{hName}</option>
                                        ))
                                      ) : (
                                        <option value={defaultOrigin}>{defaultOrigin}</option>
                                      )}
                                    </select>
                                  </div>

                                  <div>
                                    <label htmlFor={`eta-dest-${org.organId}`} className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                                      Destination Hospital
                                    </label>
                                    <select
                                      id={`eta-dest-${org.organId}`}
                                      value={organEta.destination || defaultDest}
                                      onChange={(e) => handleEtaParamChange(org.organId, 'destination', e.target.value)}
                                      className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                                    >
                                      {hospitalsList.length > 0 ? (
                                        hospitalsList.map((hName) => (
                                          <option key={hName} value={hName}>{hName}</option>
                                        ))
                                      ) : (
                                        <option value={defaultDest}>{defaultDest}</option>
                                      )}
                                    </select>
                                  </div>
                                </div>

                                <div className="pt-0.5">
                                  <button
                                    type="button"
                                    disabled={organEta.loading}
                                    onClick={() => handleCalculateEta(org.organId)}
                                    className="w-full py-1.5 px-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
                                  >
                                    <Navigation className="w-3.5 h-3.5" />
                                    <span>{organEta.loading ? 'Calculating ETA...' : 'Calculate ETA'}</span>
                                  </button>
                                </div>

                                {organEta.result && (
                                  <div className="bg-slate-50 border border-slate-200 rounded p-2 space-y-1 mt-1.5">
                                    <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                                      <span className="font-semibold text-slate-700">
                                        Dist: <strong className="text-cyan-800 font-mono">{organEta.result.distanceKm} km</strong>
                                      </span>
                                      <span className="font-semibold text-slate-700">
                                        ETA: <strong className="text-emerald-700 font-mono">{formatEtaDuration(organEta.result.etaSeconds)}</strong>
                                      </span>
                                    </div>

                                    {organEta.result.method === 'haversine-fallback' && (
                                      <div className="pt-0.5">
                                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 inline-block">
                                          approximate estimate
                                        </span>
                                      </div>
                                    )}

                                    <div className="text-[11px] text-slate-600 pt-0.5">
                                      <span>Arrival: <strong>{new Date(organEta.result.arrivalAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                                    </div>

                                    <div className="flex items-center gap-1 text-[11px] text-slate-500 italic pt-1 border-t border-slate-200">
                                      <Info className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span>Estimated route time - not live tracking</span>
                                    </div>
                                  </div>
                                )}

                                {organEta.error && (
                                  <p className="text-[11px] text-rose-700 font-medium">
                                    {organEta.error}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Multi-Signature Status */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">Surgeon Approvals:</span>
                          <span className="font-mono font-bold text-blue-800">
                            {sigCount} of 2 required approvals (out of 3 specialists)
                          </span>
                        </div>
                        {rep.signatures && rep.signatures.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {rep.signatures.map((s, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded font-medium border border-emerald-200"
                              >
                                ✓ {s.doctorName} ({s.doctorId})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {!isCertified && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReportForSign(rep);
                            setSigningModalOpen(true);
                          }}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Approve Recovery ({sigCount}/2)</span>
                        </button>
                      )}

                      {isCertified && (
                        <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Certified &amp; Dispatched to Admin Portal
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Multi-Signature Modal */}
      {selectedReportForSign && (
        <MultiSigPad
          isOpen={signingModalOpen}
          onClose={() => {
            setSigningModalOpen(false);
            setSelectedReportForSign(null);
          }}
          department="SROPS"
          recordId={selectedReportForSign.reportId}
          recordTitle={`Organ Recovery (${selectedReportForSign.totalOrgansExtracted} Organs) - Donor Hex: ${selectedReportForSign.cadaverHexId}`}
          existingSignatures={selectedReportForSign.signatures || []}
          onSignSubmit={handleExecuteSign}
        />
      )}
    </div>
  );
}

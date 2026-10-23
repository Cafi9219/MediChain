import React, { useState, useEffect } from 'react';
import {
  Heart,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UploadCloud,
  FileCheck2,
  Activity,
  UserCheck,
  Stethoscope,
  ChevronRight,
  Camera,
  Layers,
  Thermometer,
  ShieldCheck
} from 'lucide-react';
import { fetchCadavers, submitOrganHarvest, fetchHarvestReports, signOrganHarvest } from '../utils/api.js';
import MultiSigPad from './MultiSigPad.jsx';

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

export default function SropsDashboard({ onOpenExplorer, onOpenDoctors }) {
  const [activeTab, setActiveTab] = useState('harvest'); // 'harvest' or 'reports'
  const [verifiedCadavers, setVerifiedCadavers] = useState([]);
  const [reports, setReports] = useState([]);
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
      // 1. Fetch cadavers that are VERIFIED_FOR_EXTRACTION
      const cRes = await fetchCadavers('VERIFIED_FOR_EXTRACTION');
      if (cRes.success) {
        setVerifiedCadavers(cRes.cadavers);
        if (cRes.cadavers.length > 0 && !selectedCadaver) {
          setSelectedCadaver(cRes.cadavers[0]);
        }
      }

      // 2. Fetch surgical harvest reports
      const rRes = await fetchHarvestReports();
      if (rRes.success) {
        setReports(rRes.reports);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Formula as required:
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
      updated[index][field] = value;
      // Re-calculate organ ID if organ name changed
      if (field === 'organName') {
        const cadHex = selectedCadaver ? selectedCadaver.hexId : '0x7A92C4E1';
        updated[index].organId = computeOrganId(cadHex, value);
      }
      return updated;
    });
  }

  function handleOrganImageUpload(index, e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOrgansList(prev => {
          const updated = [...prev];
          updated[index].qaImage = reader.result;
          return updated;
        });
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmitHarvest(e) {
    e.preventDefault();
    if (!selectedCadaver) {
      alert('Please select a verified cadaver record.');
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
          text: `Organ harvest logged for ${organsList.length} organs! Pending 2-of-3 surgical signatures before dispatch to Admin portal.`
        });
        loadData();
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
      loadData();
      setMessage({
        type: 'success',
        text: res.message + (res.isFullyCertified ? ' Certified harvest block mined to blockchain!' : '')
      });
    } else {
      throw new Error(res.error || 'Signing failed');
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
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Surgical Retrieval & Organ Preservation Suite
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                SROPS Node
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Organ recovery, dynamic multi-organ intake, algorithmic ID token generation, and 2-of-3 surgeon certification.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('harvest')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'harvest'
                ? 'bg-white text-amber-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Heart className="w-4 h-4" />
            Dynamic Harvest Form
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'reports'
                ? 'bg-white text-amber-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            Surgical Reports Queue ({reports.length})
          </button>
        </div>
      </div>

      {/* Alert message */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
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
          <button onClick={() => setMessage(null)} className="font-bold ml-4">
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
              <UserCheck className="w-4 h-4 text-amber-600" />
              1. Verified Donor Cadaver Selection (From CIFV Pool)
            </h3>

            {verifiedCadavers.length === 0 ? (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  No verified cadavers currently available in the SROPS queue. A cadaver must be verified by 
                  <strong> 2-of-3 CIFV medical signatures</strong> before surgical organ recovery can begin.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Verified Cadaver *
                  </label>
                  <select
                    value={selectedCadaver ? selectedCadaver.hexId : ''}
                    onChange={e => {
                      const c = verifiedCadavers.find(item => item.hexId === e.target.value);
                      setSelectedCadaver(c);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none"
                  >
                    {verifiedCadavers.map(cad => (
                      <option key={cad.hexId} value={cad.hexId}>
                        {cad.hexId} - {cad.patientName} ({cad.bloodGroup})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Donor Name (Prefilled)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedCadaver ? selectedCadaver.patientName : ''}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cadaver Unique Hex ID (Prefilled)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedCadaver ? selectedCadaver.hexId : ''}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-blue-700"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Arrival Date at Surgical Suite *
                </label>
                <input
                  type="date"
                  required
                  value={arrivalDate}
                  onChange={e => setArrivalDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Arrival Time at Surgical Suite *
                </label>
                <input
                  type="time"
                  required
                  value={arrivalTime}
                  onChange={e => setArrivalTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none"
                />
              </div>

              {/* DYNAMIC TOTAL ORGANS EXTRACTED (N) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Number of Organs Extracted (N) *
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={totalOrgans}
                    onChange={e => setTotalOrgans(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold text-amber-900 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'Organ' : 'Organs'} Extracted
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Dynamic Organ Cards Based on Total Organs Chosen */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                2. Dynamic Harvested Organ Slots ({organsList.length} Generated)
              </h3>
              <span className="text-xs text-slate-500">
                Formula: [Last 4 Hex] - [Organ Code 01..08] - [4 Random Digits]
              </span>
            </div>

            <div className="space-y-4">
              {organsList.map((org, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4 relative"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-amber-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                        #{org.slot}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800">
                        Organ #{org.slot}: {org.organName}
                      </h4>
                    </div>

                    {/* Auto Generated Organ ID Badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 uppercase font-mono">AUTOGENERATED ID:</span>
                      <span className="font-mono font-bold text-xs bg-slate-900 text-amber-300 px-3 py-1 rounded-lg shadow-sm border border-slate-700">
                        {org.organId}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Organ Name / Category *
                      </label>
                      <select
                        value={org.organName}
                        onChange={e => handleOrganChange(index, 'organName', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none"
                      >
                        {Object.keys(ORGAN_CODE_MAP).map(k => (
                          <option key={k} value={k}>
                            {k} (Code: {ORGAN_CODE_MAP[k]})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Organ Viability / Condition *
                      </label>
                      <select
                        value={org.condition}
                        onChange={e => handleOrganChange(index, 'condition', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none"
                      >
                        <option value="Viable - Grade A (Optimal)">Grade A (Optimal - No Atherosclerosis)</option>
                        <option value="Viable - Grade B (Marginal)">Grade B (Marginal - Suitable with perfusion)</option>
                        <option value="Under Evaluation">Under Pulsatile Perfusion Evaluation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Harvest / Cross-Clamp Date *
                      </label>
                      <input
                        type="date"
                        value={org.extractionDate}
                        onChange={e => handleOrganChange(index, 'extractionDate', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cross-Clamp Timestamp *
                      </label>
                      <input
                        type="time"
                        value={org.extractionTime}
                        onChange={e => handleOrganChange(index, 'extractionTime', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Preservation Solution
                      </label>
                      <input
                        type="text"
                        value={org.preservationSolution}
                        onChange={e => handleOrganChange(index, 'preservationSolution', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Storage Temperature
                      </label>
                      <input
                        type="text"
                        value={org.storageTemperature}
                        onChange={e => handleOrganChange(index, 'storageTemperature', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none"
                      />
                    </div>

                    {/* QA Image Upload for this specific organ */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        QA Specimen Photo Upload
                      </label>
                      {org.qaImage ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={org.qaImage}
                            alt="Organ QA"
                            className="h-10 w-16 object-cover rounded-lg border border-slate-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleOrganChange(index, 'qaImage', '')}
                            className="text-rose-600 text-xs hover:underline font-semibold"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer border border-dashed border-slate-300 rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:bg-slate-50">
                          <UploadCloud className="w-4 h-4 text-slate-400" />
                          <span>Upload Organ Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => handleOrganImageUpload(index, e)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Operating Surgical Team */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-amber-600" />
              3. Operating Retrieval Surgical Team
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Number of Surgeons / Specialists *
                </label>
                <input
                  type="number"
                  value={surgeonsCount}
                  onChange={e => setSurgeonsCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operating Surgeons Names & Medical Registration IDs *
                </label>
                <input
                  type="text"
                  required
                  value={surgeonsList}
                  onChange={e => setSurgeonsList(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Post-Harvest Surgical Notes & Perfusion Observations
              </label>
              <textarea
                rows={2}
                value={surgicalNotes}
                onChange={e => setSurgicalNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none"
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
              {submitting ? 'Committing to Ledger...' : 'Generate Surgical Harvest Dossier'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: SURGICAL REPORTS QUEUE & 2-OF-3 MULTI-SIG */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-slate-600">
              Showing all <strong>{reports.length}</strong> surgical extraction reports on the SROPS ledger.
            </span>
            <span className="text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full font-medium border border-amber-200">
              Mandatory Rule: 2-of-3 SROPS Surgeon Signatures required before pushing to Central Admin.
            </span>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-500 text-xs">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-2">
              <span className="text-3xl">🫀</span>
              <p className="text-sm font-bold text-slate-700">No surgical harvest reports logged yet.</p>
              <p className="text-xs text-slate-500">
                Fill the Dynamic Harvest Form above to log organ retrieval.
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
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {rep.reportId}
                          </span>
                          <span className="text-xs bg-slate-100 text-blue-800 font-mono px-2 py-0.5 rounded border border-slate-200">
                            Donor Hex: {rep.cadaverHexId}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Donor: <strong>{rep.patientName}</strong> | Harvested: <strong>{rep.totalOrgansExtracted} Organs</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                            isCertified
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {isCertified ? 'CERTIFIED & MINED' : 'PENDING 2-OF-3 SURGEON SIGNATURES'}
                        </span>
                      </div>
                    </div>

                    {/* Harvested Organ Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {rep.organs.map((org, oIdx) => (
                        <div
                          key={oIdx}
                          className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-800">{org.organName}</strong>
                            <span className="text-[10px] font-mono bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                              {org.organId}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">{org.condition}</p>
                          <p className="text-[11px] text-slate-500">
                            Clamp Time: {org.extractionTime} ({org.extractionDate})
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Multi-Signature Status */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">Surgeon Signatures:</span>
                          <span className="font-mono font-bold text-blue-700">{sigCount} of 3</span>
                        </div>
                        {rep.signatures && rep.signatures.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {rep.signatures.map((s, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium border border-emerald-200"
                              >
                                ✓ {s.doctorName} ({s.doctorId})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {!isCertified && (
                        <button
                          onClick={() => {
                            setSelectedReportForSign(rep);
                            setSigningModalOpen(true);
                          }}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Surgeon Sign (2-of-3)</span>
                        </button>
                      )}

                      {isCertified && (
                        <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Dispatched to Admin Portal
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
          recordTitle={`Organ Harvest (${selectedReportForSign.totalOrgansExtracted} Organs) - Donor Hex: ${selectedReportForSign.cadaverHexId}`}
          existingSignatures={selectedReportForSign.signatures || []}
          onSignSubmit={handleExecuteSign}
        />
      )}
    </div>
  );
}

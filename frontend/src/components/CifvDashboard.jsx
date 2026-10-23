import React, { useState, useEffect } from 'react';
import {
  FilePlus,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  User,
  Camera,
  Fingerprint,
  Eye,
  FileSignature,
  Sparkles,
  Stethoscope,
  UploadCloud,
  FileCheck
} from 'lucide-react';
import { submitCadaver, fetchCadavers, signCadaver, fetchDeadlines } from '../utils/api.js';
import MultiSigPad from './MultiSigPad.jsx';
import TimeStatusBadge from './TimeStatusBadge.jsx';
import TermTooltip from './TermTooltip.jsx';

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB

export default function CifvDashboard({ onOpenExplorer, onOpenDoctors }) {
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'queue'
  const [cadavers, setCadavers] = useState([]);
  const [deadlinesMap, setDeadlinesMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  // Multi-Sig Modal state
  const [signingModalOpen, setSigningModalOpen] = useState(false);
  const [selectedRecordForSign, setSelectedRecordForSign] = useState(null);

  // Auto-calculated live Hex ID preview
  const [previewHexId, setPreviewHexId] = useState('');

  // Form State matching all user requirements
  const [formData, setFormData] = useState({
    patientName: '',
    age: '',
    gender: 'Male',
    causeOfDeath: '',
    bodyCondition: 'Intact - Non-decomposed',
    deathDate: new Date().toISOString().split('T')[0],
    deathTime: '08:30',
    arrivalDate: new Date().toISOString().split('T')[0],
    arrivalTime: '09:15',
    otherMedicalTerms: '',

    // Biometrics
    faceImage: '',
    fingerprintDamaged: false,
    fingerprintDamageDetails: '',
    fingerprintImage: '',
    retinaDamaged: false,
    retinaDamageDetails: '',
    retinaImage: '',

    // Physical identifiers
    bloodGroup: 'O+',
    hairColor: 'Black',
    skinColor: 'Wheatish',
    identificationMarks: 'Mole on right cheek',

    // Family consent
    hasFamily: true,
    nokName: '',
    nokRelation: 'Spouse',
    nokContact: '',
    nokConsentSignature: '',
    nokThumbprint: '',
    unclaimedDetails: '',

    // Clinical viability & doctors
    verifyingDoctorsCount: '2',
    verifyingDoctorNames: 'Dr. Rajesh Sharma (CIFV-DOC-101), Dr. Ananya Iyer (CIFV-DOC-102)',
    isAppropriateForHarvesting: true,
    harvestAppropriatenessNotes: 'No major trauma to vital organs. Immediate cold preservation viable.',
    isContaminatedDisease: false,
    diseaseChecklist: ['HIV Negative', 'HBsAg Negative', 'HCV Negative', 'VDRL Non-reactive'],
    additionalObservations: 'Cornea and kidneys evaluated as prime harvest candidates.'
  });

  useEffect(() => {
    loadCadavers();
    generateLiveHexPreview();
  }, []);

  function generateLiveHexPreview() {
    const chars = '0123456789ABCDEF';
    let hex = '0x';
    for (let i = 0; i < 8; i++) {
      hex += chars[Math.floor(Math.random() * 16)];
    }
    setPreviewHexId(hex);
  }

  async function loadCadavers() {
    setLoading(true);
    try {
      const [res, dRes] = await Promise.all([
        fetchCadavers(),
        fetchDeadlines()
      ]);
      if (res.success) {
        setCadavers(res.cadavers);
      }
      if (dRes && dRes.success && Array.isArray(dRes.deadlines)) {
        const map = {};
        dRes.deadlines.forEach(item => {
          const key = item.recordId || item.hexId || item.organId;
          if (key) map[key] = item;
        });
        setDeadlinesMap(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Handle simulated image upload (convert to Data URL with inline 4MB validation)
  function handleImageUpload(field, e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setMessage({
        type: 'error',
        text: `File "${file.name}" exceeds the 4 MB upload limit. Please select a smaller image.`
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, [field]: reader.result }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmitIntake(e) {
    e.preventDefault();
    if (!formData.patientName.trim()) {
      setMessage({
        type: 'error',
        text: 'Please enter the Full Name of the deceased donor before submitting.'
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await submitCadaver({
        ...formData,
        submittedBy: 'CIFV_REGISTRATION_DESK'
      });

      if (res.success) {
        setMessage({
          type: 'success',
          text: `Donor intake dossier recorded (Hex ID: ${res.cadaver.hexId}). Proceed to collect 2 required approvals out of 3 specialists in the queue.`
        });
        await loadCadavers();
        setActiveTab('queue');
        generateLiveHexPreview();
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to submit intake dossier.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error connecting to consortium ledger.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExecuteSign({ doctorId, pin }) {
    if (!selectedRecordForSign) return;
    const res = await signCadaver(selectedRecordForSign.hexId, doctorId, pin);
    if (res.success) {
      const updatedRes = await fetchCadavers();
      if (updatedRes.success) {
        setCadavers(updatedRes.cadavers);
        const refreshed = updatedRes.cadavers.find(c => c.hexId === selectedRecordForSign.hexId);
        if (refreshed) {
          setSelectedRecordForSign(refreshed);
        }
      }
      setMessage({
        type: 'success',
        text: res.message + (res.isFullyVerified ? ' Record sealed on the blockchain!' : '')
      });
    } else {
      throw new Error(res.error || 'Signing failed');
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Department Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-100 border border-cyan-200 text-3xl flex items-center justify-center">
            🏥
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Donor Intake &amp; Consent Wing
              </h2>
              <TermTooltip term="CIFV" />
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Deceased donor registration, forensic physical examination, biometric records, and <strong>2 required approvals out of 3 specialists</strong> (<TermTooltip term="2-of-3 Multi-Sig" />).
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'new'}
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'new'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <FilePlus className="w-4 h-4" />
            New Donor Intake Form
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'queue'}
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Approval Queue ({cadavers.length})
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

      {/* TAB 1: NEW CADAVER INTAKE FORM */}
      {activeTab === 'new' && (
        <form onSubmit={handleSubmitIntake} className="space-y-6">
          {/* Autogenerated Hex ID Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-sky-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-cyan-400" />
              <div>
                <span className="text-xs uppercase tracking-wider text-cyan-300 font-mono block">
                  AUTOGENERATED DONOR RECORD ID
                </span>
                <span className="text-xl md:text-2xl font-mono font-bold tracking-widest text-white">
                  {previewHexId}
                </span>
              </div>
            </div>
            <span className="text-xs text-slate-200 max-w-xs text-right hidden sm:block">
              Tamper-proof hexadecimal identifier assigned to this donor dossier.
            </span>
          </div>

          {/* Section 1: Demographics & Chronology */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-700" />
              1. Donor Demographics &amp; Death Chronology
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="cifv-patient-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Name of Deceased Donor *
                </label>
                <input
                  id="cifv-patient-name"
                  type="text"
                  required
                  value={formData.patientName}
                  onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                  placeholder="e.g. Ramesh Kumar (or Unidentified Doe)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-cyan-600 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="cifv-age" className="block text-xs font-semibold text-slate-700 mb-1">
                  Estimated / Confirmed Age *
                </label>
                <input
                  id="cifv-age"
                  type="number"
                  required
                  value={formData.age}
                  onChange={e => setFormData({ ...formData, age: e.target.value })}
                  placeholder="e.g. 42"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-cyan-600 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="cifv-gender" className="block text-xs font-semibold text-slate-700 mb-1">
                  Biological Sex *
                </label>
                <select
                  id="cifv-gender"
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-cyan-600 focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other / Indeterminate</option>
                </select>
              </div>

              <div>
                <label htmlFor="cifv-blood-group" className="block text-xs font-semibold text-slate-700 mb-1">
                  Blood Group *
                </label>
                <select
                  id="cifv-blood-group"
                  value={formData.bloodGroup}
                  onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-cyan-600 focus:outline-none"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div>
                <label htmlFor="cifv-death-date" className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Death *
                </label>
                <input
                  id="cifv-death-date"
                  type="date"
                  required
                  value={formData.deathDate}
                  onChange={e => setFormData({ ...formData, deathDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="cifv-death-time" className="block text-xs font-semibold text-slate-700 mb-1">
                  Time of Death (24h) *
                </label>
                <input
                  id="cifv-death-time"
                  type="time"
                  required
                  value={formData.deathTime}
                  onChange={e => setFormData({ ...formData, deathTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="cifv-arrival-date" className="block text-xs font-semibold text-slate-700 mb-1">
                  Arrival Date at CIFV *
                </label>
                <input
                  id="cifv-arrival-date"
                  type="date"
                  required
                  value={formData.arrivalDate}
                  onChange={e => setFormData({ ...formData, arrivalDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="cifv-arrival-time" className="block text-xs font-semibold text-slate-700 mb-1">
                  Arrival Time at CIFV *
                </label>
                <input
                  id="cifv-arrival-time"
                  type="time"
                  required
                  value={formData.arrivalTime}
                  onChange={e => setFormData({ ...formData, arrivalTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label htmlFor="cifv-cause-of-death" className="block text-xs font-semibold text-slate-700 mb-1">
                  Certified Cause of Death *
                </label>
                <input
                  id="cifv-cause-of-death"
                  type="text"
                  required
                  value={formData.causeOfDeath}
                  onChange={e => setFormData({ ...formData, causeOfDeath: e.target.value })}
                  placeholder="e.g. Brain Death following Acute Subarachnoid Hemorrhage / RTA"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-cyan-600 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="cifv-body-condition" className="block text-xs font-semibold text-slate-700 mb-1">
                  Condition of the Body
                </label>
                <input
                  id="cifv-body-condition"
                  type="text"
                  value={formData.bodyCondition}
                  onChange={e => setFormData({ ...formData, bodyCondition: e.target.value })}
                  placeholder="e.g. Preserved in cold mortuary (4°C), No decomposition"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-cyan-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label htmlFor="cifv-hair-color" className="block text-xs font-semibold text-slate-700 mb-1">
                  Hair Colour
                </label>
                <input
                  id="cifv-hair-color"
                  type="text"
                  value={formData.hairColor}
                  onChange={e => setFormData({ ...formData, hairColor: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="cifv-skin-color" className="block text-xs font-semibold text-slate-700 mb-1">
                  Skin Colour / Complexion
                </label>
                <input
                  id="cifv-skin-color"
                  type="text"
                  value={formData.skinColor}
                  onChange={e => setFormData({ ...formData, skinColor: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="cifv-id-marks" className="block text-xs font-semibold text-slate-700 mb-1">
                  Unique Identification Marks (Moles / Scars / Tattoo)
                </label>
                <input
                  id="cifv-id-marks"
                  type="text"
                  value={formData.identificationMarks}
                  onChange={e => setFormData({ ...formData, identificationMarks: e.target.value })}
                  placeholder="e.g. 2cm scar on left forearm (or NA)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Multimodal Biometrics with Conditional Damage Bypasses */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
              <Camera className="w-4 h-4 text-cyan-700" />
              2. Forensic Biometric Verification &amp; Photographic Evidence
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Face Photo */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="cifv-face-upload" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-600" />
                    Facial Portrait Image
                  </label>
                  <span className="text-xs text-slate-600">JPG/PNG (≤ 4 MB)</span>
                </div>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 text-center bg-white hover:bg-slate-50 transition-colors">
                  {formData.faceImage ? (
                    <div className="relative">
                      <img
                        src={formData.faceImage}
                        alt="Donor facial portrait preview"
                        className="h-28 w-full object-cover rounded-lg mx-auto"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, faceImage: '' })}
                        aria-label="Remove facial portrait image"
                        className="absolute top-1 right-1 bg-rose-600 text-white rounded-full px-2 py-0.5 text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="cifv-face-upload"
                      className="cursor-pointer flex flex-col items-center gap-1 rounded-lg p-1 focus-within:ring-2 focus-within:ring-blue-600"
                    >
                      <input
                        id="cifv-face-upload"
                        type="file"
                        accept="image/*"
                        onChange={e => handleImageUpload('faceImage', e)}
                        className="sr-only peer"
                      />
                      <UploadCloud className="w-8 h-8 text-slate-500 peer-focus-visible:text-blue-600" />
                      <span className="text-xs text-blue-700 font-semibold">Upload Face Photo</span>
                      <span className="text-xs text-slate-600">Official mortuary portrait</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Fingerprint Module (Conditional Damage Handling) */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Fingerprint className="w-4 h-4 text-slate-600" />
                    Fingerprint Record
                  </span>
                  <span className="text-xs text-slate-600">Biometric Scan</span>
                </div>

                {/* Conditional Checkbox */}
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                  <label htmlFor="cifv-fingerprint-damaged" className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-950">
                    <input
                      id="cifv-fingerprint-damaged"
                      type="checkbox"
                      checked={formData.fingerprintDamaged}
                      onChange={e => setFormData({ ...formData, fingerprintDamaged: e.target.checked })}
                      className="rounded text-amber-700 focus:ring-amber-500"
                    />
                    Fingers Severed / Burned / Damaged
                  </label>
                </div>

                {formData.fingerprintDamaged ? (
                  <div>
                    <label htmlFor="cifv-fingerprint-damage-details" className="block text-xs font-semibold text-rose-800 mb-1">
                      Reason / Extent of Damage (Mandatory):
                    </label>
                    <textarea
                      id="cifv-fingerprint-damage-details"
                      rows={2}
                      value={formData.fingerprintDamageDetails}
                      onChange={e => setFormData({ ...formData, fingerprintDamageDetails: e.target.value })}
                      placeholder="e.g. Severe traumatic crush injury to both distal extremities..."
                      className="w-full px-2.5 py-1.5 bg-white border border-rose-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 text-center bg-white hover:bg-slate-50 transition-colors">
                    {formData.fingerprintImage ? (
                      <div className="relative">
                        <img
                          src={formData.fingerprintImage}
                          alt="Donor fingerprint scan preview"
                          className="h-28 w-full object-contain rounded-lg mx-auto"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, fingerprintImage: '' })}
                          aria-label="Remove fingerprint image"
                          className="absolute top-1 right-1 bg-rose-600 text-white rounded-full px-2 py-0.5 text-xs font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="cifv-fingerprint-upload"
                        className="cursor-pointer flex flex-col items-center gap-1 rounded-lg p-1 focus-within:ring-2 focus-within:ring-blue-600"
                      >
                        <input
                          id="cifv-fingerprint-upload"
                          type="file"
                          accept="image/*"
                          onChange={e => handleImageUpload('fingerprintImage', e)}
                          className="sr-only peer"
                        />
                        <UploadCloud className="w-8 h-8 text-slate-500 peer-focus-visible:text-blue-600" />
                        <span className="text-xs text-blue-700 font-semibold">Upload Fingerprint</span>
                        <span className="text-xs text-slate-600">10-digit ink or scanner slip</span>
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Eyes & Retina Module (Conditional Damage Handling) */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-slate-600" />
                    Eyes &amp; Retina Record
                  </span>
                  <span className="text-xs text-slate-600">Ocular Exam</span>
                </div>

                {/* Conditional Checkbox */}
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                  <label htmlFor="cifv-retina-damaged" className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-950">
                    <input
                      id="cifv-retina-damaged"
                      type="checkbox"
                      checked={formData.retinaDamaged}
                      onChange={e => setFormData({ ...formData, retinaDamaged: e.target.checked })}
                      className="rounded text-amber-700 focus:ring-amber-500"
                    />
                    Eyes / Cornea Traumatized / Damaged
                  </label>
                </div>

                {formData.retinaDamaged ? (
                  <div>
                    <label htmlFor="cifv-retina-damage-details" className="block text-xs font-semibold text-rose-800 mb-1">
                      Reason / Ocular Damage Details:
                    </label>
                    <textarea
                      id="cifv-retina-damage-details"
                      rows={2}
                      value={formData.retinaDamageDetails}
                      onChange={e => setFormData({ ...formData, retinaDamageDetails: e.target.value })}
                      placeholder="e.g. Corneal laceration and bilateral subconjunctival hemorrhage..."
                      className="w-full px-2.5 py-1.5 bg-white border border-rose-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 text-center bg-white hover:bg-slate-50 transition-colors">
                    {formData.retinaImage ? (
                      <div className="relative">
                        <img
                          src={formData.retinaImage}
                          alt="Donor retinal scan preview"
                          className="h-28 w-full object-contain rounded-lg mx-auto"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, retinaImage: '' })}
                          aria-label="Remove retinal image"
                          className="absolute top-1 right-1 bg-rose-600 text-white rounded-full px-2 py-0.5 text-xs font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="cifv-retina-upload"
                        className="cursor-pointer flex flex-col items-center gap-1 rounded-lg p-1 focus-within:ring-2 focus-within:ring-blue-600"
                      >
                        <input
                          id="cifv-retina-upload"
                          type="file"
                          accept="image/*"
                          onChange={e => handleImageUpload('retinaImage', e)}
                          className="sr-only peer"
                        />
                        <UploadCloud className="w-8 h-8 text-slate-500 peer-focus-visible:text-blue-600" />
                        <span className="text-xs text-blue-700 font-semibold">Upload Retinal Photo</span>
                        <span className="text-xs text-slate-600">Slit lamp or fundus photo</span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Legal & Family Consent */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-cyan-700" />
              3. Family Approval &amp; Legal Authorization
            </h3>

            <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Next of Kin / Family Present?</span>
              <label htmlFor="cifv-family-yes" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  id="cifv-family-yes"
                  type="radio"
                  name="familyCheck"
                  checked={formData.hasFamily === true}
                  onChange={() => setFormData({ ...formData, hasFamily: true })}
                />
                Yes (Family Consent)
              </label>
              <label htmlFor="cifv-family-no" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  id="cifv-family-no"
                  type="radio"
                  name="familyCheck"
                  checked={formData.hasFamily === false}
                  onChange={() => setFormData({ ...formData, hasFamily: false })}
                />
                No (Unclaimed / Police Inquest Handover)
              </label>
            </div>

            {formData.hasFamily ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label htmlFor="cifv-nok-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Next of Kin Full Name *
                  </label>
                  <input
                    id="cifv-nok-name"
                    type="text"
                    value={formData.nokName}
                    onChange={e => setFormData({ ...formData, nokName: e.target.value })}
                    placeholder="e.g. Smt. Sunita Kumar"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="cifv-nok-relation" className="block text-xs font-semibold text-slate-700 mb-1">
                    Relationship with Deceased
                  </label>
                  <input
                    id="cifv-nok-relation"
                    type="text"
                    value={formData.nokRelation}
                    onChange={e => setFormData({ ...formData, nokRelation: e.target.value })}
                    placeholder="e.g. Spouse / Sibling / Parent"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="cifv-nok-contact" className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    id="cifv-nok-contact"
                    type="text"
                    value={formData.nokContact}
                    onChange={e => setFormData({ ...formData, nokContact: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <label htmlFor="cifv-unclaimed-details" className="block text-xs font-semibold text-rose-800 mb-1">
                  How was the Body Received? (Police Inquest / Magistrate Clearance Mandatory)
                </label>
                <textarea
                  id="cifv-unclaimed-details"
                  rows={2}
                  value={formData.unclaimedDetails}
                  onChange={e => setFormData({ ...formData, unclaimedDetails: e.target.value })}
                  placeholder="e.g. Received via Sector 4 Police Station, Inquest Report No. 492/2026, Magistrate Order dated..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Section 4: Clinical Viability & Infectious Disease Screen */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-cyan-700" />
              4. Clinical Viability Assessment &amp; Infectious Screening
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Is the Donor Clinically Eligible for Organ Recovery?
                </span>
                <div className="flex flex-wrap gap-4">
                  <label htmlFor="cifv-harvest-yes" className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 cursor-pointer">
                    <input
                      id="cifv-harvest-yes"
                      type="radio"
                      name="harvestAppropriate"
                      checked={formData.isAppropriateForHarvesting === true}
                      onChange={() => setFormData({ ...formData, isAppropriateForHarvesting: true })}
                    />
                    Yes (Cleared for Recovery)
                  </label>
                  <label htmlFor="cifv-harvest-no" className="flex items-center gap-1.5 text-xs font-semibold text-rose-800 cursor-pointer">
                    <input
                      id="cifv-harvest-no"
                      type="radio"
                      name="harvestAppropriate"
                      checked={formData.isAppropriateForHarvesting === false}
                      onChange={() => setFormData({ ...formData, isAppropriateForHarvesting: false })}
                    />
                    No (Not Eligible / Contraindicated)
                  </label>
                </div>
                <label htmlFor="cifv-harvest-notes" className="sr-only">
                  Clinical notes on organ preservation suitability
                </label>
                <input
                  id="cifv-harvest-notes"
                  type="text"
                  value={formData.harvestAppropriatenessNotes}
                  onChange={e => setFormData({ ...formData, harvestAppropriatenessNotes: e.target.value })}
                  placeholder="Clinical notes on organ preservation suitability"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none mt-2"
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Infectious Disease Screening Status
                </span>
                <div className="flex flex-wrap gap-4">
                  <label htmlFor="cifv-contam-no" className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 cursor-pointer">
                    <input
                      id="cifv-contam-no"
                      type="radio"
                      name="contamCheck"
                      checked={formData.isContaminatedDisease === false}
                      onChange={() => setFormData({ ...formData, isContaminatedDisease: false })}
                    />
                    No (Infection Screen Negative)
                  </label>
                  <label htmlFor="cifv-contam-yes" className="flex items-center gap-1.5 text-xs font-semibold text-rose-800 cursor-pointer">
                    <input
                      id="cifv-contam-yes"
                      type="radio"
                      name="contamCheck"
                      checked={formData.isContaminatedDisease === true}
                      onChange={() => setFormData({ ...formData, isContaminatedDisease: true })}
                    />
                    Yes (Contaminated / Sepsis)
                  </label>
                </div>
                <p className="text-xs text-slate-600">
                  Screened: HIV-1/2, Hepatitis B, Hepatitis C, Syphilis, SARS-CoV-2.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label htmlFor="cifv-verifying-doctors" className="block text-xs font-semibold text-slate-700 mb-1">
                  Verifying Medical Officers (Names and IDs) *
                </label>
                <input
                  id="cifv-verifying-doctors"
                  type="text"
                  required
                  value={formData.verifyingDoctorNames}
                  onChange={e => setFormData({ ...formData, verifyingDoctorNames: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="cifv-additional-observations" className="block text-xs font-semibold text-slate-700 mb-1">
                  Other Clinical / Forensic Observations
                </label>
                <input
                  id="cifv-additional-observations"
                  type="text"
                  value={formData.additionalObservations}
                  onChange={e => setFormData({ ...formData, additionalObservations: e.target.value })}
                  placeholder="Additional remarks on donor tissue health..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="py-3 px-6 bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-800 hover:to-blue-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <FileCheck className="w-4 h-4" />
              {submitting ? 'Registering to Consortium...' : 'Register Donor Dossier & Generate Record'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: VERIFICATION QUEUE & 2-OF-3 MULTI-SIG */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-slate-700">
              Showing all <strong>{cadavers.length}</strong> donor intake records on the CIFV ledger.
            </span>
            <span className="text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full font-semibold border border-amber-300">
              Mandatory Rule: 2 required approvals out of 3 specialists for surgical clearance.
            </span>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-600 text-xs">Loading records...</div>
          ) : cadavers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-2">
              <span className="text-3xl">📭</span>
              <p className="text-sm font-bold text-slate-700">No donor records registered yet.</p>
              <p className="text-xs text-slate-600">
                Click &ldquo;New Donor Intake Form&rdquo; to register a deceased donor.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cadavers.map(cad => {
                const isVerified = cad.status === 'VERIFIED_FOR_EXTRACTION';
                const sigCount = cad.signatures ? cad.signatures.length : 0;
                const deadlineEntry = deadlinesMap[cad.hexId] || cad.deadlineStatus || null;
                const startIso = cad.arrivalDate && cad.arrivalTime
                  ? `${cad.arrivalDate}T${cad.arrivalTime}`
                  : cad.createdAt;

                return (
                  <div
                    key={cad.hexId}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                  >
                    <div>
                      {/* Top Bar: Hex ID, TimeStatusBadge & Status */}
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
                          <span
                            className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                              isVerified
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            {isVerified ? 'APPROVED (ON-CHAIN)' : `${sigCount} OF 2 REQUIRED APPROVALS`}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-base font-bold text-slate-900">
                        {cad.patientName} ({cad.age}y, {cad.gender})
                      </h4>
                      <p className="text-xs text-slate-700 mt-1">
                        <span className="font-semibold text-slate-800">Cause:</span> {cad.causeOfDeath}
                      </p>

                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                        <div>
                          <span>Blood: </span>
                          <strong className="text-slate-900 font-mono">{cad.bloodGroup}</strong>
                        </div>
                        <div>
                          <span>Death: </span>
                          <strong className="text-slate-900">{cad.deathDate}</strong>
                        </div>
                        <div>
                          <span>Eligibility: </span>
                          <strong className={cad.isAppropriateForHarvesting ? 'text-emerald-700' : 'text-rose-700'}>
                            {cad.isAppropriateForHarvesting ? 'Cleared' : 'Contraindicated'}
                          </strong>
                        </div>
                        <div>
                          <span>Infection: </span>
                          <strong className={cad.isContaminatedDisease ? 'text-rose-700' : 'text-emerald-700'}>
                            {cad.isContaminatedDisease ? 'Positive' : 'Negative'}
                          </strong>
                        </div>
                      </div>

                      {/* Signatures Progress */}
                      <div className="mt-3 space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-700 font-semibold">Specialist Approvals:</span>
                          <span className="font-mono font-bold text-blue-800">
                            {sigCount} of 2 required approvals (out of 3 specialists)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${sigCount >= 2 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(100, (sigCount / 2) * 100)}%` }}
                          ></div>
                        </div>

                        {cad.signatures && cad.signatures.length > 0 && (
                          <div className="pt-1.5 space-y-1">
                            {cad.signatures.map((s, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex justify-between"
                              >
                                <span className="font-medium">✓ {s.doctorName}</span>
                                <span className="font-mono text-emerald-700">{s.doctorId}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-600 font-mono">
                        Hash: {cad.blockchainHash ? cad.blockchainHash.substring(0, 12) + '...' : ''}
                      </span>

                      {!isVerified && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRecordForSign(cad);
                            setSigningModalOpen(true);
                          }}
                          className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <FileSignature className="w-3.5 h-3.5" />
                          <span>Approve Record ({sigCount}/2)</span>
                        </button>
                      )}

                      {isVerified && (
                        <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Cleared for Surgical Recovery
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
      {selectedRecordForSign && (
        <MultiSigPad
          isOpen={signingModalOpen}
          onClose={() => {
            setSigningModalOpen(false);
            setSelectedRecordForSign(null);
          }}
          department="CIFV"
          recordId={selectedRecordForSign.hexId}
          recordTitle={`${selectedRecordForSign.patientName} (${selectedRecordForSign.bloodGroup})`}
          existingSignatures={selectedRecordForSign.signatures || []}
          onSignSubmit={handleExecuteSign}
        />
      )}
    </div>
  );
}

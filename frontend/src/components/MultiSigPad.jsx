import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, KeyRound, AlertCircle, Shield, Stamp } from 'lucide-react';
import Captcha from './Captcha.jsx';
import { fetchCaptcha, fetchDoctors } from '../utils/api.js';

export default function MultiSigPad({
  isOpen,
  onClose,
  department = 'CIFV', // 'CIFV' or 'SROPS'
  recordId,
  recordTitle,
  existingSignatures = [],
  onSignSubmit
}) {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [pin, setPin] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaData, setCaptchaData] = useState({ id: '', code: '' });
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setPin('');
      setCaptchaInput('');
      loadDoctors();
      loadCaptcha();
    }
  }, [isOpen, department]);

  async function loadDoctors() {
    try {
      const res = await fetchDoctors(department);
      if (res.success) {
        setDoctors(res.doctors);
        if (res.doctors.length > 0) {
          // Select first doctor that hasn't signed yet
          const unSigned = res.doctors.find(d => !existingSignatures.some(s => s.doctorId === d.id));
          setSelectedDoctorId(unSigned ? unSigned.id : res.doctors[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load department doctors:', err);
    }
  }

  async function loadCaptcha() {
    setLoadingCaptcha(true);
    try {
      const res = await fetchCaptcha();
      if (res.success) {
        setCaptchaData({ id: res.captchaId, code: res.captchaCode });
      }
    } catch (err) {
      console.error('Failed to load captcha:', err);
    } finally {
      setLoadingCaptcha(false);
    }
  }

  const alreadySignedCount = existingSignatures.length;
  const isThresholdMet = alreadySignedCount >= 2;

  async function handleSign(e) {
    e.preventDefault();
    setError('');

    if (!selectedDoctorId) {
      setError('Please select an authorized specialist.');
      return;
    }
    if (!pin) {
      setError('Please enter the Specialist Security PIN.');
      return;
    }
    if (!captchaInput.trim()) {
      setError('Please solve and enter the security captcha.');
      return;
    }

    setSubmitting(true);
    try {
      await onSignSubmit({
        doctorId: selectedDoctorId,
        pin,
        captchaId: captchaData.id,
        captchaInput
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Cryptographic signing failed.');
      loadCaptcha();
      setCaptchaInput('');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-sky-900 px-6 py-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/50 flex items-center justify-center text-lg ring-1 ring-white/20">
              <Stamp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">Consortium Multi-Signature Pad</h3>
              <p className="text-xs text-slate-300">
                Mandatory 2-of-3 Specialist Cryptographic Certification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Target Record Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
            <span className="text-slate-500 block">Record Target:</span>
            <span className="font-bold text-slate-800 text-sm font-mono block">{recordId}</span>
            <span className="text-slate-600 block mt-0.5">{recordTitle}</span>
          </div>

          {/* Current Signatures Status Progress */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700">Digital Signatures Collected:</span>
              <span className={`font-mono font-bold ${isThresholdMet ? 'text-emerald-600' : 'text-amber-600'}`}>
                {alreadySignedCount} of 3 Signatures ({isThresholdMet ? 'Consensus Approved' : 'Pending 2-of-3'})
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  alreadySignedCount >= 2 ? 'bg-emerald-500' : alreadySignedCount === 1 ? 'bg-amber-500' : 'bg-slate-300'
                }`}
                style={{ width: `${(alreadySignedCount / 3) * 100}%` }}
              ></div>
            </div>

            {/* List existing signatures */}
            {existingSignatures.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                {existingSignatures.map((sig, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold">{sig.doctorName}</span>
                      <span className="text-slate-500 font-mono text-[10px]">({sig.doctorId})</span>
                    </div>
                    <span className="font-mono text-[10px] text-emerald-700">
                      Hash: {sig.signatureHash ? sig.signatureHash.substring(0, 10) + '...' : 'Verified'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Signer Form */}
          <form onSubmit={handleSign} className="space-y-4 pt-2 border-t border-slate-200">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Signing Specialist ({department})
              </label>
              <select
                value={selectedDoctorId}
                onChange={e => setSelectedDoctorId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {doctors.map(doc => {
                  const hasSigned = existingSignatures.some(s => s.doctorId === doc.id);
                  return (
                    <option key={doc.id} value={doc.id} disabled={hasSigned}>
                      {doc.name} ({doc.id}) - {doc.role} {hasSigned ? '[ALREADY SIGNED]' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Specialist Security PIN
                </label>
                <span className="text-[11px] text-blue-600 font-medium">
                  {doctors.find(d => d.id === selectedDoctorId)
                    ? `Default PIN: ${doctors.find(d => d.id === selectedDoctorId).pin}`
                    : ''}
                </span>
              </div>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Enter 4-digit PIN"
                maxLength={6}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>

            {/* Captcha */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Security Captcha Verification
              </label>
              <div className="flex items-center gap-3">
                <Captcha
                  code={captchaData.code}
                  onRefresh={loadCaptcha}
                  loading={loadingCaptcha}
                />
                <input
                  type="text"
                  value={captchaInput}
                  onChange={e => setCaptchaInput(e.target.value)}
                  placeholder="Enter code"
                  maxLength={6}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono tracking-widest text-center uppercase"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Stamp className="w-4 h-4" />
              {submitting ? 'Computing Cryptographic Signature...' : 'Apply Digital Signature & Broadcast'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

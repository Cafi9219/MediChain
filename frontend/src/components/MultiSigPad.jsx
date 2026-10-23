import React, { useState, useEffect, useId } from 'react';
import { X, CheckCircle2, Clock, AlertCircle, Stamp, Key } from 'lucide-react';
import { fetchDoctors } from '../utils/api.js';
import TermTooltip from './TermTooltip.jsx';

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
  const [localSignatures, setLocalSignatures] = useState(existingSignatures);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [stepNotice, setStepNotice] = useState('');

  const pinInputId = useId();
  const titleId = useId();

  useEffect(() => {
    setLocalSignatures(existingSignatures || []);
  }, [existingSignatures, recordId]);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setStepNotice('');
      setPin('');
      loadDoctors(existingSignatures || []);
    }
  }, [isOpen, department, recordId]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  async function loadDoctors(currentSigs) {
    try {
      const res = await fetchDoctors(department);
      if (res.success) {
        setDoctors(res.doctors);
        if (res.doctors.length > 0) {
          const unSigned = res.doctors.find(
            d => !currentSigs.some(s => s.doctorId === d.id)
          );
          setSelectedDoctorId(unSigned ? unSigned.id : res.doctors[0].id);
        }
      }
    } catch (err) {
      setError('Unable to load department specialists.');
    }
  }

  const alreadySignedCount = localSignatures.length;
  const isThresholdMet = alreadySignedCount >= 2;
  const progressPercent = Math.min(100, Math.round((alreadySignedCount / 2) * 100));

  function getProgressLabel() {
    if (alreadySignedCount === 0) {
      return '0 of 2 required approvals (out of 3 specialists)';
    }
    if (alreadySignedCount === 1) {
      return '1 of 2 required approvals (out of 3 specialists)';
    }
    return '2 required approvals collected (out of 3 specialists)';
  }

  async function handleSign(e) {
    e.preventDefault();
    setError('');
    setStepNotice('');

    if (!selectedDoctorId) {
      setError('Please select a pending specialist card above.');
      return;
    }
    if (localSignatures.some(s => s.doctorId === selectedDoctorId)) {
      setError('This specialist has already signed this record. Please select a pending specialist.');
      return;
    }
    if (!pin.trim()) {
      setError('Please enter the Specialist Security PIN.');
      return;
    }

    setSubmitting(true);
    try {
      await onSignSubmit({
        doctorId: selectedDoctorId,
        pin
      });

      const signedDoc = doctors.find(d => d.id === selectedDoctorId);
      const updatedSigs = [
        ...localSignatures,
        {
          doctorId: selectedDoctorId,
          doctorName: signedDoc ? signedDoc.name : selectedDoctorId,
          role: signedDoc ? signedDoc.role : '',
          timestamp: new Date().toISOString()
        }
      ];
      setLocalSignatures(updatedSigs);
      setPin('');

      if (updatedSigs.length >= 2) {
        onClose();
      } else {
        const nextUnsigned = doctors.find(
          d => !updatedSigs.some(s => s.doctorId === d.id)
        );
        if (nextUnsigned) {
          setSelectedDoctorId(nextUnsigned.id);
        }
        setStepNotice(
          `1 of 2 required approvals recorded (${
            signedDoc ? signedDoc.name : selectedDoctorId
          }). Select the 2nd specialist below to seal this record.`
        );
      }
    } catch (err) {
      setError(err.message || 'Digital signature verification failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-sky-900 px-6 py-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/50 flex items-center justify-center text-lg ring-1 ring-white/20">
              <Stamp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 id={titleId} className="font-bold text-base flex items-center gap-1.5">
                <span>Specialist Approval & Digital Signature</span>
                <TermTooltip
                  dark
                  technicalTerm="2-of-3 Threshold Multi-Signature (HMAC-SHA256)"
                  description="Requires 2 required approvals out of 3 specialists in the department to mine and seal the block."
                />
              </h3>
              <p className="text-xs text-slate-200">
                Rule: 2 required approvals out of 3 specialists
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close approval modal"
            className="p-2 rounded-lg hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Target Record Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-slate-600 font-medium block">Target Record:</span>
              <span className="font-bold text-slate-900 text-sm font-mono block">
                {recordId}
              </span>
              <span className="text-slate-700 block mt-0.5">{recordTitle}</span>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 self-start sm:self-center">
              Dept: {department}
            </span>
          </div>

          {/* Current Approvals Progress */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
              <span className="font-bold text-slate-800">Approval Progress:</span>
              <span
                className={`font-mono font-bold ${
                  isThresholdMet ? 'text-emerald-700' : 'text-amber-800'
                }`}
              >
                {getProgressLabel()}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={alreadySignedCount}
              aria-valuemin={0}
              aria-valuemax={2}
              aria-label={getProgressLabel()}
              className="w-full h-3 bg-slate-200 rounded-full overflow-hidden"
            >
              <div
                className={`h-full transition-all duration-300 ${
                  isThresholdMet
                    ? 'bg-emerald-600'
                    : alreadySignedCount === 1
                    ? 'bg-amber-500'
                    : 'bg-slate-300'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* All 3 Department Specialists listed as Signed / Pending cards */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-800">
              Department Specialists (Select a Pending Specialist to Sign):
            </span>
            <div className="grid grid-cols-1 gap-2.5">
              {doctors.map(doc => {
                const sigRecord = localSignatures.find(s => s.doctorId === doc.id);
                const hasSigned = Boolean(sigRecord);
                const isSelected = !hasSigned && selectedDoctorId === doc.id;

                return (
                  <button
                    key={doc.id}
                    type="button"
                    disabled={hasSigned}
                    onClick={() => {
                      setSelectedDoctorId(doc.id);
                      setError('');
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      hasSigned
                        ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 cursor-default'
                        : isSelected
                        ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/30 shadow-sm cursor-pointer'
                        : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 cursor-pointer'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {doc.name}
                        </span>
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                          {doc.department}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-0.5">
                        {doc.role}
                      </p>
                      <p className="text-xs text-slate-600 font-mono mt-1 flex items-center gap-1 truncate">
                        <Key className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>Public Key: {doc.publicKey || 'Registered'}</span>
                      </p>
                    </div>

                    <div className="shrink-0">
                      {hasSigned ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          Signed
                        </span>
                      ) : isSelected ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 text-white text-xs font-bold shadow-sm">
                          <Clock className="w-3.5 h-3.5" />
                          Pending • Selected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300 text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          Pending
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step Notice Toast */}
          {stepNotice && (
            <div
              role="status"
              className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-start gap-2 font-medium"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>{stepNotice}</span>
            </div>
          )}

          {/* Signer PIN Form */}
          <form onSubmit={handleSign} className="space-y-4 pt-3 border-t border-slate-200">
            {error && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-start gap-2 font-medium"
              >
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label
                htmlFor={pinInputId}
                className="block text-sm font-semibold text-slate-800 mb-1.5"
              >
                Security PIN for{' '}
                <span className="text-blue-800">
                  {selectedDoctor ? selectedDoctor.name : 'Selected Specialist'}
                </span>{' '}
                *
              </label>
              <input
                id={pinInputId}
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Enter 4-digit specialist PIN"
                maxLength={6}
                autoComplete="off"
                className="w-full min-h-[42px] px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || isThresholdMet}
              className="w-full min-h-[44px] py-2.5 px-4 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white rounded-xl text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Stamp className="w-4 h-4" />
              {submitting
                ? 'Recording Specialist Approval...'
                : alreadySignedCount === 0
                ? 'Record 1st Approval (1 of 2 required approvals)'
                : 'Record 2nd Approval & Seal on Blockchain'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

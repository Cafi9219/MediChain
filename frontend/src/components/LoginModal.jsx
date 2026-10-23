import React, { useState, useEffect } from 'react';
import { X, Lock, Shield, AlertCircle } from 'lucide-react';
import Captcha from './Captcha.jsx';
import TermTooltip from './TermTooltip.jsx';
import { fetchCaptcha, loginDepartment } from '../utils/api.js';

export default function LoginModal({ isOpen, onClose, selectedDept, onLoginSuccess }) {
  const [departmentId, setDepartmentId] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaData, setCaptchaData] = useState({ id: '', code: '' });
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill department ID only (never expose or store passwords in the UI)
  const deptIds = {
    CIFV: { id: 'DEPT_CIFV', label: 'Donor Intake (CIFV)' },
    SROPS: { id: 'DEPT_SROPS', label: 'Surgical Recovery (SROPS)' },
    ADMIN: { id: 'DEPT_ADMIN', label: 'Oversight Board (CTORB)' }
  };

  useEffect(() => {
    if (isOpen) {
      setError('');
      setPassword('');
      setCaptchaInput('');
      loadCaptcha();
      if (selectedDept && deptIds[selectedDept.role]) {
        setDepartmentId(deptIds[selectedDept.role].id);
      }
    }
  }, [isOpen, selectedDept]);

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!departmentId.trim()) {
      setError('Please enter Department Medical ID.');
      return;
    }
    if (!password) {
      setError('Please enter Department Access Password.');
      return;
    }
    if (!captchaInput.trim()) {
      setError('Please enter the security captcha code.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await loginDepartment(departmentId, password, captchaData.id, captchaInput);
      if (res.success) {
        onLoginSuccess(res.department);
        onClose();
      } else {
        setError(res.error || 'Authentication failed.');
        loadCaptcha();
        setCaptchaInput('');
      }
    } catch (err) {
      setError('Network error connecting to consortium server.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const deptHeading = selectedDept
    ? (selectedDept.title || selectedDept.name || 'Authorized Consortium Node Access')
    : 'Authorized Consortium Node Access';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-sky-900 px-6 py-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/50 flex items-center justify-center text-lg ring-1 ring-white/20">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 id="login-modal-title" className="font-bold text-base">
                Department Portal Sign-In
              </h3>
              <p className="text-xs text-slate-200">
                {deptHeading}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign-in modal"
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2 font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Department Quick-Select Pills (fills Department ID only) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 font-semibold">Select Department ID:</span>
              {selectedDept?.abbr && <TermTooltip term={selectedDept.abbr} />}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(deptIds).map(([roleKey, cfg]) => {
                const isSelected = departmentId === cfg.id;
                return (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => {
                      setDepartmentId(cfg.id);
                      setError('');
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {roleKey === 'ADMIN' ? 'CTORB' : roleKey}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="login-dept-id" className="block text-xs font-semibold text-slate-700 mb-1">
              Department Medical ID
            </label>
            <input
              id="login-dept-id"
              type="text"
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              placeholder="e.g. DEPT_CIFV"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="login-dept-password" className="block text-xs font-semibold text-slate-700 mb-1">
              Department Access Password
            </label>
            <input
              id="login-dept-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter department password"
              autoComplete="current-password"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900"
            />
          </div>

          {/* Captcha Section */}
          <div className="pt-1">
            <label htmlFor="login-captcha-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Security Verification Code
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Captcha
                code={captchaData.code}
                onRefresh={loadCaptcha}
                loading={loadingCaptcha}
              />
              <input
                id="login-captcha-input"
                type="text"
                value={captchaInput}
                onChange={e => setCaptchaInput(e.target.value)}
                placeholder="Enter 5-char code"
                maxLength={6}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono tracking-widest text-center uppercase text-slate-900"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-gradient-to-r from-blue-700 to-sky-700 hover:from-blue-800 hover:to-sky-800 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>Verifying Department Credentials...</>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Sign In to Department Portal
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

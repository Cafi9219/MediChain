import React, { useState, useEffect } from 'react';
import { X, Lock, Shield, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import Captcha from './Captcha.jsx';
import { fetchCaptcha, loginDepartment } from '../utils/api.js';

export default function LoginModal({ isOpen, onClose, selectedDept, onLoginSuccess }) {
  const [departmentId, setDepartmentId] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaData, setCaptchaData] = useState({ id: '', code: '' });
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Default credentials mapping for quick fill
  const defaults = {
    CIFV: { id: 'DEPT_CIFV', pass: 'Pass@cifv2026' },
    SROPS: { id: 'DEPT_SROPS', pass: 'Pass@srops2026' },
    ADMIN: { id: 'DEPT_ADMIN', pass: 'Pass@admin2026' }
  };

  useEffect(() => {
    if (isOpen) {
      setError('');
      setCaptchaInput('');
      loadCaptcha();
      if (selectedDept && defaults[selectedDept.role]) {
        setDepartmentId(defaults[selectedDept.role].id);
        setPassword(defaults[selectedDept.role].pass);
      }
    }
  }, [isOpen, selectedDept]);

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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-sky-900 px-6 py-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/50 flex items-center justify-center text-lg ring-1 ring-white/20">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">Department Portal Login</h3>
              <p className="text-xs text-slate-300">
                {selectedDept ? selectedDept.name : 'Authorized Consortium Node Access'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick autofill helper for professors / reviewers */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs flex items-center justify-between">
            <span className="text-slate-600 font-medium">Demo Credentials:</span>
            <button
              type="button"
              onClick={() => {
                if (selectedDept && defaults[selectedDept.role]) {
                  setDepartmentId(defaults[selectedDept.role].id);
                  setPassword(defaults[selectedDept.role].pass);
                }
              }}
              className="text-blue-600 hover:text-blue-700 font-semibold underline text-[11px]"
            >
              Fill Default Credentials
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department Medical ID
            </label>
            <input
              type="text"
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              placeholder="e.g. DEPT_CIFV"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department Access Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Captcha Section */}
          <div className="pt-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Security Captcha Verification
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Captcha
                code={captchaData.code}
                onRefresh={loadCaptcha}
                loading={loadingCaptcha}
              />
              <input
                type="text"
                value={captchaInput}
                onChange={e => setCaptchaInput(e.target.value)}
                placeholder="Enter 5-digit code"
                maxLength={6}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono tracking-widest text-center uppercase"
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
                <>Verifying Consortium Credentials...</>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Authenticate to Department Node
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

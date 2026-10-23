import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Lock,
  Smartphone,
  AlertTriangle,
  Blocks,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import TermTooltip from './TermTooltip.jsx';

export default function VtopLanding({ onSelectDepartment, onOpenExplorer, onOpenDoctors, blockHeight }) {
  const [showExternalWarning, setShowExternalWarning] = useState(false);

  useEffect(() => {
    if (!showExternalWarning) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setShowExternalWarning(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showExternalWarning]);

  const departments = [
    {
      id: 'DEPT_CIFV',
      role: 'CIFV',
      title: 'Donor Intake & Consent Wing',
      subtitle: 'Medical Fitness, Consent & Forensic Clearance',
      abbr: 'CIFV',
      icon: '🏥',
      color: 'border-cyan-500 hover:border-cyan-600',
      btnColor: 'bg-cyan-700 hover:bg-cyan-800',
      description: 'Register deceased donors, upload medical & family consent documents, and collect 2 required approvals out of 3 specialists.'
    },
    {
      id: 'DEPT_SROPS',
      role: 'SROPS',
      title: 'Surgical Organ Recovery Suite',
      subtitle: 'Organ Retrieval, Preservation & Viability',
      abbr: 'SROPS',
      icon: '🫀',
      color: 'border-amber-500 hover:border-amber-600',
      btnColor: 'bg-amber-600 hover:bg-amber-700',
      description: 'Record recovered organs, cold preservation details, and clamp times with 2 required approvals out of 3 surgical specialists.'
    },
    {
      id: 'DEPT_ADMIN',
      role: 'ADMIN',
      title: 'Central Regulatory & Audit Board',
      subtitle: 'State Transplant Oversight & Certification',
      abbr: 'CTORB',
      icon: '🏛️',
      color: 'border-emerald-500 hover:border-emerald-600',
      btnColor: 'bg-emerald-700 hover:bg-emerald-800',
      description: 'Inspect the complete audit trail, verify specialist public keys, monitor organ preservation windows, and print official certificates.'
    },
    {
      id: 'DEPT_EXTERNAL',
      role: 'EXTERNAL',
      title: 'Recipient Transplant Center',
      subtitle: 'External Hospital Network (Phase 2)',
      abbr: 'RTCN',
      icon: '🚑',
      color: 'border-blue-400 hover:border-blue-500',
      btnColor: 'bg-slate-700 hover:bg-slate-800',
      description: 'Registered partner hospitals receiving allocated organs and submitting signed delivery receipts.',
      isRestricted: true
    }
  ];

  const spotlightNotices = [
    {
      title: 'MANDATORY 2 REQUIRED APPROVALS OUT OF 3 SPECIALISTS PROTOCOL (2026)',
      isNew: true
    },
    {
      title: 'GREEN CORRIDOR FAST-TRACK AIR/ROAD LOGISTICS STANDARD OPERATING PROCEDURE',
      isNew: true
    },
    {
      title: 'SAFE PRESERVATION WINDOW (COLD ISCHEMIA) TOLERANCE & STORAGE BENCHMARKS',
      isNew: false
    },
    {
      title: 'CONSORTIUM AUDIT TRAIL & TAMPER-PROOF LEDGER REGISTRATION RULES',
      isNew: false
    },
    {
      title: 'FORENSIC BIOMETRIC DATA RETENTION GUIDELINES FOR MEDICO-LEGAL DONORS',
      isNew: false
    }
  ];

  return (
    <div className="min-h-[calc(100vh-100px)] bg-slate-100 flex flex-col justify-between">
      <main className="max-w-7xl mx-auto px-4 py-8 w-full space-y-8">
        {/* Hero Title Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-800 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Consortium Healthcare Portal
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold text-blue-950 tracking-tight">
            MediChain — Transparent Organ Chain-of-Custody
          </h2>
          <p className="text-sm md:text-base text-slate-700 max-w-3xl mx-auto leading-relaxed">
            A unified clinical portal connecting Donor Intake (<TermTooltip term="CIFV" />), Surgical Organ Recovery (<TermTooltip term="SROPS" />),
            Regulatory Oversight (<TermTooltip term="CTORB" />), and Recipient Transplant Centers (<TermTooltip term="RTCN" />).
            Every critical step enforces <strong>2 required approvals out of 3 specialists</strong> (<TermTooltip term="2-of-3 Multi-Sig" />).
          </p>
        </div>

        {/* 4 Login Department Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {departments.map(dept => (
            <div
              key={dept.id}
              className={`bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border-t-4 ${dept.color} flex flex-col justify-between group`}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl p-2 rounded-xl bg-slate-50 border border-slate-100 group-hover:scale-110 transition-transform">
                    {dept.icon}
                  </span>
                  <TermTooltip term={dept.abbr} />
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {dept.title}
                </h3>
                <p className="text-xs font-semibold text-slate-600 mt-1">
                  {dept.subtitle}
                </p>
                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                  {dept.description}
                </p>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-100">
                {dept.isRestricted ? (
                  <button
                    type="button"
                    onClick={() => setShowExternalWarning(true)}
                    className="w-full py-2.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                    <span>External Hospital Access</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectDepartment(dept)}
                    className={`w-full py-2.5 px-3 ${dept.btnColor} text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer`}
                  >
                    <span>Sign In to {dept.abbr}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section: Spotlight (Left) and Audit / Dispatch (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* Spotlight Card */}
          <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-3.5 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
                <h3 className="text-sm font-bold text-rose-900 uppercase tracking-wider">
                  Clinical Protocols &amp; Live Bulletins
                </h3>
              </div>
              <span className="text-xs text-slate-600 font-semibold">
                SOTTO / NOTTO 2026
              </span>
            </div>

            <div className="p-4 divide-y divide-slate-100">
              {spotlightNotices.map((notice, idx) => (
                <div
                  key={idx}
                  className="py-2.5 flex items-start gap-2.5 px-2 rounded-lg"
                >
                  <span className="text-rose-600 font-bold text-xs mt-0.5">⚡</span>
                  <p className="text-xs font-medium text-slate-700 flex-1">
                    {notice.title}
                  </p>
                  {notice.isNew && (
                    <span className="text-xs uppercase font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded shrink-0">
                      Active
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Audit & Security Summary */}
          <div className="lg:col-span-4 space-y-4">
            {/* Security & Verification Summary */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Verification Standards
              </h4>

              <div className="flex flex-wrap gap-1.5">
                <TermTooltip term="2-of-3 Multi-Sig" />
                <TermTooltip term="Ed25519" />
                <TermTooltip term="SHA-256" />
                <TermTooltip term="Cold Ischemia" />
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Every donor intake and organ recovery step requires <strong>2 required approvals out of 3 specialists</strong> before being sealed in the audit ledger.
              </p>
            </div>

            {/* Quick Action: Explorer & Personnel */}
            <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-2xl p-5 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-mono text-cyan-300">Consortium Audit Node</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-mono">
                  Block #{blockHeight}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">
                Audit Trail &amp; Blockchain Explorer
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed">
                Browse the plain-language timeline of donor intakes, surgical recoveries, and specialist approvals, or inspect technical hashes.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onOpenExplorer}
                  className="flex-1 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow cursor-pointer"
                >
                  <Blocks className="w-3.5 h-3.5" />
                  Open Audit Ledger
                </button>
                <button
                  type="button"
                  onClick={onOpenDoctors}
                  className="py-2 px-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  The 9 Specialists
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* External Hospital Restriction Dialog */}
      {showExternalWarning && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="external-hospital-dialog-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-2xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 id="external-hospital-dialog-title" className="text-base font-bold text-slate-900">
                Recipient Hospital Portal (Phase 2)
              </h3>
              <p className="text-xs font-semibold text-amber-800 mt-1">
                Recipient Transplant Center Network (RTCN)
              </p>
              <p className="text-xs text-slate-700 mt-2 leading-relaxed text-left bg-slate-50 p-3 rounded-xl border border-slate-200">
                External recipient hospitals are isolated from pre-allocation donor identity records. Once backend transit and ETA tracking are active, partner hospitals sign delivery receipts here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowExternalWarning(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Acknowledge &amp; Close
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gradient-to-r from-blue-900 via-sky-900 to-slate-900 text-slate-200 py-3 text-center text-xs border-t border-blue-800">
        <p className="font-normal">
          Copyright © 2026 Software Development Cell, National Organ &amp; Tissue Transplant Organization (NOTTO / SOTTO). All rights reserved.
        </p>
      </footer>
    </div>
  );
}

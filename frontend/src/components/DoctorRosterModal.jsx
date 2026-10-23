import React, { useEffect } from 'react';
import { X, ShieldCheck, Key, Stethoscope } from 'lucide-react';
import TermTooltip from './TermTooltip.jsx';

export default function DoctorRosterModal({ isOpen, onClose, doctors = [] }) {
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

  if (!isOpen) return null;

  const depts = [
    {
      key: 'CIFV',
      term: 'CIFV',
      title: 'Donor Intake & Consent Wing',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: '🏥'
    },
    {
      key: 'SROPS',
      term: 'SROPS',
      title: 'Surgical Organ Recovery Suite',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: '🫀'
    },
    {
      key: 'ADMIN',
      term: 'CTORB',
      title: 'Central Regulatory & Audit Board',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      icon: '🏛️'
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doctor-roster-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-sky-900 to-slate-900 px-6 py-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/50 flex items-center justify-center text-lg ring-1 ring-white/20">
              👥
            </div>
            <div>
              <h2 id="doctor-roster-modal-title" className="text-lg font-bold">
                Consortium Certified Specialists Directory
              </h2>
              <p className="text-xs text-slate-200">
                The 9 Pre-Authorized Medical &amp; Regulatory Signatories with Verified Public Keys
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close specialists directory"
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-bold block">Consortium Approval Rule:</strong>
              Every donor intake dossier and surgical recovery report requires{' '}
              <strong>2 required approvals out of 3 specialists</strong> (<TermTooltip term="2-of-3 Multi-Sig" />) from the
              responsible department before it is permanently recorded on the ledger. Only specialist names, roles,
              departments, and public verification keys are published here.
            </div>
          </div>

          {depts.map(dept => {
            const list = doctors.filter(d => d.department === dept.key);
            return (
              <div key={dept.key} className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="text-lg">{dept.icon}</span>
                  <h3 className="font-bold text-slate-800 text-sm md:text-base">{dept.title}</h3>
                  <TermTooltip term={dept.term} />
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${dept.badgeColor}`}>
                    3 Specialists (2 Required Approvals)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {list.map(doc => (
                    <div
                      key={doc.id || doc.name}
                      className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl p-4 transition-all shadow-sm flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-600">Department</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${dept.badgeColor}`}>
                            {doc.department}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-900 text-sm pt-1">{doc.name}</h4>

                        <p className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{doc.role}</span>
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-slate-200 space-y-1">
                        <div className="flex items-center gap-1 text-xs text-emerald-800 font-semibold">
                          <Key className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Public Key</span>
                        </div>
                        <p
                          className="text-xs font-mono text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 break-all"
                          title={doc.publicKey}
                        >
                          {doc.publicKey}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Directory
          </button>
        </div>
      </div>
    </div>
  );
}

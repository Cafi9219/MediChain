import React from 'react';
import { X, ShieldCheck, Key, Stethoscope, Building, Award } from 'lucide-react';

export default function DoctorRosterModal({ isOpen, onClose, doctors = [] }) {
  if (!isOpen) return null;

  const depts = [
    {
      key: 'CIFV',
      title: 'Cadaveric Intake & Forensic Verification Wing',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: '🏥'
    },
    {
      key: 'SROPS',
      title: 'Surgical Retrieval & Organ Preservation Suite',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: '🫀'
    },
    {
      key: 'ADMIN',
      title: 'Central Transplant Oversight Regulatory Board',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      icon: '🏛️'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-sky-900 to-slate-900 px-6 py-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/50 flex items-center justify-center text-lg ring-1 ring-white/20">
              👥
            </div>
            <div>
              <h2 className="text-lg font-bold">Consortium Certified Specialists Directory</h2>
              <p className="text-xs text-slate-300">
                The 9 Pre-Authorized Medical & Regulatory Signatories with Cryptographic Public Keys
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

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block">Consortium Cryptographic Signing Requirement:</strong>
              Under state organ donation law, all cadaver intake and surgical harvest dossiers require mandatory 
              <strong> 2-out-of-3 multi-signature verification</strong> from the respective department's specialists 
              before transactions can be permanently mined into the blockchain.
            </div>
          </div>

          {depts.map(dept => {
            const list = doctors.filter(d => d.department === dept.key);
            return (
              <div key={dept.key} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="text-lg">{dept.icon}</span>
                  <h3 className="font-bold text-slate-800 text-sm md:text-base">{dept.title}</h3>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${dept.badgeColor}`}>
                    3 Authorized Personnel
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {list.map(doc => (
                    <div
                      key={doc.id}
                      className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl p-4 transition-all shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                            {doc.id}
                          </span>
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                            PIN: {doc.pin}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">{doc.name}</h4>
                        <p className="text-xs text-slate-600 font-medium flex items-center gap-1 mt-0.5">
                          <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                          {doc.role}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          <span className="font-medium text-slate-600">Reg:</span> {doc.regNumber}
                        </p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{doc.hospital}</span>
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          <Key className="w-3 h-3 text-emerald-600" />
                          Key Active
                        </span>
                        <span>{doc.experience}</span>
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
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Close Directory
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useId } from 'react';
import { Info } from 'lucide-react';

/**
 * Plain-language label with an accessible hover/focus tooltip showing the technical term.
 * Display-only helper component; uses only Tailwind and lucide-react.
 */
export default function TermTooltip({
  label,
  technicalTerm,
  description = '',
  className = '',
  dark = false
}) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className={`inline-flex items-center gap-1.5 relative ${className}`}>
      {label && <span>{label}</span>}
      <button
        type="button"
        aria-describedby={open ? tooltipId : undefined}
        aria-label={`Technical term: ${technicalTerm}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={e => {
          if (e.key === 'Escape') setOpen(false);
        }}
        className={`inline-flex items-center justify-center rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          dark
            ? 'text-cyan-300 hover:text-cyan-200 hover:bg-slate-800'
            : 'text-slate-600 hover:text-blue-700 hover:bg-slate-200/70'
        }`}
      >
        <Info className="w-3.5 h-3.5 shrink-0" />
      </button>

      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 p-2.5 rounded-xl bg-slate-900 text-white text-xs leading-relaxed shadow-xl border border-slate-700 pointer-events-none text-left font-normal normal-case tracking-normal"
        >
          <strong className="block text-cyan-300 font-mono text-xs mb-0.5">
            {technicalTerm}
          </strong>
          {description && <span className="block text-slate-200">{description}</span>}
        </span>
      )}
    </span>
  );
}

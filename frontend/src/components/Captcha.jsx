import React, { useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

export default function Captcha({ code, onRefresh, loading = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !code) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#f1f5f9');
    grad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Random distortion noise lines
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Render characters with slight random angle and high-contrast color
    const chars = code.split('');
    const charWidth = canvas.width / (chars.length + 1);
    ctx.font = 'bold 22px "JetBrains Mono", monospace';

    chars.forEach((ch, idx) => {
      ctx.save();
      const x = (idx + 0.8) * charWidth;
      const y = canvas.height / 2 + 7;
      const angle = (Math.random() - 0.5) * 0.35;

      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = ['#0f172a', '#0369a1', '#047857', '#b45309'][idx % 4];
      ctx.fillText(ch, -8, 0);
      ctx.restore();
    });

    // Subtle dots
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [code]);

  return (
    <div className="flex items-center gap-2">
      <div className="border border-slate-300 rounded-lg overflow-hidden shadow-inner bg-slate-100">
        <canvas
          ref={canvasRef}
          width={150}
          height={42}
          className="block"
          role="img"
          aria-label={code ? `Security verification code: ${code.split('').join(' ')}` : 'Loading security verification code'}
        />
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        aria-label="Refresh security verification code"
        title="Refresh security verification code"
        className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-slate-300 cursor-pointer"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}

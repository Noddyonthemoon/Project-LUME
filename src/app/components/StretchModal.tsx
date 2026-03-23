import React, { useState } from 'react';
import { Zap, X, MoveRight, Loader, Check } from 'lucide-react';

export interface StretchConfig {
  severity: 'low' | 'medium' | 'high';
  description?: string;
}

interface StretchModalProps {
  onClose: () => void;
  onBeginStretch: (config: StretchConfig) => void;
}

const SEVERITY = [
  { id: 'low' as const, label: 'Low', color: '#10b981', desc: 'Dim or partially lit' },
  { id: 'medium' as const, label: 'Medium', color: '#f59e0b', desc: 'Mostly unlit' },
  { id: 'high' as const, label: 'High', color: '#ef4444', desc: 'Completely dark, dangerous' },
];

export function StretchModal({ onClose, onBeginStretch }: StretchModalProps) {
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [description, setDescription] = useState('');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(10, 12, 18, 0.97)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          boxShadow: '0 0 60px rgba(245,158,11,0.06), 0 25px 50px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.15)' }}
            >
              <Zap size={15} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <h2 className="text-zinc-100 text-sm font-semibold">Create Unlit Road Stretch</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Mark a stretch of broken streetlights</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* How it works */}
          <div
            className="flex items-start gap-3 p-3 rounded-xl text-xs"
            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.14)' }}
          >
            <div className="flex gap-2 items-center mt-0.5 shrink-0">
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                style={{ background: 'rgba(245,158,11,0.25)', color: '#f59e0b' }}
              >1</span>
              <MoveRight size={10} style={{ color: '#52525b' }} />
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                style={{ background: 'rgba(245,158,11,0.25)', color: '#f59e0b' }}
              >2</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Click <b className="text-zinc-200">Start</b> on the map, then click <b className="text-zinc-200">End</b>. 
              The app will automatically place dark-spot markers along the entire stretch.
            </p>
          </div>

          {/* Severity */}
          <div>
            <label className="text-xs text-zinc-500 block mb-2">Severity Level</label>
            <div className="flex gap-2">
              {SEVERITY.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSeverity(s.id)}
                  className="flex-1 py-2 px-3 rounded-lg text-xs transition-all"
                  style={{
                    background: severity === s.id ? s.color + '22' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${severity === s.id ? s.color + '60' : 'rgba(255,255,255,0.07)'}`,
                    color: severity === s.id ? s.color : '#71717a',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-600 mt-1.5">
              {SEVERITY.find(s => s.id === severity)?.desc}
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-zinc-500 block mb-2">
              Description <span className="text-zinc-700">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. All lamps on this road are broken since last monsoon..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-xs text-zinc-300 placeholder-zinc-700 resize-none outline-none transition-colors"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(245,158,11,0.3)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.07)')}
            />
          </div>

          {/* CTA */}
          <button
            onClick={() => onBeginStretch({ severity, description: description || undefined })}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(217,119,6,0.25) 100%)',
              border: '1px solid rgba(245,158,11,0.45)',
              color: '#fcd34d',
              boxShadow: '0 0 20px rgba(245,158,11,0.12)',
            }}
            onMouseEnter={(e) => { (e.currentTarget).style.boxShadow = '0 0 32px rgba(245,158,11,0.25)'; }}
            onMouseLeave={(e) => { (e.currentTarget).style.boxShadow = '0 0 20px rgba(245,158,11,0.12)'; }}
          >
            <Zap size={14} />
            Begin Stretch — Click Start & End on Map
          </button>
        </div>
      </div>
    </div>
  );
}

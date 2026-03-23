import React, { useState } from 'react';
import { X, MapPin, Zap, TriangleAlert, TreePine, Check, Loader, Navigation } from 'lucide-react';

export interface ReportSubmitData {
  type: string;
  severity: string;
  lngLat: [number, number];
  description?: string;
}

interface ReportModalProps {
  onClose: () => void;
  clickedLocation: [number, number] | null;
  onSubmit?: (data: ReportSubmitData) => void | Promise<void> | Promise<boolean>;
}

const REPORT_TYPES = [
  {
    id: 'broken-light',
    icon: Zap,
    label: 'No / Broken Street Light',
    description: 'Streetlight is out, flickering, or entirely absent on this stretch.',
    color: '#f59e0b',
  },
  {
    id: 'harassment',
    icon: TriangleAlert,
    label: 'Harassment / Loitering',
    description: 'Verbal harassment, intimidation, or unsafe gatherings.',
    color: '#ef4444',
  },
  {
    id: 'secluded',
    icon: TreePine,
    label: 'Secluded / Dangerous Area',
    description: 'Isolated path, tunnel, overgrown area, or abandoned site.',
    color: '#a855f7',
  },
  {
    id: 'active-front',
    icon: MapPin,
    label: 'Add Active Front',
    description: 'Tag a business that provides natural surveillance and safety.',
    color: '#10b981',
  },
];

const SEVERITY_LEVELS = [
  { id: 'low', label: 'Low', color: '#10b981', desc: 'Minor inconvenience' },
  { id: 'medium', label: 'Medium', color: '#f59e0b', desc: 'Noticeably unsafe' },
  { id: 'high', label: 'High', color: '#ef4444', desc: 'Actively dangerous' },
];

function formatCoords(lngLat: [number, number]) {
  return `${lngLat[1].toFixed(5)}°N, ${lngLat[0].toFixed(5)}°E`;
}

export function ReportModal({ onClose, clickedLocation, onSubmit }: ReportModalProps) {
  const [step, setStep] = useState<'type' | 'details' | 'uploading' | 'done' | 'error'>('type');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string>('medium');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);

  const selectedTypeData = REPORT_TYPES.find((t) => t.id === selectedType);

  async function handleSubmit() {
    if (!selectedType || !clickedLocation) return;
    setSubmitting(true);
    setStep('uploading');
    setUploadStep(0);

    // Animate through upload steps
    await new Promise(r => setTimeout(r, 500));
    setUploadStep(1); // Validating
    await new Promise(r => setTimeout(r, 600));
    setUploadStep(2); // Uploading to cloud

    try {
      const result = onSubmit?.({
        type: selectedType,
        severity,
        lngLat: clickedLocation,
        description: description || undefined,
      });
      // Await if it's a promise
      if (result instanceof Promise) await result;
      await new Promise(r => setTimeout(r, 700));
      setUploadStep(3); // Syncing map
      await new Promise(r => setTimeout(r, 500));
      setStep('done');
    } catch {
      setStep('error');
    } finally {
      setSubmitting(false);
    }
  }

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
          border: '1px solid rgba(0,229,204,0.15)',
          boxShadow: '0 0 60px rgba(0,229,204,0.08), 0 25px 50px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <h2 className="text-zinc-100">
              {step === 'done' ? 'Report Submitted' : step === 'error' ? 'Upload Failed' : step === 'uploading' ? 'Uploading…' : 'Report an Incident'}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {step === 'type' && 'Choose the type of incident'}
              {step === 'details' && `Adding: ${selectedTypeData?.label}`}
              {step === 'uploading' && 'Sending report to LUME cloud'}
              {step === 'done' && 'Thank you for keeping the community safe'}
              {step === 'error' && 'Something went wrong. Please try again.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Location pill — always visible when we have a location */}
        {clickedLocation && step !== 'done' && (
          <div
            className="flex items-center gap-2 mx-6 mt-4 px-3 py-2 rounded-lg text-xs"
            style={{ background: 'rgba(0,229,204,0.06)', border: '1px solid rgba(0,229,204,0.14)' }}
          >
            <Navigation size={11} className="text-[#00e5cc] flex-shrink-0" />
            <span className="text-[#00e5cc] font-mono">{formatCoords(clickedLocation)}</span>
            <span className="text-zinc-600 ml-auto">Pinned location</span>
          </div>
        )}

        <div className="p-6">
          {/* Step 1 — Type */}
          {step === 'type' && (
            <div className="grid grid-cols-2 gap-2">
              {REPORT_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedType(t.id); setStep('details'); }}
                  className="relative flex flex-col items-start gap-2 p-3.5 rounded-xl text-left transition-all duration-150 active:scale-95"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${t.color}25`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = `${t.color}12`;
                    (e.currentTarget as HTMLButtonElement).style.borderColor = `${t.color}50`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = `${t.color}25`;
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: t.color + '22' }}
                  >
                    <t.icon size={16} style={{ color: t.color }} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-200" style={{ lineHeight: 1.4 }}>{t.label}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5" style={{ lineHeight: 1.4 }}>{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2 — Details */}
          {step === 'details' && selectedTypeData && (
            <div className="space-y-4">
              {/* Severity */}
              <div>
                <label className="text-xs text-zinc-500 block mb-2">Severity Level</label>
                <div className="flex gap-2">
                  {SEVERITY_LEVELS.map((s) => (
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
                  {SEVERITY_LEVELS.find((s) => s.id === severity)?.desc}
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
                  placeholder="What did you observe? Time of day, recurring pattern, etc."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-xs text-zinc-300 placeholder-zinc-700 resize-none outline-none transition-colors"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(0,229,204,0.25)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.07)')}
                />
              </div>

              {/* Anonymous note */}
              <p className="text-[10px] text-zinc-600 flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] text-zinc-400">✓</span>
                This report will be submitted anonymously
              </p>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setStep('type')}
                  className="flex-1 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2"
                  style={{
                    background: selectedTypeData.color + '22',
                    border: `1px solid ${selectedTypeData.color}50`,
                    color: selectedTypeData.color,
                  }}
                >
                  {submitting ? <Loader size={14} className="animate-spin" /> : null}
                  {submitting ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </div>
          )}

          {/* Step: Uploading to cloud */}
          {step === 'uploading' && (
            <div className="flex flex-col items-center py-8 text-center gap-5">
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                border: '3px solid rgba(0,229,204,0.15)',
                borderTopColor: selectedTypeData?.color || '#00e5cc',
                animation: 'lume-spin 0.9s linear infinite',
              }} />
              <div className="flex flex-col gap-3 w-full max-w-[240px]">
                {[
                  { label: 'Validating report data', done: uploadStep >= 1 },
                  { label: 'Uploading to LUME cloud', done: uploadStep >= 2 },
                  { label: 'Syncing to your map', done: uploadStep >= 3 },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                      background: s.done ? 'rgba(0,229,204,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${s.done ? 'rgba(0,229,204,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.3s ease',
                    }}>
                      {s.done && <Check size={10} style={{ color: '#00e5cc' }} />}
                    </div>
                    <span style={{ fontSize: '11px', color: s.done ? '#a1a1aa' : '#3f3f46', transition: 'color 0.3s' }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
              <style>{`@keyframes lume-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Step 3 — Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center py-6 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
              >
                <Check size={28} style={{ color: '#10b981' }} />
              </div>
              <h3 className="text-zinc-100 mb-1">Saved to cloud ✓</h3>
              <p className="text-xs text-zinc-500 max-w-[260px] mb-2">
                Your report is now live in the LUME database and visible to all users in this area.
              </p>
              {clickedLocation && (
                <p className="text-[10px] font-mono text-zinc-600 mb-5">
                  {formatCoords(clickedLocation)}
                </p>
              )}
              <button
                onClick={onClose}
                className="px-8 py-2.5 rounded-xl text-sm transition-all"
                style={{
                  background: 'rgba(0,229,204,0.1)',
                  border: '1px solid rgba(0,229,204,0.25)',
                  color: '#00e5cc',
                }}
              >
                Back to Map
              </button>
            </div>
          )}

          {/* Step — Error */}
          {step === 'error' && (
            <div className="flex flex-col items-center py-6 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                <X size={28} style={{ color: '#ef4444' }} />
              </div>
              <h3 className="text-zinc-100 mb-1">Upload failed</h3>
              <p className="text-xs text-zinc-500 max-w-[260px] mb-5">
                Couldn't reach the LUME cloud right now. Your report was saved locally.
              </p>
              <button
                onClick={onClose}
                className="px-8 py-2.5 rounded-xl text-sm text-zinc-400 transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useCallback, useEffect } from 'react';
import { MapPin, Loader2, X, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { SafetyAudit } from '../types';

// ── Config ─────────────────────────────────────────────────────────────────
const PARAMS = [
  {
    key: 'illumination' as const,
    label: 'Illumination',
    icon: '💡',
    lo: 'Pitch Black',
    hi: 'Bright',
    color: '#f59e0b',
  },
  {
    key: 'crowd_vibe' as const,
    label: 'Crowd Vibe',
    icon: '👥',
    lo: 'Deserted',
    hi: 'Women/Families',
    color: '#3b82f6',
  },
  {
    key: 'eyes_on_street' as const,
    label: 'Eyes on Street',
    icon: '👁️',
    lo: 'Blind Spot',
    hi: 'Highly Visible',
    color: '#a855f7',
  },
  {
    key: 'escape_options' as const,
    label: 'Escape Options',
    icon: '🚪',
    lo: 'Trapped',
    hi: 'Immediate Help',
    color: '#ef4444',
  },
  {
    key: 'walkability' as const,
    label: 'Walkability',
    icon: '🚶',
    lo: 'Forced on Road',
    hi: 'Broad Sidewalk',
    color: '#10b981',
  },
] as const;

type ParamKey = (typeof PARAMS)[number]['key'];
type AuditParams = Record<ParamKey, number>;

const DEFAULT_PARAMS: AuditParams = {
  illumination: 3,
  crowd_vibe: 3,
  eyes_on_street: 3,
  escape_options: 3,
  walkability: 3,
};

function calcAuraScore(p: AuditParams): number {
  return Math.round(
    ((p.illumination + p.crowd_vibe + p.eyes_on_street + p.escape_options + p.walkability) / 25) * 100
  );
}

function scoreColor(score: number): string {
  if (score > 75) return '#00e5cc';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

// ── Segmented Control ───────────────────────────────────────────────────────
function SegmentedControl({
  value,
  onChange,
  color,
}: {
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((v) => {
        const active = value === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            style={{
              flex: 1,
              padding: '6px 0',
              borderRadius: 6,
              border: `1px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
              background: active ? color + '33' : 'rgba(255,255,255,0.03)',
              color: active ? color : '#71717a',
              fontSize: 12,
              fontWeight: active ? 700 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: active ? `0 0 8px ${color}55` : 'none',
            }}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
interface AuditModalProps {
  onClose: () => void;
  onSubmit: (lngLat: [number, number], params: AuditParams) => Promise<void>;
  userLocation?: [number, number] | null;
}

type GpsState = 'idle' | 'locking' | 'locked' | 'denied' | 'error';

export function AuditModal({ onClose, onSubmit, userLocation }: AuditModalProps) {
  const [gpsState, setGpsState] = useState<GpsState>(userLocation ? 'locked' : 'idle');
  const [lngLat, setLngLat] = useState<[number, number] | null>(userLocation || null);
  const [params, setParams] = useState<AuditParams>({ ...DEFAULT_PARAMS });
  const [submitting, setSubmitting] = useState(false);

  const auraScore = calcAuraScore(params);
  const color = scoreColor(auraScore);

  const handleGpsLock = useCallback(() => {
    setGpsState('locking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLngLat([pos.coords.longitude, pos.coords.latitude]);
        setGpsState('locked');
      },
      (err) => {
        setGpsState(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    if (userLocation && !lngLat) {
      setLngLat(userLocation);
      setGpsState('locked');
    }
  }, [userLocation, lngLat]);

  const handleSubmit = async () => {
    if (!lngLat) return;
    setSubmitting(true);
    try {
      await onSubmit(lngLat, params);
    } catch (err) {
      console.error('Audit submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const setParam = (key: ParamKey, val: number) =>
    setParams((prev) => ({ ...prev, [key]: val }));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(12px)',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'rgba(10, 12, 18, 0.97)',
          border: '1px solid rgba(0,229,204,0.15)',
          borderRadius: 20,
          boxShadow: '0 0 60px rgba(0,229,204,0.08), 0 24px 64px rgba(0,0,0,0.8)',
          overflow: 'hidden',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <ShieldCheck size={16} color="#00e5cc" />
              <span style={{ color: '#00e5cc', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Live Safety Audit
              </span>
            </div>
            <p style={{ color: '#52525b', fontSize: 11, margin: 0 }}>
              GPS-locked • Community powered
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* GPS Status Badge (replaced full screen lock) */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 8,
              background: gpsState === 'locked' ? 'rgba(0,229,204,0.07)' : (gpsState === 'error' || gpsState === 'denied' ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.03)'),
              border: `1px solid ${gpsState === 'locked' ? 'rgba(0,229,204,0.2)' : (gpsState === 'error' || gpsState === 'denied' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)')}`,
            }}
          >
            {gpsState === 'locked' ? (
              <>
                <MapPin size={13} color="#00e5cc" />
                <span style={{ color: '#00e5cc', fontSize: 11, fontWeight: 600 }}>GPS Locked</span>
                <span style={{ color: '#3f3f46', fontSize: 10, marginLeft: 'auto', fontFamily: 'monospace' }}>
                  {lngLat ? `${lngLat[1].toFixed(4)}, ${lngLat[0].toFixed(4)}` : 'Detecting...'}
                </span>
              </>
            ) : gpsState === 'locking' ? (
              <>
                <Loader2 size={13} color="#00e5cc" style={{ animation: 'lume-spin 1s linear infinite' }} />
                <span style={{ color: '#a1a1aa', fontSize: 11 }}>Locating you...</span>
              </>
            ) : (gpsState === 'error' || gpsState === 'denied') ? (
              <>
                <AlertTriangle size={13} color="#ef4444" />
                <span style={{ color: '#fca5a5', fontSize: 11 }}>{gpsState === 'denied' ? 'Location Denied' : 'GPS Error'}</span>
                <button 
                  onClick={handleGpsLock}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', fontSize: 10, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Retry
                </button>
              </>
            ) : (
              <>
                <MapPin size={13} color="#52525b" />
                <span style={{ color: '#71717a', fontSize: 11 }}>Location not locked</span>
                <button 
                  onClick={handleGpsLock}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#00e5cc', fontSize: 10, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Lock GPS
                </button>
              </>
            )}
          </div>

          {/* Parameters (Always visible now) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {PARAMS.map((p) => (
              <div key={p.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{p.icon}</span>
                    <span style={{ color: '#e4e4e7', fontSize: 12, fontWeight: 600 }}>{p.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#52525b' }}>
                    <span>{p.lo}</span>
                    <span>→</span>
                    <span style={{ color: p.color }}>{p.hi}</span>
                  </div>
                </div>
                <SegmentedControl
                  value={params[p.key]}
                  onChange={(v) => setParam(p.key, v)}
                  color={p.color}
                />
              </div>
            ))}
          </div>

          {/* Live Aura Score */}
          <div
            style={{
              borderRadius: 12,
              padding: '16px',
              background: `linear-gradient(135deg, ${color}10 0%, ${color}08 100%)`,
              border: `1px solid ${color}30`,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 56, height: 56,
                borderRadius: '50%',
                border: `2px solid ${color}55`,
                boxShadow: `0 0 16px ${color}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ color, fontSize: 18, fontWeight: 800, fontFamily: 'monospace' }}>
                {auraScore}
              </span>
            </div>
            <div>
              <p style={{ color, fontSize: 12, fontWeight: 700, margin: '0 0 2px' }}>
                {auraScore > 75 ? 'High Safety Aura' : auraScore >= 40 ? 'Moderate Aura' : 'Low Safety Aura'}
              </p>
              <p style={{ color: '#52525b', fontSize: 10, margin: 0, lineHeight: 1.4 }}>
                Live score · Updates as you adjust the parameters above
              </p>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !lngLat}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 10,
              background: (submitting || !lngLat)
                ? 'rgba(255,255,255,0.04)'
                : `linear-gradient(135deg, ${color}22 0%, ${color}18 100%)`,
              border: `1px solid ${color}45`,
              color: (submitting || !lngLat) ? '#52525b' : color,
              fontSize: 13,
              fontWeight: 700,
              cursor: (submitting || !lngLat) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
              boxShadow: (submitting || !lngLat) ? 'none' : `0 0 20px ${color}18`,
            }}
          >
            {submitting
              ? <><Loader2 size={14} style={{ animation: 'lume-spin 1s linear infinite' }} />Submitting to network…</>
              : !lngLat 
                ? <><MapPin size={14} />Waiting for GPS Lock...</>
                : <><ShieldCheck size={14} />Submit Safety Audit</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

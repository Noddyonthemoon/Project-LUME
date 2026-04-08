import React from 'react';
import {
  X, MapPin, Clock, Users, Zap, TriangleAlert, TreePine, Store,
  ShieldCheck, Eye, AlertCircle,
} from 'lucide-react';
import type { Incident, ActiveFront } from './MapSVG';

interface MarkerInfoProps {
  marker: { type: string; data: Incident | ActiveFront };
  onClose: () => void;
}

const INCIDENT_META: Record<string, { color: string; icon: React.ComponentType<any>; bg: string; label: string }> = {
  harassment: { color: '#ef4444', icon: TriangleAlert, bg: '#ef444418', label: 'Harassment' },
  'broken-light': { color: '#f59e0b', icon: Zap, bg: '#f59e0b18', label: 'Broken Light' },
  secluded: { color: '#a855f7', icon: TreePine, bg: '#a855f718', label: 'Secluded Area' },
};

const SEVERITY_CONFIG: Record<string, { color: string; label: string }> = {
  high: { color: '#ef4444', label: 'High Risk' },
  medium: { color: '#f59e0b', label: 'Medium Risk' },
  low: { color: '#10b981', label: 'Low Risk' },
};

function SafetyTip({ type }: { type: string }) {
  const tips: Record<string, string> = {
    harassment: 'Consider using a well-lit parallel route. Walk with company when possible.',
    'broken-light': 'Report to local authorities. Use the adjacent lit street for safer passage.',
    secluded: 'Avoid this path after dark. An alternate route adds only 3 min to your walk.',
  };
  return (
    <div className="flex gap-2 p-2.5 rounded-lg mt-2"
      style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)' }}>
      <ShieldCheck size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
      <p className="text-[11px] text-blue-300/80 leading-relaxed">{tips[type] ?? 'Stay alert and trust your instincts.'}</p>
    </div>
  );
}

export function MarkerInfo({ marker, onClose }: MarkerInfoProps) {
  const isIncident = marker.type === 'incident';
  const inc = isIncident ? (marker.data as Incident) : null;
  const af = !isIncident ? (marker.data as ActiveFront) : null;
  const meta = inc ? INCIDENT_META[inc.type] : null;
  const sevConfig = inc ? SEVERITY_CONFIG[inc.severity] : null;

  return (
    <div
      className="absolute bottom-[84px] left-[calc(288px+40px)] right-5 max-w-sm rounded-xl overflow-hidden pointer-events-auto"
      style={{
        background: 'rgba(8, 10, 16, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: isIncident
          ? `1px solid ${meta?.color}30`
          : '1px solid rgba(16,185,129,0.25)',
        boxShadow: `0 0 30px ${isIncident ? meta?.color + '14' : 'rgba(16,185,129,0.10)'}, 0 20px 40px rgba(0,0,0,0.6)`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-start gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: isIncident ? meta?.bg : 'rgba(16,185,129,0.15)' }}
          >
            {isIncident && meta
              ? <meta.icon size={14} style={{ color: meta.color }} />
              : <Store size={14} style={{ color: '#10b981' }} />
            }
          </div>
          <div>
            <h3 className="text-zinc-100" style={{ fontSize: '13px' }}>
              {isIncident ? inc!.title : af!.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <MapPin size={10} className="text-zinc-600" />
              <span className="text-[10px] text-zinc-600">
                {isIncident ? inc!.street : af!.category}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors flex-shrink-0"
        >
          <X size={13} />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {isIncident && inc && meta && sevConfig && (
          <>
            {/* Tags row */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: meta.bg, color: meta.color }}
              >
                {meta.label}
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: sevConfig.color + '18', color: sevConfig.color }}
              >
                {sevConfig.label}
              </span>
            </div>

            {/* Description */}
            <p className="text-[11px] text-zinc-400 leading-relaxed mb-2">{inc.description}</p>

            {/* Stats row */}
            <div className="flex items-center gap-3 text-[10px] text-zinc-600">
              <span className="flex items-center gap-1">
                <Users size={10} />
                {inc.reports} reports
              </span>
              <span className="flex items-center gap-1">
                <Clock size={10} />
                Last: {inc.time}
              </span>
            </div>

            {/* Safety tip */}
            <SafetyTip type={inc.type} />
          </>
        )}

        {!isIncident && af && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                Active Front
              </span>
            </div>
            <div className="space-y-1.5 text-[11px] text-zinc-400">
              <div className="flex items-center gap-2">
                <Clock size={10} className="text-zinc-600" />
                <span>{af.hours}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye size={10} className="text-zinc-600" />
                <span>Provides natural street surveillance</span>
              </div>
            </div>
            <div className="flex gap-2 p-2.5 rounded-lg mt-2"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <ShieldCheck size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                This location has open windows and staff with visibility of the street — a safe waypoint.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

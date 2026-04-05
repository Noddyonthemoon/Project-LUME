import React, { useState } from 'react';
import {
  Lightbulb, ShieldAlert, Store, ChevronDown, ChevronRight,
  ChevronLeft, MapPin, Zap, Eye, Clock, Search,
  TriangleAlert, TreePine, Activity, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import type { LayerState, ActiveFront } from './MapSVG';

import type { UserReport, SafetyAudit } from '../types';


interface SidebarProps {
  layers: LayerState;
  toggleLayer: (key: keyof LayerState) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  scores: {
    illumination: number;
    socialSafety: number;
    activeFronts: number;
  };
  reports: UserReport[];
  activeFronts: (ActiveFront & { lngLat: [number, number] })[];
  osmLandmarks: any[]; // OSMLandmark type
  onReportClick?: (lngLat: [number, number], id: string) => void;
  userLocation: [number, number] | null;
  audits: SafetyAudit[];
}






// Helper to map report type to visual style
const getReportStyle = (type: string) => {
  switch (type) {
    case 'broken-light':
      return { icon: Zap, color: '#f59e0b', label: 'Broken Streetlight' };
    case 'harassment':
      return { icon: TriangleAlert, color: '#ef4444', label: 'Verbal Harassment' };
    case 'secluded':
      return { icon: TreePine, color: '#a855f7', label: 'Secluded Path' };
    default:
      return { icon: Activity, color: '#3b82f6', label: 'Safety Report' };
  }
};

const formatTime = (ts: number) => {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

// Haversine formula for geographic distance (meters)
function getHaversineDistance(pos1: [number, number], pos2: [number, number]): number {
  const R = 6371000;
  const dLat = (pos2[1] - pos1[1]) * Math.PI / 180;
  const dLon = (pos2[0] - pos1[0]) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(pos1[1] * Math.PI / 180) * Math.cos(pos2[1] * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type ClusteredReport = {
  id: string;
  type: string;
  isCluster: boolean;
  reports?: UserReport[];
  span?: number;
  maxSeverity?: string;
  timestamp: number;
  label: string;
  icon: any;
  color: string;
};



function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">{label}</span>
        <span className="text-xs font-mono" style={{ color }}>{score}</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}88` }}
        />
      </div>
    </div>
  );
}

function LayerToggle({
  active, onToggle, icon: Icon, label, color, children,
}: {
  active: boolean;
  onToggle: () => void;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string; style?: React.CSSProperties }>;
  label: string;
  color: string;
  children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800/40 transition-colors group">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          {expanded
            ? <ChevronDown size={13} className="text-zinc-500 flex-shrink-0" />
            : <ChevronRight size={13} className="text-zinc-500 flex-shrink-0" />}
          <Icon size={14} style={{ color }} />
          <span className="text-xs text-zinc-200">{label}</span>
        </button>
        <button
          onClick={onToggle}
          className="relative w-8 h-4 rounded-full transition-all duration-200 flex-shrink-0"
          style={{ backgroundColor: active ? color + '33' : '#27272a' }}
        >
          <div
            className="absolute top-0.5 w-3 h-3 rounded-full transition-all duration-200"
            style={{
              left: active ? 'calc(100% - 14px)' : '2px',
              backgroundColor: active ? color : '#52525b',
              boxShadow: active ? `0 0 6px ${color}` : 'none',
            }}
          />
        </button>
      </div>
      {expanded && children && (
        <div className="pl-6 space-y-0.5">{children}</div>
      )}
    </div>
  );
}

function SubOption({ icon: Icon, label, color, badge }: {
  icon: React.ComponentType<{ size?: number; className?: string; color?: string; style?: React.CSSProperties }>;
  label: string;
  color: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-800/30 transition-colors cursor-default">
      <Icon size={12} style={{ color }} />
      <span className="text-xs text-zinc-500">{label}</span>
      {badge && (
        <span
          className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: color + '22', color }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

const SIDEBAR_W = 288; // w-72
const SIDEBAR_LEFT = 20; // left-5


export function Sidebar({ 
  layers, toggleLayer, sidebarOpen, onToggleSidebar, scores, reports, activeFronts, osmLandmarks, onReportClick, userLocation, audits 
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const activeFrontsNearbyCount = React.useMemo(() => {
    if (!userLocation) return 0;
    return activeFronts.filter(af => getHaversineDistance(userLocation, af.lngLat) < 500).length;
  }, [userLocation, activeFronts]);

  const surveillanceBadge = React.useMemo(() => {
    if (!userLocation) return null;
    const nearby = audits.filter(a => getHaversineDistance(userLocation, a.lngLat) < 1000);
    if (!nearby.length) return null;
    
    let sum = 0;
    nearby.forEach(a => sum += a.eyes_on_street);
    const avg = sum / nearby.length;
    
    if (avg >= 4) return "Good nearby";
    if (avg >= 2.5) return "Avg nearby";
    return "Poor nearby";
  }, [userLocation, audits]);

  const clusteredReports = React.useMemo(() => {
    const sorted = [...reports].sort((a, b) => b.timestamp - a.timestamp);
    const brokenLights = sorted.filter(r => r.type === 'broken-light');
    const others = sorted.filter(r => r.type !== 'broken-light');

    const clusters: UserReport[][] = [];
    const used = new Set<string>();

    for (let i = 0; i < brokenLights.length; i++) {
      if (used.has(brokenLights[i].id)) continue;
      
      const currentCluster = [brokenLights[i]];
      used.add(brokenLights[i].id);

      // Simple greedy spatial grouping (40m threshold)
      let foundNew;
      do {
        foundNew = false;
        for (let j = 0; j < brokenLights.length; j++) {
          if (used.has(brokenLights[j].id)) continue;
          
          if (currentCluster.some(c => getHaversineDistance(c.lngLat, brokenLights[j].lngLat) < 40)) {
            currentCluster.push(brokenLights[j]);
            used.add(brokenLights[j].id);
            foundNew = true;
          }
        }
      } while (foundNew);
      
      clusters.push(currentCluster);
    }

    const finalItems: ClusteredReport[] = [
      ...others.map(r => ({
        id: r.id,
        type: r.type,
        isCluster: false,
        timestamp: r.timestamp,
        ...getReportStyle(r.type)
      })),
      ...clusters.map(c => {
        if (c.length === 1) {
          const r = c[0];
          return {
            id: r.id,
            type: r.type,
            isCluster: false,
            timestamp: r.timestamp,
            ...getReportStyle(r.type)
          };
        }

        // Calculate span (max distance between any two points)
        let maxSpan = 0;
        for (let i = 0; i < c.length; i++) {
          for (let j = i + 1; j < c.length; j++) {
            maxSpan = Math.max(maxSpan, getHaversineDistance(c[i].lngLat, c[j].lngLat));
          }
        }

        const severityOrder = { high: 3, medium: 2, low: 1 };
        const maxSeverity = c.reduce((max, curr) => 
          (severityOrder[curr.severity as keyof typeof severityOrder] || 0) > 
          (severityOrder[max as keyof typeof severityOrder] || 0) ? curr.severity : max, 
        'low');

        const newestTs = Math.max(...c.map(r => r.timestamp));

        return {
          id: `cluster-${c[0].id}`,
          type: 'broken-light',
          isCluster: true,
          reports: c,
          span: Math.round(maxSpan / 10) * 10,
          maxSeverity,
          timestamp: newestTs,
          label: 'Cluster of broken lights',
          icon: Zap,
          color: '#f59e0b'
        };
      })
    ].sort((a, b) => b.timestamp - a.timestamp);

    return finalItems.slice(0, 10);
  }, [reports]);

  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    
    const results: { id: string; label: string; sub: string; icon: any; color: string; lngLat: [number, number] }[] = [];

    // 1. Search Active Fronts
    activeFronts.forEach(af => {
      if (af.name.toLowerCase().includes(q) || af.category.toLowerCase().includes(q)) {
        results.push({ id: String(af.id), label: af.name, sub: af.category, icon: Store, color: '#10b981', lngLat: af.lngLat });
      }
    });


    // 2. Search Landmarks
    osmLandmarks.forEach(lm => {
      if (lm.name.toLowerCase().includes(q) || lm.type.toLowerCase().includes(q)) {
        results.push({ id: String(lm.id), label: lm.name, sub: lm.type.replace(/_/g, ' '), icon: MapPin, color: '#60a5fa', lngLat: lm.lngLat });
      }
    });


    // 3. Search Clustered Reports
    clusteredReports.forEach(r => {
      if (r.label.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)) {
        const pos = r.isCluster ? (r.reports?.[0].lngLat) : (reports.find(orig => orig.id === r.id)?.lngLat);
        if (pos) {
          results.push({ id: r.id, label: r.label, sub: r.isCluster ? `Cluster (${r.reports?.length} pts)` : 'User Report', icon: r.icon, color: r.color, lngLat: pos });
        }
      }
    });

    return results.slice(0, 15);
  }, [searchQuery, activeFronts, osmLandmarks, clusteredReports, reports]);


  const scoreData = [

    { label: 'Illumination', score: scores.illumination, color: '#f59e0b' },
    { label: 'Social Safety', score: Math.max(0, scores.socialSafety), color: '#3b82f6' },
    { label: 'Active Fronts', score: scores.activeFronts, color: '#a855f7' },
  ];

  const overallScore = Math.round(scoreData.reduce((sum, s) => sum + s.score, 0) / scoreData.length);
  const scoreColor = overallScore >= 75 ? '#10b981' : overallScore >= 50 ? '#f59e0b' : '#ef4444';

  return (
    // Outer wrapper at left-0 so we can animate the panel off-screen
    // while keeping the toggle tab visible on the viewport edge
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      {/* ── Sidebar panel ── */}
      <aside
        style={{
          position: 'absolute',
          top: 20,
          bottom: 20,
          left: SIDEBAR_LEFT,
          width: SIDEBAR_W,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 16,
          overflow: 'hidden',
          background: 'rgba(8, 10, 14, 0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 229, 204, 0.10)',
          boxShadow: '0 0 40px rgba(0,0,0,0.7), inset 0 0 1px rgba(0,229,204,0.08)',
          transform: sidebarOpen
            ? 'translateX(0)'
            : `translateX(-${SIDEBAR_W + SIDEBAR_LEFT + 4}px)`,
          transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)',
          pointerEvents: sidebarOpen ? 'auto' : 'none',
        }}
      >
        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-start justify-between">
            <div>
              <h1
                className="tracking-widest uppercase"
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #00e5cc 0%, #7c3aed 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '0.18em',
                }}
              >
                LUME
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5 italic">Check the aura before you walk.</p>
            </div>
            <div className="flex flex-col items-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ border: `2px solid ${scoreColor}55`, boxShadow: `0 0 10px ${scoreColor}33` }}
              >
                <span className="text-sm font-mono" style={{ color: scoreColor }}>{overallScore}</span>
              </div>
              <span className="text-[10px] text-zinc-600 mt-0.5">AURA</span>
            </div>
          </div>

          {/* Search */}
          <div className="mt-3 relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search restaurants, streets..."
              className="w-full pl-8 pr-8 py-2 rounded-lg text-xs text-zinc-300 placeholder-zinc-600 outline-none transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(0,229,204,0.3)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.07)')}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
              >✕</button>
            )}
          </div>

        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {searchQuery ? (
            <div className="px-3 pt-4">
              <p className="text-[10px] text-zinc-600 tracking-widest uppercase px-2 mb-2">Search Results</p>
              <div className="space-y-1 px-1">
                {searchResults.length > 0 ? (
                  searchResults.map((res) => (
                    <div
                      key={res.id}
                      onClick={() => onReportClick?.(res.lngLat, res.id)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-zinc-800/60 active:bg-zinc-800 group transition-all"
                    >
                      <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: res.color + '22' }}>
                        <res.icon size={12} style={{ color: res.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-200 truncate group-hover:text-[#00e5cc] transition-colors">{res.label}</p>
                        <p className="text-[10px] text-zinc-600 truncate capitalize">{res.sub}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-8 text-center">
                    <p className="text-xs text-zinc-600">No results found for "{searchQuery}"</p>
                    <p className="text-[10px] text-zinc-700 mt-1 italic">Try searching for MSRIT, Ramaiah, or a local restaurant.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* LAYERS */}
              <div className="px-3 pt-4 pb-2">
                <p className="text-[10px] text-zinc-600 tracking-widest uppercase px-2 mb-2">Layers</p>
                {/* ... existing layers ... */}
                <LayerToggle active={layers.lumen} onToggle={() => toggleLayer('lumen')} icon={Lightbulb} label="Lumen Layer" color="#00e5cc">
                  <SubOption icon={Zap} label="Streetlight Density" color="#00e5cc" badge="Live" />
                  <SubOption icon={Eye} label="Operational Status" color="#f59e0b" />
                  <SubOption icon={Store} label="Active Fronts" color="#10b981" />
                </LayerToggle>
                <LayerToggle active={layers.socialSafety} onToggle={() => toggleLayer('socialSafety')} icon={ShieldAlert} label="Social Safety" color="#ef4444">
                  <SubOption icon={TriangleAlert} label="Harassment Hotspots" color="#ef4444" badge="6 active" />
                  <SubOption icon={Activity} label="Historical Data" color="#3b82f6" />
                  <SubOption icon={TreePine} label="Vulnerability Alerts" color="#a855f7" badge="3" />
                </LayerToggle>
                <LayerToggle active={layers.activeFronts} onToggle={() => toggleLayer('activeFronts')} icon={Store} label="Active Fronts" color="#10b981">
                  <SubOption icon={Store} label="24/7 Businesses" color="#10b981" badge={activeFrontsNearbyCount > 0 ? `${activeFrontsNearbyCount} nearby` : undefined} />
                  <SubOption icon={Eye} label="Natural Surveillance" color="#60a5fa" badge={surveillanceBadge || undefined} />
                </LayerToggle>
              </div>

              {/* AREA SCORES */}
              <div className="px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-[10px] text-zinc-600 tracking-widest uppercase mb-3">Area Scores</p>
                <div className="space-y-2.5">
                  {scoreData.map((s) => <ScoreBar key={s.label} {...s} />)}
                </div>
              </div>

              {/* RECENT REPORTS */}
              <div className="px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-zinc-600 tracking-widest uppercase">Recent Reports</p>
                  <span className="text-[10px] text-zinc-600">Community</span>
                </div>
                <div className="space-y-1">
                  {clusteredReports.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => {
                        const pos = r.isCluster ? (r.reports?.[0].lngLat) : (reports.find(orig => orig.id === r.id)?.lngLat);
                        if (pos) onReportClick?.(pos, r.id);
                      }}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-zinc-800/60 active:bg-zinc-800 group transition-all"
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                        style={{ backgroundColor: r.color + '22' }}
                      >
                        <r.icon size={10} style={{ color: r.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-300 truncate group-hover:text-[#00e5cc] transition-colors">{r.label}</p>
                        {r.isCluster ? (
                          <p className="text-[10px] text-zinc-600 truncate">
                            Across: ~{r.span}m | Severity: <span className="capitalize">{r.maxSeverity}</span>
                          </p>
                        ) : (
                          <p className="text-[10px] text-zinc-600 truncate flex items-center gap-1">
                            <MapPin size={8} /> {reports.find(orig => orig.id === r.id)?.lngLat[0].toFixed(4)}, {reports.find(orig => orig.id === r.id)?.lngLat[1].toFixed(4)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Clock size={9} className="text-zinc-700" />
                        <span className="text-[10px] text-zinc-600">{formatTime(r.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>


        {/* ── Footer note ── */}
        <div className="px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-center text-[10px] text-zinc-700">
            Tap anywhere on the map to report an incident
          </p>
        </div>
      </aside>

      {/* ── Collapse / Expand toggle tab ── */}
      <button
        onClick={onToggleSidebar}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          left: sidebarOpen ? SIDEBAR_LEFT + SIDEBAR_W : 8,
          transition: 'left 0.32s cubic-bezier(0.4,0,0.2,1)',
          pointerEvents: 'auto',
          width: 22,
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(8, 10, 14, 0.88)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(0,229,204,0.12)',
          borderLeft: sidebarOpen ? 'none' : '1px solid rgba(0,229,204,0.12)',
          borderRadius: sidebarOpen ? '0 8px 8px 0' : '0 8px 8px 0',
          cursor: 'pointer',
          color: '#52525b',
          boxShadow: '2px 0 12px rgba(0,0,0,0.4)',
          zIndex: 21,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = '#00e5cc';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,229,204,0.3)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = '#52525b';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,229,204,0.12)';
        }}
      >
        {sidebarOpen
          ? <ChevronLeft size={13} />
          : <ChevronRight size={13} />
        }
      </button>
    </div>
  );
}

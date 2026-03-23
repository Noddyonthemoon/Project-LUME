import React, { useMemo } from 'react';

export type IncidentType = 'harassment' | 'broken-light' | 'secluded';
export type LitLevel = 'bright' | 'dim' | 'none';

export interface LayerState {
  lumen: boolean;
  socialSafety: boolean;
  activeFronts: boolean;
}

export interface Incident {
  id: number;
  type: IncidentType;
  x: number;
  y: number;
  severity: 'high' | 'medium' | 'low';
  reports: number;
  title: string;
  description: string;
  time: string;
  street: string;
}

export interface ActiveFront {
  id: number;
  x: number;
  y: number;
  name: string;
  category: string;
  hours: string;
}

// City grid column/row block boundaries
const COL_RANGES: [number, number][] = [
  [0, 107], [124, 230], [252, 356], [372, 467],
  [485, 584], [601, 704], [720, 817], [835, 936],
  [956, 1059], [1075, 1200],
];
const ROW_RANGES: [number, number][] = [
  [0, 99], [117, 209], [229, 309], [325, 414],
  [436, 519], [537, 621], [641, 719], [735, 800],
];

// Street center lines and their illumination level
const V_STREETS: { cx: number; lit: LitLevel }[] = [
  { cx: 115, lit: 'dim' },
  { cx: 241, lit: 'bright' },
  { cx: 364, lit: 'none' },
  { cx: 476, lit: 'dim' },
  { cx: 592, lit: 'bright' },
  { cx: 712, lit: 'none' },
  { cx: 826, lit: 'dim' },
  { cx: 946, lit: 'bright' },
  { cx: 1067, lit: 'none' },
];

const H_STREETS: { cy: number; lit: LitLevel }[] = [
  { cy: 108, lit: 'none' },
  { cy: 219, lit: 'bright' },
  { cy: 317, lit: 'dim' },
  { cy: 425, lit: 'bright' },
  { cy: 528, lit: 'dim' },
  { cy: 631, lit: 'bright' },
  { cy: 727, lit: 'none' },
];

export const INCIDENTS: Incident[] = [
  {
    id: 1, type: 'harassment', x: 592, y: 528,
    severity: 'high', reports: 12,
    title: 'Harassment Hotspot',
    description: 'Transit underpass — multiple reports of verbal harassment and intimidating behavior, especially after 9pm. Poorly lit despite being near a main road.',
    time: '2h ago', street: 'Central Ave & 7th',
  },
  {
    id: 2, type: 'broken-light', x: 364, y: 219,
    severity: 'medium', reports: 3,
    title: 'Broken Streetlight',
    description: 'Streetlight has been out for 2+ weeks. Creates a dark gap on an otherwise dim corridor. Reported to city, no action taken.',
    time: '3d ago', street: 'Oak Ave & 3rd St',
  },
  {
    id: 3, type: 'secluded', x: 476, y: 425,
    severity: 'medium', reports: 5,
    title: 'Secluded Pathway',
    description: 'Riverside Park path with overgrown vegetation and no visible sightlines. No active businesses within 200m. Avoid after dark.',
    time: '1d ago', street: 'Park Blvd',
  },
  {
    id: 4, type: 'broken-light', x: 826, y: 317,
    severity: 'low', reports: 1,
    title: 'Flickering Light',
    description: 'Partially functional streetlight that flickers rhythmically, creating a disorienting effect. Still provides some illumination.',
    time: '5h ago', street: 'West St & 4th Ave',
  },
  {
    id: 5, type: 'harassment', x: 241, y: 631,
    severity: 'high', reports: 8,
    title: 'Loitering Report',
    description: 'Consistent intimidating loitering near the bus stop after 10pm. Multiple pedestrians reported feeling unsafe in this zone.',
    time: '6h ago', street: 'Westside Transit Hub',
  },
  {
    id: 6, type: 'secluded', x: 946, y: 528,
    severity: 'medium', reports: 4,
    title: 'Abandoned Construction',
    description: 'Abandoned construction site with no lighting, fencing, or surveillance. Isolated alley runs adjacent. High vulnerability rating.',
    time: '2d ago', street: 'Eastside Industrial',
  },
  {
    id: 200, type: 'broken-light', x: 0, y: 0,
    severity: 'high', reports: 5,
    title: 'Broken Streetlight Row',
    description: 'Start of a completely dark section. Multiple consecutive streetlights are out.',
    time: '1d ago', street: 'MSRIT Road Section 1',
  },
  {
    id: 201, type: 'broken-light', x: 0, y: 0,
    severity: 'high', reports: 3,
    title: 'Broken Streetlight',
    description: 'Consecutive streetlight outage.',
    time: '1d ago', street: 'MSRIT Road Section 2',
  },
  {
    id: 202, type: 'broken-light', x: 0, y: 0,
    severity: 'high', reports: 2,
    title: 'Broken Streetlight',
    description: 'Consecutive streetlight outage creating a continuous blind spot.',
    time: '12h ago', street: 'MSRIT Road Section 3',
  },
  {
    id: 203, type: 'broken-light', x: 0, y: 0,
    severity: 'high', reports: 4,
    title: 'Broken Streetlight',
    description: 'Consecutive streetlight outage.',
    time: '8h ago', street: 'MSRIT Road Section 4',
  },
  {
    id: 204, type: 'broken-light', x: 0, y: 0,
    severity: 'high', reports: 6,
    title: 'Broken Streetlight Row',
    description: 'End of completely dark section. Extreme caution recommended.',
    time: '1d ago', street: 'MSRIT Road Section 5',
  },
];

export const ACTIVE_FRONTS: ActiveFront[] = [
  { id: 1, x: 592, y: 219, name: 'Metro Coffee', category: '24/7 Café', hours: 'Always Open' },
  { id: 2, x: 241, y: 317, name: 'Neon Mart', category: 'Convenience Store', hours: '6am – 2am' },
  { id: 3, x: 946, y: 425, name: 'Blue Moon Diner', category: 'Restaurant', hours: '24/7' },
  { id: 4, x: 712, y: 219, name: 'City Pharmacy', category: 'Pharmacy', hours: '8am – 11pm' },
];

interface MapSVGProps {
  layers: LayerState;
  onMarkerClick: (data: { type: string; data: Incident | ActiveFront }) => void;
  selectedId: string | null;
}

const INCIDENT_COLORS: Record<IncidentType, string> = {
  harassment: '#ef4444',
  'broken-light': '#f59e0b',
  secluded: '#a855f7',
};

export function MapSVG({ layers, onMarkerClick, selectedId }: MapSVGProps) {
  const blocks = useMemo(() => {
    const result: { x: number; y: number; w: number; h: number; l: number }[] = [];
    COL_RANGES.forEach(([x1, x2], ci) => {
      ROW_RANGES.forEach(([y1, y2], ri) => {
        // Pseudo-random lightness variation for city blocks
        const l = 12 + ((ci * 7 + ri * 5 + ci * ri) % 9);
        result.push({ x: x1, y: y1, w: x2 - x1, h: y2 - y1, l });
      });
    });
    return result;
  }, []);

  // Slight internal block sub-rectangles to give "building footprint" feel
  const subBlocks = useMemo(() => {
    const result: { x: number; y: number; w: number; h: number; l: number }[] = [];
    COL_RANGES.forEach(([x1, x2], ci) => {
      ROW_RANGES.forEach(([y1, y2], ri) => {
        const bw = x2 - x1;
        const bh = y2 - y1;
        if (bw > 60 && bh > 60) {
          const pad = 8 + ((ci + ri) % 6);
          const l = 18 + ((ci * 3 + ri * 11) % 7);
          result.push({ x: x1 + pad, y: y1 + pad, w: bw - pad * 2, h: bh - pad * 2, l });
        }
      });
    });
    return result;
  }, []);

  return (
    <svg
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        {/* Strong bloom glow for bright streets */}
        <filter id="glow-bright" x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b2" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b3" />
          <feMerge>
            <feMergeNode in="b1" />
            <feMergeNode in="b2" />
            <feMergeNode in="b3" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Soft glow for dim streets */}
        <filter id="glow-dim" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Marker glow */}
        <filter id="glow-marker" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Blue glow for user location */}
        <filter id="glow-user" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Street surface background */}
      <rect width="1200" height="800" fill="#09090e" />

      {/* ── Park / green spaces ── */}
      <rect x="372" y="436" width="104" height="83" fill="#0d1a12" rx="4" opacity="0.9" />
      <rect x="380" y="443" width="88" height="69" fill="#0a1610" rx="3" />
      {/* Park texture dots */}
      {[...Array(18)].map((_, i) => (
        <circle
          key={`park-dot-${i}`}
          cx={385 + (i % 6) * 14}
          cy={450 + Math.floor(i / 6) * 18}
          r="2.5"
          fill="#1a3a22"
          opacity="0.7"
        />
      ))}
      <text x="424" y="490" fontSize="7" fill="#1d4a2a" textAnchor="middle" fontFamily="monospace" opacity="0.8">PARK</text>

      {/* Water feature (river-like) */}
      <path
        d="M 0 700 Q 200 680 400 710 Q 600 740 800 720 Q 1000 700 1200 715"
        stroke="#0d1f2d"
        strokeWidth="28"
        fill="none"
        opacity="0.9"
      />
      <path
        d="M 0 700 Q 200 680 400 710 Q 600 740 800 720 Q 1000 700 1200 715"
        stroke="#0e2338"
        strokeWidth="18"
        fill="none"
        opacity="0.8"
      />
      <path
        d="M 0 700 Q 200 680 400 710 Q 600 740 800 720 Q 1000 700 1200 715"
        stroke="#1a3a55"
        strokeWidth="4"
        fill="none"
        opacity="0.3"
      />

      {/* City blocks */}
      {blocks.map((b, i) => (
        <rect
          key={`block-${i}`}
          x={b.x} y={b.y}
          width={b.w} height={b.h}
          fill={`rgb(${b.l}, ${b.l + 2}, ${b.l + 7})`}
        />
      ))}

      {/* Sub-block building footprints */}
      {subBlocks.map((b, i) => (
        <rect
          key={`sub-${i}`}
          x={b.x} y={b.y}
          width={b.w} height={b.h}
          fill={`rgb(${b.l}, ${b.l + 2}, ${b.l + 8})`}
        />
      ))}

      {/* ── Diagonal / curved boulevard ── */}
      {/* Dark street surface beneath the diagonal */}
      <path d="M 0 560 L 480 220 L 900 90" stroke="#09090e" strokeWidth="22" fill="none" />
      {/* Dim diagonal boulevard */}
      <path d="M 0 560 L 480 220 L 900 90" stroke="#2a1f00" strokeWidth="14" fill="none" opacity="0.9" />

      {/* === LUMEN LAYER === */}
      {layers.lumen && (
        <g>
          {/* Diagonal boulevard lit — amber dim */}
          <path d="M 0 560 L 480 220 L 900 90"
            stroke="#f59e0b" strokeWidth="1.5" fill="none" opacity="0.45"
            filter="url(#glow-dim)" />
          {/* Bright vertical streets — cyan glow */}
          {V_STREETS.filter(s => s.lit === 'bright').map((s, i) => (
            <g key={`vb-${i}`}>
              {/* Wide diffuse bloom */}
              <line x1={s.cx} y1={0} x2={s.cx} y2={800}
                stroke="#00e5cc" strokeWidth="18" opacity="0.04"
                filter="url(#glow-bright)" />
              {/* Main glow line */}
              <line x1={s.cx} y1={0} x2={s.cx} y2={800}
                stroke="#00e5cc" strokeWidth="2.5" opacity="0.9"
                filter="url(#glow-bright)" />
              {/* Bright center highlight */}
              <line x1={s.cx} y1={0} x2={s.cx} y2={800}
                stroke="#b2f5ef" strokeWidth="0.8" opacity="0.85" />
            </g>
          ))}
          {/* Bright horizontal streets */}
          {H_STREETS.filter(s => s.lit === 'bright').map((s, i) => (
            <g key={`hb-${i}`}>
              <line x1={0} y1={s.cy} x2={1200} y2={s.cy}
                stroke="#00e5cc" strokeWidth="18" opacity="0.04"
                filter="url(#glow-bright)" />
              <line x1={0} y1={s.cy} x2={1200} y2={s.cy}
                stroke="#00e5cc" strokeWidth="2.5" opacity="0.9"
                filter="url(#glow-bright)" />
              <line x1={0} y1={s.cy} x2={1200} y2={s.cy}
                stroke="#b2f5ef" strokeWidth="0.8" opacity="0.85" />
            </g>
          ))}
          {/* Dim vertical streets — amber */}
          {V_STREETS.filter(s => s.lit === 'dim').map((s, i) => (
            <g key={`vd-${i}`}>
              <line x1={s.cx} y1={0} x2={s.cx} y2={800}
                stroke="#f59e0b" strokeWidth="1.5" opacity="0.55"
                filter="url(#glow-dim)" />
            </g>
          ))}
          {/* Dim horizontal streets */}
          {H_STREETS.filter(s => s.lit === 'dim').map((s, i) => (
            <g key={`hd-${i}`}>
              <line x1={0} y1={s.cy} x2={1200} y2={s.cy}
                stroke="#f59e0b" strokeWidth="1.5" opacity="0.55"
                filter="url(#glow-dim)" />
            </g>
          ))}
          {/* Intersection bright spots where bright streets cross */}
          {V_STREETS.filter(s => s.lit === 'bright').map(vs =>
            H_STREETS.filter(s => s.lit === 'bright').map(hs => (
              <circle
                key={`ix-${vs.cx}-${hs.cy}`}
                cx={vs.cx} cy={hs.cy} r="14"
                fill="#00e5cc" opacity="0.06"
                filter="url(#glow-bright)"
              />
            ))
          )}
        </g>
      )}

      {/* === SOCIAL SAFETY LAYER — Incidents === */}
      {layers.socialSafety && INCIDENTS.map(inc => {
        const isSelected = selectedId === `incident-${inc.id}`;
        const color = INCIDENT_COLORS[inc.type];
        return (
          <g
            key={`inc-${inc.id}`}
            onClick={() => onMarkerClick({ type: 'incident', data: inc })}
            style={{ cursor: 'pointer' }}
          >
            {/* Outer pulse ring 1 */}
            <circle cx={inc.x} cy={inc.y} r="8" fill="none" stroke={color} strokeWidth="1.5">
              <animate attributeName="r" from="8" to="26" dur="2.2s" repeatCount="indefinite" begin="0s" />
              <animate attributeName="opacity" from="0.7" to="0" dur="2.2s" repeatCount="indefinite" begin="0s" />
            </circle>
            {/* Outer pulse ring 2 — offset */}
            <circle cx={inc.x} cy={inc.y} r="8" fill="none" stroke={color} strokeWidth="1">
              <animate attributeName="r" from="8" to="26" dur="2.2s" repeatCount="indefinite" begin="0.8s" />
              <animate attributeName="opacity" from="0.5" to="0" dur="2.2s" repeatCount="indefinite" begin="0.8s" />
            </circle>
            {/* Inner fill aura */}
            <circle cx={inc.x} cy={inc.y} r="9"
              fill={color} opacity="0.15" />
            {/* Core dot with glow */}
            <circle cx={inc.x} cy={inc.y} r={isSelected ? 7 : 5}
              fill={color} filter="url(#glow-marker)" opacity={0.95} />
            {/* Selected ring */}
            {isSelected && (
              <circle cx={inc.x} cy={inc.y} r="18"
                fill="none" stroke={color} strokeWidth="2" opacity="0.6" />
            )}
          </g>
        );
      })}

      {/* === ACTIVE FRONTS LAYER === */}
      {layers.activeFronts && ACTIVE_FRONTS.map(af => {
        const isSelected = selectedId === `active-${af.id}`;
        return (
          <g
            key={`af-${af.id}`}
            onClick={() => onMarkerClick({ type: 'active-front', data: af })}
            style={{ cursor: 'pointer' }}
          >
            {/* Gentle pulse */}
            <circle cx={af.x} cy={af.y} r="7" fill="none" stroke="#10b981" strokeWidth="1">
              <animate attributeName="r" from="7" to="20" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.5" to="0" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx={af.x} cy={af.y} r="8" fill="#10b981" opacity="0.18" />
            <circle cx={af.x} cy={af.y} r={isSelected ? 7 : 5}
              fill="#10b981" filter="url(#glow-marker)" opacity="0.95" />
            {isSelected && (
              <circle cx={af.x} cy={af.y} r="16"
                fill="none" stroke="#10b981" strokeWidth="2" opacity="0.6" />
            )}
          </g>
        );
      })}

      {/* === USER LOCATION === */}
      <g style={{ pointerEvents: 'none' }}>
        {/* Blue user pulse */}
        <circle cx={592} cy={425} r="10" fill="none" stroke="#60a5fa" strokeWidth="1.5">
          <animate attributeName="r" from="10" to="32" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.6" to="0" dur="1.8s" repeatCount="indefinite" />
        </circle>
        <circle cx={592} cy={425} r="12" fill="#3b82f6" opacity="0.12" filter="url(#glow-user)" />
        <circle cx={592} cy={425} r="7" fill="#3b82f6" filter="url(#glow-user)" opacity="0.9" />
        <circle cx={592} cy={425} r="3.5" fill="white" opacity="0.95" />
      </g>

      {/* === MAP LEGEND / SCALE (bottom-right) === */}
      <g opacity="0.4" transform="translate(1080, 760)">
        <line x1="0" y1="0" x2="60" y2="0" stroke="#4a5568" strokeWidth="1" />
        <line x1="0" y1="-4" x2="0" y2="4" stroke="#4a5568" strokeWidth="1" />
        <line x1="60" y1="-4" x2="60" y2="4" stroke="#4a5568" strokeWidth="1" />
        <text x="30" y="-8" fill="#4a5568" fontSize="8" textAnchor="middle" fontFamily="monospace">200m</text>
      </g>
    </svg>
  );
}
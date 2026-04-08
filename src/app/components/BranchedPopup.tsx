import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { SafetyAudit } from '../types';

// ── Config ─────────────────────────────────────────────────────────────────
const BRANCH_RADIUS = 88;   // px from center to node circle
const BADGE_RADIUS   = 148; // px from center to badge center

const NODES = [
  { key: 'illumination'    as const, label: 'Illumination',   icon: '💡', color: '#f59e0b', angle: -90  },
  { key: 'crowd_vibe'      as const, label: 'Crowd Vibe',     icon: '👥', color: '#3b82f6', angle: -18  },
  { key: 'eyes_on_street'  as const, label: 'Eyes on Street', icon: '👁️', color: '#a855f7', angle:  54  },
  { key: 'escape_options'  as const, label: 'Escape Options', icon: '🚪', color: '#ef4444', angle:  126 },
  { key: 'walkability'     as const, label: 'Walkability',    icon: '🚶', color: '#10b981', angle:  198 },
] as const;

function scoreColor(score: number) {
  if (score > 75) return '#00e5cc';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function scoreLabel(score: number) {
  if (score > 75) return 'High Aura';
  if (score >= 40) return 'Moderate';
  return 'Low Aura';
}

function toRad(deg: number) { return (deg * Math.PI) / 180; }

// ── SVG Node (geometry only, no text) ──────────────────────────────────────
function BranchNode({
  node,
  score,
  visible,
  delay,
}: {
  node: typeof NODES[number];
  score: number;
  visible: boolean;
  delay: number;
}) {
  const x = Math.cos(toRad(node.angle)) * BRANCH_RADIUS;
  const y = Math.sin(toRad(node.angle)) * BRANCH_RADIUS;
  const fill = score / 5;

  return (
    <g
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0)',
        transformOrigin: '0 0',
        transition: `opacity 0.35s ease ${delay}s, transform 0.4s cubic-bezier(0.34,1.56,0.64,1) ${delay}s`,
      }}
    >
      {/* Connector line (extended to BADGE_RADIUS) */}
      <line
        x1="0" y1="0"
        x2={Math.cos(toRad(node.angle)) * (BADGE_RADIUS - 28)}
        y2={Math.sin(toRad(node.angle)) * (BADGE_RADIUS - 28)}
        stroke={node.color}
        strokeWidth={1}
        strokeOpacity={0.25}
        strokeDasharray="3 4"
      />

      {/* Node track ring */}
      <circle cx={x} cy={y} r={20} fill={`${node.color}18`} stroke={`${node.color}28`} strokeWidth={1} />

      {/* Score arc */}
      <circle
        cx={x} cy={y} r={20}
        fill="none"
        stroke={node.color}
        strokeWidth={3.5}
        strokeDasharray={`${fill * 125.7} 125.7`}
        strokeLinecap="round"
        strokeOpacity={0.95}
        transform={`rotate(-90 ${x} ${y})`}
        style={{ filter: `drop-shadow(0 0 5px ${node.color})` }}
      />

      {/* Icon */}
      <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="13">
        {node.icon}
      </text>
    </g>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
interface BranchedPopupProps {
  audit: SafetyAudit;
  screenX: number;
  screenY: number;
  onClose: () => void;
}

const CANVAS_SIZE = (BADGE_RADIUS + 52) * 2;

export function BranchedPopup({ audit, screenX, screenY, onClose }: BranchedPopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const color = scoreColor(audit.aura_score);
  const half = CANVAS_SIZE / 2;

  return (
    <div
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        width: 0,
        height: 0,
        pointerEvents: 'none',
        zIndex: 40,
      }}
    >
      {/* Canvas centered on the pin */}
      <div
        style={{
          position: 'absolute',
          left: -half,
          top: -half,
          width: CANVAS_SIZE,
          height: CANVAS_SIZE,
          pointerEvents: 'auto',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.6)',
          transition: 'opacity 0.25s ease, transform 0.38s cubic-bezier(0.34,1.56,0.64,1)',
          transformOrigin: 'center center',
        }}
      >
        {/* ── SVG geometry layer ── */}
        <svg
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          viewBox={`${-half} ${-half} ${CANVAS_SIZE} ${CANVAS_SIZE}`}
          style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
        >
          {/* Center dark overlay background */}
          <circle cx={0} cy={0} r={32} fill="#06080c" opacity={0.9} />
          <circle cx={0} cy={0} r={32} fill="none" stroke={`${color}30`} strokeWidth={1} />
          
          <circle
            cx={0} cy={0} r={28}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeOpacity={0.65}
            style={{ filter: `drop-shadow(0 0 7px ${color})` }}
          />

          {/* Nodes */}
          {NODES.map((node, i) => (
            <BranchNode
              key={node.key}
              node={node}
              score={audit[node.key]}
              visible={visible}
              delay={0.05 + i * 0.06}
            />
          ))}
        </svg>

        {/* ── Center aura score badge (HTML) ── */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center"
          style={{ pointerEvents: 'none', zIndex: 2 }}
        >
          <span className="font-black font-mono leading-none" style={{ color: '#fff', fontSize: 22, textShadow: `0 0 10px ${color}88` }}>
            {audit.aura_score}
          </span>
          <span className="text-[9px] tracking-widest uppercase mt-0.5" style={{ color, opacity: 0.8, letterSpacing: '0.14em' }}>
            aura
          </span>
        </div>

        {/* ── HTML badge overlay for each node ── */}
        {NODES.map((node, i) => {
          const bx = Math.cos(toRad(node.angle)) * BADGE_RADIUS;
          const by = Math.sin(toRad(node.angle)) * BADGE_RADIUS;
          const score = audit[node.key];
          const delay = 0.08 + i * 0.07;

          return (
            <div
              key={node.key}
              style={{
                position: 'absolute',
                left: half + bx,
                top: half + by,
                transform: 'translate(-50%, -50%)',
                opacity: visible ? 1 : 0,
                scale: visible ? '1' : '0.5',
                transition: `opacity 0.3s ease ${delay}s, scale 0.38s cubic-bezier(0.34,1.56,0.64,1) ${delay}s`,
                pointerEvents: 'none',
                zIndex: 3,
              }}
            >
              <div
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl backdrop-blur-md"
                style={{
                  background: 'rgba(4, 5, 9, 0.82)',
                  border: `1px solid ${node.color}35`,
                  boxShadow: `0 0 14px rgba(0,0,0,0.6), 0 0 8px ${node.color}18`,
                  minWidth: 72,
                }}
              >
                {/* Score */}
                <span
                  className="font-bold font-mono leading-none tabular-nums"
                  style={{ color: node.color, fontSize: 14 }}
                >
                  {score}<span className="text-[9px] font-normal opacity-60">/5</span>
                </span>
                {/* Label */}
                <span className="text-[10px] font-medium text-center leading-tight whitespace-nowrap" style={{ color: '#a1a1aa' }}>
                  {node.label}
                </span>
              </div>
            </div>
          );
        })}

        {/* ── Close button ── */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-zinc-500 hover:text-zinc-300 transition-colors backdrop-blur-md"
          style={{
            background: 'rgba(4,5,9,0.85)',
            border: '1px solid rgba(255,255,255,0.1)',
            pointerEvents: 'auto',
          }}
        >
          <X size={10} />
        </button>

        {/* ── Bottom Aura label chip ── */}
        <div
          className="absolute left-1/2 -translate-x-1/2 px-3 py-1 rounded-full backdrop-blur-md text-[10px] font-semibold tracking-wider uppercase whitespace-nowrap"
          style={{
            bottom: 14,
            background: 'rgba(4,5,9,0.82)',
            border: `1px solid ${color}40`,
            color,
            boxShadow: `0 0 12px ${color}18`,
          }}
        >
          {scoreLabel(audit.aura_score)}
        </div>
      </div>
    </div>
  );
}

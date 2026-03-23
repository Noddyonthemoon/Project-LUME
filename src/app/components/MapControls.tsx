import React, { useState } from 'react';
import { Plus, Minus, Navigation, Crosshair, Layers } from 'lucide-react';

interface MapControlsProps {
  onCenterLocation?: () => void;
}

const btnBase: React.CSSProperties = {
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(8, 10, 14, 0.82)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(0, 229, 204, 0.10)',
  borderRadius: 10,
  cursor: 'pointer',
  color: '#71717a',
  transition: 'all 0.15s ease',
  flexShrink: 0,
};

function ControlBtn({
  icon: Icon,
  onClick,
  title,
  active,
  size = 16,
}: {
  icon: React.ComponentType<{ size?: number }>;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  size?: number;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...btnBase,
        color: active ? '#00e5cc' : hover ? '#a1a1aa' : '#52525b',
        background: active
          ? 'rgba(0,229,204,0.10)'
          : hover
          ? 'rgba(255,255,255,0.07)'
          : 'rgba(8,10,14,0.82)',
        boxShadow: active ? '0 0 10px rgba(0,229,204,0.12)' : 'none',
        border: active ? '1px solid rgba(0,229,204,0.25)' : '1px solid rgba(0,229,204,0.10)',
      }}
    >
      <Icon size={size} />
    </button>
  );
}

function Compass() {
  const [rotate, setRotate] = useState(0);
  return (
    <button
      title="Reset north"
      onClick={() => setRotate(r => r + 90)}
      style={{
        ...btnBase,
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e =>
        ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)')
      }
      onMouseLeave={e =>
        ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(8,10,14,0.82)')
      }
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        style={{ transform: `rotate(${rotate}deg)`, transition: 'transform 0.4s ease' }}
      >
        {/* North - cyan */}
        <polygon points="9,2 11,9 9,7 7,9" fill="#00e5cc" opacity="0.9" />
        {/* South - dim */}
        <polygon points="9,16 11,9 9,11 7,9" fill="#52525b" opacity="0.8" />
        {/* Center dot */}
        <circle cx="9" cy="9" r="1.5" fill="#71717a" />
      </svg>
    </button>
  );
}

export function MapControls({ onCenterLocation }: MapControlsProps) {
  const [zoom, setZoom] = useState(1);

  return (
    <div
      className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col gap-1.5"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Zoom in */}
      <ControlBtn
        icon={Plus}
        title="Zoom in"
        onClick={() => setZoom(z => Math.min(z + 1, 5))}
        size={15}
      />
      {/* Zoom level pip */}
      <div
        style={{
          ...btnBase,
          cursor: 'default',
          flexDirection: 'column',
          gap: 2,
          padding: '4px 0',
          height: 'auto',
          paddingTop: 6,
          paddingBottom: 6,
        }}
      >
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              backgroundColor: i < zoom ? '#00e5cc' : '#27272a',
              boxShadow: i < zoom ? '0 0 4px #00e5cc' : 'none',
              transition: 'all 0.2s',
            }}
          />
        ))}
      </div>
      {/* Zoom out */}
      <ControlBtn
        icon={Minus}
        title="Zoom out"
        onClick={() => setZoom(z => Math.max(z - 1, 1))}
        size={15}
      />

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />

      {/* Compass */}
      <Compass />

      {/* Center / My Location */}
      <ControlBtn
        icon={Crosshair}
        title="Center on my location"
        onClick={onCenterLocation}
        size={15}
      />
    </div>
  );
}

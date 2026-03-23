import React, { useEffect, useState } from 'react';
import { Radio, Clock, AlertTriangle, Navigation } from 'lucide-react';

import type { UserReport } from '../types';

const getAlertMessage = (r: UserReport) => {
  const typeLabel = r.type === 'broken-light' ? 'Broken streetlight' : r.type === 'harassment' ? 'Harassment' : r.type === 'secluded' ? 'Secluded path' : 'Safety incident';
  const loc = `${r.lngLat[0].toFixed(3)}, ${r.lngLat[1].toFixed(3)}`;
  const timeDiff = Date.now() - r.timestamp;
  const timeLabel = timeDiff < 3600000 ? `${Math.floor(timeDiff/60000)}m ago` : `${Math.floor(timeDiff/3600000)}h ago`;
  return `${typeLabel} reported at ${loc} · ${timeLabel}`;
};

const DEFAULT_ALERTS = [
  'LUME Network Live · No major incidents in the last hour',
  'Safety tips: Avoid unlit paths on Chord Rd after 10PM',
];


interface TopBarProps {
  sidebarOpen: boolean;
  reports: UserReport[];
}


const SIDEBAR_W = 288;
const SIDEBAR_LEFT = 20;
const SIDEBAR_GAP = 20;

export function TopBar({ sidebarOpen, reports }: TopBarProps) {
  const [time, setTime] = useState(new Date());
  const [alertIdx, setAlertIdx] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    const clockTick = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(clockTick);
  }, []);

  const activeAlerts = reports.length > 0 
    ? reports.sort((a,b) => b.timestamp - a.timestamp).slice(0, 5).map(getAlertMessage)
    : DEFAULT_ALERTS;

  useEffect(() => {
    const cycle = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setAlertIdx((i) => (i + 1) % activeAlerts.length);
        setFadeIn(true);
      }, 300);
    }, 5000);
    return () => clearInterval(cycle);
  }, [activeAlerts.length]);


  const hours = time.getHours();
  const isNight = hours < 6 || hours >= 20;
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const leftOffset = sidebarOpen
    ? SIDEBAR_LEFT + SIDEBAR_W + SIDEBAR_GAP
    : 20;

  return (
    <div
      className="absolute top-5 right-[72px] flex items-center gap-3 px-3 py-2 rounded-xl pointer-events-none"
      style={{
        left: leftOffset,
        transition: 'left 0.32s cubic-bezier(0.4,0,0.2,1)',
        background: 'rgba(8,10,14,0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(0,229,204,0.09)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* Live badge */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Radio size={11} style={{ color: '#00e5cc' }} />
        <span style={{ fontSize: 10, color: '#00e5cc', letterSpacing: '0.1em' }}>LIVE</span>
        <span
          style={{
            width: 6, height: 6, borderRadius: '50%',
            backgroundColor: '#00e5cc',
            boxShadow: '0 0 6px #00e5cc',
            animation: 'pulse 2s infinite',
            display: 'inline-block',
          }}
        />
      </div>

      <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />

      {/* Scrolling alert */}
      <div className="flex-1 flex items-center gap-1.5 overflow-hidden min-w-0">
        <AlertTriangle size={10} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <span
          style={{
            fontSize: 10, color: '#a1a1aa',
            opacity: fadeIn ? 1 : 0,
            transition: 'opacity 0.3s ease',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {activeAlerts[alertIdx] || activeAlerts[0]}
        </span>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-1">
          <span style={{ fontSize: 9, color: isNight ? '#7c3aed' : '#f59e0b' }}>
            {isNight ? '🌙 NIGHT' : '☀ DAY'}
          </span>
        </div>
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />
        <div className="flex items-center gap-1">
          <Navigation size={9} style={{ color: '#60a5fa' }} />
          <span style={{ fontSize: 10, color: '#52525b' }}>Bangalore, IN</span>
        </div>
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />
        <div className="flex items-center gap-1">
          <Clock size={9} style={{ color: '#52525b' }} />
          <span style={{ fontSize: 10, color: '#71717a', fontVariantNumeric: 'tabular-nums' }}>
            {timeStr}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Shared types for LUME ───────────────────────────────────────────────────

export interface UserReport {
  id: string;
  type: 'broken-light' | 'harassment' | 'secluded' | 'active-front';
  severity: 'low' | 'medium' | 'high';
  lngLat: [number, number];
  timestamp: number;
  description?: string;
}

export interface SafetyAudit {
  id: number;
  lngLat: [number, number];
  timestamp: number;
  illumination: number;
  crowd_vibe: number;
  eyes_on_street: number;
  escape_options: number;
  walkability: number;
  aura_score: number;
}

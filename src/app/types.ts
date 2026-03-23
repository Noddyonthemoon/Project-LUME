// ─── Shared types for LUME ───────────────────────────────────────────────────

export interface UserReport {
  id: string;
  type: 'broken-light' | 'harassment' | 'secluded' | 'active-front';
  severity: 'low' | 'medium' | 'high';
  lngLat: [number, number];
  timestamp: number;
  description?: string;
}

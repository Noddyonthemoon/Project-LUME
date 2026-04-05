import { supabase } from '../../lib/supabase';
import type { Incident, ActiveFront } from '../components/MapSVG';
import type { UserReport, SafetyAudit } from '../types';

// Fallback arrays to mock an unconfigured database connection
import { INCIDENTS, ACTIVE_FRONTS } from '../components/MapSVG';
import { NEW_ACTIVE_FRONTS, NEW_ACTIVE_FRONT_COORDS } from '../../generated-fronts';

const INCIDENT_COORDS: Record<number, [number, number]> = {
  1: [77.5625, 13.0372], 2: [77.5582, 13.0410], 3: [77.5698, 13.0312],
  4: [77.5648, 13.0282], 5: [77.5712, 13.0402], 6: [77.5562, 13.0358],
  200: [77.5638, 13.0350], 201: [77.5638, 13.0345], 202: [77.5638, 13.0340],
  203: [77.5638, 13.0335], 204: [77.5638, 13.0330],
};
const ACTIVE_FRONT_COORDS: Record<number, [number, number]> = {
  1: [77.5643, 13.0365], 2: [77.5590, 13.0385], 3: [77.5675, 13.0345], 4: [77.5652, 13.0420],
};

const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function getIncidents(): Promise<(Incident & { lngLat: [number, number] })[]> {
  if (!isSupabaseConfigured) {
    console.warn('LUME API: Falling back to local Mock Incidents (Missing .env variables)');
    return INCIDENTS.map(inc => ({ ...inc, lngLat: INCIDENT_COORDS[inc.id] || [0, 0] }));
  }

  const { data, error } = await supabase.from('incidents').select('*');
  if (error) {
    console.error('Error fetching incidents from Supabase:', error);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    type: row.type,
    x: 0, 
    y: 0,
    lngLat: [row.lng, row.lat],
    severity: row.severity,
    reports: row.reports_count,
    title: row.title,
    description: row.description,
    time: row.time_label || 'recent',
    street: row.street || '',
  }));
}

export async function getActiveFronts(): Promise<(ActiveFront & { lngLat: [number, number] })[]> {
  if (!isSupabaseConfigured) {
    console.warn('LUME API: Falling back to local Mock Fronts (Missing .env variables)');
    return [...ACTIVE_FRONTS, ...NEW_ACTIVE_FRONTS].map(af => {
      const coords = ACTIVE_FRONT_COORDS[af.id] || (NEW_ACTIVE_FRONT_COORDS as unknown as Record<number, [number, number]>)[af.id] || [0, 0];
      return { ...af, lngLat: coords as [number, number] };
    });
  }

  const { data, error } = await supabase.from('active_fronts').select('*');
  if (error) {
    console.error('Error fetching active fronts:', error);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    x: 0,
    y: 0,
    lngLat: [row.lng, row.lat],
    name: row.name,
    category: row.category,
    hours: row.hours || '',
  }));
}

export async function getUserReports(): Promise<UserReport[]> {
  if (!isSupabaseConfigured) return [];
  
  const { data, error } = await supabase.from('user_reports').select('*');
  if (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id.toString(),
    type: row.type,
    lngLat: [row.lng, row.lat],
    severity: row.severity,
    description: row.description || '',
    timestamp: new Date(row.created_at).getTime(),
  }));
}

export async function submitUserReport(report: Partial<UserReport>): Promise<boolean> {
  if (!isSupabaseConfigured) {
    console.warn('LUME API: Mocking successful POST report (Missing .env variables)');
    return true; // We return true so the frontend state optimistically updates it locally correctly!
  }

  const { error } = await supabase.from('user_reports').insert({
    type: report.type,
    lng: report.lngLat?.[0],
    lat: report.lngLat?.[1],
    severity: report.severity,
    description: report.description,
  });
  if (error) {
    console.error('Error submitting report to Supabase:', error);
    return false;
  }
  return true;
}

export async function deleteReport(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    console.warn('LUME API: Mock delete (Missing .env variables)');
    return true;
  }
  const { error } = await supabase.from('user_reports').delete().eq('id', id);
  if (error) {
    console.error('Error deleting report:', error);
    return false;
  }
  return true;
}

export function subscribeToReports(onEvent: (event: any) => void) {
  if (!isSupabaseConfigured) return null;
  
  return supabase
    .channel('user_reports_realtime')
    .on(
      'postgres_changes',
      { event: '*', table: 'user_reports', schema: 'public' },
      onEvent
    )
    .subscribe();
}

// ── Safety Audits ────────────────────────────────────────────

export async function getSafetyAudits(): Promise<SafetyAudit[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('safety_audits').select('*').order('created_at', { ascending: false });
  if (error) { console.error('Error fetching safety audits:', error); return []; }
  return (data || []).map((row: any) => ({
    id: row.id,
    lngLat: [row.lng, row.lat] as [number, number],
    timestamp: new Date(row.created_at).getTime(),
    illumination: row.illumination,
    crowd_vibe: row.crowd_vibe,
    eyes_on_street: row.eyes_on_street,
    escape_options: row.escape_options,
    walkability: row.walkability,
    aura_score: row.aura_score,
  }));
}

export async function submitSafetyAudit(
  lngLat: [number, number],
  params: { illumination: number; crowd_vibe: number; eyes_on_street: number; escape_options: number; walkability: number }
): Promise<SafetyAudit | null> {
  if (!isSupabaseConfigured) {
    console.warn('LUME API: Mocking audit submit (Missing .env variables)');
    return {
      id: Date.now(),
      lngLat,
      timestamp: Date.now(),
      ...params,
      aura_score: Math.round(((params.illumination + params.crowd_vibe + params.eyes_on_street + params.escape_options + params.walkability) / 20) * 100),
    };
  }

  const aura_score = Math.round(
    ((params.illumination + params.crowd_vibe + params.eyes_on_street + params.escape_options + params.walkability) / 20) * 100
  );

  const { data, error } = await supabase.from('safety_audits').insert({
    lng: lngLat[0], lat: lngLat[1],
    ...params,
    aura_score,
  }).select().single();

  if (error) { console.error('Error submitting safety audit:', error); return null; }
  return {
    id: data.id,
    lngLat,
    timestamp: new Date(data.created_at).getTime(),
    ...params,
    aura_score,
  };
}



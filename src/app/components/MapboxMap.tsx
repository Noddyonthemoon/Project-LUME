import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Supercluster from 'supercluster';
import { MAP_CENTER, MAP_ZOOM, MAP_STYLE } from '../../config';
import type { LayerState, Incident, ActiveFront } from './MapSVG';
import { INCIDENTS } from './MapSVG';
import type { UserReport, SafetyAudit } from '../types';
import { fetchOSMLandmarks, type OSMLandmark } from '../api/osm';


const INCIDENT_COLORS: Record<string, string> = {
  harassment: '#ef4444', 'broken-light': '#f59e0b', secluded: '#a855f7',
};

const ZONE_RING_COLORS: Record<string, string> = {
  'broken-light': '#b91c1c', harassment: '#ef4444',
  secluded: '#9333ea', 'active-front': '#10b981',
};

const LUMEN_LAYERS = { brightGlow: 'lume-bright-glow', bright: 'lume-bright-roads', dim: 'lume-dim-roads' } as const;
const ZONE_LAYERS = { fog: 'lume-zone-fog', fill: 'lume-zone-fill', center: 'lume-zone-center' } as const;
const REPORTS_SOURCE = 'lume-reports-source';
const DARK_GAP_SOURCE = 'lume-dark-gap-source';
const DARK_GAP_LAYER = 'lume-dark-gap';
const ACTIVE_FRONTS_SOURCE = 'lume-active-fronts-source';
const ACTIVE_FRONT_LAYERS = {
  unclustered: 'lume-active-front-unclustered',
  cluster: 'lume-active-front-cluster',
  count: 'lume-active-front-cluster-count'
} as const;
const ZOOM_THRESHOLD = 14.5;
const LANDMARK_ZOOM_THRESHOLD = 15.2;

const MSRIT_BOUNDS: maplibregl.LngLatBoundsLike = [
  [77.53, 13.01], // Southwest coordinates
  [77.60, 13.06]  // Northeast coordinates
];





/* Static landmarks removed in favor of dynamic OSM fetching */

// Helper: map OSM type to LUME category
const getLandmarkCategory = (type: string) => {
  const t = type.toLowerCase();
  if (t === 'university' || t === 'college' || t === 'school') return 'Education';
  if (t === 'hospital' || t === 'clinic' || t === 'doctors') return 'Healthcare';
  if (t === 'restaurant' || t === 'cafe' || t === 'fast_food' || t === 'pub' || t === 'bar') return 'Dining';
  if (t === 'bus_station' || t === 'train_station' || t === 'subway_entrance' || t === 'station' || t === 'bus_stop') return 'Transport';
  if (t === 'park' || t === 'garden' || t === 'recreation_ground') return 'Leisure';
  if (t === 'mall' || t === 'supermarket' || t === 'marketplace') return 'Retail';
  return 'Point of Interest';
};


// ── Shared Helpers ────────────────────────────────────────────
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
}

function buildPopupHTML(opts: { type: string; severity?: string; time?: string; title?: string; desc?: string; dismissId?: string; }): string {
  const TYPE_LABELS: Record<string, string> = { harassment: 'Harassment Hotspot', 'broken-light': 'Broken Streetlight', secluded: 'Secluded Path', 'active-front': 'Active Front' };
  const color = ZONE_RING_COLORS[opts.type] ?? '#71717a';
  const label = opts.title ?? TYPE_LABELS[opts.type] ?? opts.type;

  let html = `<div class="lume-popup-type"><span class="lume-popup-dot" style="background:${color};box-shadow:0 0 6px ${color}"></span>${label}</div>`;
  const meta: string[] = [];
  if (opts.severity) meta.push(`Severity: <b style="color:${color}">${opts.severity}</b>`);
  if (opts.time) meta.push(opts.time);
  if (meta.length) html += `<div class="lume-popup-meta">${meta.join(' \u00b7 ')}</div>`;
  if (opts.desc) html += `<div class="lume-popup-desc">${opts.desc}</div>`;
  if (opts.dismissId) html += `<button class="lume-popup-dismiss" data-dismiss-id="${opts.dismissId}">Report No Longer Exists</button>`;

  return html;
}

// ── Helper: Generic Coordinate Clustering ──────────────────────────────
function clusterPoints<T extends { id: number }>(
  items: T[], 
  getCoords: (item: T) => [number, number] | undefined, 
  radiusInDegrees = 0.0006
) {
  const clusters: { coords: [number, number]; items: T[]; ids: number[] }[] = [];
  const visited = new Set<number>();

  for (let i = 0; i < items.length; i++) {
    if (visited.has(i)) continue;
    const p1 = items[i];
    visited.add(i);
    const coords1 = getCoords(p1);
    if (!coords1) continue;
    const cluster = { coords: [...coords1] as [number, number], items: [p1], ids: [p1.id] };

    for (let j = 0; j < items.length; j++) {
      if (visited.has(j)) continue;
      const p2 = items[j];
      const coords2 = getCoords(p2);
      if (!coords2) continue;
      const dist = Math.hypot(coords1[0] - coords2[0], coords1[1] - coords2[1]);
      if (dist < radiusInDegrees) {
        visited.add(j);
        cluster.items.push(p2);
        cluster.ids.push(p2.id);
        cluster.coords[0] += coords2[0];
        cluster.coords[1] += coords2[1];
      }
    }
    if (cluster.ids.length > 1) {
      cluster.coords[0] /= cluster.ids.length;
      cluster.coords[1] /= cluster.ids.length;
    }
    clusters.push(cluster);
  }

  return clusters;
}

// ── DOM Factories ─────────────────────────────────────────────
function createMarkerWrapper(color: string, size: number = 10, isPending = false): HTMLElement {
  const wrapper = document.createElement('div');

  if (isPending) {
    wrapper.className = 'lume-pending-pin';
    wrapper.style.cssText = 'position:relative; width:22px; height:28px; cursor:default;';
    wrapper.innerHTML = `
      <div style="position:absolute; bottom:0; left:50%; transform:translateX(-50%) rotate(-45deg); width:18px; height:22px; background:${color}; border-radius:50% 50% 50% 0; box-shadow:0 0 14px ${color}bb, 0 0 28px ${color}55;">
        <div style="position:absolute; top:50%; left:50%; width:7px; height:7px; background:#06080d; border-radius:50%; transform:translate(-50%,-50%) rotate(45deg);"></div>
      </div>
      <div style="position:absolute; bottom:-4px; left:50%; width:10px; height:4px; background:${color}40; border-radius:50%; transform:translateX(-50%); filter:blur(3px);"></div>
    `;
    return wrapper;
  }

  wrapper.className = 'lume-marker';

  wrapper.style.cssText = `width: 0px; height: 0px; position: relative; cursor: pointer;`;
  wrapper.innerHTML = `
    <div style="position: absolute; top: -12px; left: -12px; width: 24px; height: 24px;"></div>
    <div class="lume-marker-dot" style="position: absolute; top: 0; left: 0; width: ${size}px; height: ${size}px; background: ${color}; border-radius: 50%; border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 0 8px ${color}, 0 0 16px ${color}66; transform: translate(-50%, -50%);"></div>
  `;
  return wrapper;
}

function createUserLocationEl(): HTMLElement {

  const color = '#3b82f6';
  const wrapper = document.createElement('div');
  wrapper.className = 'lume-marker';
  wrapper.style.cssText = 'width:14px; height:14px; position: relative;';
  wrapper.innerHTML = `
    <div style="position:absolute; inset:-8px; border-radius:50%; background:${color}15;"></div>
    <div class="lume-marker-ring" style="border: 1.5px solid ${color}; opacity: 0; animation-duration: 1.8s;"></div>
    <div class="lume-marker-dot" style="width:14px; height:14px; background:${color}; box-shadow: 0 0 14px ${color}, 0 0 28px ${color}55;"></div>
    <div class="lume-marker-dot" style="width:6px; height:6px; background:white; z-index:1;"></div>
  `;
  return wrapper;
}

function createAuraPinEl(auraScore: number, id: number | string, clusterCount?: number): HTMLElement {
  const color = auraScore > 75 ? '#00e5cc' : auraScore >= 40 ? '#f59e0b' : '#ef4444';
  const el = document.createElement('div');
  el.dataset.auraPinId = String(id);
  el.style.cssText = 'width:0;height:0;position:relative;cursor:pointer;';
  
  const badgeHTML = clusterCount && clusterCount > 1 ? `
    <div style="position:absolute;bottom:-10px;right:-14px;background:#06080d;color:#fff;
                font-size:9px;font-weight:700;padding:2px 4px;border-radius:4px;
                border:1px solid ${color};z-index:2;pointer-events:none;white-space:nowrap;
                font-family:monospace;box-shadow:0 2px 4px rgba(0,0,0,0.5);">
      x${clusterCount}
    </div>
  ` : '';

  el.innerHTML = `
    <div class="lume-aura-pin" style="
      position:absolute;top:0;left:0;
      width:22px;height:22px;
      background:${color};
      border-radius:50%;
      transform:translate(-50%,-50%);
      box-shadow:0 0 10px ${color}, 0 0 22px ${color}55;
      border: 1.5px solid rgba(255,255,255,0.25);
    ">
    </div>
    <div style="
      position:absolute;top:0;left:0;
      font-size:8px;font-weight:800;
      color:white;
      transform:translate(-50%,-50%);
      pointer-events:none;z-index:1;
      text-shadow:0 1px 2px rgba(0,0,0,0.7);
    ">${auraScore}</div>
    ${badgeHTML}
  `;
  return el;
}

// ── Component ─────────────────────────────────────────────────
interface MapboxMapProps {
  layers: LayerState;
  incidents: (Incident & { lngLat: [number, number] })[];
  activeFronts: (ActiveFront & { lngLat: [number, number] })[];
  onMarkerClick: (data: { type: string; data: Incident | ActiveFront }) => void;
  selectedId: string | null;
  reports: UserReport[];
  onMapClick: (lngLat: [number, number]) => void;
  pendingLocation: [number, number] | null;
  onCenterChange?: (center: [number, number]) => void;
  onRemoveReport?: (id: string) => void;
  onRemoveReports?: (ids: string[]) => void;
  onAuraScoresChange?: (scores: { illumination: number; socialSafety: number; activeFronts: number }) => void;
  jumpTo?: { lngLat: [number, number]; id: string } | null;
  onJumpComplete?: () => void;
  osmLandmarks: OSMLandmark[];
  // Safety Audit props
  audits: SafetyAudit[];
  onAuraPinClick: (audit: SafetyAudit) => void;
  onMapReady?: (map: maplibregl.Map) => void;
  onMapStateChange?: (state: { zoom: number; bearing: number }) => void;
  userLocation: [number, number] | null;
}



export function MapboxMap(props: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);



  // Refs for managing map entities
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const reportMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const auraPinMarkersRef = useRef<Map<number | string, maplibregl.Marker>>(new Map());
  const clustererRef = useRef<Supercluster | null>(null);
  const pendingMarkerRef = useRef<maplibregl.Marker | null>(null);


  const sharedPopupRef = useRef<maplibregl.Popup | null>(null);

  // 1. STALE CLOSURE FIX: Always keep the latest callbacks in a ref
  const callbacks = useRef(props);
  useEffect(() => {
    callbacks.current = props;
  }, [props]);

  useEffect(() => {
    if (mapRef.current && props.jumpTo) {
      const map = mapRef.current;
      const { lngLat, id } = props.jumpTo;

      map.flyTo({
        center: lngLat,
        zoom: 16,
        essential: true
      });

      // Once move ends, try to find and trigger popup
      const onMoveEnd = () => {
        triggerPopupForReport(id);
        props.onJumpComplete?.();
      };

      map.once('moveend', onMoveEnd);
    }
  }, [props.jumpTo, props.onJumpComplete]);

  // ── Helper to find and trigger popup ────────────────────────
  const triggerPopupForReport = useCallback((id: string) => {
    let targetMarker: maplibregl.Marker | undefined;
    
    // Search report markers
    for (const marker of reportMarkersRef.current.values()) {
      const el = marker.getElement();
      const reportIds = el.dataset.reportIds?.split(',');
      if (reportIds?.includes(id)) {
        targetMarker = marker;
        break;
      }
    }
    
    // If not found, search static markers
    if (!targetMarker) {
      for (const [key, marker] of markersRef.current.entries()) {
        if (key.includes(id)) {
          targetMarker = marker;
          break;
        }
      }
    }

    if (targetMarker) {
      const el = targetMarker.getElement();
      el.dispatchEvent(new MouseEvent('mouseenter'));
    }
  }, []);

  useEffect(() => {
    (window as any).removeLumeReport = (id: string) => {
      props.onRemoveReport?.(id);
      if (sharedPopupRef.current) sharedPopupRef.current.remove();
    };

    (window as any).removeLumeReports = (idString: string) => {
      const ids = idString.split(',');
      props.onRemoveReports?.(ids);
      if (sharedPopupRef.current) sharedPopupRef.current.remove();
    };
  }, [props.onRemoveReport, props.onRemoveReports]);





  // ── CSS Injection ───────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById('lume-marker-styles')) return;
    const style = document.createElement('style');
    style.id = 'lume-marker-styles';
    style.textContent = `
      @keyframes lume-pulse { 0% { transform: scale(0.8); opacity: 0.8; } 70% { transform: scale(2.4); opacity: 0; } 100% { transform: scale(2.4); opacity: 0; } }
      @keyframes lume-pin-drop { 0% { transform: translateY(-12px) scale(0.7); opacity: 0; } 60% { transform: translateY(2px) scale(1.1); opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
      .lume-marker { transition: opacity 0.3s ease; z-index: 10; }
      .lume-marker.lume-animating { transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease !important; }
      .lume-cluster-badge { transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease; }
      .lume-hidden { opacity: 0 !important; pointer-events: none !important; }
      .lume-marker-ring { position: absolute; inset: 0; border-radius: 50%; animation: lume-pulse 2.2s ease-out infinite; }
      .lume-marker-dot { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); border-radius: 50%; transition: transform 0.15s ease; }
      .maplibregl-ctrl-group { display: none !important; }
      .maplibregl-ctrl-attrib { background: rgba(6,8,13,0.7) !important; backdrop-filter: blur(8px) !important; }
      .maplibregl-ctrl-attrib a { color: #3f3f46 !important; }
      .maplibregl-canvas { cursor: crosshair !important; }
      .lume-popup .maplibregl-popup-content { background: rgba(10,12,18,0.92) !important; backdrop-filter: blur(16px) !important; border: 1px solid rgba(255,255,255,0.08) !important; border-radius: 10px !important; padding: 10px 14px !important; box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important; color: #e4e4e7 !important; font-family: system-ui, sans-serif !important; font-size: 11px !important; min-width: 160px; max-width: 240px; }
      .lume-popup .maplibregl-popup-tip { border-top-color: rgba(10,12,18,0.92) !important; border-bottom-color: rgba(10,12,18,0.92) !important; }
      .lume-popup .maplibregl-popup-close-button { display: none; }
      .lume-popup-type { font-weight: 600; font-size: 12px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
      .lume-popup-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
      .lume-popup-meta { color: #a1a1aa; font-size: 10px; display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 2px; }
      .lume-popup-desc { color: #a1a1aa; font-size: 10px; margin-top: 4px; line-height: 1.4; }
      .lume-popup-dismiss { margin-top: 8px; width: 100%; padding: 5px 0; border-radius: 6px; border: 1px solid rgba(220,38,38,0.3); background: rgba(220,38,38,0.1); color: #fca5a5; font-size: 10px; cursor: pointer; transition: all 0.15s; font-weight: 500; }
      .lume-popup-dismiss:hover { background: rgba(220,38,38,0.25); border-color: rgba(220,38,38,0.5); }
    `;
    document.head.appendChild(style);
  }, []);

  // ── Hover Popup Management ──────────────────────────────────
  const attachPopupEvents = (el: HTMLElement, marker: maplibregl.Marker) => {
    el.addEventListener('mouseenter', () => {
      const map = mapRef.current;
      if (!map) return;

      const html = el.dataset.popupHtml;
      if (!html) return;

      // Destroy old popup if exists
      if (sharedPopupRef.current) sharedPopupRef.current.remove();

      const popup = new maplibregl.Popup({ offset: 14, closeButton: false, closeOnClick: false, className: 'lume-popup', maxWidth: '260px' })
        .setHTML(html)
        .setLngLat(marker.getLngLat())
        .addTo(map);

      sharedPopupRef.current = popup;

      // Handle dismiss button dynamically
      requestAnimationFrame(() => {
        const btn = popup.getElement()?.querySelector('.lume-popup-dismiss') as HTMLButtonElement | null;
        btn?.addEventListener('click', (e) => {
          e.stopPropagation();
          const idStr = btn.dataset.dismissId;
          if (idStr) {
            if (idStr.includes(',')) {
              callbacks.current.onRemoveReports?.(idStr.split(','));
            } else {
              callbacks.current.onRemoveReport?.(idStr);
            }
          }
          popup.remove();
        }, { once: true });
      });

    });

    el.addEventListener('mouseleave', () => {
      // Small delay prevents flickering if moving cursor to the popup
      setTimeout(() => {
        const popupEl = sharedPopupRef.current?.getElement();
        if (!popupEl?.matches(':hover')) {
          sharedPopupRef.current?.remove();
          sharedPopupRef.current = null;
        }
      }, 100);
    });
  };

  const updateMarkerVisibility = useCallback(() => {
    if (!mapRef.current) return;
    const currentZoom = mapRef.current.getZoom();
    const showAll = currentZoom >= ZOOM_THRESHOLD;

    const applyVis = (el: HTMLElement) => {
      const type = el.dataset.markerType;
      if (!type || type === 'user' || type === 'pending') return;

      if (type === 'landmark') {
        if (currentZoom >= LANDMARK_ZOOM_THRESHOLD) el.classList.remove('lume-hidden');
        else el.classList.add('lume-hidden');
        return;
      }

      if (showAll || type === 'broken-light') {
        el.classList.remove('lume-hidden');
      } else {
        el.classList.add('lume-hidden');
      }
    };

    markersRef.current.forEach((m) => applyVis(m.getElement()));
    reportMarkersRef.current.forEach((m) => applyVis(m.getElement()));
  }, []);



  const renderMarkers = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const currentZoom = map.getZoom();
    const dynamicRadius = 0.0006 * Math.pow(2, 16 - currentZoom);

    // Flatten all sources into single object structure — use callbacks.current to avoid stale closures
    const { incidents, activeFronts } = callbacks.current;
    const unifiedItems = [
      ...incidents.map((inc: any) => ({ origId: String(inc.id), type: inc.type, coords: inc.lngLat, data: inc, isReport: false })),
      ...callbacks.current.reports.map((r: any) => ({ origId: r.id, type: r.type, coords: r.lngLat as [number, number], data: r, isReport: true })),
    ].filter(item => item.coords) as { origId: string, type: string, coords: [number, number], data: any, isReport: boolean }[];


    // Ensure they have pure numeric IDs for the distance algorithm
    const itemsWithId = unifiedItems.map((item, index) => ({ ...item, id: index }));
    const types = Array.from(new Set(itemsWithId.map(i => i.type)));

    const newClusterIds = new Set<string>();

    types.forEach(type => {
      const itemsOfType = itemsWithId.filter(i => i.type === type);
      const clusters = clusterPoints(itemsOfType, i => i.coords, dynamicRadius);

      clusters.forEach(cluster => {
        const isCluster = cluster.ids.length > 1;
        const rep = cluster.items[0];
        const clusterKey = `${type}-${rep.origId}`;
        
        newClusterIds.add(clusterKey);

        let color = '';
        if (type === 'active-front') color = '#10b981';
        else if (type === 'broken-light') color = '#f59e0b';
        else if (type === 'harassment') color = '#ef4444';
        else if (type === 'secluded') color = '#a855f7';
        else color = ZONE_RING_COLORS[type] || '#ef4444';

        let marker = rep.isReport ? reportMarkersRef.current.get(clusterKey) : markersRef.current.get(clusterKey);
        let el: HTMLElement;

        if (!marker) {
          el = createMarkerWrapper(color, 10);
          el.dataset.markerType = type;
          marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(cluster.coords).addTo(map);
          attachPopupEvents(el, marker);
          
          if (rep.isReport) reportMarkersRef.current.set(clusterKey, marker);
          else markersRef.current.set(clusterKey, marker);
        } else {
          el = marker.getElement();
          
          // Animate the cluster merge/split transition specifically
          el.classList.add('lume-animating');
          marker.setLngLat(cluster.coords);
          el.dataset.markerType = type;

          setTimeout(() => el.classList.remove('lume-animating'), 450);
        }

        if (type === 'active-front') {
            el.style.display = callbacks.current.layers.activeFronts ? '' : 'none';
        } else {
            el.style.display = callbacks.current.layers.socialSafety ? '' : 'none';
        }

        let badge = el.querySelector('.lume-cluster-badge') as HTMLElement | null;
        if (isCluster) {
          if (!badge) {
            badge = document.createElement('div');
            badge.className = 'lume-cluster-badge absolute -top-3 -right-3 bg-[#06080d]/95 backdrop-blur-md text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-md flex items-center justify-center';
            el.appendChild(badge);
          }
          badge.innerText = `x${cluster.ids.length}`;
          badge.style.color = color;
          badge.style.borderColor = color;
          badge.style.boxShadow = `0 0 10px ${color}40`;
        } else if (badge) {
          badge.remove();
        }

        let title = '';
        let desc = '';
        let severity = rep.data?.severity;
        let time = rep.data?.time || (rep.isReport ? 'Recent' : undefined);

        if (type === 'active-front') {
            title = isCluster ? `Cluster of ${cluster.ids.length} Active Fronts` : rep.data.name;
            desc = isCluster ? `Dense area providing strong passive safety.` : `${rep.data.category} \u00b7 ${rep.data.hours}`;
        } else if (type === 'broken-light') {
            title = isCluster ? `Cluster of ${cluster.ids.length} Broken Lights` : rep.data.title || 'Broken Streetlight';
            desc = isCluster ? `Multiple consecutive streetlights are out.` : rep.data.description;
        } else {
            const rawTitle = rep.data.title || rep.data.description || 'Report';
            title = isCluster ? `Cluster of ${cluster.ids.length} ${type}s` : rawTitle;
            desc = isCluster ? `Dense reporting zone.` : rep.data.description;
        }

        el.onclick = (e) => { 
            e.stopPropagation(); 
            const modifiedData = { ...rep.data };
            if (type === 'active-front') {
                modifiedData.name = title;
                modifiedData.category = desc;
            } else {
                modifiedData.title = title;
                modifiedData.description = desc;
            }
            callbacks.current.onMarkerClick({ type: type === 'active-front' ? 'active-front' : 'incident', data: modifiedData }); 
        };

        const canDismiss = rep.isReport;
        const dismissId = isCluster ? cluster.items.map(i => i.origId).join(',') : (rep.isReport ? rep.origId : undefined);
        if (dismissId) el.dataset.reportIds = dismissId;
        el.dataset.popupHtml = buildPopupHTML({ type, severity, time, title, desc, dismissId });

      });
    });

    // Remove stale markers that dissolved
    Array.from(markersRef.current.keys()).forEach(key => {
        if (key !== 'user' && !newClusterIds.has(key)) {
            markersRef.current.get(key)?.remove();
            markersRef.current.delete(key);
        }
    });
    Array.from(reportMarkersRef.current.keys()).forEach(key => {
        if (!newClusterIds.has(key)) {
            reportMarkersRef.current.get(key)?.remove();
            reportMarkersRef.current.delete(key);
        }
    });

    updateMarkerVisibility();
  }, [updateMarkerVisibility]);

  const calculateAura = useCallback(() => {
    const map = mapRef.current;
    const { onAuraScoresChange, reports, incidents: dbIncidents, activeFronts: dbActiveFronts, audits } = callbacks.current;
    if (!map || !onAuraScoresChange) return;

    const bounds = map.getBounds();
    
    let visibleBrokenLight = 0;
    let visibleHarassment = 0;
    let visibleSecluded = 0;
    let visibleActiveFronts = 0;
    let totalItems = 0;

    const checkPoint = (lng: number, lat: number, type: string) => {
      if (bounds.contains([lng, lat])) {
        totalItems++;
        if (type === 'broken-light') visibleBrokenLight++;
        else if (type === 'harassment') visibleHarassment++;
        else if (type === 'secluded') visibleSecluded++;
        else if (type === 'active-front') visibleActiveFronts++;
      }
    };

    dbIncidents.forEach((inc: any) => {
      if (inc.lngLat) checkPoint(inc.lngLat[0], inc.lngLat[1], inc.type);
    });

    dbActiveFronts.forEach((af: any) => {
      if (af.lngLat) checkPoint(af.lngLat[0], af.lngLat[1], 'active-front');
    });

    reports.forEach(r => checkPoint(r.lngLat[0], r.lngLat[1], r.type));

    // ── Community Audits ──
    let auditCount = 0;
    let totalIllum = 0;
    let totalSocial = 0;
    let totalActive = 0;

    audits.forEach(a => {
      if (bounds.contains(a.lngLat)) {
        auditCount++;
        totalIllum += a.illumination * 20; // 1-5 scale maps to 20-100
        totalSocial += ((a.crowd_vibe + a.escape_options) / 2) * 20;
        totalActive += ((a.eyes_on_street + a.walkability) / 2) * 20;
      }
    });

    if (totalItems === 0 && auditCount === 0) {
      onAuraScoresChange({ illumination: 70, socialSafety: 70, activeFronts: 70 });
      return;
    }

    const baseIllum = Math.max(30, 95 - 15 * visibleBrokenLight);
    const baseSocial = Math.max(0, 100 - 20 * visibleHarassment - 10 * visibleSecluded);
    const baseActive = Math.min(100, visibleActiveFronts * 20);

    let illumination = baseIllum;
    let socialSafety = baseSocial;
    let activeFronts = baseActive;

    if (auditCount > 0) {
      // Blend base infrastructure scores 50/50 with subjective community audit sentiment
      illumination = Math.round((baseIllum + (totalIllum / auditCount)) / 2);
      socialSafety = Math.round((baseSocial + (totalSocial / auditCount)) / 2);
      activeFronts = Math.round((baseActive + (totalActive / auditCount)) / 2);
    }

    onAuraScoresChange({ illumination, socialSafety, activeFronts });
  }, []);

  // ── Map Initialization ──────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      minZoom: 13.5,
      maxBounds: MSRIT_BOUNDS,
      pitch: 0,
      bearing: 0,

      attributionControl: {},
    });

    mapRef.current = map;

    map.on('click', (e) => callbacks.current.onMapClick([e.lngLat.lng, e.lngLat.lat]));
    map.on('moveend', () => {
      callbacks.current.onCenterChange?.([map.getCenter().lng, map.getCenter().lat]);
      calculateAura();
    });
    map.on('zoom', updateMarkerVisibility);
    map.on('zoomend', renderMarkers);

    map.on('load', () => {
      if (!map.getSource('carto')) return; // Ensure base style is ready

      // Add Sources
      map.addSource(REPORTS_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addSource(DARK_GAP_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addSource(ACTIVE_FRONTS_SOURCE, { 
        type: 'geojson', 
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 18
      });


      // Add Lumen Layers
      map.addLayer({ id: LUMEN_LAYERS.brightGlow, type: 'line', source: 'carto', 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']]], paint: { 'line-color': '#ffe4b0', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 10, 14, 16, 16, 28, 18, 48], 'line-blur': ['interpolate', ['linear'], ['zoom'], 12, 10, 14, 14, 16, 24, 18, 36], 'line-opacity': 0.15 } });
      map.addLayer({ id: LUMEN_LAYERS.bright, type: 'line', source: 'carto', 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']]], paint: { 'line-color': '#ffecd2', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 3, 14, 6, 16, 12, 18, 20], 'line-blur': ['interpolate', ['linear'], ['zoom'], 12, 2, 14, 4, 16, 8, 18, 12], 'line-opacity': 0.40 } });
      map.addLayer({ id: LUMEN_LAYERS.dim, type: 'line', source: 'carto', 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', ['minor', 'service']]], paint: { 'line-color': '#e8d5a8', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2, 14, 4, 16, 8, 18, 16], 'line-blur': ['interpolate', ['linear'], ['zoom'], 12, 1.5, 14, 3, 16, 6, 18, 10], 'line-opacity': 0.40 } });

      // Add Dark Gap Layer
      map.addLayer({ id: DARK_GAP_LAYER, type: 'circle', source: DARK_GAP_SOURCE, paint: { 'circle-color': '#06080d', 'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 12, ['*', ['match', ['get', 'severity'], 'low', 0.4, 'medium', 1.0, 'high', 2.5, 1.0], 1], 14, ['*', ['match', ['get', 'severity'], 'low', 0.4, 'medium', 1.0, 'high', 2.5, 1.0], 4], 16, ['*', ['match', ['get', 'severity'], 'low', 0.4, 'medium', 1.0, 'high', 2.5, 1.0], 16], 18, ['*', ['match', ['get', 'severity'], 'low', 0.4, 'medium', 1.0, 'high', 2.5, 1.0], 64], 20, ['*', ['match', ['get', 'severity'], 'low', 0.4, 'medium', 1.0, 'high', 2.5, 1.0], 256]], 'circle-blur': 0.8, 'circle-opacity': 1 } });

      // Add Report Zone Layers
      map.addLayer({ id: ZONE_LAYERS.fog, type: 'circle', minzoom: ZOOM_THRESHOLD, source: REPORTS_SOURCE, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 8, 14, 16, 16, 24, 18, 36], 'circle-color': ['match', ['get', 'type'], 'broken-light', '#1a0000', 'harassment', '#1a0000', 'secluded', '#12001e', 'active-front', '#001a10', '#1a0000'], 'circle-opacity': 0.72, 'circle-blur': 0.5 } });
      map.addLayer({ id: ZONE_LAYERS.fill, type: 'circle', minzoom: ZOOM_THRESHOLD, source: REPORTS_SOURCE, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 6, 14, 12, 16, 18, 18, 28], 'circle-color': ['match', ['get', 'type'], 'broken-light', '#5c0000', 'harassment', '#5c0000', 'secluded', '#2e0050', 'active-front', '#004020', '#5c0000'], 'circle-opacity': 0.38, 'circle-blur': 0.7 } });
      map.addLayer({ id: ZONE_LAYERS.center, type: 'circle', minzoom: ZOOM_THRESHOLD, source: REPORTS_SOURCE, paint: { 'circle-radius': 4, 'circle-color': ['match', ['get', 'type'], 'broken-light', '#dc2626', 'harassment', '#ef4444', 'secluded', '#a855f7', 'active-front', '#10b981', '#dc2626'], 'circle-stroke-width': 1, 'circle-stroke-color': 'rgba(255,255,255,0.3)', 'circle-opacity': 0.9 } });

      // ── Active Fronts Native Layers ──
      map.addLayer({
        id: ACTIVE_FRONT_LAYERS.cluster,
        type: 'circle',
        source: ACTIVE_FRONTS_SOURCE,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#10b981',
          'circle-opacity': 0.8,
          'circle-radius': ['interpolate', ['linear'], ['get', 'point_count'], 1, 12, 10, 24, 50, 36],
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(16,185,129,0.3)',
          'circle-blur': 0.2
        }
      });

      map.addLayer({
        id: ACTIVE_FRONT_LAYERS.count,
        type: 'symbol',
        source: ACTIVE_FRONTS_SOURCE,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 10
        },
        paint: { 'text-color': '#ffffff' }
      });

      map.addLayer({
        id: ACTIVE_FRONT_LAYERS.unclustered,
        type: 'circle',
        source: ACTIVE_FRONTS_SOURCE,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#10b981',
          'circle-radius': 6,
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255,255,255,0.3)',
          'circle-blur': 0.1
        }
      });

      // Click Interaction for Clusters (Bulk Delete)
      map.on('click', ACTIVE_FRONT_LAYERS.cluster, (e) => {
        const feature = e.features?.[0];
        if (!feature) return;

        const clusterId = feature.properties?.cluster_id;
        const source = map.getSource(ACTIVE_FRONTS_SOURCE) as maplibregl.GeoJSONSource;
        
        source.getClusterLeaves(clusterId, 100, 0).then((leaves) => {
          if (!leaves) return;
          
          const ids = leaves.map((f: any) => f.properties?.id);
          const count = leaves.length;
          const newestTs = Math.max(...leaves.map((f: any) => f.properties?.timestamp || 0));

          if (sharedPopupRef.current) sharedPopupRef.current.remove();
          
          sharedPopupRef.current = new maplibregl.Popup({ offset: 15, closeButton: false, className: 'lume-popup' })
            .setLngLat((feature.geometry as any).coordinates)
            .setHTML(`
              <div style="padding:4px;">
                <div style="color:#f59e0b; font-weight:700; font-size:11px; text-transform:uppercase; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
                  <span style="width:6px; height:6px; background:#f59e0b; border-radius:50%; box-shadow:0 0 8px #f59e0b;"></span>
                  Cluster of ${count} Broken Lights
                </div>
                <div style="font-size:10px; color:#a1a1aa; margin-bottom:12px; line-height:1.4;">
                  Multiple consecutive streetlights are out in this area.
                </div>
                <button 
                  onclick="window.removeLumeReports('${ids.join(',')}')"
                  style="width:100%; padding:8px; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); border-radius:6px; color:#fca5a5; font-size:10px; cursor:pointer; transition:all 0.2s;"
                  onmouseover="this.style.background='rgba(239,68,68,0.25)'; this.style.borderColor='rgba(239,68,68,0.5)';"
                  onmouseout="this.style.background='rgba(239,68,68,0.15)'; this.style.borderColor='rgba(239,68,68,0.3)';"
                >
                  Report no longer exists
                </button>
              </div>
            `)
            .addTo(map);
        });
      });

      // Hover Interaction for Clusters


      map.on('mouseleave', ACTIVE_FRONT_LAYERS.cluster, () => {
        map.getCanvas().style.cursor = '';
        sharedPopupRef.current?.remove();
        sharedPopupRef.current = null;
      });

      map.on('mouseenter', ACTIVE_FRONT_LAYERS.unclustered, (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features?.[0];
        if (!f) return;
        
        if (sharedPopupRef.current) sharedPopupRef.current.remove();
        sharedPopupRef.current = new maplibregl.Popup({ offset: 15, closeButton: false, className: 'lume-popup' })
          .setLngLat((f.geometry as any).coordinates)
          .setHTML(`
            <div style="color:#10b981; font-weight:700; font-size:10px; text-transform:uppercase; margin-bottom:4px;">Active Front</div>
            <div style="font-weight:600; font-size:12px;">${f.properties?.name}</div>
            <div style="font-size:11px; color:#a1a1aa;">${f.properties?.category}</div>
          `)
          .addTo(map);
      });

      map.on('mouseleave', ACTIVE_FRONT_LAYERS.unclustered, () => {
        map.getCanvas().style.cursor = '';
        sharedPopupRef.current?.remove();
        sharedPopupRef.current = null;
      });

      // Static Markers initialized
      const userEl = createUserLocationEl();

      userEl.dataset.markerType = 'user';
      const userMarker = new maplibregl.Marker({ element: userEl, anchor: 'top-left' }).setLngLat(MAP_CENTER).addTo(map);
      markersRef.current.set('user', userMarker);

      setMapLoaded(true); // Triggers dependent hooks safely
      callbacks.current.onMapReady?.(map);

      const emitMapState = () => {
        callbacks.current.onMapStateChange?.({
          zoom: map.getZoom(),
          bearing: map.getBearing()
        });
      };

      map.on('move', emitMapState);
      map.on('zoom', emitMapState);
      map.on('rotate', emitMapState);
      
      // Emit initial state
      emitMapState();

      updateMarkerVisibility();
      calculateAura();
    });

    return () => {
      if (sharedPopupRef.current) sharedPopupRef.current.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Sync Layers / Visibilities (Only runs after map loads) ──
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    // Toggle Layers
    const setVis = (id: string, vis: boolean) => mapRef.current?.setLayoutProperty(id, 'visibility', vis ? 'visible' : 'none');
    Object.values(LUMEN_LAYERS).forEach((id) => setVis(id, props.layers.lumen));
    Object.values(ACTIVE_FRONT_LAYERS).forEach((id) => setVis(id, props.layers.activeFronts));

    // Force marker re-render as visibilities are now actively enforced in renderMarkers and updateMarkerVisibility
    renderMarkers();
  }, [mapLoaded, props.layers, renderMarkers]);

  // ── Sync User Reports ───────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    // 1. Update GeoJSON Sources
    const zoneReports = props.reports.filter((r) => r.type !== 'active-front' && r.type !== 'broken-light');
    const lightOffReports = props.reports.filter((r) => r.type === 'broken-light');
    const preloadedBrokenLights = props.incidents.filter((inc) => inc.type === 'broken-light');

    (map.getSource(REPORTS_SOURCE) as maplibregl.GeoJSONSource)?.setData({
      type: 'FeatureCollection',
      features: zoneReports.map((r) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: r.lngLat }, properties: { type: r.type, severity: r.severity, id: r.id } }))
    });

    const darkGapFeatures = [
      ...lightOffReports.map((r) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: r.lngLat }, properties: { severity: r.severity } })),
      ...preloadedBrokenLights.map((inc) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: inc.lngLat }, properties: { severity: inc.severity } }))
    ].filter(f => f.geometry.coordinates) as GeoJSON.Feature<GeoJSON.Point>[];

    (map.getSource(DARK_GAP_SOURCE) as maplibregl.GeoJSONSource)?.setData({
      type: 'FeatureCollection',
      features: darkGapFeatures
    });

    // Handled universally by renderMarkers() loop
    renderMarkers();

    updateMarkerVisibility();
    calculateAura();
  }, [mapLoaded, props.reports, updateMarkerVisibility, calculateAura]);

  // ── Sync Incidents & ActiveFronts from Supabase ─────────────────────────
  // This fires when async data from Supabase arrives so markers re-render correctly
  useEffect(() => {
    if (!mapLoaded) return;
    renderMarkers();
    calculateAura();
  }, [mapLoaded, props.incidents, props.activeFronts, renderMarkers, calculateAura]);

  // ── Handle Selections & Pending Location ────────────────────
  useEffect(() => {
    markersRef.current.forEach((marker, key) => {
      if (key === 'user') return;
      const dot = marker.getElement().querySelector('.lume-marker-dot') as HTMLElement | null;
      if (dot) dot.style.transform = key === props.selectedId ? 'translate(-50%, -50%) scale(1.45)' : 'translate(-50%, -50%) scale(1)';
    });
  }, [props.selectedId]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (props.pendingLocation) {
      if (!pendingMarkerRef.current) {
        const el = createMarkerWrapper('#00e5cc', 10, true);
        el.dataset.markerType = 'pending';
        pendingMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(props.pendingLocation).addTo(mapRef.current);
      } else {
        pendingMarkerRef.current.setLngLat(props.pendingLocation);
        const el = pendingMarkerRef.current.getElement();
        el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; // Re-trigger drop
      }
    } else {
      pendingMarkerRef.current?.remove();
      pendingMarkerRef.current = null;
    }
  }, [props.pendingLocation]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    
    // ── Update Active Fronts & Landmarks GeoJSON (Native Clustering) ──
    const afSource = mapRef.current.getSource(ACTIVE_FRONTS_SOURCE) as maplibregl.GeoJSONSource;
    if (afSource) {
      const activeFeatures = props.activeFronts.map(af => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: af.lngLat },
        properties: { id: af.id, name: af.name, category: af.category, source: 'active-front' }
      }));
      
      const osmFeatures = props.osmLandmarks.map(lm => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: lm.lngLat },
        properties: { id: lm.id, name: lm.name, category: getLandmarkCategory(lm.type), source: 'osm' }
      }));


      afSource.setData({
        type: 'FeatureCollection',
        features: [...activeFeatures, ...osmFeatures]
      });
    }

    updateMarkerVisibility();
  }, [mapLoaded, props.activeFronts, props.osmLandmarks, updateMarkerVisibility]);





  // ── Sync Safety Audit AuraPins (Clustered) ─────────────────────────
  const updateClusters = useCallback(() => {
    if (!mapLoaded || !mapRef.current || !clustererRef.current) return;
    const map = mapRef.current;
    
    // Sometimes bounds return undefined right at load
    const bounds = map.getBounds();
    if (!bounds) return;

    const zoom = Math.round(map.getZoom());
    const bbox: [number, number, number, number] = [
      bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()
    ];

    const clusters = clustererRef.current.getClusters(bbox, zoom);
    const existingIds = new Set(auraPinMarkersRef.current.keys());

    clusters.forEach(cluster => {
      const isCluster = cluster.properties.cluster;
      const pinId = isCluster ? `cluster-${cluster.properties.cluster_id}` : cluster.properties.id;
      
      existingIds.delete(pinId);
      if (auraPinMarkersRef.current.has(pinId)) return;

      let score: number;
      let el: HTMLElement;
      let auditToPass: SafetyAudit;

      if (isCluster) {
        const p = cluster.properties;
        const avg_illum = Math.round(p.sum_illum / p.count);
        const avg_vibe = Math.round(p.sum_vibe / p.count);
        const avg_eyes = Math.round(p.sum_eyes / p.count);
        const avg_escape = Math.round(p.sum_escape / p.count);
        const avg_walk = Math.round(p.sum_walk / p.count);
        
        score = Math.round(((avg_illum + avg_vibe + avg_eyes + avg_escape + avg_walk) / 25) * 100);
        
        // Negative ID ensures it won't conflict with real IDs in BranchedPopup logic
        auditToPass = {
          id: -p.cluster_id, 
          lngLat: cluster.geometry.coordinates as [number, number],
          timestamp: Date.now(),
          illumination: avg_illum,
          crowd_vibe: avg_vibe,
          eyes_on_street: avg_eyes,
          escape_options: avg_escape,
          walkability: avg_walk,
          aura_score: score
        };
        el = createAuraPinEl(score, pinId, p.count);
      } else {
        auditToPass = cluster.properties as SafetyAudit;
        score = auditToPass.aura_score;
        el = createAuraPinEl(score, pinId);
      }

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        callbacks.current.onAuraPinClick(auditToPass);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(cluster.geometry.coordinates as [number, number])
        .addTo(map);

      auraPinMarkersRef.current.set(pinId, marker);
    });

    existingIds.forEach(id => {
      auraPinMarkersRef.current.get(id)?.remove();
      auraPinMarkersRef.current.delete(id);
    });
  }, [mapLoaded]);

  useEffect(() => {
    if (!mapLoaded) return;

    const index = new Supercluster({
      radius: 40,
      maxZoom: 16,
      map: (props) => ({
        sum_illum: props.illumination,
        sum_vibe: props.crowd_vibe,
        sum_eyes: props.eyes_on_street,
        sum_escape: props.escape_options,
        sum_walk: props.walkability,
        count: 1
      }),
      reduce: (acc, props: any) => {
        acc.sum_illum += props.sum_illum;
        acc.sum_vibe += props.sum_vibe;
        acc.sum_eyes += props.sum_eyes;
        acc.sum_escape += props.sum_escape;
        acc.sum_walk += props.sum_walk;
        acc.count += props.count;
      }
    });

    const points: any[] = props.audits.map(audit => ({
      type: 'Feature',
      properties: { ...audit },
      geometry: { type: 'Point', coordinates: audit.lngLat }
    }));

    index.load(points);
    clustererRef.current = index;
    updateClusters();
  }, [mapLoaded, props.audits, updateClusters]);

  // Handle map movement events to update rendered clusters
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;
    
    map.on('move', updateClusters);
    map.on('moveend', updateClusters);
    
    return () => {
      map.off('move', updateClusters);
      map.off('moveend', updateClusters);
    };
  }, [mapLoaded, updateClusters]);

  // ── Sync User Location ──────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !props.userLocation) return;
    const userMarker = markersRef.current.get('user');
    if (userMarker) {
      userMarker.setLngLat(props.userLocation);
    }
  }, [mapLoaded, props.userLocation]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />;
}
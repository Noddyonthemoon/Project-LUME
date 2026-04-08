import { useState, useCallback, useRef, useEffect } from 'react';
import { MapboxMap } from './components/MapboxMap';
import type { LayerState, Incident, ActiveFront } from './components/MapSVG';
import { Sidebar } from './components/Sidebar';
import { ReportModal } from './components/ReportModal';
import { StretchModal } from './components/StretchModal';
import type { StretchConfig } from './components/StretchModal';
import { MarkerInfo } from './components/MarkerInfo';
import { MapControls } from './components/MapControls';
import { TopBar } from './components/TopBar';
import { AuditModal } from './components/AuditModal';
import { BranchedPopup } from './components/BranchedPopup';
import { Plus, Zap, ShieldCheck } from 'lucide-react';
import type { UserReport, SafetyAudit } from './types';
import type { ReportSubmitData } from './components/ReportModal';
import { MAP_CENTER } from '../config';
import { fetchOSMLandmarks, type OSMLandmark } from './api/osm';
import { getIncidents, getActiveFronts, getUserReports, submitUserReport, deleteReport, subscribeToReports, getSafetyAudits, submitSafetyAudit } from './api/supabase';


type MarkerPayload = { type: string; data: Incident | ActiveFront };

export default function App() {
  const [layers, setLayers] = useState<LayerState>({
    lumen: true,
    socialSafety: true,
    activeFronts: true,
  });

  const [selectedMarker, setSelectedMarker] = useState<MarkerPayload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [incidents, setIncidents] = useState<(Incident & { lngLat: [number, number] })[]>([]);
  const [activeFronts, setActiveFronts] = useState<(ActiveFront & { lngLat: [number, number] })[]>([]);
  const [osmLandmarks, setOsmLandmarks] = useState<OSMLandmark[]>([]);

  // ── Safety Audit State ────────────────────────────────────────
  const [audits, setAudits] = useState<SafetyAudit[]>([]);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<SafetyAudit | null>(null);
  const [auditScreenPos, setAuditScreenPos] = useState<{ x: number; y: number } | null>(null);
  const mapInstanceRef = useRef<any>(null); // will receive map instance from MapboxMap

  const [pendingLocation, setPendingLocation] = useState<[number, number] | null>(null);
  const mapCenterRef = useRef<[number, number]>(MAP_CENTER);
  const [auraScores, setAuraScores] = useState({ illumination: 70, socialSafety: 70, activeFronts: 70 });

  // ── Stretch Mode ──────────────────────────────────────────────
  const [showStretchModal, setShowStretchModal] = useState(false);
  const [stretchMode, setStretchMode] = useState<null | 'awaiting-start' | 'awaiting-end'>(null);
  const [stretchConfig, setStretchConfig] = useState<StretchConfig | null>(null);
  const [stretchStart, setStretchStart] = useState<[number, number] | null>(null);
  const [stretchUploading, setStretchUploading] = useState(false);

  const [mapZoom, setMapZoom] = useState(14);
  const [mapBearing, setMapBearing] = useState(0);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [dbIncidents, dbFronts, dbReports, dbAudits] = await Promise.all([
        getIncidents(),
        getActiveFronts(),
        getUserReports(),
        getSafetyAudits(),
      ]);
      setIncidents(dbIncidents);
      setActiveFronts(dbFronts);
      setReports(dbReports);
      setAudits(dbAudits);
      setDataLoading(false);
    }
    loadData();

    const subscription = subscribeToReports((payload) => {
      console.log('Realtime Event:', payload);
      if (payload.eventType === 'INSERT') {
        const newReport: UserReport = {
          id: payload.new.id.toString(),
          type: payload.new.type,
          lngLat: [payload.new.lng, payload.new.lat],
          severity: payload.new.severity,
          description: payload.new.description || '',
          timestamp: new Date(payload.new.created_at).getTime(),
        };
        setReports((prev) => [newReport, ...prev]);
      } else if (payload.eventType === 'DELETE') {
        setReports((prev) => prev.filter(r => r.id !== payload.old.id.toString()));
      }
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // ── Geolocation Watcher ───────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation([pos.coords.longitude, pos.coords.latitude]);
      },
      (err) => {
        console.warn('Geolocation error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Fetch OSM Landmarks around the MSRIT area
  useEffect(() => {
    async function initLandmarks() {
      // Bounding box for Bangalore Central/North area (MSRIT vicinity)
      const bbox: [number, number, number, number] = [77.53, 13.01, 77.60, 13.06];
      const data = await fetchOSMLandmarks(bbox);
      setOsmLandmarks(data);
    }
    initLandmarks();
  }, []);



  function toggleLayer(key: keyof LayerState) {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const handleMarkerClick = useCallback(
    (payload: MarkerPayload) => {
      const id =
        payload.type === 'incident'
          ? `incident-${(payload.data as Incident).id}`
          : `active-${(payload.data as ActiveFront).id}`;
      if (selectedId === id) {
        setSelectedMarker(null);
        setSelectedId(null);
      } else {
        setSelectedMarker(payload);
        setSelectedId(id);
      }
    },
    [selectedId],
  );

  function closeMarker() {
    setSelectedMarker(null);
    setSelectedId(null);
  }

  // Map canvas click → open report modal at that location
  const handleMapClick = useCallback(async (lngLat: [number, number]) => {
    // STRETCH MODE: intercept map clicks
    if (stretchMode === 'awaiting-start') {
      setStretchStart(lngLat);
      setStretchMode('awaiting-end');
      return;
    }
    if (stretchMode === 'awaiting-end' && stretchStart && stretchConfig) {
      setStretchMode(null);
      setStretchUploading(true);

      // Interpolate 8 markers between start and end
      const NUM_POINTS: number = 8;
      const newReports: UserReport[] = [];
      for (let i = 0; i < NUM_POINTS; i++) {
        const t = NUM_POINTS === 1 ? 0 : i / (NUM_POINTS - 1);
        const lng = stretchStart[0] + (lngLat[0] - stretchStart[0]) * t;
        const lat = stretchStart[1] + (lngLat[1] - stretchStart[1]) * t;
        const r: UserReport = {
          id: `stretch-${Date.now()}-${i}`,
          type: 'broken-light',
          severity: stretchConfig.severity,
          lngLat: [lng, lat],
          description: stretchConfig.description,
          timestamp: Date.now(),
        };
        newReports.push(r);
        // Upload to Supabase
        await submitUserReport(r);
      }
      setReports(prev => [...prev, ...newReports]);
      setStretchStart(null);
      setStretchConfig(null);
      setStretchUploading(false);
      return;
    }

    // Normal report mode
    if (showReport) return;
    setPendingLocation(lngLat);
    setShowReport(true);
  }, [stretchMode, stretchStart, stretchConfig, showReport]);

  // Floating button → open report at current map centre
  function handleReportButtonClick() {
    setPendingLocation(mapCenterRef.current);
    setShowReport(true);
  }

  // Report submitted → persist to backend + state
  const handleReportSubmit = useCallback(async (data: ReportSubmitData) => {
    const report: Partial<UserReport> = {
      type: data.type as UserReport['type'],
      severity: data.severity as UserReport['severity'],
      lngLat: data.lngLat,
      description: data.description,
    };
    
    // Optimistic UI update so the marker appears instantly even without a real database
    const localFakeReport = {
      ...report,
      id: `report-${Date.now()}`,
      timestamp: Date.now(),
    } as UserReport;
    
    setReports(prev => [...prev, localFakeReport]);
    await submitUserReport(report);
  }, []);

  function handleReportClose() {
    setPendingLocation(null);
    setShowReport(false);
  }

  const handleRemoveReport = useCallback(async (id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
    await deleteReport(id);
  }, []);

  const handleRemoveReports = useCallback(async (ids: string[]) => {
    setReports((prev) => prev.filter((r) => !ids.includes(r.id)));
    await Promise.all(ids.map(id => deleteReport(id)));
  }, []);

  const [mapJumpLocation, setMapJumpLocation] = useState<{ lngLat: [number, number]; id: string } | null>(null);

  const handleReportClick = useCallback((lngLat: [number, number], id: string) => {
    setMapJumpLocation({ lngLat, id });
  }, []);

  // ── Safety Audit Handlers ─────────────────────────────────────
  const handleAuditSubmit = useCallback(async (lngLat: [number, number], params: any) => {
    const newAudit = await submitSafetyAudit(lngLat, params);
    if (newAudit) {
      setAudits(prev => [newAudit, ...prev]);
      setShowAuditModal(false);
    } else {
      alert('Failed to submit audit. The network might be experiencing a conflict or connection issue. Please try again.');
    }
  }, []);

  const handleAuraPinClick = useCallback((audit: SafetyAudit) => {
    setSelectedAudit(audit);
  }, []);

  // Recompute screen pos whenever selectedAudit or map moves
  useEffect(() => {
    if (!selectedAudit || !mapInstanceRef.current) {
      setAuditScreenPos(null);
      return;
    }
    const map = mapInstanceRef.current;
    const update = () => {
      const pt = map.project(selectedAudit.lngLat);
      setAuditScreenPos({ x: pt.x, y: pt.y });
    };
    update();
    map.on('move', update);
    return () => { map.off('move', update); };
  }, [selectedAudit]);

  const handleZoomIn = useCallback(() => { mapInstanceRef.current?.zoomIn(); }, []);
  const handleZoomOut = useCallback(() => { mapInstanceRef.current?.zoomOut(); }, []);
  const handleResetBearing = useCallback(() => { 
    mapInstanceRef.current?.flyTo({ bearing: 0, pitch: 0, duration: 1000 }); 
  }, []);
  const handleCenterLocation = useCallback(() => { 
    const target = userLocation || MAP_CENTER;
    mapInstanceRef.current?.flyTo({ center: target, zoom: 16, duration: 2000 });
  }, [userLocation]);


  return (
    <div className="size-full relative overflow-hidden" style={{ background: '#06080d' }}>
      {/* ── Ambient vignettes ── */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse at 0% 0%, rgba(0,229,204,0.04) 0%, transparent 50%),' +
            'radial-gradient(ellipse at 100% 100%, rgba(124,58,237,0.05) 0%, transparent 50%),' +
            'radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(0,0,0,0.3) 100%)',
        }}
      />

      {/* ── Full-screen interactive map ── */}
      <div className="absolute inset-0 z-0">
        <MapboxMap
          layers={layers}
          incidents={incidents}
          activeFronts={activeFronts}
          reports={reports}
          onMarkerClick={handleMarkerClick}
          selectedId={selectedId}
          onMapClick={handleMapClick}
          pendingLocation={pendingLocation}
          onCenterChange={(c) => { mapCenterRef.current = c; }}
          onRemoveReport={handleRemoveReport}
          onRemoveReports={handleRemoveReports}
          onAuraScoresChange={setAuraScores}
          jumpTo={mapJumpLocation}
          onJumpComplete={() => setMapJumpLocation(null)}
          osmLandmarks={osmLandmarks}
          audits={audits}
          onAuraPinClick={handleAuraPinClick}
          onMapReady={(map: any) => { mapInstanceRef.current = map; }}
          onMapStateChange={(s) => { 
            setMapZoom(s.zoom); 
            setMapBearing(s.bearing);
          }}
          userLocation={userLocation}
        />


      </div>

      {/* ── Data Loading Overlay ── */}
      {dataLoading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(6,8,13,0.85)', backdropFilter: 'blur(12px)',
          gap: '16px', pointerEvents: 'none',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            border: '3px solid rgba(0,229,204,0.15)',
            borderTopColor: '#00e5cc',
            animation: 'lume-spin 0.9s linear infinite',
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#00e5cc', fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', fontFamily: 'system-ui, sans-serif' }}>SYNCING LUME NETWORK</span>
            <span style={{ color: '#52525b', fontSize: '11px', fontFamily: 'system-ui, sans-serif' }}>Fetching safety data from cloud...</span>
          </div>
          <style>{`@keyframes lume-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── Edge vignette overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{ boxShadow: 'inset 0 0 120px rgba(0,0,0,0.55)' }}
      />

      {/* ── Collapsible Sidebar ── */}
      <Sidebar
        layers={layers}
        toggleLayer={toggleLayer}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        scores={auraScores}
        reports={reports}
        activeFronts={activeFronts}
        osmLandmarks={osmLandmarks}
        onReportClick={handleReportClick}
        userLocation={userLocation}
        audits={audits}
      />




      {/* ── Top bar ── */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <TopBar sidebarOpen={sidebarOpen} reports={reports} />

      </div>

      {/* ── Map controls (right side) ── */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <MapControls 
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetBearing={handleResetBearing}
            onCenterLocation={handleCenterLocation}
            zoom={mapZoom}
            bearing={mapBearing}
          />
        </div>
      </div>

      {/* ── Marker info panel ── */}
      {selectedMarker && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          <div className="pointer-events-auto">
            <MarkerInfo marker={selectedMarker} onClose={closeMarker} />
          </div>
        </div>
      )}

      {/* ── Legend strip (bottom centre) ── */}
      <div
        className="absolute bottom-4 z-20 flex items-center gap-4 px-4 py-2 rounded-full pointer-events-none transition-all duration-300"
        style={{
          left: sidebarOpen ? 'calc(50% + 154px)' : 'calc(50% + 15px)',
          transform: 'translateX(-50%)',
          background: 'rgba(8,10,14,0.78)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
      >
        <LegendDot color="#ffecd2" label="Well-lit" />
        <Sep />
        <LegendDot color="#e8d5a8" label="Dim" />
        <Sep />
        <LegendDot color="#27272a" label="Dark" glow={false} />
        <Sep />
        <LegendDot color="#ef4444" label="Harassment" />
        <Sep />
        <LegendDot color="#a855f7" label="Secluded" />
        <Sep />
        <LegendDot color="#10b981" label="Active Front" />
        <Sep />
        <LegendDot color="#3b82f6" label="You" />
        {reports.length > 0 && (
          <>
            <Sep />
            <LegendDot color="#b91c1c" label={`${reports.length} report${reports.length > 1 ? 's' : ''}`} />
          </>
        )}
      </div>

      {/* ── Floating buttons bottom right ── */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col items-end gap-3 pointer-events-none">

        {/* Live Safety Audit button */}
        <div className="pointer-events-auto">
          <button
            onClick={() => setShowAuditModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm transition-all duration-200 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgba(0,229,204,0.12) 0%, rgba(0,180,160,0.16) 100%)',
              border: '1px solid rgba(0,229,204,0.30)',
              color: '#00e5cc',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 0 20px rgba(0,229,204,0.10), 0 4px 16px rgba(0,0,0,0.5)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 32px rgba(0,229,204,0.25), 0 4px 16px rgba(0,0,0,0.5)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,229,204,0.55)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(0,229,204,0.10), 0 4px 16px rgba(0,0,0,0.5)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,229,204,0.30)';
            }}
          >
            <ShieldCheck size={13} />
            Safety Audit
          </button>
        </div>

        {/* Stretch of Unlit Road button */}
        <div className="pointer-events-auto relative">
          <button
            onClick={() => {
              setStretchMode(null);
              setShowStretchModal(true);
            }}
            disabled={!!stretchMode || stretchUploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm transition-all duration-200 active:scale-95"
            style={{
              background: stretchMode
                ? 'linear-gradient(135deg, rgba(245,158,11,0.35) 0%, rgba(217,119,6,0.4) 100%)'
                : 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.16) 100%)',
              border: `1px solid ${stretchMode ? 'rgba(245,158,11,0.7)' : 'rgba(245,158,11,0.3)'}`,
              color: '#fcd34d',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 0 20px rgba(245,158,11,0.10), 0 4px 16px rgba(0,0,0,0.5)',
              opacity: stretchUploading ? 0.6 : 1,
            }}
          >
            <Zap size={13} />
            {stretchUploading ? 'Uploading…' : stretchMode === 'awaiting-start' ? 'Click Start Point' : stretchMode === 'awaiting-end' ? 'Click End Point' : 'Unlit Road Stretch'}
          </button>
          {stretchMode && (
            <button
              onClick={() => { setStretchMode(null); setStretchStart(null); }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-zinc-800 border border-zinc-600 text-zinc-400 text-[8px] flex items-center justify-center"
            >✕</button>
          )}
        </div>

        {/* Floating Report Incident button */}
        <div className="pointer-events-auto flex flex-col items-center">
        <button
          onClick={handleReportButtonClick}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm transition-all duration-200 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, rgba(220,38,38,0.18) 0%, rgba(185,28,28,0.22) 100%)',
            border: '1px solid rgba(220,38,38,0.35)',
            color: '#fca5a5',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 0 20px rgba(185,28,28,0.18), 0 4px 16px rgba(0,0,0,0.5)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 0 32px rgba(220,38,38,0.35), 0 4px 16px rgba(0,0,0,0.5)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(220,38,38,0.6)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 0 20px rgba(185,28,28,0.18), 0 4px 16px rgba(0,0,0,0.5)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(220,38,38,0.35)';
          }}
        >
          <Plus size={14} />
          Report Incident
          </button>
          <p className="text-center text-[9px] text-zinc-700 mt-1">or tap the map</p>
        </div>
      </div>

      {/* ── Audit Modal ── */}
      {showAuditModal && (
        <AuditModal
          onClose={() => setShowAuditModal(false)}
          onSubmit={handleAuditSubmit}
          userLocation={userLocation}
        />
      )}

      {/* ── BranchedPopup (screen-space overlay) ── */}
      {selectedAudit && auditScreenPos && (
        <BranchedPopup
          audit={selectedAudit}
          screenX={auditScreenPos.x}
          screenY={auditScreenPos.y}
          onClose={() => setSelectedAudit(null)}
        />
      )}

      {/* ── Stretch Modal ── */}
      {showStretchModal && (
        <div className="absolute inset-0 z-50">
          <StretchModal
            onClose={() => setShowStretchModal(false)}
            onBeginStretch={(config) => {
              setStretchConfig(config);
              setStretchMode('awaiting-start');
              setShowStretchModal(false);
            }}
          />
        </div>
      )}

      {/* ── Report modal ── */}
      {showReport && (
        <div className="absolute inset-0 z-50">
          <ReportModal
            onClose={handleReportClose}
            clickedLocation={pendingLocation}
            onSubmit={handleReportSubmit}
          />
        </div>
      )}
    </div>
  );
}

function LegendDot({
  color,
  label,
  glow = true,
}: {
  color: string;
  label: string;
  glow?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        style={{
          width: 7, height: 7, borderRadius: '50%',
          backgroundColor: color,
          boxShadow: glow ? `0 0 5px ${color}` : 'none',
          border: glow ? 'none' : '1px solid #3f3f46',
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 9, color: '#52525b', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

function Sep() {
  return (
    <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
  );
}

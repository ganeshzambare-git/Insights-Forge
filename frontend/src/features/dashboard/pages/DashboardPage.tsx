import React, { useState, useRef } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { useGeo } from '../hooks/useGeo';
import { ingestionClient } from '@/features/dataset/api/ingestionClient';
import { useTenantStore } from '@/store/tenantStore';
import { useQueryClient } from '@tanstack/react-query';
import { DataObservatory } from '../components/DataObservatory';
import { OverviewPanel } from '../components/OverviewPanel';

// Per-sector copy mirrored from the marketing landing page so the dashboard
// header matches each sector's identity (Retail / Service / Education / Agriculture).
const SECTOR_META: Record<string, { title: string; eyebrow: string }> = {
  retail: {
    title: 'Retail',
    eyebrow: 'Grocery chains, quick-commerce, dark stores & distributors',
  },
  service: {
    title: 'Service',
    eyebrow: 'Support centers, repair & maintenance firms, salons, agencies',
  },
  education: {
    title: 'Education',
    eyebrow: 'Schools, colleges, academies & coaching institutes',
  },
  agriculture: {
    title: 'Agriculture',
    eyebrow: 'Farms, farming cooperatives & agri-input suppliers',
  },
};


export const DashboardPage: React.FC = () => {
  const { data, isLoading, isError, refetch } = useDashboard();
  const { data: geo } = useGeo();
  const { sectorId: storeSectorId } = useTenantStore();
  const { tenantId } = useTenantStore();
  const queryClient = useQueryClient();

  const [uploadState, setUploadState] = useState<'initial' | 'uploading' | 'processing' | 'success' | 'error'>('initial');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptFile = (file: File | undefined) => {
    if (!file) return;
    setSelectedFile(file);
    setUploadState('initial');
    setUploadError('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const sectorId = storeSectorId || (data?.sectorId || '').toLowerCase();
  const meta = SECTOR_META[sectorId] || {
    title: sectorId ? sectorId[0].toUpperCase() + sectorId.slice(1) : 'Dashboard',
    eyebrow: 'AI decision intelligence for your organization',
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadState('initial');
      setUploadError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !sectorId) return;
    setUploadState('uploading');
    try {
      const response = await ingestionClient.upload(sectorId, selectedFile);
      if (response && (response.status === 'processing' || response.status === 'accepted')) {
         setUploadState('processing');
      } else {
         setUploadState('success');
      }
      // Ingestion is async on the backend — the records land a few seconds
      // after the upload response. Invalidate every query for this
      // tenant+sector now AND on a short retry schedule so KPIs, charts and
      // the Data Observatory refresh on their own (no manual page reload).
      const refreshAll = () => {
        refetch();
        if (tenantId && sectorId) {
          queryClient.invalidateQueries({ queryKey: [tenantId, sectorId] });
        }
      };
      refreshAll();
      [4000, 9000, 16000].forEach((delay) => setTimeout(refreshAll, delay));
    } catch (error) {
      console.error('Upload failed', error);
      setUploadState('error');
      setUploadError('Upload failed. Please check the file and try again.');
    }
  };

  return (
    <div className="sector-dash">
      <style dangerouslySetInnerHTML={{ __html: DASH_THEME_CSS }} />

      {/* Sector hero header — mirrors the landing sector-intro */}
      <header className="sd-hero">
        <span className="sd-bullet" />
        <div>
          <h1 className="sd-title">{meta.title}</h1>
          <p className="sd-eyebrow">{meta.eyebrow}</p>
        </div>
      </header>

      {/* Import Data Section */}
      <section className="sd-section">
        <h2 className="sd-section-title">Import Data</h2>
        <p className="sd-eyebrow" style={{ marginTop: '-12px', marginBottom: '16px' }}>
          Upload your business data to generate analytics and AI-powered insights.
        </p>
        <div className="sd-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="file"
            accept=".csv,.xlsx,.json"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {uploadState === 'initial' || uploadState === 'error' ? (
            <>
              <span className="sd-note" style={{ padding: 0 }}>Supported formats: CSV and Excel (.xlsx)</span>
              <div
                role="button"
                tabIndex={0}
                aria-label="Upload a CSV or Excel file"
                className={`sd-drop${isDragging ? ' is-dragging' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <span className="sd-drop-icon" aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </span>
                <span className="sd-drop-title">Click to select</span>
                <span className="sd-drop-sub">or drag and drop file here</span>
              </div>
            </>
          ) : null}

          {selectedFile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: 'var(--fog)', borderRadius: '6px', border: '1px solid var(--chalk)', width: 'fit-content' }}>
              <span style={{ fontWeight: 500, color: 'var(--carbon)' }}>{selectedFile.name}</span>
              <span style={{ fontSize: '13px', color: 'var(--slate)' }}>{(selectedFile.size / 1024).toFixed(1)} KB</span>
              {(uploadState === 'initial' || uploadState === 'error') && (
                <button 
                  onClick={() => { setSelectedFile(null); setUploadState('initial'); }}
                  style={{ padding: '2px 6px', background: 'transparent', border: 'none', color: 'var(--signal-orange)', cursor: 'pointer', fontSize: '13px', marginLeft: '8px' }}
                >
                  Remove
                </button>
              )}
            </div>
          )}

          {uploadState === 'initial' && selectedFile && (
            <button 
              onClick={handleUpload}
              style={{ padding: '8px 20px', background: 'var(--signal-orange)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', alignSelf: 'flex-start', fontWeight: 600 }}
            >
              Upload Data
            </button>
          )}

          {uploadState === 'uploading' && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button disabled style={{ padding: '8px 20px', background: 'var(--chalk)', color: 'var(--slate)', border: 'none', borderRadius: '6px', cursor: 'not-allowed', fontWeight: 600 }}>
                Uploading...
              </button>
            </div>
          )}
          {uploadState === 'processing' && <p className="sd-note" style={{ color: 'var(--signal-orange)', fontWeight: 500 }}>File uploaded successfully. Your data is being processed.</p>}
          {uploadState === 'success' && <p className="sd-note" style={{ color: '#2e7d32', fontWeight: 500 }}>Data imported successfully.</p>}
          {uploadState === 'error' && <p className="sd-note sd-error" style={{ fontWeight: 500 }}>{uploadError}</p>}
        </div>
      </section>

      {isLoading && <div className="sd-note">Loading intelligence for {meta.title}…</div>}
      {isError && <div className="sd-note sd-error">Failed to load dashboard data.</div>}

      {data && (
        <>
          {/* Performance Overview — filters rail, KPI deltas, forecast, mix, table */}
          <section className="sd-section">
            <OverviewPanel sectorTitle={meta.title} />
          </section>

          {/* Data Observatory — auto-generated chart + description per column */}
          <section className="sd-section">
            <h2 className="sd-section-title">Data observatory</h2>
            <p className="sd-eyebrow" style={{ marginTop: '-12px', marginBottom: '16px' }}>
              Every profiled column of your uploaded data, charted and explained.
            </p>
            <DataObservatory />
          </section>

          {/* Geo */}
          <section className="sd-section">
            <h2 className="sd-section-title">Geographic footprint</h2>
            <div className="sd-card sd-geo">
              <span className="sd-geo-num">{geo ? geo.features.length : '—'}</span>
              <span className="sd-geo-cap">
                {geo ? `mapped location(s) across ${meta.title}` : 'Loading geographic data…'}
              </span>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

// Scoped landing-sector theme for the dashboard. Local + route-mounted only,
// so it never alters the app's global Tailwind theme or the shell chrome.
const DASH_THEME_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Inter:wght@400;500;600&display=swap');

.sector-dash {
  --signal-orange: #ff682c;
  --carbon: #202020;
  --graphite: #4d4d4d;
  --slate: #828282;
  --fog: #f5f5f5;
  --mist: #efefef;
  --chalk: #e8e8e8;
  --paper: #ffffff;
  min-height: 100%;
  margin: -1px;
  padding: 40px clamp(20px, 4vw, 56px) 64px;
  background:
    radial-gradient(1000px 480px at 0% -10%, rgba(255,104,44,0.08), transparent 60%),
    var(--mist);
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
  color: var(--carbon);
}
.sd-hero { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 40px; }
.sd-bullet {
  width: 14px; height: 14px; margin-top: 12px; border-radius: 50%;
  background: var(--signal-orange);
  box-shadow: 0 0 0 6px rgba(255,104,44,0.15);
  flex-shrink: 0;
}
.sd-title {
  font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(36px, 5vw, 56px);
  line-height: 1.02;
  letter-spacing: -1px;
  font-weight: 600;
  color: var(--carbon);
}
.sd-eyebrow { margin-top: 6px; font-size: 16px; color: var(--slate); }
.sd-section { margin-bottom: 40px; }
.sd-section-title {
  font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
  font-size: 20px; font-weight: 600; letter-spacing: -0.3px;
  color: var(--carbon); margin-bottom: 16px;
}
.sd-kpi-grid {
  display: grid; gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}
.sd-kpi {
  position: relative; overflow: hidden;
  background: var(--paper);
  border: 1px solid var(--chalk);
  border-radius: 18px;
  padding: 22px 22px 24px;
  box-shadow: 0 1px 3px rgba(32,32,32,0.04), 0 4px 16px rgba(32,32,32,0.04);
}
.sd-kpi-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--signal-orange); }
.sd-kpi-label { font-size: 13px; font-weight: 500; color: var(--slate); text-transform: uppercase; letter-spacing: 0.4px; }
.sd-kpi-value {
  margin-top: 10px;
  font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
  font-size: 34px; font-weight: 600; letter-spacing: -0.8px; color: var(--carbon);
}
.sd-card {
  background: var(--paper);
  border: 1px solid var(--chalk);
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(32,32,32,0.04), 0 4px 16px rgba(32,32,32,0.04);
}
.sd-geo { display: flex; align-items: baseline; gap: 14px; }
.sd-geo-num {
  font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
  font-size: 44px; font-weight: 600; letter-spacing: -1px; color: var(--signal-orange);
}
.sd-geo-cap { font-size: 15px; color: var(--graphite); }
.sd-note { color: var(--slate); font-size: 15px; padding: 8px 0; }
.sd-error { color: var(--signal-orange); }

/* ---- Dropzone (Import Data) ---- */
.sd-drop {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; padding: 44px 20px; cursor: pointer; text-align: center;
  border: 1.5px dashed var(--chalk); border-radius: 12px; background: var(--paper);
  transition: border-color 0.25s ease, background 0.25s ease;
}
.sd-drop:hover, .sd-drop.is-dragging {
  border-color: var(--signal-orange);
  background: var(--fog);
}
.sd-drop:focus-visible { outline: 2px solid rgba(255,104,44,0.4); outline-offset: 2px; }
.sd-drop-icon {
  width: 44px; height: 44px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--mist); color: var(--carbon); margin-bottom: 6px;
  transition: background 0.25s ease, color 0.25s ease;
}
.sd-drop:hover .sd-drop-icon, .sd-drop.is-dragging .sd-drop-icon {
  background: var(--signal-orange); color: #fff;
}
.sd-drop-title { font-size: 14px; font-weight: 600; color: var(--carbon); }
.sd-drop-sub { font-size: 13px; color: var(--slate); }

/* ---- Staggered entrance: each card rises in ~90ms after the previous ---- */
.sd-rise {
  opacity: 0;
  animation: sdRise 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: calc(var(--d, 0) * 90ms);
}
@keyframes sdRise {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .sd-rise { animation: none; opacity: 1; }
}
.sd-obs-summary { font-size: 15px; color: var(--graphite); margin-bottom: 20px; max-width: 72ch; }
.sd-obs-grid {
  display: grid; gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
}
.sd-obs-card { display: flex; flex-direction: column; gap: 10px; padding: 24px; }
.sd-obs-title {
  font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
  font-size: 17px; font-weight: 600; letter-spacing: -0.3px; color: var(--carbon);
}
.sd-obs-chart { width: 100%; min-height: 260px; }
.sd-obs-stats { display: flex; flex-wrap: wrap; gap: 8px; }
.sd-obs-stat {
  display: inline-flex; align-items: baseline; gap: 6px;
  background: var(--fog); border: 1px solid var(--chalk);
  border-radius: 20px; padding: 3px 12px; font-size: 12px;
}
.sd-obs-stat-k { color: var(--slate); text-transform: capitalize; }
.sd-obs-stat-v { color: var(--carbon); font-weight: 600; }
.sd-obs-desc { font-size: 14px; line-height: 1.5; color: var(--graphite); border-top: 1px solid var(--chalk); padding-top: 12px; }

/* ---- Performance Overview (screenshot layout) ---- */
.sd-ov { display: grid; grid-template-columns: 232px 1fr; gap: 20px; align-items: start; }
@media (max-width: 900px) { .sd-ov { grid-template-columns: 1fr; } }
.sd-ov-filters { display: flex; flex-direction: column; gap: 14px; padding: 20px; }
.sd-ov-filters-title {
  font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--slate);
}
.sd-ov-field { display: flex; flex-direction: column; gap: 6px; }
.sd-ov-field > span { font-size: 13px; color: var(--graphite); text-transform: capitalize; }
.sd-ov-field select, .sd-ov-daterange {
  background: var(--fog); border: 1px solid var(--chalk); border-radius: 8px;
  padding: 8px 10px; font-size: 13px; color: var(--carbon); width: 100%;
}
.sd-ov-field select:focus { outline: 2px solid rgba(255,104,44,0.35); border-color: var(--signal-orange); }
.sd-ov-main { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.sd-ov-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.sd-ov-title {
  font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
  font-size: 22px; font-weight: 600; letter-spacing: -0.4px; color: var(--carbon);
}
.sd-ov-sub { margin-top: 4px; font-size: 14px; color: var(--slate); }
.sd-ov-live {
  display: inline-flex; align-items: center; gap: 7px;
  background: var(--paper); border: 1px solid var(--chalk); border-radius: 20px;
  padding: 5px 14px; font-size: 13px; font-weight: 500; color: var(--carbon);
}
.sd-ov-live-dot { width: 8px; height: 8px; border-radius: 50%; background: #2e7d32; }
.sd-ov-kpis { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
.sd-ov-kpi {
  background: var(--paper); border: 1px solid var(--chalk); border-radius: 14px; padding: 16px 18px;
}
.sd-ov-kpi.is-accent { border-color: var(--signal-orange); }
.sd-ov-kpi-label { font-size: 13px; color: var(--slate); }
.sd-ov-kpi-value {
  margin-top: 8px;
  font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
  font-size: 28px; font-weight: 600; letter-spacing: -0.6px; color: var(--carbon);
}
.sd-ov-kpi-delta { margin-top: 6px; font-size: 12px; font-weight: 500; }
.sd-ov-kpi-delta.is-up { color: #2e7d32; }
.sd-ov-kpi-delta.is-down { color: var(--signal-orange); }
.sd-ov-kpi-delta.is-flat { color: var(--slate); }
.sd-ov-charts { display: grid; grid-template-columns: 3fr 2fr; gap: 20px; }
@media (max-width: 1100px) { .sd-ov-charts { grid-template-columns: 1fr; } }
.sd-ov-chartcard { padding: 18px 18px 8px; min-width: 0; }
.sd-ov-card-title {
  font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
  font-size: 16px; font-weight: 600; letter-spacing: -0.2px; color: var(--carbon);
}
.sd-ov-card-sub { font-size: 12px; color: var(--slate); margin: 2px 0 6px; }
.sd-ov-tablecard { padding: 6px 18px 12px; overflow-x: auto; }
.sd-ov-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.sd-ov-table th {
  text-align: left; font-size: 11px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase;
  color: var(--slate); padding: 12px 10px; border-bottom: 1px solid var(--chalk);
}
.sd-ov-table td { padding: 12px 10px; border-bottom: 1px solid var(--fog); color: var(--carbon); }
.sd-ov-pill { display: inline-block; border-radius: 20px; padding: 3px 12px; font-size: 12px; font-weight: 500; }
.sd-ov-pill.is-healthy { background: rgba(46,125,50,0.10); color: #2e7d32; }
.sd-ov-pill.is-low { background: rgba(255,104,44,0.12); color: var(--signal-orange); }
.sd-ov-pill.is-critical { background: rgba(179,64,42,0.12); color: #b3402a; }
.sd-ov-tablenote { font-size: 12px; color: var(--slate); padding-top: 10px; }
`;

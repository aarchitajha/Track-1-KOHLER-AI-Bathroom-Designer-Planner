import React, { useState, useRef } from 'react';
import { Sliders, Sparkles, Check, Zap, Droplets, Leaf, Info, AlertTriangle, Camera, X, CheckCircle2 } from 'lucide-react';

const THEMES = [
  {
    id: "Minimalist Modern",
    title: "Minimalist Modern",
    desc: "Clean geometric lines, hidden drains, thin rim vessels, monochrome whites and blacks.",
    sampleColor: "#222222"
  },
  {
    id: "Classic Luxury",
    title: "Classic Luxury",
    desc: "Heritage widespread spouts, rich French Gold and Brushed Bronze finishes, ornate craftsmanship.",
    sampleColor: "#bfa15f"
  },
  {
    id: "Japanese Zen",
    title: "Japanese Zen",
    desc: "Organic curves, pebble-smooth contours, steam basins, rainheads, and soothing cashmere/earth tones.",
    sampleColor: "#7d8b82"
  }
];

const selectStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid var(--color-grey-200)',
  background: 'var(--color-white)',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--color-grey-700)'
};

export default function InputForm({ initialParams, onOptimize, sessionId, onRestoreHistory, onClearSketch, isLoading }) {
  const [lengthFt, setLengthFt] = useState(initialParams?.length_ft || 10.0);
  const [widthFt, setWidthFt] = useState(initialParams?.width_ft || 8.0);
  const [budgetInr, setBudgetInr] = useState(initialParams?.budget_inr || 150000);
  const [theme, setTheme] = useState(initialParams?.theme || "Minimalist Modern");
  const [includeBathtub, setIncludeBathtub] = useState(initialParams?.include_bathtub || false);
  const [waterPressure, setWaterPressure] = useState(initialParams?.water_pressure || "medium");
  const [electricalRoughIn, setElectricalRoughIn] = useState(
    initialParams?.electrical_rough_in !== undefined ? initialParams.electrical_rough_in : true
  );
  const [greenCertification, setGreenCertification] = useState(initialParams?.green_certification || "none");
  const [sketchLayout, setSketchLayout] = useState(initialParams?.sketch_layout || []);
  const [sketchHistoryId, setSketchHistoryId] = useState(initialParams?.sketch_history_id || null);
  const [history, setHistory] = useState([]);

  const [visionState, setVisionState] = useState('idle');
  const [visionProposal, setVisionProposal] = useState(null);
  const [visionError, setVisionError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8003';

  // Synchronize when initialParams change externally (e.g. from chat agent)
  React.useEffect(() => {
    if (initialParams) {
      if (initialParams.length_ft !== undefined) setLengthFt(initialParams.length_ft);
      if (initialParams.width_ft !== undefined) setWidthFt(initialParams.width_ft);
      if (initialParams.budget_inr !== undefined) setBudgetInr(initialParams.budget_inr);
      if (initialParams.theme !== undefined) setTheme(initialParams.theme);
      if (initialParams.include_bathtub !== undefined) setIncludeBathtub(initialParams.include_bathtub);
      if (initialParams.sketch_layout !== undefined) setSketchLayout(initialParams.sketch_layout || []);
      if (initialParams.sketch_history_id !== undefined) setSketchHistoryId(initialParams.sketch_history_id || null);
    }
  }, [initialParams]);

  const loadHistory = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/sketch-history?session_id=${encodeURIComponent(sessionId)}`);
      if (resp.ok) setHistory(await resp.json());
    } catch (err) {
      console.warn('[InputForm] Could not load sketch history:', err);
    }
  };

  React.useEffect(() => { loadHistory(); }, [sessionId]);

  const buildParams = (overrides = {}) => ({
    length_ft: parseFloat(overrides.length_ft ?? lengthFt),
    width_ft: parseFloat(overrides.width_ft ?? widthFt),
    budget_inr: parseInt(overrides.budget_inr ?? budgetInr, 10),
    theme: overrides.theme ?? theme,
    include_bathtub: overrides.include_bathtub ?? includeBathtub,
    water_pressure: overrides.water_pressure ?? waterPressure,
    electrical_rough_in: overrides.electrical_rough_in ?? electricalRoughIn,
    green_certification: overrides.green_certification ?? greenCertification,
    sketch_layout: overrides.sketch_layout !== undefined ? overrides.sketch_layout : sketchLayout,
    sketch_history_id: overrides.sketch_history_id !== undefined ? overrides.sketch_history_id : sketchHistoryId
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVisionState('loading');
    setVisionError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 s max

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('session_id', sessionId);
      const resp = await fetch(`${API_BASE}/api/vision-dimensions`, {
        method: 'POST',
        body: form,
        signal: controller.signal
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: 'Vision API error' }));
        const detail = err.detail;
        throw new Error(typeof detail === 'string' ? detail : 'Vision analysis failed');
      }
      const data = await resp.json();
      setSketchHistoryId(data.history_id || null);
      setVisionProposal(data);
      setVisionState('proposal');
      loadHistory();
    } catch (err) {
      const isAbort = err.name === 'AbortError';
      setVisionError(isAbort ? 'Image analysis timed out. Please try again.' : err.message);
      setVisionState('error');
    } finally {
      clearTimeout(timeoutId);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const applyVisionProposal = async () => {
    if (!visionProposal?.proposed_dimensions) return;
    const { length_ft, width_ft } = visionProposal.proposed_dimensions;
    const inferred = visionProposal.inferred_layout || [];
    const wantsTub = inferred.some(
      (f) => f.category === 'Bathtubs' && (f.used_for_placement || ['high', 'medium'].includes(f.confidence))
    );
    const nextLength = length_ft || lengthFt;
    const nextWidth = width_ft || widthFt;
    const nextTub = includeBathtub || wantsTub;
    if (length_ft) setLengthFt(length_ft);
    if (width_ft) setWidthFt(width_ft);
    if (wantsTub) setIncludeBathtub(true);
    setSketchLayout(inferred);
    setVisionState('idle');
    setVisionProposal(null);
    const params = buildParams({
      length_ft: nextLength,
      width_ft: nextWidth,
      include_bathtub: nextTub,
      sketch_layout: inferred,
      sketch_history_id: visionProposal.history_id
    });
    setSketchHistoryId(visionProposal.history_id || sketchHistoryId);
    await onOptimize(params);
    await loadHistory();
  };

  const restoreHistory = async (entry) => {
    setSketchHistoryId(entry.id);
    let nextLayout = [];
    let nextL = lengthFt;
    let nextW = widthFt;
    if (entry.proposal) {
      const dimensions = entry.proposal.proposed_dimensions || {};
      nextL = dimensions.length_ft || lengthFt;
      nextW = dimensions.width_ft || widthFt;
      nextLayout = entry.proposal.inferred_layout || [];
      setLengthFt(nextL);
      setWidthFt(nextW);
      setSketchLayout(nextLayout);
    }
    if (entry.bundle?.bundles?.length) {
      onRestoreHistory?.(entry);
    } else {
      // Re-run optimization with restored sketch parameters
      await onOptimize(buildParams({
        length_ft: nextL,
        width_ft: nextW,
        sketch_layout: nextLayout,
        sketch_history_id: entry.id
      }));
    }
  };

  const handleClearSketch = async () => {
    setSketchLayout([]);
    setSketchHistoryId(null);
    setVisionProposal(null);
    setVisionState('idle');
    if (onClearSketch) {
      onClearSketch();
    } else {
      await onOptimize(buildParams({ sketch_layout: [], sketch_history_id: null }));
    }
  };

  const deleteHistory = async (entry) => {
    try {
      const resp = await fetch(`${API_BASE}/api/sketch-history/${entry.id}?session_id=${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
      if (resp.ok) {
        setHistory((items) => items.filter((item) => item.id !== entry.id));
        // If the deleted sketch was active or proposal is open, wipe state completely
        if (sketchHistoryId === entry.id || visionProposal?.history_id === entry.id) {
          handleClearSketch();
        }
      }
    } catch (err) {
      console.warn('[InputForm] Error deleting sketch:', err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onOptimize(buildParams());
  };

  const areaSqFt = Math.round(lengthFt * widthFt);
  const attrib = visionProposal?.layout_attribution;

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} color="var(--color-grey-800)" />
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-grey-800)', margin: 0 }}>
            Room, MEP & Budget Planner
          </h2>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--color-grey-400)', background: 'var(--color-grey-100)', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
          MEP-Constrained Optimizer
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label className="form-label">Length: {lengthFt} ft</label>
            <input
              type="range"
              min="6"
              max="24"
              step="0.5"
              value={lengthFt}
              onChange={(e) => setLengthFt(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--color-black)' }}
            />
          </div>
          <div>
            <label className="form-label">Width: {widthFt} ft</label>
            <input
              type="range"
              min="5"
              max="20"
              step="0.5"
              value={widthFt}
              onChange={(e) => setWidthFt(e.target.value)}
              style={{ width: '100%', accentColor: 'var(--color-black)' }}
            />
          </div>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--color-grey-400)', marginBottom: '20px' }}>
          Total Floor Area: <b>{areaSqFt} sq ft</b> {areaSqFt < 45 ? '(Compact suite)' : '(Spacious suite, bathtub eligible)'}
        </div>

        <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'var(--color-grey-100)', border: '1px solid var(--color-grey-200)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--color-grey-800)' }}>
              <Camera size={14} color="var(--color-grey-800)" />
              Sketch to Full Design
            </div>
            <span style={{ fontSize: '10px', color: 'var(--color-grey-400)', fontStyle: 'italic' }}>Always confirms before applying</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--color-grey-500)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
            Upload a bathroom photo or hand-drawn sketch. AI estimates room size and identifiable fixture zones, then the optimizer completes anything the sketch leaves unclear.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageUpload}
            id="vision-upload-input"
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={visionState === 'loading'}
              className="btn btn-primary btn-sm"
              style={{ opacity: visionState === 'loading' ? 0.7 : 1 }}
            >
              <Camera size={13} />
              {visionState === 'loading' ? 'Analyzing sketch...' : 'Upload Photo or Sketch'}
            </button>

            {sketchLayout && sketchLayout.length > 0 && (
              <button
                type="button"
                onClick={handleClearSketch}
                className="btn btn-secondary btn-sm"
                style={{ color: '#b91c1c', borderColor: '#fca5a5' }}
                title="Clear sketch layout and revert to standard architectural placement"
              >
                <X size={13} /> Clear Sketch Layout
              </button>
            )}
          </div>

          {sketchLayout && sketchLayout.length > 0 && (
            <div style={{ marginTop: '8px', padding: '6px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '11px', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>📐 <b>Active:</b> Drawing-derived spatial layout is active ({sketchLayout.length} fixture zones mapped)</span>
              <button type="button" onClick={handleClearSketch} style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', fontWeight: 700, fontSize: '11px', textDecoration: 'underline' }}>Reset</button>
            </div>
          )}

          {history.length > 0 && (
            <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-grey-200)', paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-grey-800)' }}>
                  Saved sketches ({history.length})
                </span>
                <span style={{ fontSize: '10px', color: 'var(--color-grey-400)' }}>Click thumbnail to view</span>
              </div>
              {history.map((entry) => (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--color-grey-100)' }}>
                  <img
                    src={entry.image_url}
                    alt={entry.filename}
                    onClick={() => setPreviewImage(entry.image_url)}
                    style={{ width: '42px', height: '32px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: '1px solid var(--color-grey-200)' }}
                    title="Click to zoom image"
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-grey-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.filename}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-grey-400)' }}>
                      {entry.proposal?.proposed_dimensions?.length_ft ? `${entry.proposal.proposed_dimensions.length_ft}' × ${entry.proposal.proposed_dimensions.width_ft}' • ` : ''}
                      {entry.bundle ? 'Design generated' : 'Analyzed'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => restoreHistory(entry)}
                    title="Load this sketch and generate suites"
                    style={{ background: sketchHistoryId === entry.id ? '#0f172a' : '#fff', color: sketchHistoryId === entry.id ? '#fff' : '#0f172a' }}
                  >
                    {sketchHistoryId === entry.id ? 'Active' : 'Open'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteHistory(entry)}
                    title="Delete saved sketch"
                    style={{ border: 'none', background: 'none', color: 'var(--color-grey-500)', cursor: 'pointer', padding: '4px' }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {visionState === 'error' && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-grey-800)', background: 'var(--color-white)', border: '1px solid var(--color-grey-200)', padding: '6px 10px', borderRadius: '5px' }}>
              <AlertTriangle size={12} /> {visionError}
              <button type="button" onClick={() => setVisionState('idle')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-grey-400)' }}><X size={12} /></button>
            </div>
          )}

          {visionState === 'proposal' && visionProposal && (
            <div style={{ marginTop: '10px', background: 'var(--color-white)', border: '1px solid var(--color-grey-800)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--color-grey-800)' }}>
                <CheckCircle2 size={14} /> Sketch analysis — please review
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div style={{ background: 'var(--color-grey-100)', padding: '8px', borderRadius: '5px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--color-grey-400)', marginBottom: '2px' }}>Length</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-grey-800)' }}>{visionProposal.proposed_dimensions.length_ft} ft</div>
                </div>
                <div style={{ background: 'var(--color-grey-100)', padding: '8px', borderRadius: '5px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--color-grey-400)', marginBottom: '2px' }}>Width</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-grey-800)' }}>{visionProposal.proposed_dimensions.width_ft} ft</div>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-grey-500)', marginBottom: '10px' }}>
                Size confidence: <b style={{ color: 'var(--color-grey-800)' }}>{visionProposal.confidence}</b> — {visionProposal.notes}
              </div>
              {(visionProposal.inferred_layout || []).length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-grey-800)', marginBottom: '6px' }}>Detected fixtures</div>
                  {(visionProposal.inferred_layout || []).map((f, idx) => (
                    <div key={idx} style={{ fontSize: '11px', color: 'var(--color-grey-500)', marginBottom: '4px' }}>
                      <b style={{ color: 'var(--color-grey-800)' }}>{f.category || f.type}</b>
                      {' — '}
                      {f.used_for_placement
                        ? `from sketch (${f.confidence} confidence${f.wall ? `, ${f.wall} wall` : ''})`
                        : `unclear in sketch — optimizer will place (${f.confidence})`}
                    </div>
                  ))}
                </div>
              )}
              {attrib && (
                <div style={{ fontSize: '11px', color: 'var(--color-grey-500)', marginBottom: '10px', lineHeight: 1.4 }}>
                  <div><b style={{ color: 'var(--color-grey-800)' }}>From sketch:</b> {attrib.from_sketch?.length ? attrib.from_sketch.join(', ') : 'none clear enough'}</div>
                  <div><b style={{ color: 'var(--color-grey-800)' }}>Optimizer will fill:</b> {attrib.optimizer_filled?.length ? attrib.optimizer_filled.join(', ') : 'none'}</div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={applyVisionProposal}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                >
                  <Check size={12} /> Apply layout and generate suites
                </button>
                <button
                  type="button"
                  onClick={() => { setVisionState('idle'); setVisionProposal(null); }}
                  className="btn btn-secondary btn-sm"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lightbox Preview Modal for Sketch Drawings */}
        {previewImage && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(4px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
            onClick={() => setPreviewImage(null)}
          >
            <div
              style={{
                position: 'relative',
                background: '#fff',
                borderRadius: '8px',
                padding: '12px',
                maxWidth: '90vw',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>Uploaded Bathroom Sketch</span>
                <button
                  onClick={() => setPreviewImage(null)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>
              <img
                src={previewImage}
                alt="Bathroom sketch preview"
                style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '4px' }}
              />
            </div>
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label className="form-label">Target Budget (INR)</label>
            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-black)' }}>
              ₹{parseInt(budgetInr, 10).toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            min="30000"
            max="600000"
            step="10000"
            value={budgetInr}
            onChange={(e) => setBudgetInr(e.target.value)}
            style={{ width: '100%', accentColor: 'var(--color-black)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-grey-300)', marginTop: '4px' }}>
            <span>₹30,000 (Essential)</span>
            <span>₹2,50,000 (Signature)</span>
            <span>₹6,00,000+ (Luxury)</span>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label className="form-label" style={{ marginBottom: '10px' }}>Aesthetic Theme</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            {THEMES.map((t) => {
              const isSelected = theme === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  style={{
                    border: `1.5px solid ${isSelected ? 'var(--color-black)' : 'var(--color-grey-200)'}`,
                    borderRadius: '6px',
                    padding: '12px',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--color-grey-100)' : 'var(--color-white)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: t.sampleColor }} />
                    {isSelected && <Check size={14} color="var(--color-black)" />}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-grey-800)' }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-grey-400)', marginTop: '4px', lineHeight: 1.3 }}>
                    {t.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-grey-100)',
            border: '1px solid var(--color-grey-200)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <Sliders size={16} color="var(--color-grey-800)" />
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-grey-800)', margin: 0 }}>
              Device & MEP Constraints (Engineering Inputs)
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '12px' }}>
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <Droplets size={13} color="var(--color-grey-500)" /> Water Pressure
              </label>
              <select
                id="water-pressure-select"
                value={waterPressure}
                onChange={(e) => setWaterPressure(e.target.value)}
                style={selectStyle}
              >
                <option value="low">Low (&lt; 1.5 Bar / Gravity Feed)</option>
                <option value="medium">Medium (1.5 – 2.5 Bar / Municipal Standard)</option>
                <option value="high">High (3.0+ Bar / Booster Pump Equipped)</option>
              </select>
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <Zap size={13} color="var(--color-grey-500)" /> Electrical Rough-in
              </label>
              <select
                id="electrical-rough-in-select"
                value={electricalRoughIn ? "yes" : "no"}
                onChange={(e) => setElectricalRoughIn(e.target.value === "yes")}
                style={selectStyle}
              >
                <option value="yes">Available (230V Circuit for Smart Toilets & Lighted Mirrors)</option>
                <option value="no">Plumbing Only (Disallow Smart Toilets & Lighted Mirrors)</option>
              </select>
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <Leaf size={13} color="var(--color-grey-500)" /> Green Certification Standard
              </label>
              <select
                id="green-cert-select"
                value={greenCertification}
                onChange={(e) => setGreenCertification(e.target.value)}
                style={selectStyle}
              >
                <option value="none">Standard Plumbing Code (No Flow Caps)</option>
                <option value="leed">LEED v4 Certified (Flow & Flush Caps Enforced)</option>
                <option value="griha">GRIHA 4-Star Standard (Water Efficiency Mandatory)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
            {!electricalRoughIn && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-grey-700)', background: 'var(--color-white)', border: '1px solid var(--color-grey-200)', padding: '5px 8px', borderRadius: '4px' }}>
                <AlertTriangle size={13} />
                <span><b>Electrical Rough-in Inactive:</b> Smart Toilets (Veil/Innate/Leap) and Lighted Mirrors will be filtered out. High-efficiency mechanical fixtures will be selected.</span>
              </div>
            )}
            {waterPressure === "low" && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-grey-700)', background: 'var(--color-white)', border: '1px solid var(--color-grey-200)', padding: '5px 8px', borderRadius: '4px' }}>
                <Info size={13} />
                <span><b>Low Water Pressure:</b> Large 25-30cm rainheads requiring &gt; 2.5 bar will be filtered out. Gravity-compatible multi-function showers and pillar taps will be selected.</span>
              </div>
            )}
            {greenCertification !== "none" && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-grey-700)', background: 'var(--color-white)', border: '1px solid var(--color-grey-200)', padding: '5px 8px', borderRadius: '4px' }}>
                <Leaf size={13} />
                <span><b>{greenCertification.toUpperCase()} Flow Limits Enforced:</b> Faucets capped at 6.0 LPM and Showers at 9.5 LPM. Dual-flush water-saving toilets prioritized.</span>
              </div>
            )}
          </div>
        </div>

        {areaSqFt >= 45 && (
          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="tub-check"
              checked={includeBathtub}
              onChange={(e) => setIncludeBathtub(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--color-black)', cursor: 'pointer' }}
            />
            <label htmlFor="tub-check" style={{ fontSize: '13px', color: 'var(--color-grey-700)', cursor: 'pointer' }}>
              Include Freestanding / Drop-In Bathtub in recommendations
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px' }}
        >
          <Sparkles size={16} />
          {isLoading ? "Optimizing Suites..." : "Generate Optimized Suites"}
        </button>
      </form>
    </div>
  );
}

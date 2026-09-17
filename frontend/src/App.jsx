import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Download, Droplets, MessageCircle, Box, LayoutGrid } from 'lucide-react';
import Room3DViewer from './components/Room3DViewer';
import Room2DViewer from './components/Room2DViewer';
import BundleComparison from './components/BundleComparison';
import InputForm from './components/InputForm';
import ChatPanel from './components/ChatPanel';
import FixtureDetailModal from './components/FixtureDetailModal';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8003';

const DEFAULT_FALLBACK_BUNDLE = {
  bundle_id: "bundle-balanced",
  bundle_name: "Balanced Signature Suite",
  tier: "balanced",
  theme: "Minimalist Modern",
  total_price_inr: 106285,
  total_mrp_inr: 120780,
  savings_inr: 14495,
  discount_pct: 12.0,
  within_budget: true,
  budget_inr: 150000,
  water_savings: {
    annual_saved_liters: 83841,
    annual_saved_gallons: 22148,
    baseline_liters: 144540,
    efficient_liters: 60699,
    savings_pct: 58.0
  },
  mep_compliance: {
    passed: true,
    violations: [],
    details: ["Electrical points clearance met", "Drain slope validated"]
  },
  room: { length_ft: 10, width_ft: 8, height_ft: 8, area_sqft: 80 },
  camera: {
    target: [0, 2, 0],
    position: [8.5, 10.8, 10],
    distance: 16.65,
    fov: 45
  },
  fixtures: [
    {
      sku: "21226IN-HP1",
      name: "ModernLife Edge 60 cm rectangular vessel bathroom sink",
      category: "Washbasins",
      price_inr: 18500,
      finish: "White",
      position: [-2.9, 2.7, -3.07],
      rotation: [0, 0, 0]
    },
    {
      sku: "77963-8A-BL",
      name: "Components Rocker bathroom sink faucet handle",
      category: "Faucets",
      price_inr: 8900,
      finish: "Matte Black",
      position: [-2.9, 2.85, -3.52],
      rotation: [0, 0, 0]
    },
    {
      sku: "26050IN-BGL",
      name: "Essential 71.5 cm round framed mirror",
      category: "Mirrors & Cabinets",
      price_inr: 14500,
      finish: "Brushed Moderne Brass",
      position: [-2.9, 4.8, -3.92],
      rotation: [0, 0, 0]
    },
    {
      sku: "17629IN-SM-0",
      name: "Ove 1Pc complete toilet bundle in White",
      category: "Toilets",
      price_inr: 38500,
      finish: "White",
      position: [0.2, 0, -3.12],
      rotation: [0, 0, 0]
    },
    {
      sku: "73199IN-CP",
      name: "Rainduet Contemporary square 20 cm single-function rainhead",
      category: "Showers",
      price_inr: 25885,
      finish: "Polished Chrome",
      position: [3.2, 7.2, 2.2],
      rotation: [0, -1.57, 0]
    }
  ]
};

export default function App() {
  const [roomSpecs, setRoomSpecs] = useState({
    length_ft: 10.0,
    width_ft: 8.0,
    budget_inr: 150000,
    theme: "Minimalist Modern",
    include_bathtub: false,
    water_pressure: "medium",
    electrical_rough_in: true,
    green_certification: "none",
    sketch_layout: []
  });

  const [bundlesData, setBundlesData] = useState({
    room_specs: { length_ft: 10.0, width_ft: 8.0, height_ft: 8.0 },
    bundles: [DEFAULT_FALLBACK_BUNDLE]
  });
  const [activeBundleId, setActiveBundleId] = useState("bundle-balanced");
  const [viewMode, setViewMode] = useState("3d"); // '3d' | '2d'
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [inspectedFixture, setInspectedFixture] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Chat agent state (FR-6, FR-7, FR-8)
  const [sessionId] = useState(() => {
    const stored = window.localStorage.getItem('kohler-session-id');
    if (stored) return stored;
    const next = "session-" + Math.random().toString(36).substring(2, 9);
    window.localStorage.setItem('kohler-session-id', next);
    return next;
  });
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Welcome to the Kohler AI Bathroom Designer. I've prepared 3 optimized suites based on real Kohler catalog products and spatial clearance rules. You can adjust the parameters or chat with me to swap fixtures, shift aesthetics, or fine-tune costs."
    }
  ]);
  const [isSending, setIsSending] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const chatAbortRef = useRef(null); // holds the live AbortController for cancellation

  const handleCancelChat = useCallback(() => {
    if (chatAbortRef.current) {
      chatAbortRef.current.abort();
      chatAbortRef.current = null;
    }
  }, []);

  // ITEM 1 FIX: useCallback so runOptimization is a stable reference — prevents
  // InputForm and useEffect from re-triggering on every App render
  const runOptimization = useCallback(async (params) => {
    setIsLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
      });
      if (!resp.ok) throw new Error(`Optimization API failed with status ${resp.status}`);
      const data = await resp.json();
      setBundlesData(data);
      setRoomSpecs(params);
      setActiveBundleId(data.bundles[1]?.bundle_id || data.bundles[0]?.bundle_id);
      if (params.sketch_history_id) {
        fetch(`${API_BASE}/api/sketch-history/${params.sketch_history_id}/bundle`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bundle: data })
        }).catch((err) => console.warn('[App] Could not save sketch design history:', err));
      }
      return data;
    } catch (err) {
      console.warn("[App] Optimization API unavailable, keeping standard Kohler suite:", err);
    } finally {
      setIsLoading(false);
    }
  }, []); // stable — no deps change after mount

  const restoreSketchHistory = useCallback((entry) => {
    if (entry.bundle?.bundles?.length) {
      setBundlesData(entry.bundle);
      setRoomSpecs({
        ...entry.bundle.room_specs,
        ...entry.proposal?.proposed_dimensions,
        sketch_layout: entry.proposal?.inferred_layout || [],
        sketch_history_id: entry.id
      });
      setActiveBundleId(entry.bundle.bundles[1]?.bundle_id || entry.bundle.bundles[0]?.bundle_id);
    } else if (entry.proposal) {
      const nextSpecs = {
        ...roomSpecs,
        ...entry.proposal.proposed_dimensions,
        sketch_layout: entry.proposal.inferred_layout || [],
        sketch_history_id: entry.id
      };
      runOptimization(nextSpecs);
    }
  }, [roomSpecs, runOptimization]);

  const handleClearSketch = useCallback(() => {
    setRoomSpecs((prev) => {
      const updated = {
        ...prev,
        sketch_layout: [],
        sketch_history_id: null
      };
      runOptimization(updated);
      return updated;
    });
  }, [runOptimization]);

  useEffect(() => {
    runOptimization(roomSpecs);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoize activeBundle so Room3DViewer doesn't see a new object reference on unrelated renders
  const activeBundle = useMemo(
    () => bundlesData?.bundles?.find((b) => b.bundle_id === activeBundleId) || bundlesData?.bundles?.[0],
    [bundlesData, activeBundleId]
  );

  // bundleKey encodes bundle_id + tier + all fixture SKUs
  const bundleKey = useMemo(() => {
    if (!activeBundle) return "empty";
    const skuHash = (activeBundle.fixtures || []).map(f => f.sku || '').join('-');
    return `${activeBundle.bundle_id}-${activeBundle.tier}-${skuHash}`;
  }, [activeBundle]);

  // Chat send — cancel previous in-flight requests, 25s timeout, cycling status indicator
  const THINKING_LABELS = [
    "Analyzing design intent...",
    "Consulting Kohler catalog...",
    "Evaluating spatial layout...",
    "Generating design recommendations..."
  ];

  const handleSendMessage = useCallback(async (userMessage) => {
    if (!userMessage?.trim() || isSending) return;

    // Cancel any previous in-flight chat request
    if (chatAbortRef.current) {
      chatAbortRef.current.abort();
    }

    setIsSending(true);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    const controller = new AbortController();
    chatAbortRef.current = controller;
    const timeoutSeconds = 25;
    const hardTimeout = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

    let labelIdx = 0;
    setActiveTool(THINKING_LABELS[0]);
    const labelTimer = setInterval(() => {
      labelIdx = (labelIdx + 1) % THINKING_LABELS.length;
      setActiveTool(THINKING_LABELS[labelIdx]);
    }, 4000);

    try {
      const resp = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage,
          active_bundle: activeBundle,
          current_params: roomSpecs
        })
      });

      if (!resp.ok) {
        const errorBody = await resp.json().catch(() => ({}));
        throw new Error(errorBody.detail || `Chat request failed (${resp.status})`);
      }
      const data = await resp.json();

      if (data.tool_called) {
        setActiveTool(`${data.tool_called}()`);
        setTimeout(() => setActiveTool(null), 1200);
      } else {
        setActiveTool(null);
      }

      // If reoptimize was called by agent
      if (data.tool_called === "reoptimize" && data.tool_result?.data) {
        setBundlesData(data.tool_result.data);
        setActiveBundleId(data.tool_result.data.bundles[1]?.bundle_id || data.tool_result.data.bundles[0]?.bundle_id);
        if (data.current_params) setRoomSpecs(data.current_params);
      }

      // swap_item updates bundlesData so bundleKey changes → 3D scene refreshes
      if (data.tool_called === "swap_item" && data.active_bundle) {
        setBundlesData((prev) => {
          if (!prev) return prev;
          const updatedBundles = prev.bundles.map((b) =>
            b.bundle_id === activeBundleId ? { ...data.active_bundle, bundle_id: activeBundleId } : b
          );
          return { ...prev, bundles: updatedBundles };
        });
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      const isAbort = err.name === "AbortError";
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isAbort
            ? "The AI model took too long to respond. Ollama may still be warming up — please try again."
            : err.message || "Apologies, I encountered an issue executing that command. Please try again."
        }
      ]);
      setActiveTool(null);
    } finally {
      clearTimeout(hardTimeout);
      clearInterval(labelTimer);
      chatAbortRef.current = null;
      setIsSending(false);
    }
  }, [sessionId, activeBundle, roomSpecs, activeBundleId, isSending]);

  // Export PDF Quote (FR-15)
  const handleExportPDF = useCallback(async () => {
    if (!activeBundle) return;
    setIsExporting(true);
    try {
      const resp = await fetch(`${API_BASE}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bundle: activeBundle,
          room_specs: bundlesData.room_specs || roomSpecs
        })
      });

      if (!resp.ok) throw new Error("Failed to export PDF quote");
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Kohler_${activeBundle.bundle_name.replace(/\s+/g, "_")}_Quote.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("Error generating PDF quote: " + err.message);
    } finally {
      setIsExporting(false);
    }
  }, [activeBundle, bundlesData, roomSpecs]);

  return (
    <div>
      {/* App Header */}
      <header className="app-header">
        <div className="container header-inner">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className="brand-logo">KOHLER.</span>
            <span className="brand-subtitle">AI Bathroom Designer & Planner</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {activeBundle && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span className="badge-eco">
                  <Droplets size={13} /> {activeBundle.water_savings?.annual_saved_gallons?.toLocaleString()} Gal saved/yr
                </span>
                <span style={{ fontWeight: 800, color: 'var(--color-black)' }}>
                  ₹{activeBundle.total_price_inr.toLocaleString()}
                </span>
              </div>
            )}

            <button
              onClick={handleExportPDF}
              disabled={isExporting || !activeBundle}
              className="btn btn-primary"
            >
              <Download size={15} />
              {isExporting ? "Generating PDF..." : "Export Official Quote"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container">
        <div className="main-layout">
          <div>
            {/* View Mode Header & 2D/3D Toggle */}
            <div className="viewmode-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-grey-800)', margin: 0 }}>
                  {viewMode === '3d' ? '3D Realistic Product Visualization' : '2D Architectural Floor Plan'}
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--color-grey-400)', fontWeight: 500 }}>
                  ({activeBundle?.bundle_name || 'Standard Suite'})
                </span>
              </div>

              {/* 2D / 3D Segmented Toggle */}
              <div
                style={{
                  display: 'inline-flex',
                  background: '#e2e8f0',
                  padding: '3px',
                  borderRadius: '8px',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
                }}
              >
                <button
                  id="toggle-view-3d"
                  onClick={() => setViewMode('3d')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: viewMode === '3d' ? '#ffffff' : 'transparent',
                    color: viewMode === '3d' ? '#0f172a' : '#64748b',
                    boxShadow: viewMode === '3d' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Box size={14} /> 3D View
                </button>
                <button
                  id="toggle-view-2d"
                  onClick={() => setViewMode('2d')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: viewMode === '2d' ? '#ffffff' : 'transparent',
                    color: viewMode === '2d' ? '#0f172a' : '#64748b',
                    boxShadow: viewMode === '2d' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <LayoutGrid size={14} /> 2D Floor Plan
                </button>
              </div>
            </div>

            {activeBundle?.layout_attribution && (
              (activeBundle.layout_attribution.from_sketch?.length > 0 ||
                activeBundle.layout_attribution.optimizer_filled?.length > 0) && (
                <div
                  style={{
                    marginBottom: '12px',
                    padding: '10px 12px',
                    background: 'var(--color-grey-100)',
                    border: '1px solid var(--color-grey-200)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: 'var(--color-grey-500)',
                    lineHeight: 1.45
                  }}
                >
                  <b style={{ color: 'var(--color-grey-800)' }}>Layout sources</b>
                  {' — '}
                  <b style={{ color: 'var(--color-grey-800)' }}>From sketch:</b>{' '}
                  {activeBundle.layout_attribution.from_sketch?.length
                    ? activeBundle.layout_attribution.from_sketch.join(', ')
                    : 'none'}
                  {' · '}
                  <b style={{ color: 'var(--color-grey-800)' }}>Optimizer-filled:</b>{' '}
                  {activeBundle.layout_attribution.optimizer_filled?.length
                    ? activeBundle.layout_attribution.optimizer_filled.join(', ')
                    : 'none'}
                </div>
              )
            )}

            {/* Viewport Container — keeps 3D Canvas mounted to preserve camera angle */}
            <div className="viewport-container" style={{ marginBottom: '64px' }}>
              <div style={{ width: '100%', height: '100%', display: viewMode === '3d' ? 'block' : 'none' }}>
                {/* ITEM 2 FIX: bundleKey passed so Room3DViewer reliably re-fires its
                    loading effect whenever the active bundle's fixture composition changes */}
                <Room3DViewer
                  bundle={activeBundle}
                  bundles={bundlesData?.bundles}
                  roomSpecs={roomSpecs}
                  bundleKey={bundleKey}
                />
              </div>
              <div style={{ width: '100%', height: '100%', display: viewMode === '2d' ? 'block' : 'none' }}>
                <Room2DViewer
                  bundle={activeBundle}
                  roomSpecs={roomSpecs}
                  onInspectFixture={(f) => setInspectedFixture(f)}
                />
              </div>
            </div>

            {/* Room Dimensions & Budget Controls — image upload inside InputForm */}
            <InputForm
              initialParams={roomSpecs}
              onOptimize={runOptimization}
              sessionId={sessionId}
              onRestoreHistory={restoreSketchHistory}
              onClearSketch={handleClearSketch}
              isLoading={isLoading}
            />

            {/* ITEM 10: Bundle Comparison — name/SKU/price/category only, no inline spec chips */}
            <BundleComparison
              bundles={bundlesData?.bundles}
              activeBundleId={activeBundleId}
              onSelectBundle={(id) => setActiveBundleId(id)}
              onInspectFixture={(f) => setInspectedFixture(f)}
            />
          </div>
        </div>
      </main>

      {/* Fixture Details Modal */}
      {inspectedFixture && (
        <FixtureDetailModal
          fixture={inspectedFixture}
          onClose={() => setInspectedFixture(null)}
        />
      )}

      {/* Floating Chat Toggle FAB */}
      <button
        id="chat-toggle-fab"
        className="chat-fab"
        onClick={() => setIsChatOpen((prev) => !prev)}
        title={isChatOpen ? 'Close Chat' : 'Chat with AI Designer'}
      >
        {isChatOpen ? (
          <span style={{ fontSize: '20px', lineHeight: 1 }}>✕</span>
        ) : (
          <MessageCircle size={22} />
        )}
      </button>

      {/* Floating Chat Panel Overlay */}
      {isChatOpen && (
        <div className="chat-overlay">
          <ChatPanel
            messages={messages}
            isSending={isSending}
            activeTool={activeTool}
            onSendMessage={handleSendMessage}
            onCancel={handleCancelChat}
            onClose={() => setIsChatOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { X, Smartphone, Layers, CheckCircle2, Box } from 'lucide-react';

export default function ARSelectionModal({ isOpen, onClose, bundle, arMode, onLaunchWebXR }) {
  if (!isOpen) return null;

  const fixtures = bundle?.fixtures || [];
  const theme = (bundle?.theme || 'Minimalist Modern').toLowerCase();

  // Pick matching USDZ suite model
  let suiteUsdzPath = '/models/bathroom-suite.usdz';
  if (theme.includes('luxury') || theme.includes('classic')) {
    suiteUsdzPath = '/models/suite-luxury.usdz';
  } else if (theme.includes('zen') || theme.includes('japanese')) {
    suiteUsdzPath = '/models/suite-zen.usdz';
  } else if (theme.includes('modern')) {
    suiteUsdzPath = '/models/suite-modern.usdz';
  }

  const isQuickLook = arMode === 'quicklook';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(5px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '24px',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '88vh',
          overflowY: 'auto',
          boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
          border: '1px solid var(--color-grey-200)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smartphone size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Augmented Reality (AR) Studio
              </h3>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
                Select whether to project the full assembled suite or place individual fixtures in real-world scale.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#64748b',
              fontSize: '18px',
              fontWeight: 700
            }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* PRIMARY HERO CHOICE: Assembled Multi-Fixture Suite (Default) */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            borderRadius: '10px',
            padding: '16px 18px',
            marginBottom: '20px',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={16} color="#38bdf8" />
              <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.02em', color: '#ffffff' }}>
                Full Bathroom Suite (All {fixtures.length} Fixtures)
              </span>
            </div>
            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              Default • Recommended
            </span>
          </div>

          <p style={{ fontSize: '11px', color: '#cbd5e1', margin: '0 0 12px 0', lineHeight: 1.45 }}>
            Projects the complete assembled <b>{bundle?.bundle_name}</b> ({bundle?.theme} aesthetic) containing your configured washbasin, faucet, toilet, mirror, and shower.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>
              ₹{bundle?.total_price_inr?.toLocaleString()}
            </div>

            {isQuickLook ? (
              <a
                rel="ar"
                href={suiteUsdzPath}
                className="btn btn-primary btn-sm"
                style={{
                  background: '#38bdf8',
                  color: '#0f172a',
                  fontWeight: 800,
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px'
                }}
              >
                <img src="/icons.svg" alt="" style={{ display: 'none' }} />
                <Smartphone size={14} /> Launch Full Suite in AR
              </a>
            ) : (
              <button
                onClick={() => onLaunchWebXR(null)}
                className="btn btn-primary btn-sm"
                style={{
                  background: '#38bdf8',
                  color: '#0f172a',
                  fontWeight: 800,
                  padding: '8px 16px',
                  borderRadius: '6px'
                }}
              >
                <Smartphone size={14} /> Launch Full Suite in AR
              </button>
            )}
          </div>
        </div>

        {/* SECTION DIVIDER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{ height: '1px', flex: 1, background: '#e2e8f0' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Or View Individual Fixture ({fixtures.length} available)
          </span>
          <div style={{ height: '1px', flex: 1, background: '#e2e8f0' }} />
        </div>

        {/* INDIVIDUAL FIXTURE SELECTION LIST */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {fixtures.map((fixture, idx) => {
            const fixtureUsdz = `/models/${fixture.sku}.usdz`;

            return (
              <div
                key={fixture.sku || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  transition: 'background 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Box size={14} color="#475569" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        {fixture.category}
                      </span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>•</span>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>
                        {fixture.finish || 'Standard'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>
                      {fixture.name}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>
                    ₹{fixture.price_inr?.toLocaleString()}
                  </span>

                  {isQuickLook ? (
                    <a
                      rel="ar"
                      href={fixtureUsdz}
                      style={{
                        background: '#0f172a',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title={`View ${fixture.name} in AR`}
                    >
                      <img src="/icons.svg" alt="" style={{ display: 'none' }} />
                      <Smartphone size={12} /> View in AR
                    </a>
                  ) : (
                    <button
                      onClick={() => onLaunchWebXR(fixture)}
                      style={{
                        background: '#0f172a',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title={`View ${fixture.name} in AR`}
                    >
                      <Smartphone size={12} /> View in AR
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
          <span>Powered by Kohler Real-Scale BIM & USDZ/WebXR</span>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11px', padding: '4px 10px' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

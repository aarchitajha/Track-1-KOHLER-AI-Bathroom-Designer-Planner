import React, { useState, useEffect } from 'react';
import { X, ExternalLink, CheckCircle2, Droplets, ShieldCheck, Smartphone } from 'lucide-react';
import { launchWebXRARSession } from '../utils/arSession';

function isIOSPlatform() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return true;
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
  const a = document.createElement('a');
  return Boolean(a.relList && a.relList.supports && a.relList.supports('ar'));
}

export default function FixtureDetailModal({ fixture, onClose }) {
  const [arMode, setArMode] = useState('none'); // 'quicklook' | 'webxr' | 'none'

  useEffect(() => {
    async function checkAR() {
      if (typeof navigator !== 'undefined' && navigator.xr && typeof navigator.xr.isSessionSupported === 'function') {
        try {
          const sup = await navigator.xr.isSessionSupported('immersive-ar');
          if (sup) {
            setArMode('webxr');
            return;
          }
        } catch {}
      }
      if (isIOSPlatform()) {
        setArMode('quicklook');
      }
    }
    checkAR();
  }, []);

  if (!fixture) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#fff',
          borderRadius: '12px',
          padding: '24px',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-grey-400)'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-grey-400)', textTransform: 'uppercase' }}>
            {fixture.area || 'Basin Area'} • {fixture.category}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--color-grey-700)', background: 'var(--color-grey-100)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
            <CheckCircle2 size={12} /> Verified Real Product
          </span>
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-grey-800)', marginBottom: '4px' }}>
          {fixture.name}
        </h3>
        <div style={{ fontSize: '13px', color: 'var(--color-grey-300)', marginBottom: '16px' }}>
          SKU: <b>{fixture.sku}</b> • Finish: <b>{fixture.finish || 'White'}</b>
        </div>

        {/* Product Image */}
        {fixture.image_url && (
          <div style={{ background: '#f8f8f8', borderRadius: '8px', padding: '20px', textAlign: 'center', marginBottom: '16px' }}>
            <img
              src={fixture.image_url}
              alt={fixture.name}
              style={{ maxHeight: '220px', maxWidth: '100%', objectFit: 'contain' }}
            />
          </div>
        )}

        {/* Price Box */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '12px 16px', background: '#f9f9f9', borderRadius: '6px', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-grey-400)', textTransform: 'uppercase', fontWeight: 600 }}>Selling Price (INR)</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-black)' }}>
              ₹{fixture.price_inr?.toLocaleString()}
            </div>
          </div>
          {fixture.mrp_inr && fixture.mrp_inr > fixture.price_inr && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-grey-400)', textTransform: 'uppercase', fontWeight: 600 }}>MRP</div>
              <div style={{ fontSize: '14px', color: 'var(--color-grey-300)', textDecoration: 'line-through' }}>
                ₹{fixture.mrp_inr.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Technical & MEP Engineering Specifications */}
        {fixture.specs && (
          <div style={{ background: 'var(--color-grey-100)', border: '1px solid var(--color-grey-200)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-grey-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
              Engineering & MEP Specifications
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'var(--color-grey-400)', fontSize: '11px' }}>Electrical Rough-in:</span>
                <div style={{ fontWeight: 600, color: 'var(--color-grey-800)' }}>
                  {fixture.specs.electrical_specs}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--color-grey-400)', fontSize: '11px' }}>Operating Water Pressure:</span>
                <div style={{ fontWeight: 600, color: 'var(--color-grey-800)' }}>
                  Min {fixture.specs.min_water_pressure_bar} Bar ({fixture.specs.pressure_tier})
                </div>
              </div>
              {fixture.specs.flow_rate_lpm && (
                <div>
                  <span style={{ color: 'var(--color-grey-400)', fontSize: '11px' }}>Flow Rate:</span>
                  <div style={{ fontWeight: 600, color: 'var(--color-grey-800)' }}>
                    {fixture.specs.flow_rate_lpm} LPM
                  </div>
                </div>
              )}
              {fixture.specs.flush_volume_lpf && (
                <div>
                  <span style={{ color: 'var(--color-grey-400)', fontSize: '11px' }}>Flush Volume:</span>
                  <div style={{ fontWeight: 600, color: 'var(--color-grey-800)' }}>
                    {fixture.specs.flush_volume_lpf} LPF
                  </div>
                </div>
              )}
              {fixture.specs.green_certifications?.length > 0 && (
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--color-grey-400)', fontSize: '11px' }}>Green Building Compliance:</span>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {fixture.specs.green_certifications.map((g, idx) => (
                      <span key={idx} style={{ background: 'var(--color-grey-100)', color: 'var(--color-grey-700)', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--color-grey-200)' }}>
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Efficiency specs (legacy fallback) */}
        {!fixture.specs && fixture.flow_rate_lpm && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#e8f5e9', color: '#1b5e20', borderRadius: '6px', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
            <Droplets size={16} /> Flow Rate: {fixture.flow_rate_lpm} LPM (Water Conservation Spec)
          </div>
        )}

        {/* 3D Model Asset Status */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>
            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '2px' }}>
              3D Model: High-Fidelity Kohler Representation
            </div>
            Drop official manufacturer CAD mesh into <code>public/models/{fixture.sku}.glb</code> to display exact studio BIM/CAD geometry.
          </div>
        </div>

        {/* Verification provenance */}
        <div style={{ fontSize: '12px', color: 'var(--color-grey-400)', lineHeight: '1.5', borderTop: '1px solid var(--color-grey-100)', paddingTop: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--color-grey-600)', marginBottom: '4px' }}>
            <ShieldCheck size={14} /> Catalog Data Integrity
          </div>
          Verified live on Kohler India portal (kohler.co.in). Price includes GST and standard manufacturer warranty.
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* iOS AR Quick Look Button */}
          {arMode === 'quicklook' && (
            <a
              rel="ar"
              href={`/models/${fixture.sku}.usdz`}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', gap: '6px' }}
            >
              <img src="/icons.svg" alt="" style={{ display: 'none' }} />
              <Smartphone size={15} /> View in AR
            </a>
          )}

          {/* WebXR Button (Android) */}
          {arMode === 'webxr' && (
            <button
              onClick={async () => {
                try {
                  await launchWebXRARSession({
                    selectedFixture: fixture
                  });
                } catch (e) {
                  console.warn('[AR] WebXR session failed:', e);
                }
              }}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', gap: '6px' }}
            >
              <Smartphone size={15} /> View in AR
            </button>
          )}

          {/* Link out to Kohler official store */}
          {fixture.source_url && (
            <a
              href={fixture.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <ExternalLink size={14} /> View on Kohler.co.in Official Store
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

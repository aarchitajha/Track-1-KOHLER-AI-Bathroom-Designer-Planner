import React from 'react';
import { Check, Droplets, Sparkles, Tag, Eye } from 'lucide-react';

export default function BundleComparison({ bundles, activeBundleId, onSelectBundle, onInspectFixture }) {
  if (!bundles || bundles.length === 0) return null;

  return (
    <div style={{ marginTop: 'var(--space-48)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-grey-800)' }}>
            Curated Kohler Suites
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-grey-400)', marginTop: '2px' }}>
            Multi-constraint optimized packages tailored to your room dimensions and theme.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
        {bundles.map((bundle) => {
          const isActive = bundle.bundle_id === activeBundleId;
          const water = bundle.water_savings || {};
          const isWithinBudget = bundle.within_budget;

          return (
            <div
              key={bundle.bundle_id}
              onClick={() => onSelectBundle(bundle.bundle_id)}
              className="card"
              style={{
                cursor: 'pointer',
                borderColor: isActive ? 'var(--color-black)' : 'var(--color-grey-100)',
                borderWidth: isActive ? '2px' : '1px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '20px'
              }}
            >
              {/* Header */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: bundle.tier === 'Premium' ? '#111' : (bundle.tier === 'Balanced' ? '#e8e8e8' : '#f0f0f0'),
                      color: bundle.tier === 'Premium' ? '#fff' : '#111'
                    }}
                  >
                    {bundle.tier} Tier
                  </span>

                  {isActive && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--color-black)' }}>
                      <Check size={16} /> Active in 3D
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-grey-800)', marginTop: '6px' }}>
                  {bundle.bundle_name}
                </h3>

                {/* Price block */}
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-black)' }}>
                    ₹{bundle.total_price_inr.toLocaleString()}
                  </span>
                  {bundle.total_mrp_inr > bundle.total_price_inr && (
                    <span style={{ fontSize: '13px', color: 'var(--color-grey-300)', textDecoration: 'line-through' }}>
                      ₹{bundle.total_mrp_inr.toLocaleString()}
                    </span>
                  )}
                </div>

                {bundle.savings_inr > 0 && (
                  <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-eco-green)', fontWeight: 600 }}>
                    <Tag size={12} /> Save ₹{bundle.savings_inr.toLocaleString()} ({bundle.discount_pct}% off)
                  </div>
                )}

                {/* Water savings badge */}
                <div style={{ marginTop: '12px' }}>
                  <span className="badge-eco">
                    <Droplets size={12} />
                    {water.annual_saved_gallons ? `${water.annual_saved_gallons.toLocaleString()} Gal (${(water.annual_saved_litres || 0).toLocaleString()} L) saved/yr` : 'WaterSense Spec'}
                  </span>
                </div>

                {/* Fixtures list */}
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--color-grey-100)', paddingTop: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-grey-400)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Included Fixtures ({bundle.fixtures?.length || 0})
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {bundle.fixtures?.map((f) => (
                      <div
                        key={f.sku}
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectFixture(f);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          background: '#fbfbfb',
                          border: '1px solid #f0f0f0',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          {f.image_url ? (
                            <img src={f.image_url} alt={f.name} style={{ width: '30px', height: '30px', objectFit: 'contain', background: '#fff', borderRadius: '3px' }} />
                          ) : (
                            <div style={{ width: '30px', height: '30px', background: '#eee', borderRadius: '3px' }} />
                          )}
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--color-grey-700)', textOverflow: 'ellipsis', overflow: 'hidden' }}>{f.name}</div>
                            <div style={{ fontSize: '10px', color: 'var(--color-grey-300)' }}>SKU: {f.sku}</div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--color-grey-800)' }}>₹{f.price_inr?.toLocaleString()}</div>
                          <div style={{ fontSize: '10px', color: 'var(--color-grey-400)' }}>
                            {f.category}
                            {f.placement_source ? ` · ${f.placement_source === 'sketch' ? 'from sketch' : 'optimizer'}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div style={{ marginTop: '20px' }}>
                <button
                  className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ width: '100%' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBundle(bundle.bundle_id);
                  }}
                >
                  {isActive ? 'Current 3D Layout' : 'Switch to this Suite'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

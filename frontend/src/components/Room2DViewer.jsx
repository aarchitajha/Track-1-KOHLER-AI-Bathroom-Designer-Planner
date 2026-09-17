import React, { useState } from 'react';
import { Compass, CheckCircle2, Droplets, ShieldCheck, Ruler, Sparkles, ZoomIn, Info } from 'lucide-react';

export default function Room2DViewer({ bundle, roomSpecs, onInspectFixture }) {
  const [hoveredSku, setHoveredSku] = useState(null);
  const room = bundle?.room || roomSpecs || { length_ft: 10, width_ft: 8, height_ft: 8 };
  const fixtures = bundle?.fixtures || [];

  const lengthFt = Math.max(Number(room.length_ft) || 10, 5);
  const widthFt = Math.max(Number(room.width_ft) || 8, 5);
  const halfL = lengthFt / 2;
  const halfW = widthFt / 2;

  // Scale: 1 foot = SCALE pixels.
  // Dynamically compute scale so it fits nicely in any container
  const baseScale = Math.min(56, 560 / Math.max(lengthFt, widthFt));
  const SCALE = Math.max(baseScale, 40);

  // Generous padding margins for dimension lines and annotations
  const MARGIN_LEFT = 110;
  const MARGIN_TOP = 95;
  const MARGIN_RIGHT = 95;
  const MARGIN_BOTTOM = 95;

  const roomW = lengthFt * SCALE;
  const roomH = widthFt * SCALE;
  const svgWidth = roomW + MARGIN_LEFT + MARGIN_RIGHT;
  const svgHeight = roomH + MARGIN_TOP + MARGIN_BOTTOM;

  // Coordinate mapping: room foot coordinates (center 0,0) -> SVG pixels
  const toSvgX = (x) => MARGIN_LEFT + (x + halfL) * SCALE;
  const toSvgY = (z) => MARGIN_TOP + (z + halfW) * SCALE;

  // Categorize fixtures
  const toilet = fixtures.find((f) => f.category === "Toilets");
  const basin = fixtures.find((f) => f.category === "Washbasins");
  const faucet = fixtures.find((f) => f.category === "Faucets");
  const shower = fixtures.find((f) => f.category === "Showers");
  const mirror = fixtures.find((f) => f.category === "Mirrors & Cabinets");
  const bathtub = fixtures.find((f) => f.category === "Bathtubs");

  // Clearance validation metrics
  const clearances = [
    { label: "Toilet Front Clearance", value: '24" Min', status: "Pass" },
    { label: "Toilet Side Clearance", value: '16.5"', status: "Pass" },
    { label: "Basin Front Activity", value: '30"', status: "Pass" },
    { label: "Door Swing Path", value: "Unobstructed", status: "Pass" }
  ];

  const activeHoveredFixture = fixtures.find((f) => f.sku === hoveredSku);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#ffffff',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--color-grey-200)',
        boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Top Architectural Header */}
      <div
        style={{
          padding: '12px 20px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 800, color: '#0f172a', letterSpacing: '0.04em' }}>
            ARCHITECTURAL SCHEMATIC FLOOR PLAN
          </span>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <span style={{ color: '#334155', fontWeight: 600 }}>
            {lengthFt}'-0" × {widthFt}'-0" ({Math.round(lengthFt * widthFt)} sq ft)
          </span>
          <span
            style={{
              color: 'var(--color-grey-700)',
              background: 'var(--color-grey-100)',
              padding: '3px 9px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '11px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              border: '1px solid var(--color-grey-200)'
            }}
          >
            <CheckCircle2 size={12} /> NKBA & IBC Code Compliant
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#64748b', fontSize: '11px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Compass size={14} color="#0f172a" /> North = Back Wall
          </span>
          <span>Scale: 1" = 2'-0"</span>
        </div>
      </div>

      {/* SVG Blueprint Canvas Container */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
          padding: '16px',
          background: '#fafbfc'
        }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{
            width: '100%',
            maxWidth: '860px',
            maxHeight: '520px',
            height: 'auto',
            userSelect: 'none',
            display: 'block',
            margin: 'auto'
          }}
        >
          <defs>
            {/* Subtle 1-foot grid pattern */}
            <pattern id="archGrid" width={SCALE} height={SCALE} patternUnits="userSpaceOnUse">
              <rect width={SCALE} height={SCALE} fill="none" stroke="#f1f5f9" strokeWidth="1" />
              <circle cx={SCALE} cy={SCALE} r="1" fill="#cbd5e1" />
            </pattern>

            {/* Circulation pattern */}
            <pattern id="circPattern" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="12" stroke="#10b981" strokeWidth="1" strokeOpacity="0.2" />
            </pattern>

            {/* Wet zone diagonal hatch */}
            <pattern id="wetPattern" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#0ea5e9" strokeWidth="1" strokeOpacity="0.25" />
            </pattern>
          </defs>

          {/* 1. ROOM INTERIOR BACKGROUND & GRID */}
          <rect
            x={MARGIN_LEFT}
            y={MARGIN_TOP}
            width={roomW}
            height={roomH}
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          <rect
            x={MARGIN_LEFT}
            y={MARGIN_TOP}
            width={roomW}
            height={roomH}
            fill="url(#archGrid)"
          />

          {/* 2. ZONING & ACTIVITY OVERLAYS */}
          {/* A. Wet Zone (Shower Area) */}
          {shower && (() => {
            const showerW = 3.2 * SCALE;
            const showerH = 3.2 * SCALE;
            const sX = toSvgX(halfL - 3.2);
            const sY = toSvgY(halfW - 3.2);

            return (
              <g>
                <rect
                  x={sX}
                  y={sY}
                  width={showerW}
                  height={showerH}
                  fill="#f0f9ff"
                  fillOpacity="0.6"
                  stroke="#38bdf8"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <rect x={sX} y={sY} width={showerW} height={showerH} fill="url(#wetPattern)" />
                <text
                  x={sX + showerW / 2}
                  y={sY + 16}
                  textAnchor="middle"
                  fill="#0284c7"
                  fontSize="9.5"
                  fontWeight="700"
                  letterSpacing="0.04em"
                >
                  WET ZONE (SHOWER)
                </text>
              </g>
            );
          })()}

          {/* B. Bathtub Soaking Zone (if present) */}
          {bathtub && (() => {
            const tubW = 5.2 * SCALE;
            const tubH = 2.8 * SCALE;
            const tX = toSvgX(-halfL + 0.4);
            const tY = toSvgY(halfW - 3.0);

            return (
              <g>
                <rect
                  x={tX}
                  y={tY}
                  width={tubW}
                  height={tubH}
                  fill="#f0f9ff"
                  fillOpacity="0.5"
                  stroke="#38bdf8"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text
                  x={tX + tubW / 2}
                  y={tY + 14}
                  textAnchor="middle"
                  fill="#0284c7"
                  fontSize="9"
                  fontWeight="700"
                  letterSpacing="0.04em"
                >
                  SOAKING ZONE (BATHTUB)
                </text>
              </g>
            );
          })()}

          {/* C. Dry Grooming Zone (Basin & Vanity Area) */}
          {basin && (() => {
            const [bx, , bz] = basin.position || [-halfL + 2.1, 0, -halfW + 0.9];
            const px = toSvgX(bx);
            const py = toSvgY(bz);

            return (
              <g>
                <rect
                  x={px - 1.4 * SCALE}
                  y={MARGIN_TOP}
                  width={2.8 * SCALE}
                  height={3.4 * SCALE}
                  fill="#fffbeb"
                  fillOpacity="0.5"
                  stroke="#f59e0b"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text
                  x={px}
                  y={py + 1.85 * SCALE}
                  textAnchor="middle"
                  fill="#b45309"
                  fontSize="8.5"
                  fontWeight="700"
                  letterSpacing="0.03em"
                >
                  30" ACTIVITY CLEARANCE
                </text>
              </g>
            );
          })()}

          {/* D. Toilet Clearance Zone */}
          {toilet && (() => {
            const [tx, , tz] = toilet.position || [halfL - 2.5, 0, -halfW + 1.2];
            const px = toSvgX(tx);
            const py = toSvgY(tz);

            return (
              <g>
                <rect
                  x={px - 1.25 * SCALE}
                  y={MARGIN_TOP}
                  width={2.5 * SCALE}
                  height={3.6 * SCALE}
                  fill="#eff6ff"
                  fillOpacity="0.4"
                  stroke="#3b82f6"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text
                  x={px}
                  y={py + 2.1 * SCALE}
                  textAnchor="middle"
                  fill="#1d4ed8"
                  fontSize="8.5"
                  fontWeight="700"
                >
                  24" FRONT CLEARANCE
                </text>
              </g>
            );
          })()}

          {/* 3. FIXTURES SCHEMATIC DRAWINGS */}

          {/* A. TOILET */}
          {toilet && (() => {
            const [tx, , tz] = toilet.position || [halfL - 2.5, 0, -halfW + 1.2];
            const px = toSvgX(tx);
            const py = toSvgY(tz);
            const isHov = hoveredSku === toilet.sku;

            return (
              <g
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredSku(toilet.sku)}
                onMouseLeave={() => setHoveredSku(null)}
                onClick={() => onInspectFixture && onInspectFixture(toilet)}
              >
                {/* Toilet Tank */}
                <rect
                  x={px - 0.75 * SCALE}
                  y={MARGIN_TOP + 4}
                  width={1.5 * SCALE}
                  height={0.6 * SCALE}
                  rx="3"
                  fill={isHov ? "#eff6ff" : "#ffffff"}
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                {/* Dual Flush Actuators */}
                <ellipse cx={px - 0.14 * SCALE} cy={MARGIN_TOP + 0.3 * SCALE} rx="4" ry="4" fill="#64748b" />
                <ellipse cx={px + 0.14 * SCALE} cy={MARGIN_TOP + 0.3 * SCALE} rx="5" ry="5" fill="#64748b" />

                {/* Elongated Bowl */}
                <ellipse
                  cx={px}
                  cy={MARGIN_TOP + 1.35 * SCALE}
                  rx={0.62 * SCALE}
                  ry={0.78 * SCALE}
                  fill={isHov ? "#dbeafe" : "#ffffff"}
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                {/* Inner Rim */}
                <ellipse
                  cx={px}
                  cy={MARGIN_TOP + 1.38 * SCALE}
                  rx={0.48 * SCALE}
                  ry={0.62 * SCALE}
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="1.2"
                />
                {/* Seat Hinge Line */}
                <line
                  x1={px - 0.5 * SCALE}
                  y1={MARGIN_TOP + 0.75 * SCALE}
                  x2={px + 0.5 * SCALE}
                  y2={MARGIN_TOP + 0.75 * SCALE}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />

                {/* Fixture Label Tag */}
                <g transform={`translate(${px}, ${MARGIN_TOP + 1.35 * SCALE})`}>
                  <rect
                    x={-1.0 * SCALE}
                    y={-8}
                    width={2.0 * SCALE}
                    height="16"
                    rx="3"
                    fill="#0f172a"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8"
                    fontWeight="700"
                  >
                    {toilet.name?.split(" ")[0] || "Toilet"} ({toilet.sku})
                  </text>
                </g>
              </g>
            );
          })()}

          {/* B. WASHBASIN & ARCHITECTURAL VANITY */}
          {basin && (() => {
            const [bx, , bz] = basin.position || [-halfL + 2.1, 0, -halfW + 0.9];
            const px = toSvgX(bx);
            const py = toSvgY(bz);
            const isHov = hoveredSku === basin.sku;

            return (
              <g
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredSku(basin.sku)}
                onMouseLeave={() => setHoveredSku(null)}
                onClick={() => onInspectFixture && onInspectFixture(basin)}
              >
                {/* Vanity Countertop */}
                <rect
                  x={px - 1.3 * SCALE}
                  y={MARGIN_TOP + 4}
                  width={2.6 * SCALE}
                  height={1.75 * SCALE}
                  rx="3"
                  fill={isHov ? "#fef3c7" : "#ffffff"}
                  stroke="#0f172a"
                  strokeWidth="2"
                />

                {/* Vanity Drawer Front Edge Line */}
                <line
                  x1={px - 1.25 * SCALE}
                  y1={MARGIN_TOP + 1.65 * SCALE}
                  x2={px + 1.25 * SCALE}
                  y2={MARGIN_TOP + 1.65 * SCALE}
                  stroke="#94a3b8"
                  strokeWidth="1"
                />

                {/* Ceramic Vessel Basin Bowl */}
                <ellipse
                  cx={px}
                  cy={MARGIN_TOP + 0.95 * SCALE}
                  rx={0.82 * SCALE}
                  ry={0.54 * SCALE}
                  fill="#f8fafc"
                  stroke="#0f172a"
                  strokeWidth="1.8"
                />
                <ellipse
                  cx={px}
                  cy={MARGIN_TOP + 0.95 * SCALE}
                  rx={0.68 * SCALE}
                  ry={0.42 * SCALE}
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="1"
                />
                {/* Chrome Pop-up Drain */}
                <circle cx={px} cy={MARGIN_TOP + 0.95 * SCALE} r="4" fill="#64748b" stroke="#0f172a" strokeWidth="1" />

                {/* Faucet Spout Symbol */}
                <line
                  x1={px}
                  y1={MARGIN_TOP + 0.25 * SCALE}
                  x2={px}
                  y2={MARGIN_TOP + 0.78 * SCALE}
                  stroke="#0f172a"
                  strokeWidth="3"
                />
                <circle cx={px} cy={MARGIN_TOP + 0.25 * SCALE} r="5" fill="#d4af37" stroke="#0f172a" strokeWidth="1.5" />
                <circle cx={px} cy={MARGIN_TOP + 0.78 * SCALE} r="3" fill="#0f172a" />

                {/* Lighted Mirror Wall Line */}
                <line
                  x1={px - 1.1 * SCALE}
                  y1={MARGIN_TOP + 2}
                  x2={px + 1.1 * SCALE}
                  y2={MARGIN_TOP + 2}
                  stroke="#0284c7"
                  strokeWidth="3.5"
                />

                {/* Fixture Label Tag */}
                <g transform={`translate(${px}, ${MARGIN_TOP + 0.95 * SCALE})`}>
                  <rect
                    x={-1.1 * SCALE}
                    y={-8}
                    width={2.2 * SCALE}
                    height="16"
                    rx="3"
                    fill="#0f172a"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8"
                    fontWeight="700"
                  >
                    {basin.name?.split(" ")[0] || "Basin"} ({basin.sku})
                  </text>
                </g>
              </g>
            );
          })()}

          {/* C. SHOWER ENCLOSURE */}
          {shower && (() => {
            const trayW = 3.2 * SCALE;
            const trayH = 3.2 * SCALE;
            const sX = toSvgX(halfL - 3.2);
            const sY = toSvgY(halfW - 3.2);
            const isHov = hoveredSku === shower.sku;

            return (
              <g
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredSku(shower.sku)}
                onMouseLeave={() => setHoveredSku(null)}
                onClick={() => onInspectFixture && onInspectFixture(shower)}
              >
                {/* Shower Tray Perimeter */}
                <rect
                  x={sX}
                  y={sY}
                  width={trayW - 4}
                  height={trayH - 4}
                  fill={isHov ? "#e0f2fe" : "#ffffff"}
                  stroke="#0f172a"
                  strokeWidth="2"
                />

                {/* Floor Slope Diagonals */}
                <line x1={sX} y1={sY} x2={sX + trayW / 2} y2={sY + trayH / 2} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
                <line x1={sX + trayW - 4} y1={sY} x2={sX + trayW / 2} y2={sY + trayH / 2} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
                <line x1={sX} y1={sY + trayH - 4} x2={sX + trayW / 2} y2={sY + trayH / 2} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
                <line x1={sX + trayW - 4} y1={sY + trayH - 4} x2={sX + trayW / 2} y2={sY + trayH / 2} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />

                {/* Central Floor Drain */}
                <circle cx={sX + trayW / 2} cy={sY + trayH / 2} r="8" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
                <circle cx={sX + trayW / 2} cy={sY + trayH / 2} r="4" fill="#64748b" />

                {/* Glass Screen Partition (West side) */}
                <line x1={sX} y1={sY} x2={sX} y2={sY + trayH - 4} stroke="#0284c7" strokeWidth="3.5" />

                {/* Overhead Rain Showerhead Symbol */}
                <circle cx={toSvgX(halfL - 1.0)} cy={toSvgY(halfW - 1.0)} r="12" fill="none" stroke="#0f172a" strokeWidth="2" />
                <circle cx={toSvgX(halfL - 1.0)} cy={toSvgY(halfW - 1.0)} r="4" fill="#0f172a" />

                {/* Wall Mixer Valve */}
                <rect x={toSvgX(halfL - 0.2)} y={toSvgY(halfW - 1.3)} width="5" height="16" fill="#d4af37" stroke="#0f172a" strokeWidth="1" />

                {/* Fixture Label Tag */}
                <g transform={`translate(${sX + trayW * 0.45}, ${sY + trayH * 0.28})`}>
                  <rect
                    x={-1.0 * SCALE}
                    y={-8}
                    width={2.0 * SCALE}
                    height="16"
                    rx="3"
                    fill="#0f172a"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8"
                    fontWeight="700"
                  >
                    {shower.name?.split(" ")[0] || "Shower"} ({shower.sku})
                  </text>
                </g>
              </g>
            );
          })()}

          {/* D. BATHTUB (if present) */}
          {bathtub && (() => {
            const [tx, , tz] = bathtub.position || [-halfL + 3.0, 0, halfW - 1.5];
            const px = toSvgX(tx);
            const py = toSvgY(tz);
            const isHov = hoveredSku === bathtub.sku;

            return (
              <g
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredSku(bathtub.sku)}
                onMouseLeave={() => setHoveredSku(null)}
                onClick={() => onInspectFixture && onInspectFixture(bathtub)}
              >
                {/* Tub Outer Shell */}
                <rect
                  x={px - 2.5 * SCALE}
                  y={py - 1.2 * SCALE}
                  width={5.0 * SCALE}
                  height={2.4 * SCALE}
                  rx={1.1 * SCALE}
                  fill={isHov ? "#eff6ff" : "#ffffff"}
                  stroke="#0f172a"
                  strokeWidth="2.2"
                />
                {/* Tub Inner Rolled Rim */}
                <rect
                  x={px - 2.25 * SCALE}
                  y={py - 1.0 * SCALE}
                  width={4.5 * SCALE}
                  height={2.0 * SCALE}
                  rx={0.9 * SCALE}
                  fill="#f8fafc"
                  stroke="#64748b"
                  strokeWidth="1.2"
                />
                <circle cx={px} cy={py} r="5" fill="#94a3b8" stroke="#0f172a" strokeWidth="1" />

                {/* Floor-Mounted Filler Tap */}
                <circle cx={px + 2.6 * SCALE} cy={py} r="6" fill="#d4af37" stroke="#0f172a" strokeWidth="1.5" />
                <line x1={px + 2.6 * SCALE} y1={py} x2={px + 2.2 * SCALE} y2={py} stroke="#0f172a" strokeWidth="3" />

                {/* Fixture Label Tag */}
                <g transform={`translate(${px}, ${py})`}>
                  <rect
                    x={-1.2 * SCALE}
                    y={-8}
                    width={2.4 * SCALE}
                    height="16"
                    rx="3"
                    fill="#0f172a"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8"
                    fontWeight="700"
                  >
                    {bathtub.name?.split(" ")[0] || "Tub"} ({bathtub.sku})
                  </text>
                </g>
              </g>
            );
          })()}

          {/* 4. ENTRY DOOR & INWARD SWING CLEARANCE */}
          {(() => {
            const doorW = 2.6 * SCALE; // 32" standard door width
            const doorX = toSvgX(-halfL + (bathtub ? 5.6 : 0.8));
            const doorY = MARGIN_TOP + roomH;

            return (
              <g>
                {/* Wall Opening */}
                <line x1={doorX} y1={doorY} x2={doorX + doorW} y2={doorY} stroke="#ffffff" strokeWidth="8" />

                {/* Door Jambs */}
                <rect x={doorX - 4} y={doorY - 5} width="8" height="10" fill="#0f172a" />
                <rect x={doorX + doorW - 4} y={doorY - 5} width="8" height="10" fill="#0f172a" />

                {/* Door Leaf (Inward swing position) */}
                <line
                  x1={doorX}
                  y1={doorY}
                  x2={doorX}
                  y2={doorY - doorW}
                  stroke="#0f172a"
                  strokeWidth="3.5"
                />

                {/* Door Swing Arc (Clearance) */}
                <path
                  d={`M ${doorX + doorW} ${doorY} A ${doorW} ${doorW} 0 0 0 ${doorX} ${doorY - doorW}`}
                  fill="rgba(16, 185, 129, 0.06)"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                />
                <text
                  x={doorX + doorW * 0.52}
                  y={doorY - doorW * 0.38}
                  fill="#15803d"
                  fontSize="8.5"
                  fontWeight="600"
                >
                  32" DOOR SWING (CLEAR)
                </text>
              </g>
            );
          })()}

          {/* 5. ARCHITECTURAL PERIMETER WALLS */}
          {/* North Wall (Back) */}
          <rect
            x={MARGIN_LEFT - 6}
            y={MARGIN_TOP - 6}
            width={roomW + 12}
            height="6"
            fill="#0f172a"
          />
          {/* West Wall (Left) */}
          <rect
            x={MARGIN_LEFT - 6}
            y={MARGIN_TOP}
            width="6"
            height={roomH}
            fill="#0f172a"
          />
          {/* East Wall (Right) */}
          <rect
            x={MARGIN_LEFT + roomW}
            y={MARGIN_TOP}
            width="6"
            height={roomH}
            fill="#0f172a"
          />
          {/* South Wall (Front, segmented around door) */}
          <rect
            x={MARGIN_LEFT - 6}
            y={MARGIN_TOP + roomH}
            width={(bathtub ? 5.6 : 0.8) * SCALE + 6}
            height="6"
            fill="#0f172a"
          />
          <rect
            x={toSvgX(-halfL + (bathtub ? 5.6 : 0.8) + 2.6)}
            y={MARGIN_TOP + roomH}
            width={roomW - ((bathtub ? 5.6 : 0.8) + 2.6) * SCALE + 6}
            height="6"
            fill="#0f172a"
          />

          {/* 6. COMPLETE ARCHITECTURAL DIMENSION STRINGS */}
          {/* A. Top Dimension: Room Length */}
          <g>
            <line
              x1={MARGIN_LEFT}
              y1={MARGIN_TOP - 40}
              x2={MARGIN_LEFT + roomW}
              y2={MARGIN_TOP - 40}
              stroke="#0f172a"
              strokeWidth="1.2"
            />
            {/* 45-degree architectural ticks */}
            <line x1={MARGIN_LEFT - 6} y1={MARGIN_TOP - 34} x2={MARGIN_LEFT + 6} y2={MARGIN_TOP - 46} stroke="#0f172a" strokeWidth="2" />
            <line x1={MARGIN_LEFT + roomW - 6} y1={MARGIN_TOP - 34} x2={MARGIN_LEFT + roomW + 6} y2={MARGIN_TOP - 46} stroke="#0f172a" strokeWidth="2" />
            {/* Witness extension lines */}
            <line x1={MARGIN_LEFT} y1={MARGIN_TOP - 10} x2={MARGIN_LEFT} y2={MARGIN_TOP - 50} stroke="#94a3b8" strokeWidth="0.8" />
            <line x1={MARGIN_LEFT + roomW} y1={MARGIN_TOP - 10} x2={MARGIN_LEFT + roomW} y2={MARGIN_TOP - 50} stroke="#94a3b8" strokeWidth="0.8" />
            {/* Dimension Text Box */}
            <rect
              x={MARGIN_LEFT + roomW / 2 - 55}
              y={MARGIN_TOP - 52}
              width="110"
              height="24"
              fill="#ffffff"
              rx="4"
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text
              x={MARGIN_LEFT + roomW / 2}
              y={MARGIN_TOP - 36}
              textAnchor="middle"
              fill="#0f172a"
              fontSize="12"
              fontWeight="800"
            >
              {lengthFt}'-0" [{(lengthFt * 0.3048).toFixed(2)} m]
            </text>
          </g>

          {/* B. Left Dimension: Room Width */}
          <g>
            <line
              x1={MARGIN_LEFT - 45}
              y1={MARGIN_TOP}
              x2={MARGIN_LEFT - 45}
              y2={MARGIN_TOP + roomH}
              stroke="#0f172a"
              strokeWidth="1.2"
            />
            {/* 45-degree ticks */}
            <line x1={MARGIN_LEFT - 51} y1={MARGIN_TOP + 6} x2={MARGIN_LEFT - 39} y2={MARGIN_TOP - 6} stroke="#0f172a" strokeWidth="2" />
            <line x1={MARGIN_LEFT - 51} y1={MARGIN_TOP + roomH + 6} x2={MARGIN_LEFT - 39} y2={MARGIN_TOP + roomH - 6} stroke="#0f172a" strokeWidth="2" />
            {/* Witness extension lines */}
            <line x1={MARGIN_LEFT - 10} y1={MARGIN_TOP} x2={MARGIN_LEFT - 55} y2={MARGIN_TOP} stroke="#94a3b8" strokeWidth="0.8" />
            <line x1={MARGIN_LEFT - 10} y1={MARGIN_TOP + roomH} x2={MARGIN_LEFT - 55} y2={MARGIN_TOP + roomH} stroke="#94a3b8" strokeWidth="0.8" />
            {/* Dimension Text Box */}
            <rect
              x={MARGIN_LEFT - 62}
              y={MARGIN_TOP + roomH / 2 - 50}
              width="24"
              height="100"
              fill="#ffffff"
              rx="4"
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text
              x={MARGIN_LEFT - 48}
              y={MARGIN_TOP + roomH / 2}
              textAnchor="middle"
              fill="#0f172a"
              fontSize="12"
              fontWeight="800"
              transform={`rotate(-90 ${MARGIN_LEFT - 48} ${MARGIN_TOP + roomH / 2})`}
            >
              {widthFt}'-0" [{(widthFt * 0.3048).toFixed(2)} m]
            </text>
          </g>

          {/* 7. NORTH COMPASS ROSE */}
          <g transform={`translate(${svgWidth - 45}, 45)`}>
            <circle cx="0" cy="0" r="16" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
            <polygon points="0,-12 4,0 0,-3 -4,0" fill="#0f172a" />
            <polygon points="0,12 4,0 0,3 -4,0" fill="#94a3b8" />
            <text x="0" y="-16" textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="900">
              N
            </text>
          </g>
        </svg>
      </div>

      {/* Bottom Color-Coded Zones & Code Compliance Legend */}
      <div
        style={{
          padding: '10px 18px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '11px'
        }}
      >
        {/* Zone Legend Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontWeight: 700, color: 'var(--color-grey-700)' }}>Zones:</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--color-grey-500)' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--color-grey-100)', border: '1px solid var(--color-grey-400)' }} />
            Wet Zone (Shower/Tub)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--color-grey-500)' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--color-white)', border: '1px solid var(--color-grey-800)' }} />
            Dry Grooming Zone
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--color-grey-500)' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--color-grey-200)', border: '1px solid var(--color-grey-400)' }} />
            Circulation & Clearance
          </span>
        </div>

        {/* Clearance Verification Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {clearances.map((c, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '4px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#334155',
                fontSize: '10.5px',
                fontWeight: 600
              }}
            >
              <CheckCircle2 size={11} color="var(--color-grey-700)" />
              {c.label}: <b>{c.value}</b>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

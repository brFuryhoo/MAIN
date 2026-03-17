import React, { useState, useMemo } from 'react';

/* ══════════════════════════════════════════════════════════════════
   PROFESSIONAL SVG WORLD MAP — Aureos AI Intelligence Terminal
   Detailed continent paths with interactive risk hotspots
   ══════════════════════════════════════════════════════════════════ */

const riskColor = (score) =>
  score > 80 ? '#FF5252' : score > 60 ? '#FF9800' : score > 40 ? '#CFAE46' : '#00E676';

const REGION_POSITIONS = {
  middle_east:    { x: 580, y: 210, label: 'MIDDLE EAST' },
  russia_europe:  { x: 520, y: 120, label: 'EUROPE' },
  east_asia:      { x: 735, y: 180, label: 'EAST ASIA' },
  south_america:  { x: 265, y: 310, label: 'S. AMERICA' },
  north_america:  { x: 170, y: 155, label: 'N. AMERICA' },
  south_asia:     { x: 655, y: 230, label: 'S. ASIA' },
  africa:         { x: 505, y: 280, label: 'AFRICA' },
  oceania:        { x: 780, y: 340, label: 'OCEANIA' },
};

// Detailed continent paths (simplified mercator projection)
const CONTINENTS = [
  // North America
  { id: 'na', d: 'M60,90 L95,60 L135,55 L175,60 L215,55 L250,65 L265,80 L275,100 L280,125 L270,145 L255,170 L240,190 L225,205 L205,215 L185,210 L160,200 L140,185 L125,175 L115,165 L105,148 L95,140 L82,135 L70,125 L62,110 Z' },
  // Greenland
  { id: 'gl', d: 'M280,30 L310,25 L340,30 L355,45 L350,70 L330,80 L310,75 L290,65 L280,50 Z' },
  // South America
  { id: 'sa', d: 'M220,230 L245,225 L270,230 L290,245 L305,265 L310,290 L305,320 L295,345 L280,365 L260,375 L245,370 L235,350 L230,325 L232,300 L228,275 L222,250 Z' },
  // Europe
  { id: 'eu', d: 'M430,65 L445,60 L465,55 L490,60 L510,65 L530,75 L545,90 L548,105 L542,120 L530,130 L515,135 L500,140 L485,138 L470,135 L455,128 L445,118 L438,105 L432,90 L430,78 Z' },
  // Africa
  { id: 'af', d: 'M455,175 L475,170 L500,168 L520,172 L540,178 L555,190 L565,210 L570,235 L568,260 L560,285 L548,310 L535,330 L518,340 L500,345 L482,340 L467,328 L458,310 L452,285 L448,260 L450,235 L452,210 L453,195 Z' },
  // Russia / N Asia
  { id: 'ru', d: 'M548,50 L580,45 L620,40 L660,38 L700,42 L740,48 L770,55 L790,65 L795,80 L788,95 L775,105 L755,110 L730,108 L700,105 L670,100 L640,95 L610,92 L585,95 L562,100 L548,95 L545,80 L546,65 Z' },
  // Middle East
  { id: 'me', d: 'M548,145 L570,140 L590,148 L605,160 L610,178 L608,195 L598,210 L582,218 L568,215 L556,205 L550,190 L545,175 L546,160 Z' },
  // South Asia (India)
  { id: 'si', d: 'M615,180 L640,170 L660,175 L675,190 L680,210 L672,235 L658,250 L640,258 L625,252 L615,238 L610,218 L612,198 Z' },
  // East Asia (China, Japan, Korea)
  { id: 'ea', d: 'M680,100 L710,95 L738,100 L760,115 L772,135 L770,158 L760,178 L745,195 L725,205 L705,200 L690,188 L680,170 L675,150 L678,130 L679,115 Z' },
  // Southeast Asia
  { id: 'sea', d: 'M700,220 L720,215 L740,222 L755,235 L760,255 L752,272 L738,280 L720,278 L708,268 L700,252 L698,238 Z' },
  // Oceania (Australia)
  { id: 'oc', d: 'M720,300 L750,292 L780,295 L805,305 L818,322 L815,345 L800,360 L778,368 L755,365 L738,355 L725,340 L720,322 Z' },
  // NZ
  { id: 'nz', d: 'M825,355 L835,350 L842,358 L840,370 L832,375 L825,368 Z' },
];

// Connection lines between high-risk regions
const getConnections = (regions) => {
  const highRisk = regions.filter(r => r.risk_score > 55).sort((a, b) => b.risk_score - a.risk_score);
  const connections = [];
  for (let i = 0; i < highRisk.length - 1; i++) {
    const p1 = REGION_POSITIONS[highRisk[i].id];
    const p2 = REGION_POSITIONS[highRisk[i + 1].id];
    if (p1 && p2) connections.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, score: highRisk[i].risk_score });
  }
  return connections;
};

export const WorldMap = ({ regions = [], onRegionClick, selectedRegion }) => {
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const connections = useMemo(() => getConnections(regions), [regions]);

  return (
    <svg viewBox="0 0 900 420" className="w-full h-auto select-none" style={{ minHeight: '340px' }}>
      <defs>
        <radialGradient id="mapBgGrad" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#141516" />
          <stop offset="100%" stopColor="#0A0A0B" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        {regions.map(r => (
          <radialGradient key={`rg-${r.id}`} id={`rg-${r.id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={riskColor(r.risk_score)} stopOpacity="0.35" />
            <stop offset="70%" stopColor={riskColor(r.risk_score)} stopOpacity="0.08" />
            <stop offset="100%" stopColor={riskColor(r.risk_score)} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>

      {/* Background */}
      <rect width="900" height="420" fill="url(#mapBgGrad)" rx="16" />

      {/* Grid */}
      {Array.from({ length: 18 }, (_, i) => (
        <line key={`vg${i}`} x1={i * 50 + 25} y1="0" x2={i * 50 + 25} y2="420" stroke="rgba(255,255,255,0.018)" strokeWidth="0.5" />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <line key={`hg${i}`} x1="0" y1={i * 50 + 20} x2="900" y2={i * 50 + 20} stroke="rgba(255,255,255,0.018)" strokeWidth="0.5" />
      ))}
      {/* Equator */}
      <line x1="0" y1="210" x2="900" y2="210" stroke="rgba(207,174,70,0.06)" strokeWidth="0.5" strokeDasharray="6,6" />
      {/* Prime meridian */}
      <line x1="450" y1="0" x2="450" y2="420" stroke="rgba(207,174,70,0.06)" strokeWidth="0.5" strokeDasharray="6,6" />

      {/* Continents */}
      {CONTINENTS.map(c => (
        <path key={c.id} d={c.d}
          fill="rgba(255,255,255,0.035)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
      ))}

      {/* Connection lines between high-risk regions */}
      {connections.map((conn, i) => (
        <g key={`conn-${i}`}>
          <line x1={conn.x1} y1={conn.y1} x2={conn.x2} y2={conn.y2}
            stroke={riskColor(conn.score)}
            strokeOpacity="0.12"
            strokeWidth="0.8"
            strokeDasharray="4,6"
          >
            <animate attributeName="stroke-dashoffset" values="0;10" dur="3s" repeatCount="indefinite" />
          </line>
        </g>
      ))}

      {/* Region hotspots */}
      {regions.map(r => {
        const pos = REGION_POSITIONS[r.id];
        if (!pos) return null;
        const isSelected = selectedRegion?.id === r.id;
        const isHovered = hoveredRegion === r.id;
        const color = riskColor(r.risk_score);
        const active = isSelected || isHovered;

        return (
          <g key={r.id}
            onClick={() => onRegionClick?.(r)}
            onMouseEnter={() => setHoveredRegion(r.id)}
            onMouseLeave={() => setHoveredRegion(null)}
            style={{ cursor: 'pointer' }}
          >
            {/* Outer glow pulse */}
            <circle cx={pos.x} cy={pos.y} r={active ? 40 : 32} fill={`url(#rg-${r.id})`}>
              <animate attributeName="r" values={`${active ? 36 : 28};${active ? 44 : 36};${active ? 36 : 28}`} dur={r.risk_score > 60 ? '2s' : '4s'} repeatCount="indefinite" />
            </circle>

            {/* Main circle */}
            <circle cx={pos.x} cy={pos.y} r={active ? 16 : 12}
              fill={color + (active ? '35' : '20')}
              stroke={color}
              strokeWidth={active ? 2 : 1}
              strokeOpacity={active ? 1 : 0.6}
            >
              {r.risk_score > 70 && (
                <animate attributeName="stroke-opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
              )}
            </circle>

            {/* Center dot */}
            <circle cx={pos.x} cy={pos.y} r={active ? 4 : 3} fill={color}>
              {r.risk_score > 70 && (
                <animate attributeName="r" values="3;5;3" dur="1.5s" repeatCount="indefinite" />
              )}
            </circle>

            {/* Label */}
            <text x={pos.x} y={pos.y - (active ? 22 : 18)}
              textAnchor="middle"
              fill={active ? color : '#777'}
              fontSize={active ? '9' : '8'}
              fontWeight="700"
              fontFamily="'Inter', system-ui, sans-serif"
              letterSpacing="0.5"
            >
              {pos.label}
            </text>

            {/* Score */}
            <text x={pos.x} y={pos.y + 4}
              textAnchor="middle"
              fill={color}
              fontSize={active ? '12' : '10'}
              fontWeight="800"
              fontFamily="'JetBrains Mono', monospace"
            >
              {r.risk_score}
            </text>

            {/* Risk level label on hover */}
            {active && (
              <text x={pos.x} y={pos.y + 28}
                textAnchor="middle"
                fill={color}
                fontSize="7"
                fontWeight="600"
                fontFamily="'Inter', system-ui, sans-serif"
                textTransform="uppercase"
                letterSpacing="1"
                opacity="0.8"
              >
                {r.risk_level?.toUpperCase()}
              </text>
            )}
          </g>
        );
      })}

      {/* Legend */}
      <g transform="translate(20, 380)">
        <text x="0" y="0" fill="#555" fontSize="7" fontFamily="'Inter', system-ui" fontWeight="600" letterSpacing="1">RISK LEVELS</text>
        {[
          { label: 'CRITICAL', color: '#FF5252', x: 0 },
          { label: 'HIGH', color: '#FF9800', x: 80 },
          { label: 'ELEVATED', color: '#CFAE46', x: 140 },
          { label: 'LOW', color: '#00E676', x: 215 },
        ].map(l => (
          <g key={l.label} transform={`translate(${l.x}, 12)`}>
            <circle cx="4" cy="0" r="3" fill={l.color} />
            <text x="12" y="3" fill="#666" fontSize="7" fontFamily="'Inter', system-ui">{l.label}</text>
          </g>
        ))}
      </g>

      {/* Timestamp */}
      <text x="880" y="408" textAnchor="end" fill="#444" fontSize="7" fontFamily="'JetBrains Mono', monospace">
        AUREOS AI QUANTICA · GLOBAL RISK MAP
      </text>
    </svg>
  );
};

export default WorldMap;

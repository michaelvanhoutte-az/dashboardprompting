// Shared Azumuta-styled primitives + dashboard widgets.
// Exports to window so other babel scripts can use them.
const { useState } = React;

/* ----------------------------------------------------------------- */
/* Primitives                                                        */
/* ----------------------------------------------------------------- */
function AzButton({ variant = 'primary', size = 'md', icon, children, onClick, disabled, style }) {
  const base = {
    fontFamily: 'var(--font-body)', fontWeight: 600, border: '1px solid transparent',
    borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
    transition: 'all 160ms cubic-bezier(0.2,0.8,0.2,1)', opacity: disabled ? 0.4 : 1,
    pointerEvents: disabled ? 'none' : 'auto', whiteSpace: 'nowrap',
  };
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 13 },
    md: { padding: '9px 16px', fontSize: 14 },
    lg: { padding: '12px 22px', fontSize: 15 },
  };
  const variants = {
    primary:   { background: 'var(--az-green-strong)', color: '#fff' },
    secondary: { background: 'var(--az-cream)', color: 'var(--az-eggplant)', borderColor: 'var(--border-subtle)' },
    ghost:     { background: 'transparent', color: 'var(--az-eggplant)' },
    inverse:   { background: 'var(--az-eggplant)', color: 'var(--az-cream)' },
    red:       { background: 'var(--az-red)', color: 'var(--az-cream)' },
  };
  return (
    <button onClick={onClick} style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {icon && <i className={`ph-light ph-${icon}`} style={{ fontSize: size === 'sm' ? 14 : 16 }}></i>}
      {children}
    </button>
  );
}

function Eyebrow({ children, style }) {
  return <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-3)', ...style }}>{children}</div>;
}

function Chip({ variant = 'neutral', children, style }) {
  const vs = {
    success: { bg: '#C8F7C5', fg: '#0A5952' },
    info:    { bg: '#AAE4F4', fg: '#1726EE' },
    warn:    { bg: '#FFE8C0', fg: '#8A6100' },
    danger:  { bg: '#FFC8BD', fg: '#B5371E' },
    neutral: { bg: 'var(--az-mist)', fg: 'var(--az-graphite)' },
    accent:  { bg: 'var(--az-soft-red)', fg: 'var(--az-dark-red)' },
  }[variant];
  return (
    <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12, padding: '3px 10px', borderRadius: 999, display: 'inline-flex', gap: 6, alignItems: 'center', background: vs.bg, color: vs.fg, ...style }}>{children}</span>
  );
}

/* A widget shell — every dashboard widget sits in one of these. */
function Widget({ eyebrow, title, badge, children, span = 1, rows, accent, onMenu, style }) {
  return (
    <div style={{
      gridColumn: `span ${span}`, gridRow: rows ? `span ${rows}` : undefined,
      background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 14,
      boxShadow: 'var(--shadow-sm)', padding: '16px 18px', display: 'flex', flexDirection: 'column',
      position: 'relative', minWidth: 0, ...style,
    }}>
      {accent && <div style={{ position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 999, background: 'var(--az-red)' }}></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          {eyebrow && <Eyebrow style={{ marginBottom: 3 }}>{eyebrow}</Eyebrow>}
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.015em', color: 'var(--az-eggplant)', lineHeight: 1.2 }}>{title}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {badge}
          <i className="ph-light ph-dots-three-outline" style={{ fontSize: 15, color: 'var(--fg-4)', cursor: 'pointer' }}></i>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------------- */
/* KPI tile                                                          */
/* ----------------------------------------------------------------- */
function Kpi({ label, value, unit, delta, trend = 'up', spark, icon }) {
  const trendColor = trend === 'up' ? 'var(--az-green-strong)' : trend === 'down' ? 'var(--az-dark-red)' : 'var(--fg-3)';
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Eyebrow>{label}</Eyebrow>
        {icon && <i className={`ph-light ph-${icon}`} style={{ fontSize: 17, color: 'var(--fg-4)' }}></i>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 36, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--az-eggplant)' }}>{value}</span>
        {unit && <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: 'var(--fg-3)' }}>{unit}</span>}
      </div>
      {spark && <Sparkline data={spark} trend={trend} />}
      {delta && (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500, color: trendColor, display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className={`ph-light ph-${trend === 'up' ? 'trend-up' : trend === 'down' ? 'trend-down' : 'minus'}`}></i>
          {delta}
        </div>
      )}
    </div>
  );
}

function Sparkline({ data, trend }) {
  const w = 120, h = 26;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d - min) / (max - min || 1)) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const color = trend === 'down' ? 'var(--az-dark-red)' : 'var(--az-green-strong)';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="26" preserveAspectRatio="none" style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ----------------------------------------------------------------- */
/* Bar / column chart                                                */
/* ----------------------------------------------------------------- */
function BarChart({ data, height = 150 }) {
  const max = Math.max(...data.map(d => d.v));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'flex-end' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height, borderBottom: '1px solid var(--border-subtle)' }}>
        {data.map((b, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>{b.v}</div>
            <div style={{ width: '70%', maxWidth: 38, height: `${(b.v / max) * (height - 22)}px`, background: b.c || 'var(--az-red)', borderRadius: '4px 4px 0 0' }}></div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
        {data.map((b, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--fg-3)' }}>{b.l}</div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- */
/* Line / trend chart                                                */
/* ----------------------------------------------------------------- */
function LineChart({ series, labels, height = 160, target }) {
  const w = 520, h = height;
  const pad = { l: 0, r: 0, t: 10, b: 0 };
  const all = series.flatMap(s => s.data);
  const max = Math.max(...all) * 1.08, min = Math.min(...all) * 0.96;
  const X = i => (i / (series[0].data.length - 1)) * w;
  const Y = v => h - ((v - min) / (max - min || 1)) * (h - pad.t);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
          {[0.25, 0.5, 0.75].map(g => (
            <line key={g} x1="0" x2={w} y1={h * g} y2={h * g} stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="3 4" />
          ))}
          {target != null && <line x1="0" x2={w} y1={Y(target)} y2={Y(target)} stroke="var(--az-red)" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.6" />}
          {series.map((s, si) => {
            const pts = s.data.map((d, i) => `${X(i).toFixed(1)},${Y(d).toFixed(1)}`).join(' ');
            const area = `0,${h} ${pts} ${w},${h}`;
            return (
              <g key={si}>
                {s.fill && <polygon points={area} fill={s.color} opacity="0.08" />}
                <polyline points={pts} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                {s.data.map((d, i) => <circle key={i} cx={X(i)} cy={Y(d)} r="3" fill="#fff" stroke={s.color} strokeWidth="2" />)}
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8 }}>
        {labels.map((l, i) => <span key={i} style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--fg-3)' }}>{l}</span>)}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- */
/* Donut chart                                                       */
/* ----------------------------------------------------------------- */
function Donut({ data, centerValue, centerLabel }) {
  const total = data.reduce((s, d) => s + d.v, 0);
  let acc = 0;
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1 }}>
      <svg viewBox="0 0 130 130" width="118" height="118" style={{ flexShrink: 0 }}>
        <g transform="rotate(-90 65 65)">
          {data.map((d, i) => {
            const frac = d.v / total;
            const dash = `${(frac * c).toFixed(1)} ${c.toFixed(1)}`;
            const off = -acc * c;
            acc += frac;
            return <circle key={i} cx="65" cy="65" r={r} fill="none" stroke={d.c} strokeWidth="18" strokeDasharray={dash} strokeDashoffset={off} />;
          })}
        </g>
        <text x="65" y="60" textAnchor="middle" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, fill: 'var(--az-eggplant)' }}>{centerValue}</text>
        <text x="65" y="78" textAnchor="middle" style={{ fontFamily: 'var(--font-body)', fontSize: 9, fill: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{centerLabel}</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-body)', fontSize: 12.5 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: d.c, flexShrink: 0 }}></span>
            <span style={{ color: 'var(--fg-2)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.l}</span>
            <span style={{ color: 'var(--fg-1)', fontWeight: 600 }}>{Math.round(d.v / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- */
/* Split / quality bar                                               */
/* ----------------------------------------------------------------- */
function SplitBar({ label, good, warn, bad }) {
  const total = good + warn + bad;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: 12.5 }}>
        <span style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{label}</span>
        <span style={{ color: 'var(--fg-3)' }}>{total}</span>
      </div>
      <div style={{ height: 9, borderRadius: 4, overflow: 'hidden', display: 'flex', background: 'var(--az-mist)' }}>
        <div style={{ width: `${good / total * 100}%`, background: 'var(--az-green-strong)' }}></div>
        <div style={{ width: `${warn / total * 100}%`, background: 'var(--az-yellow)' }}></div>
        <div style={{ width: `${bad / total * 100}%`, background: 'var(--az-dark-red)' }}></div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- */
/* Data table                                                        */
/* ----------------------------------------------------------------- */
function DataTable({ columns, rows }) {
  return (
    <div style={{ flex: 1, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: columns.map(c => c.w || '1fr').join(' '), padding: '0 0 8px', borderBottom: '1px solid var(--border-subtle)' }}>
        {columns.map((c, i) => (
          <div key={i} style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-3)', textAlign: c.align || 'left' }}>{c.label}</div>
        ))}
      </div>
      {rows.map((r, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: columns.map(c => c.w || '1fr').join(' '), padding: '10px 0', borderBottom: ri < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
          {columns.map((c, ci) => (
            <div key={ci} style={{ fontFamily: c.mono ? 'var(--font-mono)' : 'var(--font-body)', fontSize: 12.5, color: ci === 0 ? 'var(--fg-1)' : 'var(--fg-2)', fontWeight: ci === 0 ? 600 : 400, textAlign: c.align || 'left' }}>
              {c.render ? c.render(r[c.key], r) : r[c.key]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- */
/* Heatmap                                                           */
/* ----------------------------------------------------------------- */
function Heatmap({ cols, rows, scaleColor = 'var(--az-green-strong)' }) {
  // rows: [{ label, values: [0..1, ...] }]
  return (
    <div style={{ flex: 1, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `120px repeat(${cols.length}, 1fr)`, gap: 4, marginBottom: 4 }}>
        <div></div>
        {cols.map((c, i) => (
          <div key={i} style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--fg-3)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c}</div>
        ))}
      </div>
      {rows.map((r, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: `120px repeat(${cols.length}, 1fr)`, gap: 4, marginBottom: 4 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--fg-1)', fontWeight: 500, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</div>
          {r.values.map((v, vi) => (
            <div key={vi} title={`${Math.round(v * 100)}%`} style={{ height: 30, borderRadius: 4, background: heatColor(v), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: v > 0.55 ? '#fff' : 'var(--fg-3)' }}>
              {Math.round(v * 100)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
function heatColor(v) {
  // cream -> green-strong
  if (v >= 0.85) return '#2FB67C';
  if (v >= 0.7) return '#6FCB9A';
  if (v >= 0.5) return '#A9DFBF';
  if (v >= 0.3) return '#FBB03B';
  return '#FFC8BD';
}

Object.assign(window, { AzButton, Eyebrow, Chip, Widget, Kpi, Sparkline, BarChart, LineChart, Donut, SplitBar, DataTable, Heatmap });

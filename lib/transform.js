let _id = 0;
function wid() { return 'w' + (++_id) + '_' + Math.random().toString(36).slice(2, 6); }

const COLORS = [
  'var(--az-red)', 'var(--az-eggplant)', 'var(--az-yellow)',
  'var(--az-green-strong)', 'var(--az-blue-strong)',
  '#8B4B6A', '#6B8E23', '#CD853F',
];

function toNum(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function fmtVal(v, unit) {
  const n = toNum(v);
  if (v === null || v === undefined) return '—';
  if (unit === '%') return n.toFixed(1);
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(1) + 'K';
  if (Number.isInteger(n)) return n.toLocaleString('en');
  return n.toFixed(2);
}

function transformWidget(spec, rows) {
  const id = wid();
  const base = {
    id,
    type: spec.type,
    span: spec.span,
    eyebrow: spec.eyebrow,
    title: spec.title,
    sql: spec.sql || null,
  };

  switch (spec.type) {
    case 'kpi': {
      const row = rows[0] || {};
      const keys = Object.keys(row);
      const val = row.value ?? row[keys[0]];
      const prev = row.previous_value;
      let delta = null, trend = 'flat';
      if (prev != null && val != null) {
        const diff = toNum(val) - toNum(prev);
        const sign = diff >= 0 ? '+' : '';
        delta = `${sign}${diff.toFixed(1)}${spec.unit || ''} vs previous`;
        trend = diff >= 0 ? 'up' : 'down';
      }
      return {
        ...base,
        span: 1,
        label: spec.title,
        value: fmtVal(val, spec.unit),
        unit: spec.unit,
        delta,
        trend,
        icon: spec.icon || 'number-circle-one',
      };
    }

    case 'bar': {
      const data = rows.map((r, i) => {
        const keys = Object.keys(r);
        return {
          l: String(r.label ?? r[keys[0]] ?? ''),
          v: toNum(r.value ?? r[keys[1]] ?? 0),
          c: COLORS[i === 0 ? 0 : 1],
        };
      });
      // Highlight the highest bar
      if (data.length > 0) {
        const maxVal = Math.max(...data.map(d => d.v));
        data.forEach(d => { d.c = d.v === maxVal ? COLORS[0] : COLORS[1]; });
      }
      return { ...base, data };
    }

    case 'line': {
      const vals = rows.map(r => {
        const keys = Object.keys(r);
        return toNum(r.value ?? r[keys[1]] ?? 0);
      });
      const labels = rows.map(r => {
        const keys = Object.keys(r);
        return String(r.label ?? r[keys[0]] ?? '');
      });
      return {
        ...base,
        labels,
        target: spec.target ?? null,
        series: [{ data: vals, color: 'var(--az-red)', fill: true }],
      };
    }

    case 'donut': {
      const data = rows.map((r, i) => {
        const keys = Object.keys(r);
        return {
          l: String(r.label ?? r[keys[0]] ?? ''),
          v: toNum(r.value ?? r[keys[1]] ?? 0),
          c: COLORS[i % COLORS.length],
        };
      });
      const total = data.reduce((s, d) => s + d.v, 0);
      return {
        ...base,
        centerValue: spec.centerValue || fmtVal(total),
        centerLabel: spec.centerLabel || 'Total',
        data,
      };
    }

    case 'table': {
      if (!rows.length) return { ...base, span: spec.span || 4, columns: [], rows: [] };
      const cols = Object.keys(rows[0]).map(k => ({
        key: k,
        label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        mono: /id|count|num|qty|rate|pct|score|min|sec/i.test(k),
        align: /count|num|qty|rate|pct|score|min|sec/i.test(k) ? 'right' : 'left',
      }));
      return { ...base, span: spec.span || 4, columns: cols, rows };
    }

    case 'heatmap': {
      const colSet = [...new Set(rows.map(r => {
        const keys = Object.keys(r);
        return String(r.col_label ?? r[keys[1]] ?? '');
      }))];
      const rowSet = [...new Set(rows.map(r => {
        const keys = Object.keys(r);
        return String(r.row_label ?? r[keys[0]] ?? '');
      }))];
      const lookup = {};
      rows.forEach(r => {
        const keys = Object.keys(r);
        const rk = String(r.row_label ?? r[keys[0]] ?? '');
        const ck = String(r.col_label ?? r[keys[1]] ?? '');
        lookup[`${rk}\x00${ck}`] = toNum(r.value ?? r[keys[2]] ?? 0);
      });
      const heatRows = rowSet.map(rl => ({
        label: rl,
        values: colSet.map(cl => lookup[`${rl}\x00${cl}`] || 0),
      }));
      return { ...base, cols: colSet, rows: heatRows };
    }

    default:
      return { ...base, id };
  }
}

module.exports = { transformWidget };

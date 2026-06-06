// Scripted-but-realistic AI engine. Pure functions: prompt -> plan.
// A "plan" is either { kind:'clarify', ... } or { kind:'build', ... }.
// Follow-ups mutate an existing widget list.

function _norm(s) { return (s || '').toLowerCase(); }
function _has(s, ...words) { return words.some(w => s.includes(w)); }

/* Scope phrases pulled from the prompt, for nicer step detail text. */
function _scope(s) {
  const bits = [];
  const line = s.match(/line\s?\d/);
  if (line) bits.push('Line ' + line[0].replace(/\D/g, ''));
  if (_has(s, 'shift a')) bits.push('Shift A');
  if (_has(s, 'this week', 'weekly')) bits.push('this week');
  else if (_has(s, 'this month', 'monthly', 'month')) bits.push('this month');
  else if (_has(s, 'today')) bits.push('today');
  else if (_has(s, 'quarter')) bits.push('this quarter');
  return bits;
}

/* Build the plan from a prompt. ctx = { dashboardEmpty } */
function planPrompt(prompt, ctx = {}) {
  const s = _norm(prompt).trim();
  const scope = _scope(s);
  const scopeStr = scope.length ? ' · ' + scope.join(' · ') : '';

  // --- Ambiguity: broad "quality" or a generic "make a dashboard" ---
  const generic = /^(make|build|create|set up|give me|i want|need)\b/.test(s) && !_has(s, 'oee', 'yield', 'defect', 'scrap', 'pareto', 'train', 'skill', 'downtime', 'stoppage', 'audit', 'output', 'throughput', 'unit', 'inspection', 'safety');
  const broadQuality = _has(s, 'quality') && !_has(s, 'yield', 'defect', 'scrap', 'audit', 'first-pass', 'fpy');

  if (broadQuality) {
    return {
      kind: 'clarify',
      preSteps: [
        { label: 'Understanding your request', detail: 'A quality dashboard — broad request' },
        { label: 'Checking available data', detail: 'Yield, defects, scrap, audits, FPY by line' },
      ],
      question: 'Quality covers a few things in your database. Which should I lead with?',
      footnote: 'Or tell me a specific line, time range, or metric.',
      chips: [
        { label: 'First-pass yield', prompt: 'First-pass yield trend and by line' + scopeStr.replace(' · ', ' ') },
        { label: 'Defects & scrap', prompt: 'Defect Pareto and scrap reasons' + scopeStr.replace(' · ', ' ') },
        { label: 'Audit results', prompt: 'Audit pass rate and recent audits' },
        { label: 'All of it', prompt: 'Full quality overview: yield, defects, scrap and audits' },
      ],
    };
  }
  if (generic && s.length < 60) {
    return {
      kind: 'clarify',
      preSteps: [
        { label: 'Understanding your request', detail: 'Open-ended — needs a focus' },
        { label: 'Checking available data', detail: 'Production, Quality, Skills & Downtime sources' },
      ],
      question: "Happy to build that. What should this dashboard focus on?",
      footnote: 'Pick a starting point — you can always add more after.',
      chips: [
        { label: 'Production & OEE', prompt: 'OEE, yield and output trend' },
        { label: 'Defects & scrap', prompt: 'Defect Pareto and scrap reasons this month' },
        { label: 'Training & skills', prompt: 'Where are our training gaps?' },
        { label: 'Downtime', prompt: 'Downtime trend and top stoppages today' },
      ],
    };
  }

  // --- Concrete intents ---
  let widgets, name, sources, chosen, eyebrow;
  if (_has(s, 'downtime', 'stoppage', 'breakdown')) {
    widgets = [W.kpiDowntime(), W.downtimeTrend(), W.topStoppages()];
    name = 'Downtime Watch'; sources = 'Machine status, stoppage log & OEE losses';
    chosen = 'a downtime KPI, a 7-day trend and a top-stoppages table';
  } else if (_has(s, 'train', 'skill', 'gap', 'competen', 'certif')) {
    widgets = [W.kpiCertified(), W.skillGaps(), W.trainingHeatmap()];
    name = 'Training & Skills'; sources = 'Skill matrix, training records & sign-offs';
    chosen = 'a certification KPI, a gaps-by-line bar and a completion heatmap';
  } else if (_has(s, 'audit', 'inspection', 'safety', '5s')) {
    widgets = [W.kpiAuditPass(), W.auditResults(), W.recentAudits()];
    name = 'Audit Tracker'; sources = 'Audit log, inspection results & sign-offs';
    chosen = 'a pass-rate KPI, an outcomes donut and a recent-audits table';
  } else if (_has(s, 'defect', 'scrap', 'pareto', 'reject')) {
    widgets = [W.kpiScrap(), W.kpiDefects(), W.defectPareto(), W.scrapReasons()];
    name = 'Defects & Scrap'; sources = 'Defect log, scrap records & rework';
    chosen = 'scrap & defect KPIs, a defect Pareto and a scrap-reasons donut';
  } else if (_has(s, 'oee', 'output', 'throughput', 'unit', 'production', 'line') && !_has(s, 'yield')) {
    widgets = [W.kpiYield(), W.kpiOee(), W.kpiUnits(), W.oeeTrend(), W.defectsByStation()];
    if (_has(s, 'scrap')) widgets.push(W.scrapReasons());
    name = 'Production Overview'; sources = 'OEE, output counts, yield & defect rates';
    chosen = 'yield/OEE/output KPIs, an OEE trend and defects by station';
  } else if (_has(s, 'yield', 'first-pass', 'fpy')) {
    widgets = [W.kpiYield(), W.yieldTrend(), W.defectsByStation()];
    if (_has(s, 'oee')) widgets.unshift(W.kpiOee());
    name = 'Yield'; sources = 'First-pass yield, rework & defect rates';
    chosen = 'a yield KPI, a 7-day yield trend and defects by station';
  } else {
    widgets = [W.kpiYield(), W.kpiOee(), W.oeeTrend(), W.defectsByStation()];
    name = 'Operations Overview'; sources = 'Production, Quality & Skills sources';
    chosen = 'headline KPIs, an OEE trend and defects by station';
  }

  const interpreted = (chosen ? '' : '') + summarisePrompt(s) + scopeStr;
  return {
    kind: 'build',
    dashboardName: name,
    renameIfEmpty: ctx.dashboardEmpty,
    widgets,
    steps: [
      { label: 'Understanding your request', detail: interpreted },
      { label: 'Checking available data', detail: 'Matched ' + sources },
      { label: 'Choosing the right widgets', detail: 'Picked ' + chosen },
      { label: 'Building your dashboard', detail: 'Placed ' + widgets.length + ' widgets' },
    ],
    summary: widgets.map(specSummary),
  };
}

function summarisePrompt(s) {
  // Title-case-ish short interpretation
  let t = s.replace(/^(make|build|create|set up|give me|show me|i want|i need|add|track)\s+(me\s+)?(a\s+)?/i, '');
  t = t.replace(/\bdashboard\b/i, '').replace(/\s+/g, ' ').trim();
  if (!t) t = 'overview';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function specSummary(spec) {
  const icons = { kpi: spec.icon || 'number-circle-one', bar: 'chart-bar', line: 'chart-line-up', donut: 'chart-donut', table: 'table', heatmap: 'grid-four', split: 'rows' };
  const typeName = { kpi: 'KPI', bar: 'Bar', line: 'Line', donut: 'Donut', table: 'Table', heatmap: 'Heatmap', split: 'Bars' };
  return { name: spec.label || spec.title, type: typeName[spec.type], icon: icons[spec.type] };
}

/* ---- Follow-up edits on an existing widget list ---- */
function planFollowup(prompt, widgets) {
  const s = _norm(prompt);
  const list = widgets.slice();

  // Remove / delete
  if (_has(s, 'remove', 'delete', 'drop', 'get rid')) {
    const target = list.find(w => titleMatch(w, s));
    if (target) {
      return {
        steps: [{ label: 'Understanding your request', detail: 'Remove “' + (target.title || target.label) + '”' }, { label: 'Updating dashboard', detail: 'Removed 1 widget' }],
        widgets: list.filter(w => w.id !== target.id),
        text: 'Removed ' + (target.title || target.label) + '.',
      };
    }
  }
  // Add a target line
  if (_has(s, 'target')) {
    const line = list.find(w => w.type === 'line' && w.target == null);
    if (line) {
      const idx = list.findIndex(w => w.id === line.id);
      const vals = line.series[0].data; const tgt = Math.round(Math.max(...vals) * 0.98);
      list[idx] = { ...line, target: line.title.includes('OEE') ? 85 : tgt };
      return { steps: [{ label: 'Understanding your request', detail: 'Add a target line' }, { label: 'Updating dashboard', detail: 'Target added to “' + line.title + '”' }], widgets: list, text: 'Added a target line to ' + line.title + '.' };
    }
  }
  // Split by shift -> 2nd series on a line
  if (_has(s, 'shift', 'split')) {
    const line = list.find(w => w.type === 'line');
    if (line && line.series.length < 2) {
      const idx = list.findIndex(w => w.id === line.id);
      const base = line.series[0].data;
      const shiftB = base.map(v => +(v - 2 - Math.random() * 3).toFixed(1));
      list[idx] = { ...line, title: line.title.replace(/·.*/, '· by shift'), series: [{ ...line.series[0], fill: false }, { data: shiftB, color: 'var(--az-eggplant)' }] };
      return { steps: [{ label: 'Understanding your request', detail: 'Split trend by shift' }, { label: 'Updating dashboard', detail: 'Added Shift A / Shift B series' }], widgets: list, text: 'Split ' + line.title + ' into Shift A and Shift B.' };
    }
  }
  // Convert last bar/line to a table
  if (_has(s, 'table')) {
    const idx = [...list].reverse().findIndex(w => w.type === 'bar');
    if (idx !== -1) {
      const realIdx = list.length - 1 - idx; const bar = list[realIdx];
      list[realIdx] = { id: bar.id, type: 'table', span: 2, eyebrow: bar.eyebrow, title: bar.title.replace('Pareto', 'breakdown'),
        columns: [{ key: 'l', label: 'Item' }, { key: 'v', label: 'Count', align: 'right', mono: true, w: '90px' }],
        rows: bar.data.map(d => ({ l: d.l, v: d.v })) };
      return { steps: [{ label: 'Understanding your request', detail: 'Show as a table' }, { label: 'Updating dashboard', detail: 'Converted “' + bar.title + '” to a table' }], widgets: list, text: 'Converted ' + bar.title + ' to a table.' };
    }
  }
  // Add a scrap breakdown
  if (_has(s, 'scrap', 'breakdown')) {
    return { steps: [{ label: 'Understanding your request', detail: 'Add a scrap breakdown' }, { label: 'Building widget', detail: 'Added a scrap-reasons donut' }], widgets: [...list, W.scrapReasons()], text: 'Added a scrap-reasons breakdown.' };
  }

  // Fall through: treat as a fresh build appended to this dashboard
  const plan = planPrompt(prompt, { dashboardEmpty: false });
  if (plan.kind === 'build') {
    return { steps: plan.steps, widgets: [...list, ...plan.widgets], text: 'Added ' + plan.widgets.length + ' widgets.', summary: plan.summary };
  }
  return plan; // clarify
}

function titleMatch(w, s) {
  const t = _norm(w.title || w.label);
  const keys = ['scrap', 'defect', 'yield', 'oee', 'training', 'downtime', 'audit', 'pareto', 'heatmap', 'donut', 'table'];
  return keys.some(k => s.includes(k) && t.includes(k));
}

/* Default follow-up suggestion chips based on current widgets */
function followupChips(widgets) {
  const chips = [];
  if (widgets.some(w => w.type === 'line' && w.target == null)) chips.push('Add a target line');
  if (widgets.some(w => w.type === 'line')) chips.push('Split by shift');
  if (widgets.some(w => w.type === 'bar')) chips.push('Make it a table');
  if (!widgets.some(w => w.title && w.title.includes('Scrap'))) chips.push('Add a scrap breakdown');
  return chips.slice(0, 3);
}

Object.assign(window, { planPrompt, planFollowup, followupChips, specSummary });

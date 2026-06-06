// Widget spec -> rendered body. Specs are plain data the AI engine produces.
// Depends on widgets.jsx (BarChart, LineChart, Donut, DataTable, Heatmap, Kpi, Eyebrow, Chip).

let _wid = 0;
function widId() { _wid += 1; return 'w' + _wid + '_' + Math.random().toString(36).slice(2, 6); }

/* Render the BODY of a non-KPI widget from its spec. */
function renderWidgetBody(spec) {
  switch (spec.type) {
    case 'bar':
      return <BarChart height={spec.height || 150} data={spec.data} />;
    case 'line':
      return <LineChart labels={spec.labels} series={spec.series} target={spec.target} height={spec.height || 150} />;
    case 'donut':
      return <Donut centerValue={spec.centerValue} centerLabel={spec.centerLabel} data={spec.data} />;
    case 'table':
      return <DataTable columns={spec.columns} rows={spec.rows} />;
    case 'heatmap':
      return <Heatmap cols={spec.cols} rows={spec.rows} />;
    case 'split':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13, justifyContent: 'center', flex: 1 }}>
          {spec.bars.map((b, i) => <SplitBar key={i} {...b} />)}
        </div>
      );
    default:
      return <div style={{ color: 'var(--fg-4)', fontSize: 13 }}>Unknown widget</div>;
  }
}

/* ---- Widget spec factories (used by the AI engine) ---- */
const W = {
  kpiYield: () => ({ id: widId(), type: 'kpi', span: 1, label: 'First-pass yield', value: '98.7', unit: '%', delta: '+0.4 vs last week', trend: 'up', icon: 'target', spark: [97.9, 98.1, 97.8, 98.4, 98.2, 98.6, 98.7] }),
  kpiOee: () => ({ id: widId(), type: 'kpi', span: 1, label: 'OEE', value: '82.4', unit: '%', delta: '+1.8 this shift', trend: 'up', icon: 'gauge', spark: [78, 79.5, 80, 79, 81, 81.8, 82.4] }),
  kpiUnits: () => ({ id: widId(), type: 'kpi', span: 1, label: 'Units today', value: '1,284', delta: '92% of target', trend: 'up', icon: 'package', spark: [820, 940, 1010, 1120, 1180, 1240, 1284] }),
  kpiDefects: () => ({ id: widId(), type: 'kpi', span: 1, label: 'Open defects', value: '12', delta: '-3 this shift', trend: 'down', icon: 'warning', spark: [19, 18, 16, 15, 14, 13, 12] }),
  kpiScrap: () => ({ id: widId(), type: 'kpi', span: 1, label: 'Scrap rate', value: '3.1', unit: '%', delta: '-0.4 vs target', trend: 'down', icon: 'trash', spark: [4.0, 3.8, 3.6, 3.5, 3.3, 3.2, 3.1] }),
  kpiDowntime: () => ({ id: widId(), type: 'kpi', span: 1, label: 'Downtime today', value: '47', unit: 'min', delta: '+12 vs avg', trend: 'up', icon: 'timer', spark: [22, 28, 24, 30, 35, 41, 47] }),
  kpiCertified: () => ({ id: widId(), type: 'kpi', span: 1, label: 'Operators certified', value: '78', unit: '%', delta: '+5 this quarter', trend: 'up', icon: 'seal-check', spark: [68, 70, 71, 73, 74, 76, 78] }),
  kpiAuditPass: () => ({ id: widId(), type: 'kpi', span: 1, label: 'Audit pass rate', value: '94', unit: '%', delta: '+2 this month', trend: 'up', icon: 'check-square', spark: [88, 90, 89, 91, 92, 93, 94] }),

  oeeTrend: () => ({ id: widId(), type: 'line', span: 2, eyebrow: 'Production', title: 'OEE trend · 7 days', badgeText: 'vs 85% target', badgeVariant: 'neutral', labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], target: 85, series: [{ data: [78, 79.5, 80, 79, 81, 81.8, 82.4], color: 'var(--az-red)', fill: true }] }),
  yieldTrend: () => ({ id: widId(), type: 'line', span: 2, eyebrow: 'Quality', title: 'First-pass yield · 7 days', labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], series: [{ data: [97.9, 98.1, 97.8, 98.4, 98.2, 98.6, 98.7], color: 'var(--az-green-strong)', fill: true }] }),
  defectsByStation: () => ({ id: widId(), type: 'bar', span: 2, eyebrow: 'Quality', title: 'Defects by station', badgeText: 'Top: Leak test', badgeVariant: 'danger', data: [
    { l: 'Torque', v: 14, c: 'var(--az-eggplant)' }, { l: 'Weld', v: 9, c: 'var(--az-eggplant)' }, { l: 'Leak', v: 22, c: 'var(--az-red)' }, { l: 'Harness', v: 6, c: 'var(--az-eggplant)' }, { l: 'Final QC', v: 11, c: 'var(--az-eggplant)' },
  ] }),
  defectPareto: () => ({ id: widId(), type: 'bar', span: 2, eyebrow: 'Quality', title: 'Defect Pareto · this month', badgeText: '80% from 3 causes', badgeVariant: 'warn', data: [
    { l: 'Leak', v: 42, c: 'var(--az-red)' }, { l: 'Torque', v: 28, c: 'var(--az-red)' }, { l: 'Solder', v: 19, c: 'var(--az-eggplant)' }, { l: 'Fit', v: 11, c: 'var(--az-eggplant)' }, { l: 'Other', v: 6, c: 'var(--az-eggplant)' },
  ] }),
  scrapReasons: () => ({ id: widId(), type: 'donut', span: 2, eyebrow: 'Quality', title: 'Scrap reasons', centerValue: '3.1%', centerLabel: 'Scrap rate', data: [
    { l: 'Material flaw', v: 38, c: 'var(--az-red)' }, { l: 'Mis-assembly', v: 27, c: 'var(--az-eggplant)' }, { l: 'Calibration', v: 21, c: 'var(--az-yellow)' }, { l: 'Other', v: 14, c: 'var(--az-mist)' },
  ] }),
  trainingHeatmap: () => ({ id: widId(), type: 'heatmap', span: 2, eyebrow: 'Skills', title: 'Training completion', accent: true, cols: ['Torque', 'Weld', 'Leak', 'Final QC'], rows: [
    { label: 'Line 1 · Assembly', values: [0.95, 0.8, 0.6, 0.9] }, { label: 'Line 2 · Welding', values: [0.7, 0.92, 0.4, 0.75] }, { label: 'Line 3 · Final QC', values: [0.85, 0.55, 0.88, 0.96] },
  ] }),
  skillGaps: () => ({ id: widId(), type: 'bar', span: 2, eyebrow: 'Skills', title: 'Certification gaps by line', badgeText: 'Line 2 lagging', badgeVariant: 'warn', data: [
    { l: 'Line 1', v: 12, c: 'var(--az-eggplant)' }, { l: 'Line 2', v: 31, c: 'var(--az-red)' }, { l: 'Line 3', v: 8, c: 'var(--az-eggplant)' }, { l: 'Line 4', v: 17, c: 'var(--az-eggplant)' },
  ] }),
  downtimeTrend: () => ({ id: widId(), type: 'line', span: 2, eyebrow: 'Production', title: 'Downtime · 7 days', badgeText: 'minutes / day', badgeVariant: 'neutral', labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], series: [{ data: [22, 28, 24, 30, 35, 41, 47], color: 'var(--az-dark-red)', fill: true }] }),
  topStoppages: () => ({ id: widId(), type: 'table', span: 2, eyebrow: 'Production', title: 'Top stoppages', columns: [
    { key: 'cause', label: 'Cause' }, { key: 'line', label: 'Line', w: '90px' }, { key: 'mins', label: 'Min', w: '70px', align: 'right', mono: true }, { key: 'count', label: 'Events', w: '80px', align: 'right', mono: true },
  ], rows: [
    { cause: 'Material wait', line: 'Line 2', mins: 18, count: 4 }, { cause: 'Tool change', line: 'Line 1', mins: 12, count: 6 }, { cause: 'Jam · conveyor', line: 'Line 3', mins: 9, count: 3 }, { cause: 'Calibration', line: 'Line 2', mins: 8, count: 2 },
  ] }),
  recentAudits: () => ({ id: widId(), type: 'table', span: 4, eyebrow: 'Quality', title: 'Recent audits', columns: [
    { key: 'when', label: 'Time', w: '70px', mono: true }, { key: 'audit', label: 'Audit' }, { key: 'line', label: 'Line', w: '110px' }, { key: 'who', label: 'Operator', w: '130px' }, { key: 'result', label: 'Result', w: '110px', align: 'right', render: v => <Chip variant={v === 'Pass' ? 'success' : v === 'Flag' ? 'danger' : 'warn'}>{v}</Chip> },
  ], rows: [
    { when: '14:08', audit: 'Daily safety walk', line: 'Line 3', who: 'Marta K.', result: 'Pass' }, { when: '13:51', audit: 'Torque calibration', line: 'Line 1', who: 'Jan P.', result: 'Flag' }, { when: '13:22', audit: '5S workplace check', line: 'Line 2', who: 'Sam B.', result: 'Pass' }, { when: '12:45', audit: 'Leak-test SOP', line: 'Line 2', who: 'Lena R.', result: 'Review' },
  ] }),
  auditResults: () => ({ id: widId(), type: 'donut', span: 2, eyebrow: 'Quality', title: 'Audit outcomes · 30 days', centerValue: '94%', centerLabel: 'Pass rate', data: [
    { l: 'Pass', v: 188, c: 'var(--az-green-strong)' }, { l: 'Review', v: 9, c: 'var(--az-yellow)' }, { l: 'Flag', v: 4, c: 'var(--az-dark-red)' },
  ] }),
};

/* ---- Seed dashboards (pre-populated examples for the left list) ---- */
function seedDashboards() {
  return [
    { id: 'untitled', name: 'Untitled dashboard', icon: 'squares-four', pinned: false, widgets: [], thread: null },
    { id: 'prod', name: 'Production Overview', icon: 'chart-line-up', pinned: true, widgets: [W.kpiYield(), W.kpiOee(), W.kpiUnits(), W.kpiDefects(), W.oeeTrend(), W.defectsByStation(), W.scrapReasons(), W.trainingHeatmap(), W.recentAudits()] },
    { id: 'quality', name: 'Quality & Scrap', icon: 'shield-check', pinned: true, widgets: [W.kpiYield(), W.kpiScrap(), W.kpiDefects(), W.defectPareto(), W.scrapReasons(), W.recentAudits()] },
    { id: 'line3', name: 'Line 3 · Shift A', icon: 'gauge', pinned: false, widgets: [W.kpiOee(), W.kpiUnits(), W.oeeTrend(), W.defectsByStation()] },
    { id: 'skills', name: 'Training & Skills', icon: 'graduation-cap', pinned: false, widgets: [W.kpiCertified(), W.skillGaps(), W.trainingHeatmap()] },
    { id: 'downtime', name: 'Downtime Watch', icon: 'timer', pinned: false, widgets: [W.kpiDowntime(), W.downtimeTrend(), W.topStoppages()] },
    { id: 'audits', name: 'Audit Tracker', icon: 'check-square', pinned: false, widgets: [W.kpiAuditPass(), W.auditResults(), W.recentAudits()] },
    { id: 'oee-deep', name: 'OEE Deep-dive', icon: 'chart-donut', pinned: false, widgets: [W.kpiOee(), W.oeeTrend(), W.downtimeTrend()] },
    { id: 'weekly', name: 'Weekly Ops Review', icon: 'calendar-check', pinned: false, widgets: [W.kpiYield(), W.kpiOee(), W.kpiUnits(), W.kpiScrap(), W.yieldTrend(), W.defectPareto()] },
  ];
}

Object.assign(window, { renderWidgetBody, W, seedDashboards, widId });

// Dashboard content — populated widget grid + empty state.

function DashGridProduction({ cols = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14, alignContent: 'start' }}>
      <Kpi label="First-pass yield" value="98.7" unit="%" delta="+0.4 vs last week" trend="up" icon="target" spark={[97.9, 98.1, 97.8, 98.4, 98.2, 98.6, 98.7]} />
      <Kpi label="OEE" value="82.4" unit="%" delta="+1.8 this shift" trend="up" icon="gauge" spark={[78, 79.5, 80, 79, 81, 81.8, 82.4]} />
      <Kpi label="Units today" value="1,284" delta="92% of target" trend="up" icon="package" spark={[820, 940, 1010, 1120, 1180, 1240, 1284]} />
      <Kpi label="Open defects" value="12" delta="-3 this shift" trend="down" icon="warning" spark={[19, 18, 16, 15, 14, 13, 12]} />

      <Widget eyebrow="Production" title="OEE trend · 7 days" span={cols >= 4 ? 2 : cols} badge={<Chip variant="neutral">vs 85% target</Chip>}>
        <LineChart
          labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
          target={85}
          series={[{ data: [78, 79.5, 80, 79, 81, 81.8, 82.4], color: 'var(--az-red)', fill: true }]}
          height={150}
        />
      </Widget>

      <Widget eyebrow="Quality" title="Defects by station" span={cols >= 4 ? 2 : cols} badge={<Chip variant="danger">Top: Leak test</Chip>}>
        <BarChart height={150} data={[
          { l: 'Torque', v: 14, c: 'var(--az-eggplant)' },
          { l: 'Weld', v: 9, c: 'var(--az-eggplant)' },
          { l: 'Leak', v: 22, c: 'var(--az-red)' },
          { l: 'Harness', v: 6, c: 'var(--az-eggplant)' },
          { l: 'Final QC', v: 11, c: 'var(--az-eggplant)' },
        ]} />
      </Widget>

      <Widget eyebrow="Quality" title="Scrap reasons" span={cols >= 4 ? 2 : cols}>
        <Donut centerValue="3.1%" centerLabel="Scrap rate" data={[
          { l: 'Material flaw', v: 38, c: 'var(--az-red)' },
          { l: 'Mis-assembly', v: 27, c: 'var(--az-eggplant)' },
          { l: 'Calibration', v: 21, c: 'var(--az-yellow)' },
          { l: 'Other', v: 14, c: 'var(--az-mist)' },
        ]} />
      </Widget>

      <Widget eyebrow="Skills" title="Training completion" span={cols >= 4 ? 2 : cols} accent>
        <Heatmap
          cols={['Torque', 'Weld', 'Leak', 'Final QC']}
          rows={[
            { label: 'Line 1 · Assembly', values: [0.95, 0.8, 0.6, 0.9] },
            { label: 'Line 2 · Welding', values: [0.7, 0.92, 0.4, 0.75] },
            { label: 'Line 3 · Final QC', values: [0.85, 0.55, 0.88, 0.96] },
          ]}
        />
      </Widget>

      <Widget eyebrow="Quality" title="Recent audits" span={cols} >
        <DataTable
          columns={[
            { key: 'when', label: 'Time', w: '70px', mono: true },
            { key: 'audit', label: 'Audit' },
            { key: 'line', label: 'Line', w: '110px' },
            { key: 'result', label: 'Result', w: '110px', align: 'right', render: v => <Chip variant={v === 'Pass' ? 'success' : v === 'Flag' ? 'danger' : 'warn'}>{v}</Chip> },
          ]}
          rows={[
            { when: '14:08', audit: 'Daily safety walk', line: 'Line 3', result: 'Pass' },
            { when: '13:51', audit: 'Torque calibration', line: 'Line 1', result: 'Flag' },
            { when: '13:22', audit: '5S workplace check', line: 'Line 2', result: 'Pass' },
            { when: '12:45', audit: 'Leak-test SOP', line: 'Line 2', result: 'Review' },
          ]}
        />
      </Widget>
    </div>
  );
}

/* Empty dashboard state — invites the first prompt */
function EmptyDashboard({ compact }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32, position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5, backgroundImage: 'radial-gradient(var(--border-subtle) 1px, transparent 1px)', backgroundSize: '22px 22px', maskImage: 'radial-gradient(circle at center, #000, transparent 72%)', WebkitMaskImage: 'radial-gradient(circle at center, #000, transparent 72%)' }}></div>
      <div style={{ position: 'relative', maxWidth: 440 }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, background: 'var(--az-soft-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <img src="assets/logo-icon-red.svg" alt="" style={{ width: 32, height: 32 }} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', color: 'var(--az-eggplant)', margin: '0 0 10px' }}>Build a dashboard with a prompt</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, lineHeight: 1.55, color: 'var(--fg-3)', margin: '0 0 22px' }}>
          Your Manufacturing Analytics database is connected. Describe what you want to track and Azumuta assembles the widgets — charts, KPIs, tables — for you.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {['Show me OEE and yield for Line 3', 'Defect Pareto by station this month', 'Training gaps across the floor'].map((s, i) => (
            <button key={i} style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, padding: '8px 14px', borderRadius: 999, cursor: 'pointer', background: '#fff', border: '1px solid var(--border-subtle)', color: 'var(--fg-2)', display: 'inline-flex', gap: 6, alignItems: 'center', boxShadow: 'var(--shadow-xs)' }}>
              <i className="ph-light ph-sparkle" style={{ fontSize: 13, color: 'var(--az-red)' }}></i>{s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Skeleton widgets — shown while AI is building */
function BuildingDashboard() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, alignContent: 'start' }}>
      <Kpi label="First-pass yield" value="98.7" unit="%" delta="+0.4 vs last week" trend="up" icon="target" spark={[97.9, 98.1, 97.8, 98.4, 98.2, 98.6, 98.7]} />
      <Kpi label="OEE" value="82.4" unit="%" delta="+1.8 this shift" trend="up" icon="gauge" spark={[78, 79.5, 80, 79, 81, 81.8, 82.4]} />
      {[0, 1].map(i => <SkeletonTile key={i} />)}
      <SkeletonTile span={2} tall />
      <SkeletonTile span={2} tall />
    </div>
  );
}
function SkeletonTile({ span = 1, tall }) {
  return (
    <div style={{ gridColumn: `span ${span}`, height: tall ? 196 : 116, background: '#fff', border: '1px dashed var(--border-accent)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, position: 'relative', overflow: 'hidden' }}>
      <div className="az-shimmer" style={{ position: 'absolute', inset: 0 }}></div>
      <span className="az-spin" style={{ width: 16, height: 16, border: '2px solid var(--az-soft-red)', borderTopColor: 'var(--az-red)', borderRadius: '50%' }}></span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--az-dark-red)', fontWeight: 500 }}>Building widget…</span>
    </div>
  );
}

Object.assign(window, { DashGridProduction, EmptyDashboard, BuildingDashboard, SkeletonTile });

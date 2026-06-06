// App chrome + the three layout directions.

const DASHBOARDS = [
  { id: 'prod', name: 'Production Overview', icon: 'chart-line-up', pinned: true, widgets: 7 },
  { id: 'quality', name: 'Quality & Scrap', icon: 'shield-check', pinned: true, widgets: 5 },
  { id: 'line3', name: 'Line 3 · Shift A', icon: 'gauge', pinned: false, widgets: 4 },
  { id: 'skills', name: 'Training & Skills', icon: 'graduation-cap', pinned: false, widgets: 6 },
  { id: 'downtime', name: 'Downtime Watch', icon: 'timer', pinned: false, widgets: 3 },
];

/* Slim Azumuta app icon rail (global nav) */
function AppRail() {
  const items = [
    { icon: 'squares-four', on: false },
    { icon: 'clipboard-text', on: false },
    { icon: 'chart-donut', on: true },
    { icon: 'tree-structure', on: false },
    { icon: 'graduation-cap', on: false },
    { icon: 'shield-check', on: false },
  ];
  return (
    <div style={{ width: 60, background: 'var(--az-eggplant)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', flexShrink: 0, gap: 4 }}>
      <img src="assets/logo-icon-red.svg" alt="Azumuta" style={{ width: 26, height: 26, marginBottom: 16 }} />
      {items.map((it, i) => (
        <div key={i} style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: it.on ? 'rgba(255,74,46,0.2)' : 'transparent', color: it.on ? '#FFC8BD' : '#A89790', cursor: 'pointer' }}>
          <i className={`ph-light ph-${it.icon}`} style={{ fontSize: 20 }}></i>
        </div>
      ))}
      <div style={{ flex: 1 }}></div>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--az-red)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12 }}>MK</div>
    </div>
  );
}

/* Dashboard list rail (left, persistent) */
function DashListRail({ activeId = 'prod' }) {
  const pinned = DASHBOARDS.filter(d => d.pinned);
  const others = DASHBOARDS.filter(d => !d.pinned);
  const Row = (d) => (
    <div key={d.id} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 9, cursor: 'pointer',
      background: d.id === activeId ? 'var(--az-soft-red)' : 'transparent',
    }}>
      <i className={`ph-light ph-${d.icon}`} style={{ fontSize: 17, color: d.id === activeId ? 'var(--az-dark-red)' : 'var(--fg-3)' }}></i>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: d.id === activeId ? 600 : 500, color: d.id === activeId ? 'var(--az-eggplant)' : 'var(--fg-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
      </div>
      {d.pinned && <i className="ph-fill ph-push-pin" style={{ fontSize: 12, color: 'var(--az-red)' }}></i>}
    </div>
  );
  return (
    <div style={{ width: 212, background: '#fff', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '16px 14px 12px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, letterSpacing: '-0.015em', color: 'var(--az-eggplant)', marginBottom: 12 }}>Dashboards</div>
        <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '9px', borderRadius: 9, border: '1px dashed var(--border-accent)', background: 'var(--az-cream)', color: 'var(--az-dark-red)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600 }}>
          <i className="ph-light ph-plus" style={{ fontSize: 15 }}></i>New dashboard
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', padding: '0 8px' }}>
        <Eyebrow style={{ padding: '6px 6px 6px' }}>Pinned</Eyebrow>
        {pinned.map(Row)}
        <Eyebrow style={{ padding: '14px 6px 6px' }}>All dashboards</Eyebrow>
        {others.map(Row)}
      </div>
    </div>
  );
}

/* Canvas header */
function CanvasHeader({ title = 'Production Overview', subtitle = 'Live · auto-refresh 30s', showTabs }) {
  return (
    <div style={{ padding: showTabs ? '16px 24px 0' : '16px 24px', borderBottom: showTabs ? 'none' : '1px solid var(--border-subtle)', background: 'var(--bg-page)', flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, letterSpacing: '-0.02em', color: 'var(--az-eggplant)', margin: 0 }}>{title}</h1>
            <i className="ph-fill ph-push-pin" style={{ fontSize: 14, color: 'var(--az-red)' }}></i>
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--fg-3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--az-green-strong)' }}></span>{subtitle}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={iconBtn}><i className="ph-light ph-calendar-blank" style={{ fontSize: 17, color: 'var(--fg-2)' }}></i></button>
          <button style={iconBtn}><i className="ph-light ph-share-network" style={{ fontSize: 17, color: 'var(--fg-2)' }}></i></button>
          <button style={iconBtn}><i className="ph-light ph-dots-three" style={{ fontSize: 17, color: 'var(--fg-2)' }}></i></button>
        </div>
      </div>
    </div>
  );
}
const iconBtn = { width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border-subtle)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };

/* Horizontal dashboard tabs (Layout B) */
function DashTabs({ activeId = 'prod' }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '12px 24px 0', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-page)', flexShrink: 0 }}>
      {DASHBOARDS.slice(0, 4).map(d => (
        <div key={d.id} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', cursor: 'pointer',
          borderBottom: d.id === activeId ? '2px solid var(--az-red)' : '2px solid transparent',
          color: d.id === activeId ? 'var(--az-eggplant)' : 'var(--fg-3)',
          fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: d.id === activeId ? 600 : 500,
        }}>
          {d.pinned && <i className="ph-fill ph-push-pin" style={{ fontSize: 11, color: d.id === activeId ? 'var(--az-red)' : 'var(--fg-4)' }}></i>}
          {d.name}
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', color: 'var(--fg-4)', cursor: 'pointer' }}>
        <i className="ph-light ph-plus" style={{ fontSize: 16 }}></i>
      </div>
    </div>
  );
}

/* ------- AI panel compositions per flow state ------- */
function panelBg(tone) { return tone === 'dark' ? 'var(--az-eggplant-dark)' : tone === 'eggplant' ? 'var(--az-eggplant)' : '#fff'; }
function AiPanelHeader({ tone = 'light' }) {
  const dark = tone !== 'light';
  return (
    <div style={{ padding: '14px 16px', borderBottom: dark ? '1px solid rgba(241,238,236,0.12)' : '1px solid var(--border-subtle)', background: panelBg(tone), display: 'flex', flexDirection: 'column', gap: 11, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <AiAvatar size={28} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14.5, letterSpacing: '-0.01em', color: dark ? 'var(--az-cream)' : 'var(--az-eggplant)' }}>Dashboard Assistant</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: dark ? '#C9BFBA' : 'var(--fg-3)' }}>Builds widgets from your prompts</div>
          </div>
        </div>
        <i className="ph-light ph-arrows-out-line-horizontal" style={{ fontSize: 17, color: dark ? '#C9BFBA' : 'var(--fg-4)', cursor: 'pointer' }}></i>
      </div>
      <DataSourceBadge tone={tone} />
    </div>
  );
}

function AiPanel({ state, tone = 'light', width = 360 }) {
  const dark = tone !== 'light';
  return (
    <div style={{ width, background: panelBg(tone), borderLeft: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <AiPanelHeader tone={tone} />
      <div style={{ flex: 1, overflow: 'hidden', padding: '16px 16px 4px', display: 'flex', flexDirection: 'column' }}>
        {state === 'initial' && <AiThreadInitial dark={dark} />}
        {state === 'done' && <AiThreadDone dark={dark} />}
        {state === 'clarify' && <AiThreadClarify dark={dark} />}
        {state === 'building' && <AiThreadBuilding dark={dark} />}
      </div>
      <PromptInput
        tone={dark ? 'dark' : 'light'}
        value={state === 'building' ? 'Track OEE and first-pass yield for Line 3 this week' : ''}
        suggestions={state === 'done' ? null : ['Defect Pareto', 'Yield by shift', 'Downtime today']}
      />
    </div>
  );
}

function AiThreadInitial({ dark }) {
  const boxBg = dark ? 'rgba(241,238,236,0.06)' : 'var(--az-cream)';
  const boxBorder = dark ? 'rgba(241,238,236,0.14)' : 'var(--border-subtle)';
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <AiSay dark={dark}>Hi Marta — I'm connected to your Manufacturing Analytics database. Tell me what you'd like to track and I'll build the widgets.</AiSay>
      <div style={{ marginLeft: 36, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Eyebrow style={{ marginBottom: 2, color: dark ? '#A89790' : 'var(--fg-3)' }}>Try</Eyebrow>
        {[
          { icon: 'gauge', t: 'OEE & yield for Line 3 this week' },
          { icon: 'chart-bar', t: 'Defect Pareto by station this month' },
          { icon: 'graduation-cap', t: 'Where are our training gaps?' },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid ' + boxBorder, background: boxBg, cursor: 'pointer' }}>
            <i className={`ph-light ph-${s.icon}`} style={{ fontSize: 17, color: 'var(--az-red)' }}></i>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: dark ? 'var(--az-cream)' : 'var(--fg-1)', fontWeight: 500 }}>{s.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AiThreadDone({ dark }) {
  const [collapsed, setCollapsed] = useStateAi(true);
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <UserBubble>Track OEE and first-pass yield for Line 3 this week, and flag where we're scrapping the most.</UserBubble>
      <ProgressSteps collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} steps={[
        { label: 'Understanding your request', detail: 'OEE + yield for Line 3, plus scrap drivers · this week', state: 'done' },
        { label: 'Checking available data', detail: '6 matching sources in Quality & Production', state: 'done' },
        { label: 'Choosing the right widgets', detail: 'KPI tiles, OEE trend line, defect bar, scrap donut', state: 'done' },
        { label: 'Building your dashboard', detail: 'Placed 5 widgets', state: 'done' },
      ]} />
      <ResultCard dark={dark} title="Production Overview" widgets={[
        { name: 'First-pass yield', type: 'KPI', icon: 'target' },
        { name: 'OEE', type: 'KPI', icon: 'gauge' },
        { name: 'OEE trend · 7 days', type: 'Line', icon: 'chart-line-up' },
        { name: 'Defects by station', type: 'Bar', icon: 'chart-bar' },
        { name: 'Scrap reasons', type: 'Donut', icon: 'chart-donut' },
      ]} />
    </div>
  );
}

function AiThreadClarify({ dark }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <UserBubble>Make me a dashboard for quality.</UserBubble>
      <ProgressSteps steps={[
        { label: 'Understanding your request', detail: 'Quality dashboard — broad request', state: 'done' },
        { label: 'Checking available data', detail: 'Yield, defects, scrap, audits, FPY by line', state: 'done' },
      ]} />
      <ClarifyCard
        dark={dark}
        question="Quality covers a few things here. Which should I lead with?"
        chips={['First-pass yield', 'Defects & scrap', 'Audit results', 'All of it']}
        footnote="Or tell me a line, time range, or specific metric."
        onPick={() => {}}
      />
    </div>
  );
}

function AiThreadBuilding({ dark }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <UserBubble>Track OEE and first-pass yield for Line 3 this week.</UserBubble>
      <ProgressSteps steps={[
        { label: 'Understanding your request', detail: 'OEE + first-pass yield · Line 3 · this week', state: 'done' },
        { label: 'Checking available data', detail: 'Found OEE, yield, defect & scrap sources', state: 'done' },
        { label: 'Choosing the right widgets', detail: '2 KPI tiles, OEE trend, defect Pareto', state: 'active' },
        { label: 'Building your dashboard', state: 'pending' },
      ]} />
    </div>
  );
}

Object.assign(window, { DASHBOARDS, AppRail, DashListRail, CanvasHeader, DashTabs, AiPanel, AiPanelHeader });

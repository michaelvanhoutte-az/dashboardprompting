// Interactive prompt-driven dashboard builder (Layout C: AI co-pilot).
const { useState: uS, useEffect: uE, useRef: uR, useCallback: uCb } = React;

let _uid = 0;
const uid = () => 'm' + (++_uid) + Date.now().toString(36).slice(-3);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const NAME_ICON = {
  'Production Overview': 'chart-line-up', 'Defects & Scrap': 'shield-warning', 'Training & Skills': 'graduation-cap',
  'Downtime Watch': 'timer', 'Audit Tracker': 'check-square', 'Yield': 'target', 'Operations Overview': 'squares-four',
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#FF4A2E",
  "panelTone": "dark",
  "speed": 1,
  "density": "comfortable"
}/*EDITMODE-END*/;

/* ============================ APP ============================ */
function App() {
  const [dashboards, setDashboards] = uS(seedDashboards);
  const [activeId, setActiveId] = uS('untitled');
  const [threads, setThreads] = uS({});
  const [collapsed, setCollapsed] = uS(false);
  const [fullscreen, setFullscreen] = uS(false);
  const [busy, setBusy] = uS(false);
  const [input, setInput] = uS('');
  const [building, setBuilding] = uS(null);   // { dashId, specs:[] }
  const [dragId, setDragId] = uS(null);
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const active = dashboards.find(d => d.id === activeId) || dashboards[0];
  const stepMs = Math.round(720 / (t.speed || 1));

  /* ---- thread helpers ---- */
  const appendMsg = (dashId, msg) => setThreads(t => ({ ...t, [dashId]: [...(t[dashId] || []), msg] }));
  const patchMsg = (dashId, mid, patch) => setThreads(t => ({ ...t, [dashId]: (t[dashId] || []).map(m => m.id === mid ? { ...m, ...patch } : m) }));
  const setStep = (dashId, mid, idx, state) => setThreads(t => ({ ...t, [dashId]: (t[dashId] || []).map(m => m.id === mid ? { ...m, steps: m.steps.map((s, i) => i === idx ? { ...s, state } : s) } : m) }));

  /* ---- dashboard helpers ---- */
  const setWidgets = (dashId, widgets) => setDashboards(ds => ds.map(d => d.id === dashId ? { ...d, widgets } : d));
  const renameDash = (dashId, name) => setDashboards(ds => ds.map(d => d.id === dashId ? { ...d, name, icon: NAME_ICON[name] || d.icon } : d));
  const togglePin = (dashId) => setDashboards(ds => ds.map(d => d.id === dashId ? { ...d, pinned: !d.pinned } : d));

  /* ---- animation runners ---- */
  async function animateSteps(dashId, mid, n, buildSpecs) {
    for (let i = 0; i < n; i++) {
      setStep(dashId, mid, i, 'active');
      if (buildSpecs && i === n - 1) setBuilding({ dashId, specs: buildSpecs });
      await sleep(stepMs);
      setStep(dashId, mid, i, 'done');
      await sleep(110);
    }
  }

  async function runClarify(dashId, plan) {
    const mid = uid();
    appendMsg(dashId, { id: mid, role: 'steps', steps: plan.preSteps.map(s => ({ ...s, state: 'pending' })), collapsed: false });
    await animateSteps(dashId, mid, plan.preSteps.length, null);
    patchMsg(dashId, mid, { collapsed: true });
    appendMsg(dashId, { id: uid(), role: 'clarify', question: plan.question, chips: plan.chips, footnote: plan.footnote, answered: false });
  }

  async function runBuild(dashId, plan, isEmpty, prevWidgets) {
    const mid = uid();
    appendMsg(dashId, { id: mid, role: 'steps', steps: plan.steps.map(s => ({ ...s, state: 'pending' })), collapsed: false });
    const newCount = isEmpty ? plan.widgets.length : Math.max(0, plan.widgets.length - prevWidgets.length);
    const newSpecs = newCount > 0 ? plan.widgets.slice(plan.widgets.length - newCount) : null;
    await animateSteps(dashId, mid, plan.steps.length, newSpecs);
    setBuilding(null);
    setWidgets(dashId, plan.widgets);
    if (isEmpty && plan.renameIfEmpty) renameDash(dashId, plan.dashboardName);
    patchMsg(dashId, mid, { collapsed: true });
    const finalWidgets = plan.widgets;
    appendMsg(dashId, {
      id: uid(), role: 'result',
      title: isEmpty ? plan.dashboardName : (dashboards.find(d => d.id === dashId) || {}).name,
      widgets: plan.summary || null,
      intro: plan.text || null,
      chips: followupChips(finalWidgets),
    });
  }

  const handleSubmit = uCb(async (text) => {
    const t = (text || '').trim();
    if (!t || busy) return;
    const dashId = activeId;
    const dash = dashboards.find(d => d.id === dashId);
    appendMsg(dashId, { id: uid(), role: 'user', text: t });
    setInput('');
    setBusy(true);
    await sleep(260);
    const isEmpty = dash.widgets.length === 0;
    const plan = isEmpty ? planPrompt(t, { dashboardEmpty: dash.name.startsWith('Untitled') }) : planFollowup(t, dash.widgets);
    if (plan.kind === 'clarify') { await runClarify(dashId, plan); }
    else { await runBuild(dashId, plan, isEmpty, dash.widgets); }
    setBusy(false);
  }, [activeId, dashboards, busy, stepMs]);

  const onClarifyPick = (dashId, mid, chip) => {
    patchMsg(dashId, mid, { answered: true });
    handleSubmit(typeof chip === 'string' ? chip : chip.prompt);
  };

  const newDashboard = () => {
    const id = 'd' + uid();
    setDashboards(ds => [{ id, name: 'Untitled dashboard', icon: 'squares-four', pinned: false, widgets: [] }, ...ds]);
    setActiveId(id);
  };

  const clearThread = () => setThreads(t => ({ ...t, [activeId]: [] }));

  const deleteWidget = (dashId, wId) => setWidgets(dashId, active.widgets.filter(w => w.id !== wId));
  const onReorder = (fromId, toId) => {
    const a = active.widgets.slice();
    const fi = a.findIndex(w => w.id === fromId), ti = a.findIndex(w => w.id === toId);
    if (fi < 0 || ti < 0 || fi === ti) return;
    const [m] = a.splice(fi, 1); a.splice(ti, 0, m);
    setWidgets(active.id, a);
  };

  uE(() => {
    const onKey = (e) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // accent override
  uE(() => { document.documentElement.style.setProperty('--az-red', t.accent); }, [t.accent]);

  const thread = threads[activeId] || [];

  if (fullscreen) {
    return <FullscreenView dash={active} dashboards={dashboards} onExit={() => setFullscreen(false)} onSwitch={setActiveId} building={building && building.dashId === active.id ? building : null} />;
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--bg-page)' }}>
      <AppRail />
      <LeftPanel
        dashboards={dashboards} activeId={activeId} collapsed={collapsed}
        onSelect={setActiveId} onToggle={() => setCollapsed(c => !c)}
        onNew={newDashboard} onPin={togglePin}
      />
      <Canvas
        dash={active} busy={busy} building={building && building.dashId === active.id ? building : null}
        dragId={dragId} setDragId={setDragId} onReorder={onReorder} density={t.density}
        onDeleteWidget={(wid) => deleteWidget(active.id, wid)}
        onPin={() => togglePin(active.id)} onFullscreen={() => setFullscreen(true)}
        onSuggest={handleSubmit}
      />
      <CoPilotPanel
        thread={thread} dashName={active.name} widgetCount={active.widgets.length} tone={t.panelTone}
        busy={busy} input={input} setInput={setInput} onSubmit={handleSubmit}
        onClarifyPick={(mid, chip) => onClarifyPick(activeId, mid, chip)}
        onToggleSteps={(mid) => patchMsg(activeId, mid, { collapsed: !(thread.find(m => m.id === mid) || {}).collapsed })}
        onClearThread={clearThread}
      />
      <TweaksPanel>
        <TweakSection label="Assistant" />
        <TweakRadio label="Panel tone" value={t.panelTone} options={['dark', 'eggplant', 'light']} onChange={(v) => setTweak('panelTone', v)} />
        <TweakSlider label="AI speed" value={t.speed} min={0.5} max={2} step={0.5} unit="×" onChange={(v) => setTweak('speed', v)} />
        <TweakSection label="Canvas" />
        <TweakColor label="Accent" value={t.accent} options={['#FF4A2E', '#B5371E', '#1726EE', '#2FB67C']} onChange={(v) => setTweak('accent', v)} />
        <TweakRadio label="Density" value={t.density} options={['comfortable', 'compact']} onChange={(v) => setTweak('density', v)} />
      </TweaksPanel>
    </div>
  );
}

/* ===================== LEFT PANEL (collapsible) ===================== */
function LeftPanel({ dashboards, activeId, collapsed, onSelect, onToggle, onNew, onPin }) {
  const pinned = dashboards.filter(d => d.pinned);
  const others = dashboards.filter(d => !d.pinned);

  if (collapsed) {
    return (
      <div style={{ width: 58, background: '#fff', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', gap: 6, flexShrink: 0 }}>
        <button title="Expand" onClick={onToggle} style={railIconBtn}><i className="ph-light ph-sidebar-simple" style={{ fontSize: 19, color: 'var(--fg-2)' }}></i></button>
        <button title="New dashboard" onClick={onNew} style={{ ...railIconBtn, background: 'var(--az-soft-red)', color: 'var(--az-dark-red)' }}><i className="ph-light ph-plus" style={{ fontSize: 19 }}></i></button>
        <div style={{ width: 24, height: 1, background: 'var(--border-subtle)', margin: '4px 0' }}></div>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {dashboards.map(d => (
            <button key={d.id} title={d.name} onClick={() => onSelect(d.id)} style={{ ...railIconBtn, position: 'relative', background: d.id === activeId ? 'var(--az-soft-red)' : 'transparent', color: d.id === activeId ? 'var(--az-dark-red)' : 'var(--fg-3)' }}>
              <i className={`ph-light ph-${d.icon}`} style={{ fontSize: 19 }}></i>
              {d.pinned && <span style={{ position: 'absolute', top: 4, right: 4, width: 5, height: 5, borderRadius: '50%', background: 'var(--az-red)' }}></span>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const Row = (d) => (
    <div key={d.id} onClick={() => onSelect(d.id)} className="dash-row" style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, cursor: 'pointer',
      background: d.id === activeId ? 'var(--az-soft-red)' : 'transparent',
    }}>
      <i className={`ph-light ph-${d.icon}`} style={{ fontSize: 17, color: d.id === activeId ? 'var(--az-dark-red)' : 'var(--fg-3)', flexShrink: 0 }}></i>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: d.id === activeId ? 600 : 500, color: d.id === activeId ? 'var(--az-eggplant)' : 'var(--fg-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--fg-4)' }}>{d.widgets.length ? d.widgets.length + ' widgets' : 'Empty'}</div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onPin(d.id); }} className="pin-btn" title={d.pinned ? 'Unpin' : 'Pin'} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 3, opacity: d.pinned ? 1 : 0, transition: 'opacity 120ms' }}>
        <i className={`${d.pinned ? 'ph-fill' : 'ph-light'} ph-push-pin`} style={{ fontSize: 14, color: d.pinned ? 'var(--az-red)' : 'var(--fg-4)' }}></i>
      </button>
    </div>
  );

  return (
    <div style={{ width: 248, background: '#fff', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '15px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, letterSpacing: '-0.015em', color: 'var(--az-eggplant)' }}>Dashboards</div>
        <button title="Collapse" onClick={onToggle} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}><i className="ph-light ph-sidebar-simple" style={{ fontSize: 18, color: 'var(--fg-3)' }}></i></button>
      </div>
      <div style={{ padding: '0 14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--az-mist)', borderRadius: 8, marginBottom: 10 }}>
          <i className="ph-light ph-magnifying-glass" style={{ fontSize: 14, color: 'var(--fg-4)' }}></i>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--fg-4)' }}>Search dashboards…</span>
        </div>
        <button onClick={onNew} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '9px', borderRadius: 9, border: '1px dashed var(--border-accent)', background: 'var(--az-cream)', color: 'var(--az-dark-red)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600 }}>
          <i className="ph-light ph-plus" style={{ fontSize: 15 }}></i>New dashboard
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }}>
        {pinned.length > 0 && <Eyebrow style={{ padding: '6px 8px' }}>Pinned</Eyebrow>}
        {pinned.map(Row)}
        <Eyebrow style={{ padding: '14px 8px 6px' }}>All dashboards · {others.length}</Eyebrow>
        {others.map(Row)}
      </div>
    </div>
  );
}
const railIconBtn = { width: 38, height: 38, borderRadius: 9, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };

/* ===================== CANVAS ===================== */
function Canvas({ dash, busy, building, dragId, setDragId, onReorder, onDeleteWidget, onPin, onFullscreen, onSuggest, density }) {
  const empty = dash.widgets.length === 0 && !building;
  const gap = density === 'compact' ? 10 : 14;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ padding: '15px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-page)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 23, letterSpacing: '-0.02em', color: 'var(--az-eggplant)', margin: 0 }}>{dash.name}</h1>
            <button onClick={onPin} title={dash.pinned ? 'Unpin' : 'Pin'} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2 }}>
              <i className={`${dash.pinned ? 'ph-fill' : 'ph-light'} ph-push-pin`} style={{ fontSize: 15, color: dash.pinned ? 'var(--az-red)' : 'var(--fg-4)' }}></i>
            </button>
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--fg-3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--az-green-strong)' }}></span>
            {busy ? 'Assistant is working…' : dash.widgets.length ? 'Live · auto-refresh 30s' : 'Empty · ask the assistant to build'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={canvasIconBtn} title="Date range"><i className="ph-light ph-calendar-blank" style={{ fontSize: 17, color: 'var(--fg-2)' }}></i></button>
          <button style={canvasIconBtn} title="Share"><i className="ph-light ph-share-network" style={{ fontSize: 17, color: 'var(--fg-2)' }}></i></button>
          <button onClick={onFullscreen} title="Present fullscreen" style={{ ...canvasIconBtn, gap: 7, width: 'auto', padding: '0 13px', color: 'var(--az-eggplant)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600 }}>
            <i className="ph-light ph-arrows-out" style={{ fontSize: 16 }}></i>Fullscreen
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 28px' }}>
        {empty ? <CanvasEmpty onSuggest={onSuggest} /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap, alignContent: 'start' }}>
            {dash.widgets.map(w => (
              <WidgetCard key={w.id} spec={w} dragging={dragId === w.id}
                onDragStart={() => setDragId(w.id)} onDragEnd={() => setDragId(null)}
                onDrop={() => { if (dragId && dragId !== w.id) onReorder(dragId, w.id); setDragId(null); }}
                onDelete={() => onDeleteWidget(w.id)} />
            ))}
            {building && building.specs.map((s, i) => <SkeletonFor key={'sk' + i} spec={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}
const canvasIconBtn = { height: 36, minWidth: 36, borderRadius: 8, border: '1px solid var(--border-subtle)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };

function CanvasEmpty({ onSuggest }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5, backgroundImage: 'radial-gradient(var(--border-subtle) 1px, transparent 1px)', backgroundSize: '22px 22px', maskImage: 'radial-gradient(circle at center, #000, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle at center, #000, transparent 70%)' }}></div>
      <div style={{ position: 'relative', maxWidth: 460 }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, background: 'var(--az-soft-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <img src="assets/logo-icon-red.svg" alt="" style={{ width: 32, height: 32 }} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', color: 'var(--az-eggplant)', margin: '0 0 10px' }}>Build this dashboard with a prompt</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14.5, lineHeight: 1.55, color: 'var(--fg-3)', margin: '0 0 22px' }}>
          Your Manufacturing Analytics database is connected. Describe what you want to track in the assistant on the right — Azumuta assembles the widgets for you.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {['Show OEE and yield for Line 3 this week', 'Defect Pareto by station this month', 'Where are our training gaps?'].map((s, i) => (
            <button key={i} onClick={() => onSuggest(s)} style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, padding: '8px 14px', borderRadius: 999, cursor: 'pointer', background: '#fff', border: '1px solid var(--border-subtle)', color: 'var(--fg-2)', display: 'inline-flex', gap: 6, alignItems: 'center', boxShadow: 'var(--shadow-xs)' }}>
              <i className="ph-light ph-sparkle" style={{ fontSize: 13, color: 'var(--az-red)' }}></i>{s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* One widget card with drag handle + delete */
function WidgetCard({ spec, dragging, onDragStart, onDragEnd, onDrop, onDelete }) {
  const [menu, setMenu] = uS(false);
  const span = spec.span || 1;
  const toolbar = (
    <div className="wdg-tools" style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 2, zIndex: 3 }}>
      <span className="wdg-grip" draggable onDragStart={onDragStart} onDragEnd={onDragEnd} title="Drag to reorder" style={{ cursor: 'grab', width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-4)', background: 'rgba(255,255,255,0.7)' }}>
        <i className="ph-light ph-dots-six" style={{ fontSize: 15 }}></i>
      </span>
      <span onClick={() => onDelete()} title="Remove" style={{ cursor: 'pointer', width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-4)', background: 'rgba(255,255,255,0.7)' }}>
        <i className="ph-light ph-x" style={{ fontSize: 14 }}></i>
      </span>
    </div>
  );

  const outer = {
    gridColumn: `span ${span}`, position: 'relative', minWidth: 0,
    opacity: dragging ? 0.4 : 1, transition: 'opacity 150ms',
  };

  if (spec.type === 'kpi') {
    return (
      <div className="wdg-card wdg-in" style={outer} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        {toolbar}
        <Kpi {...spec} />
      </div>
    );
  }
  return (
    <div className="wdg-card wdg-in" style={{ ...outer, gridRow: spec.tall ? 'span 2' : undefined }} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      {toolbar}
      <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', padding: '16px 18px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: spec.type === 'table' ? 'auto' : 230 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 8, paddingRight: 40 }}>
          <div style={{ minWidth: 0 }}>
            {spec.eyebrow && <Eyebrow style={{ marginBottom: 3 }}>{spec.eyebrow}</Eyebrow>}
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.015em', color: 'var(--az-eggplant)', lineHeight: 1.2 }}>{spec.title}</div>
          </div>
          {spec.badgeText && <Chip variant={spec.badgeVariant || 'neutral'}>{spec.badgeText}</Chip>}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>{renderWidgetBody(spec)}</div>
      </div>
    </div>
  );
}

function SkeletonFor({ spec }) {
  const span = spec.span || 1;
  const isKpi = spec.type === 'kpi';
  return (
    <div style={{ gridColumn: `span ${span}`, height: isKpi ? 116 : 230, background: '#fff', border: '1px dashed var(--border-accent)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, position: 'relative', overflow: 'hidden' }}>
      <div className="az-shimmer" style={{ position: 'absolute', inset: 0 }}></div>
      <span className="az-spin" style={{ width: 15, height: 15, border: '2px solid var(--az-soft-red)', borderTopColor: 'var(--az-red)', borderRadius: '50%' }}></span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--az-dark-red)', fontWeight: 500 }}>Building {spec.label || spec.title}…</span>
    </div>
  );
}

Object.assign(window, { App, LeftPanel, Canvas, WidgetCard });

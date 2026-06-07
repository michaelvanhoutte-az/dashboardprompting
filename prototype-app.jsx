// Interactive prompt-driven dashboard builder (Layout C: AI co-pilot).
const { useState: uS, useEffect: uE, useRef: uR, useCallback: uCb } = React;

let _uid = 0;
const uid = () => 'm' + (++_uid) + Date.now().toString(36).slice(-3);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const CHAT_STEPS = [
  'Understanding your request',
  'Checking available data',
  'Choosing the right widgets',
  'Building your dashboard',
];

async function* streamChat(body) {
  let res;
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    yield { event: 'error', data: { message: 'Could not reach server: ' + err.message } };
    return;
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: 'Server error ' + res.status }));
    yield { event: 'error', data };
    return;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', ev = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (line.startsWith('event: ')) { ev = line.slice(7).trim(); }
      else if (line.startsWith('data: ') && ev) {
        try { yield { event: ev, data: JSON.parse(line.slice(6)) }; } catch (_) {}
        ev = null;
      }
    }
  }
}

const NAME_ICON = {
  'Production Overview': 'chart-line-up', 'Defects & Scrap': 'shield-warning', 'Training & Skills': 'graduation-cap',
  'Downtime Watch': 'timer', 'Audit Tracker': 'check-square', 'Yield': 'target', 'Operations Overview': 'squares-four',
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#FF4A2E",
  "panelTone": "dark",
  "density": "comfortable"
}/*EDITMODE-END*/;

function buildHistory(thread) {
  const result = [];
  for (const m of thread) {
    if (m.role === 'user') result.push({ role: 'user', text: m.text });
    else if (m.role === 'clarify') result.push({ role: 'assistant', text: m.question });
    else if (m.role === 'assistant') result.push({ role: 'assistant', text: m.text });
    else if (m.role === 'result') result.push({ role: 'assistant', text: m.intro || 'Done — widgets added.' });
    // skip: steps, error
  }
  // Merge consecutive same-role entries (can happen when steps are skipped)
  const merged = [];
  for (const m of result) {
    if (merged.length && merged[merged.length - 1].role === m.role) {
      merged[merged.length - 1].text += '\n' + m.text;
    } else {
      merged.push({ ...m });
    }
  }
  return merged.slice(-12); // keep last 12 turns max
}

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
  const [focusedWidget, setFocusedWidget] = uS(null);
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const configLoaded = uR(false);
  const saveTimer = uR(null);

  const active = dashboards.find(d => d.id === activeId) || dashboards[0];

  /* ---- thread helpers ---- */
  const appendMsg = (dashId, msg) => setThreads(t => ({ ...t, [dashId]: [...(t[dashId] || []), msg] }));
  const patchMsg = (dashId, mid, patch) => setThreads(t => ({ ...t, [dashId]: (t[dashId] || []).map(m => m.id === mid ? { ...m, ...patch } : m) }));
  const setStep = (dashId, mid, idx, state) => setThreads(t => ({ ...t, [dashId]: (t[dashId] || []).map(m => m.id === mid ? { ...m, steps: m.steps.map((s, i) => i === idx ? { ...s, state } : s) } : m) }));

  /* ---- dashboard helpers ---- */
  const setWidgets = (dashId, widgets) => setDashboards(ds => ds.map(d => d.id === dashId ? { ...d, widgets } : d));
  const renameDash = (dashId, name) => setDashboards(ds => ds.map(d => d.id === dashId ? { ...d, name, icon: NAME_ICON[name] || d.icon } : d));
  const togglePin = (dashId) => setDashboards(ds => ds.map(d => d.id === dashId ? { ...d, pinned: !d.pinned } : d));

  const handleSubmit = uCb(async (text) => {
    const msg = (text || '').trim();
    if (!msg || busy) return;
    const dashId = activeId;
    const dash = dashboards.find(d => d.id === dashId);
    const currentFocused = focusedWidget; // capture at submission time
    const history = buildHistory(threads[dashId] || []);
    appendMsg(dashId, { id: uid(), role: 'user', text: msg });
    setInput('');
    setBusy(true);

    const stepsMid = uid();
    appendMsg(dashId, {
      id: stepsMid, role: 'steps',
      steps: CHAT_STEPS.map(label => ({ label, state: 'pending', detail: '' })),
      collapsed: false,
    });

    let builtWidgets = [];

    try {
      for await (const { event, data } of streamChat({ prompt: msg, currentWidgets: dash.widgets, focusedWidgetId: currentFocused?.id, history })) {
        if (event === 'step') {
          setThreads(prev => ({
            ...prev,
            [dashId]: (prev[dashId] || []).map(m => m.id === stepsMid
              ? { ...m, steps: m.steps.map((s, i) => i === data.index ? { ...s, state: data.state, detail: data.detail || '' } : s) }
              : m
            ),
          }));
        } else if (event === 'widget') {
          builtWidgets = [...builtWidgets, data.widget];
          setBuilding({ dashId, specs: [data.widget] });
        } else if (event === 'clarify') {
          patchMsg(dashId, stepsMid, { collapsed: true });
          appendMsg(dashId, {
            id: uid(), role: 'clarify',
            question: data.question, chips: data.chips,
            footnote: data.footnote, answered: false,
          });
        } else if (event === 'result') {
          const isEmpty = dash.widgets.length === 0;
          setBuilding(null);
          setWidgets(dashId, data.widgets);
          if (!currentFocused && isEmpty && data.dashboardName && dash.name.startsWith('Untitled')) {
            renameDash(dashId, data.dashboardName);
          }
          patchMsg(dashId, stepsMid, { collapsed: true });
          appendMsg(dashId, {
            id: uid(), role: 'result',
            title: data.dashboardName,
            widgets: [],
            intro: currentFocused ? `Updated "${currentFocused.title}".` : null,
            chips: followupChips(data.widgets),
          });
        } else if (event === 'error') {
          patchMsg(dashId, stepsMid, { collapsed: true });
          appendMsg(dashId, { id: uid(), role: 'error', text: data.message || 'Something went wrong.' });
        }
      }
    } catch (err) {
      patchMsg(dashId, stepsMid, { collapsed: true });
      appendMsg(dashId, { id: uid(), role: 'error', text: err.message });
    }

    setBuilding(null);
    setBusy(false);
  }, [activeId, dashboards, busy, focusedWidget]);

  const onClarifyPick = (dashId, mid, chip) => {
    patchMsg(dashId, mid, { answered: true });
    handleSubmit(typeof chip === 'string' ? chip : chip.prompt);
  };

  const newDashboard = () => {
    const id = 'd' + uid();
    setDashboards(ds => [{ id, name: 'Untitled dashboard', icon: 'squares-four', pinned: false, widgets: [] }, ...ds]);
    setActiveId(id);
  };

  const handleRefine = uCb((wSpec) => {
    setFocusedWidget(wSpec);
    const others = (dashboards.find(d => d.id === activeId)?.widgets.length || 1) - 1;
    appendMsg(activeId, {
      id: uid(), role: 'assistant',
      text: `Refining "${wSpec.title}" — describe the change you want, and I'll leave your other ${others} widget${others !== 1 ? 's' : ''} untouched.`,
    });
  }, [activeId, dashboards]);

  const deleteWidget = (dashId, wId) => {
    if (focusedWidget && focusedWidget.id === wId) setFocusedWidget(null);
    setWidgets(dashId, active.widgets.filter(w => w.id !== wId));
  };
  const updateWidget = (dashId, widget) => {
    setDashboards(ds => ds.map(d => d.id === dashId
      ? { ...d, widgets: d.widgets.map(w => w.id === widget.id ? widget : w) }
      : d
    ));
  };
  const onReorder = (fromId, toId) => {
    const a = active.widgets.slice();
    const fi = a.findIndex(w => w.id === fromId), ti = a.findIndex(w => w.id === toId);
    if (fi < 0 || ti < 0 || fi === ti) return;
    const [m] = a.splice(fi, 1); a.splice(ti, 0, m);
    setWidgets(active.id, a);
  };

  // Load saved config on mount, then enable auto-save
  uE(() => {
    fetch('/api/config')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.dashboards) setDashboards(d.dashboards); })
      .catch(() => {})
      .finally(() => { configLoaded.current = true; });
  }, []);

  // Auto-save dashboards to config file (debounced, only after initial load)
  uE(() => {
    if (!configLoaded.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dashboards }) }).catch(() => {});
    }, 600);
  }, [dashboards]);

  // Clear focused widget when switching dashboards
  uE(() => { setFocusedWidget(null); }, [activeId]);

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
        onUpdateWidget={(widget) => updateWidget(active.id, widget)}
        onPin={() => togglePin(active.id)} onFullscreen={() => setFullscreen(true)}
        onSuggest={handleSubmit} onRefineWidget={handleRefine}
      />
      <CoPilotPanel
        thread={thread} dashName={active.name} widgetCount={active.widgets.length} tone={t.panelTone}
        busy={busy} input={input} setInput={setInput} onSubmit={handleSubmit}
        onClarifyPick={(mid, chip) => onClarifyPick(activeId, mid, chip)}
        onToggleSteps={(mid) => patchMsg(activeId, mid, { collapsed: !(thread.find(m => m.id === mid) || {}).collapsed })}
        focusedWidget={focusedWidget} onExitFocus={() => setFocusedWidget(null)}
      />
      <TweaksPanel>
        <TweakSection label="Assistant" />
        <TweakRadio label="Panel tone" value={t.panelTone} options={['dark', 'eggplant', 'light']} onChange={(v) => setTweak('panelTone', v)} />
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
function Canvas({ dash, busy, building, dragId, setDragId, onReorder, onDeleteWidget, onUpdateWidget, onPin, onFullscreen, onSuggest, density, onRefineWidget }) {
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
                onDelete={() => onDeleteWidget(w.id)}
                onUpdate={onUpdateWidget}
                onRefine={onRefineWidget} />
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

/* One widget card with drag handle + refine + delete */
function WidgetCard({ spec, dragging, onDragStart, onDragEnd, onDrop, onDelete, onRefine, onUpdate }) {
  const [sqlOpen, setSqlOpen] = uS(false);
  const [editSql, setEditSql] = uS('');
  const [saving, setSaving] = uS(false);
  const [saveError, setSaveError] = uS(null);
  const span = spec.span || 1;

  const openSql = () => { setEditSql(spec.sql || ''); setSaveError(null); setSqlOpen(true); };
  const closeSql = () => { setSqlOpen(false); setSaveError(null); };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: editSql, spec }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Query failed');
      onUpdate(data.widget);
      closeSql();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const sqlPanel = sqlOpen && (
    <div style={{ marginTop: 10, padding: '12px', background: 'var(--az-mist)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
      <textarea
        value={editSql}
        onChange={e => setEditSql(e.target.value)}
        spellCheck={false}
        rows={4}
        style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.6, color: 'var(--az-eggplant)', background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '8px 10px', resize: 'vertical', outline: 'none' }}
      />
      {saveError && <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--az-dark-red)', marginTop: 6 }}>{saveError}</div>}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}>
        <button onClick={closeSql} disabled={saving} style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: '#fff', color: 'var(--fg-2)', cursor: 'pointer' }}>Cancel</button>
        <button onClick={handleSave} disabled={saving || !editSql.trim()} style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 6, border: 'none', background: saving ? 'var(--az-mist)' : 'var(--az-eggplant)', color: saving ? 'var(--fg-3)' : '#fff', cursor: saving ? 'default' : 'pointer' }}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  );

  const toolBtn = (onClick, title, icon, active) => (
    <span onClick={onClick} title={title} style={{ cursor: 'pointer', width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? 'var(--az-dark-red)' : 'var(--fg-4)', background: active ? 'var(--az-soft-red)' : 'rgba(255,255,255,0.7)' }}>
      <i className={`ph-light ph-${icon}`} style={{ fontSize: 14 }}></i>
    </span>
  );

  const toolbar = (
    <div className="wdg-tools" style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 2, zIndex: 3 }}>
      <span className="wdg-grip" draggable onDragStart={onDragStart} onDragEnd={onDragEnd} title="Drag to reorder" style={{ cursor: 'grab', width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-4)', background: 'rgba(255,255,255,0.7)' }}>
        <i className="ph-light ph-dots-six" style={{ fontSize: 15 }}></i>
      </span>
      {onRefine && toolBtn(() => onRefine(spec), 'Refine this widget', 'magic-wand', false)}
      {spec.sql != null && toolBtn(sqlOpen ? closeSql : openSql, 'Edit SQL', 'code', sqlOpen)}
      {toolBtn(() => onDelete(), 'Remove', 'x', false)}
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
        {sqlPanel}
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
        {sqlPanel && <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>{sqlPanel}</div>}
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

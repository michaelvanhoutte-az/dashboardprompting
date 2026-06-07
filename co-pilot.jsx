// Dark AI co-pilot panel + controlled input dock + fullscreen present mode.
const { useState: uSc, useEffect: uEc, useRef: uRc } = React;

const TONES = {
  dark:     { bg: 'var(--az-eggplant-dark)', headBorder: 'rgba(241,238,236,0.1)', title: 'var(--az-cream)', sub: '#C9BFBA', eye: '#A89790', dark: true },
  eggplant: { bg: 'var(--az-eggplant)', headBorder: 'rgba(241,238,236,0.16)', title: 'var(--az-cream)', sub: '#C9BFBA', eye: '#C9BFBA', dark: true },
  light:    { bg: '#fff', headBorder: 'var(--border-subtle)', title: 'var(--az-eggplant)', sub: 'var(--fg-3)', eye: 'var(--fg-3)', dark: false },
};

function CoPilotPanel({ thread, dashName, widgetCount, busy, input, setInput, onSubmit, onClarifyPick, onToggleSteps, tone = 'dark', onClearThread }) {
  const T = TONES[tone] || TONES.dark;
  const scrollRef = uRc(null);
  uEc(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [thread, busy]);

  return (
    <div style={{ width: 386, background: T.bg, display: 'flex', flexDirection: 'column', flexShrink: 0, borderLeft: '1px solid ' + (T.dark ? 'rgba(0,0,0,0.2)' : 'var(--border-subtle)') }}>
      {/* header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid ' + T.headBorder, display: 'flex', flexDirection: 'column', gap: 11, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AiAvatar size={30} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em', color: T.title }}>Dashboard Assistant</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: T.sub }}>Builds widgets from your prompts</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {thread.length > 0 && !busy && (
              <button
                onClick={onClearThread}
                title="Clear conversation"
                style={{ border: 'none', background: T.dark ? 'rgba(241,238,236,0.1)' : 'var(--az-mist)', cursor: 'pointer', padding: '5px 10px', borderRadius: 7, display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <i className="ph-light ph-eraser" style={{ fontSize: 14, color: T.sub }}></i>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, color: T.sub }}>Clear</span>
              </button>
            )}
            <i className="ph-light ph-dots-three-vertical" style={{ fontSize: 18, color: T.sub, cursor: 'pointer' }}></i>
          </div>
        </div>
        <DataSourceBadge tone={T.dark ? 'dark' : 'light'} />
      </div>

      {/* thread */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 6px' }}>
        {thread.length === 0 && <Greeting widgetCount={widgetCount} dashName={dashName} onSubmit={onSubmit} dark={T.dark} eye={T.eye} />}
        {thread.map((m) => {
          if (m.role === 'user') return <UserBubble key={m.id}>{m.text}</UserBubble>;
          if (m.role === 'steps') return <ProgressSteps key={m.id} steps={m.steps} collapsed={m.collapsed} onToggle={() => onToggleSteps(m.id)} />;
          if (m.role === 'clarify') return <ClarifyCard key={m.id} dark={T.dark} question={m.question} chips={m.chips} footnote={m.footnote} answered={m.answered} onPick={(c) => onClarifyPick(m.id, c)} />;
          if (m.role === 'result') return <ResultCard key={m.id} dark={T.dark} title={m.title} widgets={m.widgets || []} intro={m.intro} chips={m.chips} onChip={(c) => onSubmit(c)} />;
          if (m.role === 'assistant') return <AiSay key={m.id} dark={T.dark}>{m.text}</AiSay>;
          return null;
        })}
      </div>

      <InputDock value={input} setValue={setInput} onSubmit={onSubmit} busy={busy} hasThread={thread.length > 0} tone={T} />
    </div>
  );
}

function Greeting({ widgetCount, dashName, onSubmit, dark = true, eye = '#A89790' }) {
  const suggestions = widgetCount > 0
    ? [{ icon: 'plus-circle', t: 'Add a scrap breakdown' }, { icon: 'target', t: 'Add a target line' }, { icon: 'arrows-split', t: 'Split the trend by shift' }]
    : [{ icon: 'gauge', t: 'OEE & yield for Line 3 this week' }, { icon: 'chart-bar', t: 'Defect Pareto by station this month' }, { icon: 'graduation-cap', t: 'Where are our training gaps?' }];
  const boxBg = dark ? 'rgba(241,238,236,0.06)' : 'var(--az-cream)';
  const boxBorder = dark ? 'rgba(241,238,236,0.14)' : 'var(--border-subtle)';
  const txt = dark ? 'var(--az-cream)' : 'var(--fg-1)';
  return (
    <div>
      <AiSay dark={dark}>
        {widgetCount > 0
          ? <>This dashboard has <b style={{ color: dark ? 'var(--az-soft-red)' : 'var(--az-dark-red)' }}>{widgetCount} widgets</b>. Ask me to add, change, or remove anything.</>
          : <>Hi Marta — I'm connected to your Manufacturing Analytics database. Tell me what you'd like to track and I'll build the widgets.</>}
      </AiSay>
      <div style={{ marginLeft: 36, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Eyebrow style={{ marginBottom: 2, color: eye }}>Try</Eyebrow>
        {suggestions.map((s, i) => (
          <div key={i} onClick={() => onSubmit(s.t)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid ' + boxBorder, background: boxBg, cursor: 'pointer' }}>
            <i className={`ph-light ph-${s.icon}`} style={{ fontSize: 17, color: 'var(--az-red)' }}></i>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: txt, fontWeight: 500 }}>{s.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InputDock({ value, setValue, onSubmit, busy, hasThread, tone }) {
  const T = tone || { dark: true, headBorder: 'rgba(241,238,236,0.1)' };
  const taRef = uRc(null);
  uEc(() => { const ta = taRef.current; if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; } }, [value]);
  const submit = () => { if (value.trim() && !busy) onSubmit(value); };
  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } };
  return (
    <div style={{ padding: '12px 16px 16px', borderTop: '1px solid ' + T.headBorder, flexShrink: 0 }}>
      <div style={{ background: '#fff', border: T.dark ? 'none' : '1px solid var(--border-subtle)', borderRadius: 14, padding: '10px 12px', boxShadow: T.dark ? '0 4px 14px rgba(0,0,0,0.18)' : 'var(--shadow-sm)', opacity: busy ? 0.7 : 1 }}>
        <textarea ref={taRef} value={value} disabled={busy} onChange={(e) => setValue(e.target.value)} onKeyDown={onKey}
          rows={1} placeholder={busy ? 'Working…' : hasThread ? 'Ask a follow-up, or describe a new widget…' : 'Describe a dashboard or widget…'}
          style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontFamily: 'var(--font-body)', fontSize: 13.5, lineHeight: 1.5, color: 'var(--fg-1)', background: 'transparent', minHeight: 20, maxHeight: 120 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <i className="ph-light ph-database" style={{ fontSize: 16, color: 'var(--fg-4)' }}></i>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--fg-4)' }}>Manufacturing Analytics</span>
          </div>
          <button onClick={submit} disabled={busy || !value.trim()} style={{ width: 32, height: 32, borderRadius: 9, border: 'none', background: value.trim() && !busy ? 'var(--az-red)' : 'var(--az-mist)', color: value.trim() && !busy ? '#fff' : 'var(--fg-4)', cursor: value.trim() && !busy ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {busy ? <span className="az-spin" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff', borderRadius: '50%' }}></span> : <i className="ph-light ph-arrow-up" style={{ fontSize: 16 }}></i>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== FULLSCREEN / PRESENT MODE ===================== */
function FullscreenView({ dash, dashboards, onExit, onSwitch, building }) {
  const [menu, setMenu] = uSc(false);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-page)', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
      <div style={{ padding: '14px 28px', borderBottom: '1px solid var(--border-subtle)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="assets/logo-icon-red.svg" alt="" style={{ width: 26, height: 26 }} />
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenu(m => !m)} style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'transparent', cursor: 'pointer' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', color: 'var(--az-eggplant)' }}>{dash.name}</span>
              <i className="ph-light ph-caret-down" style={{ fontSize: 15, color: 'var(--fg-3)' }}></i>
            </button>
            {menu && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 8, background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', padding: 6, minWidth: 240, zIndex: 10 }}>
                {dashboards.filter(d => d.widgets.length).map(d => (
                  <button key={d.id} onClick={() => { onSwitch(d.id); setMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', border: 'none', background: d.id === dash.id ? 'var(--az-soft-red)' : 'transparent', cursor: 'pointer', padding: '9px 11px', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 500, color: d.id === dash.id ? 'var(--az-eggplant)' : 'var(--fg-1)' }}>
                    <i className={`ph-light ph-${d.icon}`} style={{ fontSize: 16, color: d.id === dash.id ? 'var(--az-dark-red)' : 'var(--fg-3)' }}></i>{d.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--az-green-strong)' }}></span>Live
          </span>
        </div>
        <button onClick={onExit} style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid var(--border-subtle)', background: '#fff', cursor: 'pointer', padding: '8px 14px', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--az-eggplant)' }}>
          <i className="ph-light ph-arrows-in" style={{ fontSize: 16 }}></i>Exit fullscreen <span style={{ color: 'var(--fg-4)', fontWeight: 400 }}>Esc</span>
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 40px 40px' }}>
        <div style={{ maxWidth: 1500, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, alignContent: 'start' }}>
          {dash.widgets.map(w => <FullscreenWidget key={w.id} spec={w} />)}
        </div>
      </div>
    </div>
  );
}

function FullscreenWidget({ spec }) {
  const span = spec.type === 'kpi' ? 1 : (spec.type === 'table' && spec.span === 4) ? 6 : 3;
  if (spec.type === 'kpi') return <div style={{ gridColumn: 'span 1' }}><Kpi {...spec} /></div>;
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', padding: '18px 20px', display: 'flex', flexDirection: 'column', minHeight: spec.type === 'table' ? 'auto' : 250 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 8 }}>
          <div>
            {spec.eyebrow && <Eyebrow style={{ marginBottom: 3 }}>{spec.eyebrow}</Eyebrow>}
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.015em', color: 'var(--az-eggplant)' }}>{spec.title}</div>
          </div>
          {spec.badgeText && <Chip variant={spec.badgeVariant || 'neutral'}>{spec.badgeText}</Chip>}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{renderWidgetBody(spec)}</div>
      </div>
    </div>
  );
}

Object.assign(window, { CoPilotPanel, InputDock, FullscreenView, FullscreenWidget });

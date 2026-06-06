// AI assistant panel pieces — flow states for the prompt-driven builder.
const { useState: useStateAi } = React;

const AZ_BRAND = 'assets/logo-icon-red.svg';

/* Brandmark avatar for assistant turns */
function AiAvatar({ size = 26, pulse }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 8, background: 'var(--az-soft-red)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      boxShadow: pulse ? '0 0 0 0 rgba(255,74,46,0.5)' : 'none',
      animation: pulse ? 'azpulse 1.6s infinite' : 'none',
    }}>
      <img src={AZ_BRAND} alt="" style={{ width: size * 0.62, height: size * 0.62 }} />
    </div>
  );
}

/* A user prompt bubble (right aligned) */
function UserBubble({ children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
      <div style={{
        maxWidth: '84%', background: 'var(--az-eggplant)', color: 'var(--az-cream)',
        padding: '10px 14px', borderRadius: '14px 14px 4px 14px',
        fontFamily: 'var(--font-body)', fontSize: 13.5, lineHeight: 1.5,
      }}>{children}</div>
    </div>
  );
}

/* Assistant text line */
function AiSay({ children, avatar = true, dark }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
      {avatar ? <AiAvatar /> : <div style={{ width: 26, flexShrink: 0 }}></div>}
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, lineHeight: 1.55, color: dark ? 'var(--az-cream)' : 'var(--fg-2)', paddingTop: 3 }}>{children}</div>
    </div>
  );
}

/* Live progress steps — collapses to a summary when done */
function ProgressSteps({ steps, collapsed, onToggle }) {
  const allDone = steps.every(s => s.state === 'done');
  if (collapsed && allDone) {
    return (
      <div onClick={onToggle} style={{
        display: 'flex', gap: 10, marginBottom: 14, cursor: 'pointer',
      }}>
        <AiAvatar />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'var(--az-cream)', border: '1px solid var(--border-subtle)', borderRadius: 10, fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--fg-3)' }}>
          <i className="ph-light ph-check-circle" style={{ fontSize: 15, color: 'var(--az-green-strong)' }}></i>
          <span>Completed {steps.length} steps</span>
          <i className="ph-light ph-caret-down" style={{ fontSize: 13 }}></i>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
      <AiAvatar pulse={!allDone} />
      <div style={{ flex: 1, background: 'var(--az-cream)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', opacity: s.state === 'pending' ? 0.45 : 1 }}>
            <div style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {s.state === 'done' && <i className="ph-light ph-check-circle" style={{ fontSize: 16, color: 'var(--az-green-strong)' }}></i>}
              {s.state === 'active' && <span className="az-spin" style={{ width: 13, height: 13, border: '2px solid var(--az-soft-red)', borderTopColor: 'var(--az-red)', borderRadius: '50%' }}></span>}
              {s.state === 'pending' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--fg-4)' }}></span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: s.state === 'active' ? 600 : 500, color: s.state === 'active' ? 'var(--az-eggplant)' : 'var(--fg-2)' }}>{s.label}</div>
              {s.detail && s.state !== 'pending' && (
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--fg-3)', marginTop: 2, lineHeight: 1.45 }}>{s.detail}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Clarifying question with quick-pick chips. chips: [{label, prompt}] or [string] */
function ClarifyCard({ question, chips, footnote, onPick, dark, answered }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
      <AiAvatar />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, lineHeight: 1.55, color: dark ? 'var(--az-cream)' : 'var(--fg-2)', marginBottom: 10 }}>{question}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, opacity: answered ? 0.5 : 1, pointerEvents: answered ? 'none' : 'auto' }}>
          {chips.map((c, i) => {
            const label = typeof c === 'string' ? c : c.label;
            return (
              <button key={i} onClick={() => onPick && onPick(c)} style={{
                fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: 500,
                padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                background: '#fff', border: '1px solid var(--border-accent)', color: 'var(--az-dark-red)',
                transition: 'all 140ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--az-soft-red)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}>{label}</button>
            );
          })}
        </div>
        {footnote && !answered && <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: dark ? 'rgba(241,238,236,0.6)' : 'var(--fg-4)', marginTop: 9 }}>{footnote}</div>}
      </div>
    </div>
  );
}

/* Result summary card listing widgets that were added */
function ResultCard({ title, widgets, chips, onChip, dark, intro }) {
  const boldColor = dark ? 'var(--az-soft-red)' : 'var(--az-eggplant)';
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
      <AiAvatar />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, lineHeight: 1.55, color: dark ? 'var(--az-cream)' : 'var(--fg-2)', marginBottom: 10 }}>
          {intro || <>Done — I added <b style={{ color: boldColor }}>{widgets.length} widgets</b> to <b style={{ color: boldColor }}>{title}</b>.</>}
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
          {widgets.map((w, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderTop: i ? '1px solid var(--border-subtle)' : 'none' }}>
              <i className={`ph-light ph-${w.icon}`} style={{ fontSize: 16, color: 'var(--az-red)' }}></i>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--fg-1)', fontWeight: 500, flex: 1 }}>{w.name}</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--fg-4)' }}>{w.type}</span>
            </div>
          ))}
        </div>
        {chips && chips.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {chips.map((c, i) => (
              <button key={i} onClick={() => onChip && onChip(c)} style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500, padding: '5px 11px', borderRadius: 999, cursor: 'pointer', background: '#fff', border: '1px solid var(--border-subtle)', color: 'var(--fg-2)' }}>{c}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* Prompt input dock */
function PromptInput({ placeholder = 'Describe a dashboard or widget…', value = '', suggestions, tone = 'light' }) {
  return (
    <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--border-subtle)', background: tone === 'light' ? '#fff' : 'transparent' }}>
      {suggestions && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {suggestions.map((s, i) => (
            <button key={i} style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500, padding: '5px 10px', borderRadius: 999, cursor: 'pointer', background: 'var(--az-cream)', border: '1px solid var(--border-subtle)', color: 'var(--fg-2)', display: 'inline-flex', gap: 5, alignItems: 'center' }}>
              <i className="ph-light ph-sparkle" style={{ fontSize: 12, color: 'var(--az-red)' }}></i>{s}
            </button>
          ))}
        </div>
      )}
      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '10px 12px', background: '#fff', boxShadow: 'var(--shadow-xs)' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: value ? 'var(--fg-1)' : 'var(--fg-4)', minHeight: 20, lineHeight: 1.5 }}>
          {value || placeholder}{value && <span className="az-caret">|</span>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <i className="ph-light ph-paperclip" style={{ fontSize: 17, color: 'var(--fg-4)', cursor: 'pointer' }}></i>
            <i className="ph-light ph-database" style={{ fontSize: 17, color: 'var(--fg-4)', cursor: 'pointer' }}></i>
          </div>
          <button style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: value ? 'var(--az-red)' : 'var(--az-mist)', color: value ? '#fff' : 'var(--fg-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ph-light ph-arrow-up" style={{ fontSize: 16 }}></i>
          </button>
        </div>
      </div>
    </div>
  );
}

/* Data-source connection status row (top of panel) */
function DataSourceBadge({ tone = 'light' }) {
  const dark = tone === 'dark';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 11px', borderRadius: 8, background: dark ? 'rgba(241,238,236,0.1)' : 'var(--status-success-bg)', alignSelf: 'flex-start' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--az-green-strong)' }}></span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500, color: dark ? 'var(--az-cream)' : '#0A5952' }}>Connected · Manufacturing Analytics DB</span>
    </div>
  );
}

Object.assign(window, { AiAvatar, UserBubble, AiSay, ProgressSteps, ClarifyCard, ResultCard, PromptInput, DataSourceBadge });

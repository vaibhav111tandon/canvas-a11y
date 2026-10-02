import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { cases } from './cases/index.js';
import { detectCapabilities, API_REFERENCE } from './core/capabilities.js';
import { createSession } from './core/runner.js';
import './styles.css';
const caps = detectCapabilities();
const initialId = new URLSearchParams(location.hash.slice(1)).get('case') || 'geometry-sync';
const Badge = ({ status = 'NOT RUN' }) => (
  <span className={`badge ${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span>
);
function App() {
  const [view, setView] = useState('Tests'),
    [selected, setSelected] = useState(cases.find((c) => c.id === initialId) || cases[12]),
    [category, setCategory] = useState('All tests'),
    [query, setQuery] = useState(''),
    [results, setResults] = useState({}),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState('Diagnostics'),
    [clicks, setClicks] = useState(0),
    [message, setMessage] = useState(''),
    [notes, setNotes] = useState(''),
    [controls, setControls] = useState({ x: 170, y: 106, angle: 0, scale: 1, sync: true });
  const host = useRef(),
    session = useRef(),
    stop = useRef(false),
    running = useRef(false);
  const displayedTest = view === 'Playground' ? cases[12] : selected;
  const result = results[selected.id];
  const evidenceRef = useRef(results);
  evidenceRef.current = results;
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: 'read_canvas_a11y_results',
            description:
              'Read the current Canvas A11y session results and detected browser capabilities. Does not run tests.',
            inputSchema: { type: 'object', properties: {}, additionalProperties: false },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute(input) {
              if (
                !input ||
                typeof input !== 'object' ||
                Array.isArray(input) ||
                Object.keys(input).length
              )
                throw new Error('Expected an empty object.');
              return {
                schemaVersion: 1,
                capabilities: caps,
                results: Object.values(evidenceRef.current),
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {
      // Optional WebMCP registration must not prevent the browser UI from loading.
    }
    return () => lifecycle.abort();
  }, []);
  const categories = [
    'All tests',
    'Geometry',
    'Semantics',
    'Focus',
    'Keyboard',
    'Transforms',
    'ARIA',
  ];
  const filtered = cases.filter(
    (c) =>
      (category === 'All tests' || c.category === category) &&
      `${c.title} ${c.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  useEffect(() => {
    if (!host.current || view === 'Browser Support' || view === 'Results') return;
    session.current = createSession(host.current, view === 'Playground' ? cases[12] : selected, {
      ...(view === 'Playground' ? controls : {}),
      onActivation: setClicks,
    });
    setClicks(0);
    setNotes('');
    return () => session.current?.dispose();
  }, [selected, view, controls]);
  useEffect(() => {
    const handler = () => {
      const id = new URLSearchParams(location.hash.slice(1)).get('case');
      const item = cases.find((c) => c.id === id);
      if (item && !running.current) {
        setSelected(item);
        setView('Tests');
      }
    };
    addEventListener('hashchange', handler);
    return () => removeEventListener('hashchange', handler);
  }, []);
  function choose(test) {
    if (busy) return;
    setSelected(test);
    setView('Tests');
    history.replaceState(null, '', `#case=${test.id}`);
  }
  async function run(all = false) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    stop.current = false;
    setMessage('Running native checks…');
    try {
      if (all) {
        setResults({});
        for (const test of cases) {
          if (stop.current) break;
          session.current?.dispose();
          const s = createSession(host.current, test);
          session.current = s;
          const r = await s.run();
          setResults((prev) => ({ ...prev, [test.id]: r }));
        }
        session.current?.dispose();
        session.current = createSession(host.current, selected, { onActivation: setClicks });
      } else {
        session.current?.dispose();
        session.current = createSession(
          host.current,
          view === 'Playground' ? cases[12] : selected,
          { ...(view === 'Playground' ? controls : {}), onActivation: setClicks },
        );
        const r = await session.current.run();
        setResults((prev) => ({
          ...prev,
          [view === 'Playground' ? 'playground' : selected.id]: r,
        }));
      }
      setMessage(
        stop.current ? 'Run stopped.' : 'Run complete. Inspect diagnostic evidence below.',
      );
    } catch (e) {
      setMessage(`Runner error: ${e.message}`);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  function exportJSON() {
    const data = {
      schemaVersion: 1,
      suiteVersion: '0.1.0',
      exportedAt: new Date().toISOString(),
      source: location.href,
      capabilities: caps,
      results: Object.values(results),
      limitations: [
        'DOM bounds are not accessibility-tree bounds.',
        'Manual observations are user-reported, not automated.',
        'Raster bounds are alpha extents of controlled fixtures, not a general segmentation algorithm.',
      ],
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canvas-a11y-report.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('JSON report downloaded.');
  }
  const activeResult = view === 'Playground' ? results.playground : result;
  const suiteResults = Object.entries(results)
    .filter(([id]) => id !== 'playground')
    .map(([, r]) => r);
  const counts = (s) => suiteResults.filter((r) => r.status === s).length;
  const manual = (status) => {
    if (view === 'Playground') {
      setMessage('Select a test case to record a manual observation.');
      return;
    }
    if (!notes.trim()) {
      setMessage('Add an observation and browser/assistive-technology details first.');
      return;
    }
    setResults((prev) => ({
      ...prev,
      [selected.id]: {
        ...(prev[selected.id] || {
          id: selected.id,
          title: selected.title,
          status: 'UNSUPPORTED',
          reason: 'Automated checks not run.',
          capabilities: caps,
        }),
        manualObservation: { status, notes, timestamp: new Date().toISOString() },
      },
    }));
    setMessage('Manual observation recorded separately from automated results.');
  };
  return (
    <>
      <a href="#main" className="skip">
        Skip to test workspace
      </a>
      <header>
        <a className="brand" href="#case=geometry-sync" onClick={() => choose(cases[12])}>
          <span className="brand-icon">⊡</span>Canvas A11y
          <span className="version">v0.1 / experimental</span>
        </a>
        <a className="external" href={API_REFERENCE} target="_blank" rel="noreferrer">
          API explainer ↗
        </a>
      </header>
      <nav className="top-nav" aria-label="Main navigation">
        {['Tests', 'Playground', 'Browser Support', 'Results'].map((v) => (
          <button
            key={v}
            disabled={busy}
            className={view === v ? 'current' : ''}
            onClick={() => setView(v)}
          >
            {v}
            {v === 'Tests' && <small>{cases.length}</small>}
          </button>
        ))}
        <span className="nav-note">HTML-IN-CANVAS LABORATORY</span>
      </nav>
      <div className="app-layout">
        <aside>
          <div className="sidebar-title">TEST COLLECTION</div>
          <label className="search">
            <span>⌕</span>
            <input
              aria-label="Search test cases"
              placeholder="Find a test…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="categories">
            {categories.map((c) => (
              <button
                disabled={busy}
                key={c}
                className={category === c ? 'active' : ''}
                onClick={() => {
                  setCategory(c);
                  setView('Tests');
                }}
              >
                <span>{c}</span>
                <span>
                  {c === 'All tests' ? cases.length : cases.filter((t) => t.category === c).length}
                </span>
              </button>
            ))}
          </div>
          <div className="case-list">
            {filtered.map((c) => (
              <button
                disabled={busy}
                key={c.id}
                className={selected.id === c.id ? 'selected' : ''}
                onClick={() => choose(c)}
              >
                <span className={`case-dot ${(results[c.id]?.status || '').toLowerCase()}`} />
                <span>{c.title}</span>
                <small>{String(cases.indexOf(c) + 1).padStart(2, '0')}</small>
              </button>
            ))}
            {!filtered.length && <p>No matching tests.</p>}
          </div>
          <div className="sidebar-footer">
            <span className="tiny-cross">+</span>
            <div>
              Open source. Open questions.
              <br />
              <a href={API_REFERENCE}>Built for an evolving platform ↗</a>
            </div>
          </div>
        </aside>
        <main id="main">
          <div className={`capability-banner ${caps.supported ? 'available' : ''}`}>
            <span className="banner-icon">{caps.supported ? '◉' : 'ⓘ'}</span>
            <div>
              <strong>
                {caps.supported
                  ? 'Experimental API detected'
                  : 'This browser needs experimental API support'}
              </strong>
              <p>
                {caps.supported
                  ? `${caps.generation} generation · Actual test execution verifies drawing support.`
                  : 'You can explore every test. Native checks will report UNSUPPORTED until the API is enabled.'}
              </p>
            </div>
            <button disabled={busy} onClick={() => setView('Browser Support')}>
              Setup instructions
            </button>
          </div>
          {view === 'Browser Support' ? (
            <section className="support">
              <div className="eyebrow">ENVIRONMENT / CAPABILITIES</div>
              <h1>Know what you’re testing.</h1>
              <p>
                Feature detection is local to this browser. It is not a claim about every version of
                this browser.
              </p>
              <div className="support-grid">
                <article className="panel">
                  <h2>Enable the experiment</h2>
                  <ol>
                    <li>Install a recent Chrome Canary build.</li>
                    <li>
                      Open <code>chrome://flags/#canvas-draw-element</code> and enable it.
                    </li>
                    <li>
                      Also enable{' '}
                      <code>chrome://flags/#enable-experimental-web-platform-features</code> if the
                      current explainer requires it.
                    </li>
                    <li>Relaunch and reload this page.</li>
                  </ol>
                  <p>
                    For Origin Trials, register your exact deployment origin and add the issued
                    token as an <code>origin-trial</code> meta tag or response header. Check current
                    dates and milestone eligibility; a token for another domain will not work.
                  </p>
                  <a
                    href="https://developer.chrome.com/blog/html-in-canvas-origin-trial"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Chrome Origin Trial instructions ↗
                  </a>
                </article>
                <article className="panel">
                  <h2>Detected capabilities</h2>
                  {Object.entries(caps)
                    .filter(([, v]) => typeof v === 'boolean')
                    .map(([k, v]) => (
                      <div className="cap-row" key={k}>
                        <code>{k}</code>
                        <Badge status={v ? 'PASS' : 'UNSUPPORTED'} />
                      </div>
                    ))}
                  <p>
                    API generation: <code>{caps.generation}</code>
                  </p>
                </article>
              </div>
              <article className="panel">
                <h2>The API is changing</h2>
                <p>
                  The current WICG explainer describes <code>content="drawable"</code>,{' '}
                  <code>drawable</code>, and automatic geometry updates. The earlier Chrome trial
                  uses <code>layoutsubtree</code> and a returned matrix applied to CSS. The runner
                  selects an adapter using detected capabilities.
                </p>
                <p>
                  Neither API generation is treated as production-ready. Unsupported or unrecognized
                  shapes are reported explicitly. No screenshot polyfill is used.
                </p>
                <a href={API_REFERENCE}>Living explainer ↗</a> ·{' '}
                <a href="https://github.com/whatwg/html/pull/11588">Specification proposal ↗</a>
                <pre>{caps.userAgent}</pre>
              </article>
            </section>
          ) : view === 'Results' ? (
            <section>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">SESSION / RESULTS</div>
                  <h1>Evidence, not assumptions.</h1>
                </div>
                <button onClick={exportJSON}>Export JSON ↓</button>
              </div>
              <Summary counts={counts} total={suiteResults.length} />
              {!Object.keys(results).length ? (
                <div className="panel empty">
                  <h2>No tests run yet</h2>
                  <p>Run a case or the full collection to collect browser evidence.</p>
                  <button onClick={() => setView('Tests')}>Open test runner</button>
                </div>
              ) : (
                <div className="results-list">
                  {Object.values(results).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => choose(cases.find((c) => c.id === r.id) || cases[12])}
                    >
                      <div>
                        <strong>{r.title}</strong>
                        <p>{r.reason}</p>
                        {r.manualObservation && (
                          <small>Manual observation: {r.manualObservation.status}</small>
                        )}
                      </div>
                      <Badge status={r.status} />
                    </button>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {view === 'Playground'
                      ? 'INTERACTIVE / PLAYGROUND'
                      : `${selected.category.toUpperCase()} / TEST ${String(cases.indexOf(selected) + 1).padStart(2, '0')}`}
                  </div>
                  <h1>
                    {view === 'Playground' ? 'Move the pixels. Follow the DOM.' : selected.title}
                  </h1>
                  <p>
                    {view === 'Playground'
                      ? 'Change the draw transform and inspect the measured geometry.'
                      : selected.description}
                  </p>
                </div>
                <div className="heading-actions">
                  <button disabled={busy} className="primary" onClick={() => run(false)}>
                    ▶ {busy ? 'Running…' : view === 'Playground' ? 'Measure' : 'Run test'}
                  </button>
                  {view === 'Tests' && (
                    <button disabled={busy} onClick={() => run(true)}>
                      Run all {cases.length}
                    </button>
                  )}
                  {busy && (
                    <button
                      onClick={() => {
                        stop.current = true;
                      }}
                    >
                      Stop after current test
                    </button>
                  )}
                </div>
              </div>
              <div className="workspace-meta">
                <span>
                  <span className="live-dot" /> LIVE FIXTURE
                </span>
                <code>{view === 'Playground' ? 'playground' : selected.id}</code>
                <Badge status={activeResult?.status} />
              </div>
              <div className="lab-grid">
                <section className="canvas-panel">
                  <div className="panel-label">
                    <span>Visual canvas</span>
                    <span>560 × 280 backing px</span>
                  </div>
                  <div className="canvas-stage" ref={host} />
                  <div className="canvas-footer">
                    <span>Native drawElementImage()</span>
                    <span>Activations: {clicks}</span>
                    <button
                      disabled={!caps.supported || busy}
                      onClick={() => session.current?.focus()}
                    >
                      Focus control
                    </button>
                  </div>
                </section>
                <section className="geometry-panel">
                  <div className="panel-label">
                    Geometry inspector<span className="tag">CSS PX</span>
                  </div>
                  <Bounds
                    title="Canvas raster bounds"
                    values={activeResult?.geometry?.visual}
                    color="visual"
                  />
                  <Bounds
                    title="DOM border-box bounds"
                    values={activeResult?.geometry?.dom}
                    color="semantic"
                  />
                  <div className="difference">
                    <span>Maximum difference</span>
                    <strong>
                      {activeResult?.geometry?.comparison?.maxDelta != null
                        ? `${activeResult.geometry.comparison.maxDelta.toFixed(2)} px`
                        : '—'}
                    </strong>
                    <span>Tolerance ≤ 2 CSS px</span>
                  </div>
                  <p className="measurement-note">
                    Real alpha-pixel extents vs. getBoundingClientRect(). DOM geometry is a proxy,
                    not an accessibility-tree measurement.
                  </p>
                </section>
              </div>
              {view === 'Playground' && (
                <section className="panel playground-controls">
                  {[
                    ['x', 0, 350, 1],
                    ['y', 0, 190, 1],
                    ['angle', -45, 45, 1],
                    ['scale', 0.5, 1.8, 0.1],
                  ].map(([key, min, max, step]) => (
                    <label key={key}>
                      {key}
                      <output>{controls[key]}</output>
                      <input
                        disabled={busy}
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        aria-label={key}
                        value={controls[key]}
                        onChange={(e) => {
                          setControls({ ...controls, [key]: Number(e.target.value) });
                          setResults((prev) => {
                            const next = { ...prev };
                            delete next.playground;
                            return next;
                          });
                        }}
                      />
                    </label>
                  ))}
                  <label className="sync-control">
                    <input
                      disabled={busy}
                      type="checkbox"
                      checked={controls.sync}
                      onChange={(e) => {
                        setControls({ ...controls, sync: e.target.checked });
                        setResults((prev) => {
                          const next = { ...prev };
                          delete next.playground;
                          return next;
                        });
                      }}
                    />{' '}
                    Synchronize geometry
                  </label>
                  <p>
                    Turn synchronization off to introduce deliberate semantic drift. This is a
                    diagnostic negative control, not a browser defect.
                  </p>
                </section>
              )}
              <div className="detail-tabs" role="tablist" aria-label="Test details">
                {['Diagnostics', 'Test definition', 'Manual verification'].map((t) => (
                  <button
                    role="tab"
                    id={`detail-${t.replaceAll(' ', '-')}`}
                    aria-controls="detail-panel"
                    tabIndex={tab === t ? 0 : -1}
                    onKeyDown={(e) => {
                      const names = ['Diagnostics', 'Test definition', 'Manual verification'];
                      let index = names.indexOf(t);
                      if (e.key === 'ArrowRight') index = (index + 1) % 3;
                      else if (e.key === 'ArrowLeft') index = (index + 2) % 3;
                      else if (e.key === 'Home') index = 0;
                      else if (e.key === 'End') index = 2;
                      else return;
                      e.preventDefault();
                      setTab(names[index]);
                      document
                        .getElementById(`detail-${names[index].replaceAll(' ', '-')}`)
                        ?.focus();
                    }}
                    aria-selected={tab === t}
                    key={t}
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </button>
                ))}
                <button className="export" onClick={exportJSON}>
                  Export JSON ↓
                </button>
              </div>
              <section
                className="details"
                id="detail-panel"
                role="tabpanel"
                aria-labelledby={`detail-${tab.replaceAll(' ', '-')}`}
                tabIndex={0}
              >
                {tab === 'Diagnostics' ? (
                  <>
                    {activeResult ? (
                      <>
                        <div className="result-line">
                          <Badge status={activeResult.status} />
                          <strong>{activeResult.reason}</strong>
                        </div>
                        {activeResult.checks.map((c, i) => (
                          <div className="check-row" key={i}>
                            <span>{c.name}</span>
                            <Badge status={c.status} />
                          </div>
                        ))}
                        {activeResult.manualRequired && (
                          <p className="manual-note">
                            Manual verification still required: {activeResult.manualRequired}
                          </p>
                        )}
                        <details>
                          <summary>Raw diagnostic evidence</summary>
                          <pre>{JSON.stringify(activeResult, null, 2)}</pre>
                        </details>
                      </>
                    ) : (
                      <div className="waiting">
                        <span>◎</span>
                        <div>
                          <strong>Ready when your browser is.</strong>
                          <p>
                            Run this test to collect raster bounds, DOM checks and API diagnostics.
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="evidence-note">
                      <strong>What a PASS means</strong>
                      <p>
                        Only the listed assertions passed in this browser session. It does not
                        certify WCAG compliance or assistive-technology support.
                      </p>
                    </div>
                  </>
                ) : tab === 'Test definition' ? (
                  <>
                    <h3>Expected behavior</h3>
                    <p>{displayedTest.expected}</p>
                    <pre>{JSON.stringify(displayedTest, null, 2)}</pre>
                    <a href={displayedTest.reference}>Relevant API information ↗</a>
                    <p>
                      Permanent case reference:{' '}
                      <a href={`#case=${selected.id}`}>#case={selected.id}</a>
                    </p>
                  </>
                ) : (
                  <>
                    <h3>Human verification</h3>
                    <p>
                      {displayedTest.manual ||
                        'Inspect the focus indicator, hit target, and accessibility-tree bounds using browser developer tools. Record anything the automated checks miss.'}
                    </p>
                    <p>
                      Use a screen reader or DevTools on this live fixture. Record browser version,
                      operating system, assistive technology and the observed behavior.
                    </p>
                    <label className="notes-label">
                      Observation
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Chrome version / OS / screen reader version / observed behavior…"
                      />
                    </label>
                    <div className="manual-actions">
                      <button disabled={!caps.supported || busy} onClick={() => manual('PASS')}>
                        Record manual pass
                      </button>
                      <button disabled={!caps.supported || busy} onClick={() => manual('FAIL')}>
                        Record manual failure
                      </button>
                    </div>
                    {result?.manualObservation && (
                      <p>
                        Saved observation: {result.manualObservation.status} —{' '}
                        {result.manualObservation.notes}
                      </p>
                    )}
                  </>
                )}
              </section>
              <Summary counts={counts} total={suiteResults.length} />
            </>
          )}
          <footer>
            <span>
              Canvas A11y <span> / </span> Experimental platform testing
            </span>
            <span>No uploads. Reports stay in this session.</span>
          </footer>
          <div role="status" className="status-message">
            {message}
          </div>
        </main>
      </div>
    </>
  );
}
function Bounds({ title, values, color }) {
  return (
    <div className="bounds">
      <h3>
        <span className={`legend ${color}`} />
        {title}
      </h3>
      <div>
        {['x', 'y', 'width', 'height'].map((k) => (
          <span key={k}>
            <small>{k}</small>
            <code>{values ? values[k].toFixed(1) : '—'}</code>
          </span>
        ))}
      </div>
    </div>
  );
}
function Summary({ counts, total }) {
  return (
    <div className="summary">
      <span>
        SESSION RESULTS{' '}
        <strong>
          {total} / {cases.length}
        </strong>
      </span>
      <span>
        <i className="pass-dot" />
        {counts('PASS')} passed
      </span>
      <span>
        <i className="fail-dot" />
        {counts('FAIL')} failed
      </span>
      <span>
        <i />
        {counts('UNSUPPORTED')} unsupported / manual
      </span>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);

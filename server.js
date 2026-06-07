const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getSchema, query } = require('./lib/db');
const { chat } = require('./lib/claude');
const { transformWidget } = require('./lib/transform');

const configPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
  console.error('ERROR: config.json not found. Copy config.example.json to config.json and fill in your values.');
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const DB_URL = config.database.connectionString;
const DB_SCHEMA = config.database.schema || 'public';
const API_KEY = config.claude.apiKey;
const PORT = (config.server && config.server.port) || 3000;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

let cachedSchema = null;

async function loadSchema() {
  try {
    cachedSchema = await getSchema(DB_URL, DB_SCHEMA);
    console.log(`Schema loaded: ${cachedSchema.tables.length} tables from schema "${DB_SCHEMA}"`);
  } catch (err) {
    console.warn('Could not load schema on startup:', err.message);
  }
}

function sse(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

app.get('/api/debug-schema', async (req, res) => {
  try {
    const pool = require('pg').Pool ? null : null; // just use db directly
    const { Pool } = require('pg');
    const p = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    const { rows } = await p.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        AND table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `);
    await p.end();
    res.json({ tables: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/schema', async (req, res) => {
  try {
    if (!cachedSchema) cachedSchema = await getSchema(DB_URL, DB_SCHEMA);
    const slim = {
      tables: cachedSchema.tables.map(t => ({ name: t.name, columns: t.columns })),
    };
    res.json(slim);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const CONFIG_PATH = path.join(__dirname, 'dashboards.json');

app.get('/api/config', (req, res) => {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return res.status(404).json({ error: 'no config' });
    res.json(JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config', (req, res) => {
  try {
    const { dashboards } = req.body || {};
    if (!dashboards) return res.status(400).json({ error: 'dashboards required' });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ dashboards }, null, 2));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  const { prompt, currentWidgets, focusedWidgetId, history } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const STEPS = [
    { label: 'Understanding your request', detail: '' },
    { label: 'Checking available data', detail: '' },
    { label: 'Choosing the right widgets', detail: '' },
    { label: 'Building your dashboard', detail: '' },
  ];

  function step(idx, state, detail) {
    sse(res, 'step', { index: idx, state, label: STEPS[idx].label, detail: detail || '' });
  }

  try {
    step(0, 'active', '');
    if (!cachedSchema) cachedSchema = await getSchema(DB_URL, DB_SCHEMA);
    step(0, 'done', `Found ${cachedSchema.tables.length} tables`);

    step(1, 'active', '');
    const tableNames = cachedSchema.tables.map(t => t.name).join(', ');
    step(1, 'done', `Using: ${tableNames.slice(0, 80)}${tableNames.length > 80 ? '…' : ''}`);

    step(2, 'active', '');
    const focusedWidget = focusedWidgetId && currentWidgets
      ? (currentWidgets.find(w => w.id === focusedWidgetId) || null)
      : null;
    const plan = await chat({ prompt, schema: cachedSchema, currentWidgets, focusedWidget, apiKey: API_KEY, history });
    step(2, 'done', plan.kind === 'clarify' ? 'Need clarification' : `${plan.widgets.length} widgets selected`);

    if (plan.kind === 'clarify') {
      sse(res, 'clarify', {
        preSteps: plan.preSteps || [],
        question: plan.question,
        chips: plan.chips || [],
        footnote: plan.footnote || '',
      });
      res.end();
      return;
    }

    step(3, 'active', '');
    const builtWidgets = [];
    for (const spec of plan.widgets) {
      try {
        const rows = await query(DB_URL, spec.sql, DB_SCHEMA);
        const widget = transformWidget(spec, rows);
        builtWidgets.push(widget);
        sse(res, 'widget', { widget });
      } catch (err) {
        console.error(`Widget query failed [${spec.title}]:`, err.message);
        sse(res, 'widget_error', { title: spec.title, error: err.message });
      }
    }
    step(3, 'done', `${builtWidgets.length} widgets ready`);

    // If refining a single widget, merge it back in-place (preserving original ID and order)
    let finalWidgets = builtWidgets;
    if (focusedWidget && builtWidgets.length > 0 && currentWidgets) {
      const refined = { ...builtWidgets[0], id: focusedWidget.id };
      finalWidgets = currentWidgets.map(w => w.id === focusedWidget.id ? refined : w);
    }

    sse(res, 'result', {
      dashboardName: plan.dashboardName || 'New Dashboard',
      widgets: finalWidgets,
    });
  } catch (err) {
    console.error('Chat error:', err);
    sse(res, 'error', { message: err.message });
  }

  res.end();
});

loadSchema().then(() => {
  app.listen(PORT, () => {
    console.log(`Azumuta Dashboard Builder → http://localhost:${PORT}`);
  });
});

const Anthropic = require('@anthropic-ai/sdk');

function formatSchema(schema) {
  return schema.tables.map(t => {
    const cols = t.columns
      .map(c => `  - ${c.name}: ${c.type || c.data_type}${c.nullable ? '' : ' NOT NULL'}`)
      .join('\n');

    let sample = '';
    if (t.sampleRows && t.sampleRows.length > 0) {
      const keys = Object.keys(t.sampleRows[0]);
      const rows = t.sampleRows.slice(0, 2)
        .map(r => '    ' + keys.map(k => `${k}=${JSON.stringify(r[k])}`).join(', '))
        .join('\n');
      sample = `\n  Sample rows:\n${rows}`;
    }

    return `Table: ${t.name}\n${cols}${sample}`;
  }).join('\n\n');
}

const SYSTEM_TEMPLATE = `You are a dashboard assistant for Azumuta, a connected-worker manufacturing platform. \
You create widget plans from natural language prompts using a real PostgreSQL database.

## Available widget types

**kpi** (span: 1) — Single metric tile
  SQL returns ONE row. Required column: \`value\`. Optional: \`previous_value\` (shows delta).
  Example: SELECT COUNT(*) AS value FROM production_records WHERE date = CURRENT_DATE

**bar** (span: 2) — Bar/column chart
  SQL returns rows with \`label\` (text) and \`value\` (number). ORDER BY value DESC, LIMIT 8.
  Example: SELECT station AS label, COUNT(*) AS value FROM defects GROUP BY station ORDER BY value DESC LIMIT 8

**line** (span: 2) — Line/trend chart
  SQL returns rows with \`label\` (time label text) and \`value\` (number), ordered chronologically.
  Example: SELECT TO_CHAR(date, 'Dy') AS label, AVG(oee) AS value FROM oee_daily GROUP BY date ORDER BY date

**donut** (span: 2) — Donut/pie chart
  SQL returns rows with \`label\` (text) and \`value\` (number). LIMIT 6.
  Example: SELECT reason AS label, COUNT(*) AS value FROM scrap GROUP BY reason ORDER BY value DESC LIMIT 6

**table** (span: 4 for wide, 2 for narrow) — Data table
  SQL can return any columns. Column names become headers. LIMIT 10.
  Example: SELECT created_at AS time, audit_name, line, result FROM audits ORDER BY created_at DESC LIMIT 10

**heatmap** (span: 2) — Grid completion/rate matrix
  SQL returns rows with \`row_label\`, \`col_label\`, and \`value\` (float 0.0–1.0).
  Example: SELECT line AS row_label, skill AS col_label, completion_rate AS value FROM skill_matrix

## Database schema

{SCHEMA}

## Response format — JSON only, no other text

For a **clear request**, respond with:
{
  "kind": "build",
  "dashboardName": "Concise Name",
  "widgets": [
    {
      "type": "kpi|bar|line|donut|table|heatmap",
      "title": "Widget title",
      "eyebrow": "Category label (e.g. Production, Quality, Skills)",
      "span": 1,
      "icon": "phosphor-icon-name",
      "sql": "SELECT ...",
      "unit": "optional unit for KPI (%, units, min, etc.)"
    }
  ]
}

For an **ambiguous or too-broad request**, respond with:
{
  "kind": "clarify",
  "preSteps": [
    { "label": "Understanding your request", "detail": "Brief interpretation" },
    { "label": "Checking available data", "detail": "What tables were relevant" }
  ],
  "question": "Specific clarifying question",
  "chips": ["Option A", "Option B", "Option C"],
  "footnote": "Or describe a specific metric or time range."
}

## Rules
- Use ONLY table and column names that exist in the schema above
- Write safe, read-only SELECT statements only — absolutely no INSERT, UPDATE, DELETE, DROP, TRUNCATE
- Use standard PostgreSQL syntax: CURRENT_DATE, date_trunc(), TO_CHAR(), INTERVAL, etc.
- Keep queries simple (at most 3 table joins)
- Always alias result columns to match the expected names (\`label\`, \`value\`, etc.)
- For time-series: order by date/time ascending
- For bar/donut: order by value descending with a reasonable LIMIT
- Choose icons from Phosphor Light: gauge, chart-line-up, chart-bar, chart-donut, target, shield-check, graduation-cap, timer, warning, package, calendar-blank, table, grid-four, users, trending-up, trending-down, factory, wrench, clipboard-text`;

async function chat({ prompt, schema, currentWidgets, focusedWidget, apiKey, history }) {
  const client = new Anthropic({ apiKey });
  const systemPrompt = SYSTEM_TEMPLATE.replace('{SCHEMA}', formatSchema(schema));

  let userContent = prompt;
  if (focusedWidget) {
    const spec = {
      type: focusedWidget.type,
      title: focusedWidget.title,
      eyebrow: focusedWidget.eyebrow || '',
      span: focusedWidget.span,
      sql: focusedWidget.sql || null,
      unit: focusedWidget.unit || null,
    };
    const others = (currentWidgets || [])
      .filter(w => w.id !== focusedWidget.id)
      .map(w => `- ${w.title} (${w.type})`)
      .join('\n') || '(none)';
    userContent = `You are refining ONE specific widget. Return a "build" response with ONLY that one updated widget in the "widgets" array — do NOT include any other widgets.

Current widget spec:
${JSON.stringify(spec, null, 2)}

Other widgets on the dashboard (context only — do NOT return them):
${others}

User's requested change: ${prompt}`;
  } else if (currentWidgets && currentWidgets.length > 0) {
    const existing = currentWidgets
      .map(w => w.title || w.label)
      .filter(Boolean)
      .join(', ');
    userContent = `The dashboard currently shows: ${existing}.\n\nUser request: ${prompt}`;
  }

  // Build multi-turn messages: prior history turns + current prompt
  const messages = [];
  if (history && history.length > 0) {
    for (const h of history) {
      messages.push({ role: h.role, content: h.text });
    }
  }
  messages.push({ role: 'user', content: userContent });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
  });

  const text = response.content[0].text.trim();
  // Extract JSON, tolerating markdown code fences
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/) || text.match(/(\{[\s\S]+\})/);
  if (!jsonMatch) throw new Error(`Unexpected Claude response: ${text.slice(0, 200)}`);

  return JSON.parse(jsonMatch[1]);
}

module.exports = { chat, formatSchema };

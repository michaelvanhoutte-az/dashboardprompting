const { Pool } = require('pg');

const pools = {};

function getPool(connectionString) {
  if (!pools[connectionString]) {
    pools[connectionString] = new Pool({ connectionString, max: 5 });
  }
  return pools[connectionString];
}

async function getSchema(connectionString) {
  const pool = getPool(connectionString);

  const { rows: tables } = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const result = { tables: [] };

  for (const { table_name } of tables) {
    const { rows: cols } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [table_name]);

    let sampleRows = [];
    try {
      const { rows } = await pool.query(`SELECT * FROM "${table_name}" LIMIT 3`);
      sampleRows = rows;
    } catch (_) {}

    result.tables.push({
      name: table_name,
      columns: cols.map(c => ({
        name: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable === 'YES',
      })),
      sampleRows,
    });
  }

  return result;
}

async function query(connectionString, sql) {
  // Safety: only allow SELECT / WITH statements
  const normalized = sql.trim().toLowerCase();
  if (!/^(select|with)\b/.test(normalized)) {
    throw new Error('Only SELECT queries are allowed');
  }
  const pool = getPool(connectionString);
  const { rows } = await pool.query(sql);
  return rows;
}

module.exports = { getSchema, query };

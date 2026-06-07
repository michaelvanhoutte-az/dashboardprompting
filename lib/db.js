const { Pool } = require('pg');

const pools = {};

function getPool(connectionString, schema) {
  const key = connectionString + '|' + (schema || '');
  if (!pools[key]) {
    const pool = new Pool({ connectionString, max: 5, ssl: { rejectUnauthorized: false } });
    if (schema) {
      // Set search_path on every new connection so unqualified table names resolve correctly
      pool.on('connect', client => {
        client.query(`SET search_path TO "${schema}", public`);
      });
    }
    pools[key] = pool;
  }
  return pools[key];
}

async function getSchema(connectionString, schema = 'public') {
  const pool = getPool(connectionString, schema);

  const { rows: tables } = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = $1 AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `, [schema]);

  const result = { tables: [] };

  for (const { table_name } of tables) {
    const { rows: cols } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `, [schema, table_name]);

    let sampleRows = [];
    try {
      const { rows } = await pool.query(`SELECT * FROM "${schema}"."${table_name}" LIMIT 3`);
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

async function query(connectionString, sql, schema) {
  const normalized = sql.trim().toLowerCase();
  if (!/^(select|with)\b/.test(normalized)) {
    throw new Error('Only SELECT queries are allowed');
  }
  const pool = getPool(connectionString, schema);
  const { rows } = await pool.query(sql);
  return rows;
}

module.exports = { getSchema, query };

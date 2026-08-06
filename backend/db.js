import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'control_impresiones',
  password: process.env.DB_PASSWORD || '1234',
  port: Number(process.env.DB_PORT || 5432),
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10
});

pool.on('error', (err) => {
  console.error('Error en el pool de PostgreSQL:', err.message);
});

export async function testConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1 AS ok');
  } finally {
    client.release();
  }
}

export default pool;

import pool from './db.js';
import bcrypt from 'bcrypt';

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'operario',
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS impresoras (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    modelo VARCHAR(255),
    ubicacion VARCHAR(255) NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'activa'
        CHECK (estado IN ('activa', 'inactiva', 'mantenimiento')),
    contador_actual INTEGER NOT NULL DEFAULT 0 CHECK (contador_actual >= 0),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS suministros (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('toner', 'papel', 'otro')),
    cantidad INTEGER NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
    stock_minimo INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    stock_maximo INTEGER CHECK (stock_maximo IS NULL OR stock_maximo >= 0),
    codigo VARCHAR(100) NOT NULL UNIQUE,
    fecha_ingreso DATE NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_stock_maximo CHECK (stock_maximo IS NULL OR stock_maximo >= stock_minimo)
  )`,
  `CREATE TABLE IF NOT EXISTS movimientos_suministros (
    id SERIAL PRIMARY KEY,
    suministro_id INTEGER NOT NULL REFERENCES suministros(id) ON DELETE CASCADE,
    tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('entrada', 'salida')),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    observacion TEXT,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS mantenimientos (
    id SERIAL PRIMARY KEY,
    impresora_id INTEGER NOT NULL REFERENCES impresoras(id) ON DELETE CASCADE,
    tecnico VARCHAR(255) NOT NULL,
    fecha DATE NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'en proceso', 'finalizado')),
    descripcion TEXT NOT NULL,
    solucion TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS registros_diarios (
    id SERIAL PRIMARY KEY,
    impresora_id INTEGER NOT NULL REFERENCES impresoras(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    contador_diario INTEGER NOT NULL DEFAULT 0 CHECK (contador_diario >= 0),
    recarga_papel INTEGER NOT NULL DEFAULT 0 CHECK (recarga_papel >= 0),
    cambio_toner BOOLEAN NOT NULL DEFAULT FALSE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (impresora_id, fecha)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_movimientos_suministro ON movimientos_suministros(suministro_id)`,
  `CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_suministros(fecha)`,
  `CREATE INDEX IF NOT EXISTS idx_registros_fecha ON registros_diarios(fecha)`,
  `CREATE INDEX IF NOT EXISTS idx_mantenimientos_estado ON mantenimientos(estado)`,
  `CREATE TABLE IF NOT EXISTS alertas (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('suministro', 'impresora', 'mantenimiento', 'sistema')),
    gravedad VARCHAR(20) NOT NULL DEFAULT 'medio' CHECK (gravedad IN ('crítico', 'alto', 'medio', 'bajo')),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    referencia_id INTEGER,
    activa BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS auditoria (
    id BIGSERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    accion VARCHAR(80) NOT NULL,
    modulo VARCHAR(80) NOT NULL,
    detalle JSONB NOT NULL DEFAULT '{}'::jsonb,
    direccion_ip VARCHAR(64),
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_alertas_activa ON alertas(activa)`,
  `CREATE INDEX IF NOT EXISTS idx_alertas_gravedad ON alertas(gravedad)`,
  `CREATE INDEX IF NOT EXISTS idx_alertas_fecha ON alertas(fecha_creacion)`,
  `CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id)`
];

export async function initializeDatabase() {
  await pool.query('SELECT 1');

  for (const sql of STATEMENTS) {
    try {
      await pool.query(sql);
    } catch (error) {
      if (error.code === '42710' || error.code === '42P07') continue;
      if (sql.includes('ALTER TABLE usuarios') && ['42804', '0A000'].includes(error.code)) continue;
      throw error;
    }
  }

  const adminExists = await pool.query('SELECT id FROM usuarios WHERE usuario = $1', ['admin']);
  if (adminExists.rows.length === 0) {
    await pool.query(
      'INSERT INTO usuarios (nombre, usuario, password, rol) VALUES ($1, $2, $3, $4)',
      ['Administrador', 'admin', await bcrypt.hash('admin123', 12), 'administrador']
    );
    console.log('Usuario admin creado (admin / admin123).');
  } else {
    await pool.query(
      "UPDATE usuarios SET rol = 'administrador' WHERE usuario = 'admin' AND rol IN ('Admin', 'admin')"
    );
  }

  const tablas = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1::text[]) ORDER BY tablename",
    [['usuarios', 'impresoras', 'suministros', 'movimientos_suministros', 'mantenimientos', 'registros_diarios', 'alertas', 'auditoria']]
  );
  console.log('Tablas SICIS listas:', tablas.rows.map(r => r.tablename).join(', '));
}

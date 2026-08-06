import pool from './db.js';

async function migrarBaseDeDatos() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🔄 Iniciando migración unificada de base de datos...');

    // 1. Asegurar que la columna password existe (no renombrar a contrasena)
    try {
      await client.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'usuarios' AND column_name = 'password'
            ) THEN
                -- Si existe contrasena, renombrarla a password
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'usuarios' AND column_name = 'contrasena'
                ) THEN
                    ALTER TABLE usuarios RENAME COLUMN contrasena TO password;
                ELSE
                    ALTER TABLE usuarios ADD COLUMN password VARCHAR(255);
                END IF;
            END IF;
        END $$
      `);
      console.log('  ✓ Columna password verificada/asegurada');
    } catch (err) {
      console.log('  ℹ️  No se pudo asegurar columna password:', err.message);
    }

    // 3. Agregar columna proveedor a suministros
    try {
      await client.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'suministros' AND column_name = 'proveedor'
            ) THEN
                ALTER TABLE suministros ADD COLUMN proveedor VARCHAR(100);
            END IF;
        END $$
      `);
      console.log('  ✓ Columna proveedor en suministros verificada/agregada');
    } catch (err) {
      console.log('  ℹ️  No se pudo agregar proveedor a suministros');
    }

    // 4. Agregar columna proveedor a movimientos_suministros
    try {
      await client.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'movimientos_suministros' AND column_name = 'proveedor'
            ) THEN
                ALTER TABLE movimientos_suministros ADD COLUMN proveedor VARCHAR(100);
            END IF;
        END $$
      `);
      console.log('  ✓ Columna proveedor en movimientos_suministros verificada/agregada');
    } catch (err) {
      console.log('  ℹ️  No se pudo agregar proveedor a movimientos_suministros');
    }

    // 5. Agregar columna tecnico_recarga a registros_diarios
    try {
      await client.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'registros_diarios' AND column_name = 'tecnico_recarga'
            ) THEN
                ALTER TABLE registros_diarios ADD COLUMN tecnico_recarga VARCHAR(100);
            END IF;
        END $$
      `);
      console.log('  ✓ Columna tecnico_recarga en registros_diarios verificada/agregada');
    } catch (err) {
      console.log('  ℹ️  No se pudo agregar tecnico_recarga a registros_diarios');
    }

    // 6. Actualizar constraint de tipo en suministros
    try {
      await client.query('ALTER TABLE suministros DROP CONSTRAINT IF EXISTS suministros_tipo_check');
      await client.query("ALTER TABLE suministros ADD CONSTRAINT suministros_tipo_check CHECK (tipo IN ('toner','papel','tinta','otro'))");
      console.log('  ✓ Constraint tipo en suministros actualizado');
    } catch (err) {
      console.log('  ℹ️  No se pudo actualizar constraint tipo (puede que ya exista)');
    }

    // 7. Actualizar constraint de rol en usuarios
    try {
      await client.query('ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check');
      await client.query("ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('administrador','supervisor','operario','tecnico'))");
      console.log('  ✓ Constraint rol en usuarios actualizado');
    } catch (err) {
      console.log('  ℹ️  No se pudo actualizar constraint rol (puede que ya exista)');
    }

    // 8. Agregar columnas específicas para alertas
    const columnasAlertas = [
      { nombre: 'nombre', tipo: 'VARCHAR(255)' },
      { nombre: 'codigo', tipo: 'VARCHAR(50)' },
      { nombre: 'cantidad', tipo: 'INTEGER' },
      { nombre: 'stock_minimo', tipo: 'INTEGER' },
      { nombre: 'porcentaje_stock', tipo: 'INTEGER' }
    ];

    for (const col of columnasAlertas) {
      try {
        await client.query(`
          DO $$
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'alertas' AND column_name = '${col.nombre}'
              ) THEN
                  ALTER TABLE alertas ADD COLUMN ${col.nombre} ${col.tipo};
              END IF;
          END $$
        `);
        console.log(`  ✓ Columna ${col.nombre} en alertas verificada/agregada`);
      } catch (err) {
        console.log(`  ℹ️  No se pudo agregar columna ${col.nombre} en alertas`);
      }
    }

    // Bitácora inmutable de acciones críticas.
    await client.query(`
      CREATE TABLE IF NOT EXISTS auditoria (
        id BIGSERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        accion VARCHAR(80) NOT NULL,
        modulo VARCHAR(80) NOT NULL,
        detalle JSONB NOT NULL DEFAULT '{}'::jsonb,
        direccion_ip VARCHAR(64),
        fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id)');

    await client.query('COMMIT');

    console.log('\n✅ Migración unificada completada exitosamente');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error durante la migración:', error.message);
    console.error('Detalle:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrarBaseDeDatos();

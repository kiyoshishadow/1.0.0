import pool from './db.js';

const DATOS_PRUEBA = {
  usuarios: [
    { nombre: 'Carlos Supervisor', usuario: 'carlos', password: 'carlos123', rol: 'supervisor', activo: true },
    { nombre: 'Maria Operario', usuario: 'maria', password: 'maria123', rol: 'operario', activo: true },
    { nombre: 'Juan Tecnico', usuario: 'juan', password: 'juan123', rol: 'tecnico', activo: true },
    { nombre: 'Laura Operario2', usuario: 'laura', password: 'laura123', rol: 'operario', activo: true }
  ],
  impresoras: [
    { nombre: 'Impresora Recepción', modelo: 'HP LaserJet Pro M404dn', ubicacion: 'Área de Recepción - Piso 1', estado: 'activa', contador_actual: 15420 },
    { nombre: 'Impresora Administración', modelo: 'Canon imageCLASS MF244dw', ubicacion: 'Oficina Administrativa - Piso 2', estado: 'activa', contador_actual: 8930 },
    { nombre: 'Impresora Sala Juntas', modelo: 'Brother HL-L3210CW', ubicacion: 'Sala de Juntas - Piso 3', estado: 'activa', contador_actual: 12450 },
    { nombre: 'Impresora Archivo', modelo: 'HP LaserJet Enterprise M507', ubicacion: 'Área de Archivo - Sótano', estado: 'inactiva', contador_actual: 45670 },
    { nombre: 'Impresora Producción', modelo: 'Xerox VersaLink C7000', ubicacion: 'Área de Producción - Piso 1', estado: 'mantenimiento', contador_actual: 89340 },
    { nombre: 'Impresora TI', modelo: 'Epson EcoTank ET-4760', ubicacion: 'Departamento TI - Piso 4', estado: 'activa', contador_actual: 5670 },
    { nombre: 'Impresora Finanzas', modelo: 'Ricoh IM C3000', ubicacion: 'Finanzas - Piso 2', estado: 'activa', contador_actual: 28745 },
    { nombre: 'Impresora Recursos Humanos', modelo: 'Canon imageRUNNER C3226i', ubicacion: 'Recursos Humanos - Piso 3', estado: 'activa', contador_actual: 19320 },
    { nombre: 'Impresora Biblioteca', modelo: 'Brother MFC-L8900CDW', ubicacion: 'Biblioteca - Planta baja', estado: 'inactiva', contador_actual: 34780 },
    { nombre: 'Impresora Dirección', modelo: 'HP Color LaserJet Enterprise M480f', ubicacion: 'Dirección General - Piso 5', estado: 'activa', contador_actual: 11280 },
    { nombre: 'Impresora Bodega', modelo: 'Kyocera ECOSYS M3645idn', ubicacion: 'Bodega Central - Sótano', estado: 'mantenimiento', contador_actual: 76210 },
    { nombre: 'Impresora Laboratorio', modelo: 'Epson WorkForce Pro WF-C5790', ubicacion: 'Laboratorio - Piso 4', estado: 'activa', contador_actual: 9650 },
    { nombre: 'Impresora Comunicaciones', modelo: 'Xerox C315', ubicacion: 'Comunicaciones - Piso 2', estado: 'activa', contador_actual: 22490 },
    { nombre: 'Impresora Atención Ciudadana', modelo: 'Lexmark MX431adn', ubicacion: 'Atención Ciudadana - Planta baja', estado: 'inactiva', contador_actual: 41860 }
  ],
  suministros: [
    { nombre: 'Toner Negro HP CF258A', tipo: 'toner', cantidad: 15, stock_minimo: 5, stock_maximo: 30, codigo: 'TON-HP-001', fecha_ingreso: '2025-01-15' },
    { nombre: 'Toner Cian HP CF259A', tipo: 'toner', cantidad: 8, stock_minimo: 3, stock_maximo: 20, codigo: 'TON-HP-002', fecha_ingreso: '2025-01-15' },
    { nombre: 'Toner Magenta HP CF260A', tipo: 'toner', cantidad: 8, stock_minimo: 3, stock_maximo: 20, codigo: 'TON-HP-003', fecha_ingreso: '2025-01-15' },
    { nombre: 'Toner Amarillo HP CF261A', tipo: 'toner', cantidad: 8, stock_minimo: 3, stock_maximo: 20, codigo: 'TON-HP-004', fecha_ingreso: '2025-01-15' },
    { nombre: 'Toner Negro Canon 057', tipo: 'toner', cantidad: 12, stock_minimo: 4, stock_maximo: 25, codigo: 'TON-CA-001', fecha_ingreso: '2025-02-01' },
    { nombre: 'Toner Cian Canon 056', tipo: 'toner', cantidad: 6, stock_minimo: 2, stock_maximo: 15, codigo: 'TON-CA-002', fecha_ingreso: '2025-02-01' },
    { nombre: 'Toner Magenta Canon 055', tipo: 'toner', cantidad: 6, stock_minimo: 2, stock_maximo: 15, codigo: 'TON-CA-003', fecha_ingreso: '2025-02-01' },
    { nombre: 'Toner Amarillo Canon 054', tipo: 'toner', cantidad: 6, stock_minimo: 2, stock_maximo: 15, codigo: 'TON-CA-004', fecha_ingreso: '2025-02-01' },
    { nombre: 'Papel Carta A4 80g', tipo: 'papel', cantidad: 500, stock_minimo: 100, stock_maximo: 1000, codigo: 'PAP-A4-001', fecha_ingreso: '2025-01-10' },
    { nombre: 'Papel Oficio 8.5x13 75g', tipo: 'papel', cantidad: 200, stock_minimo: 50, stock_maximo: 500, codigo: 'PAP-OF-001', fecha_ingreso: '2025-01-20' },
    { nombre: 'Papel Carta A4 100g Premium', tipo: 'papel', cantidad: 150, stock_minimo: 30, stock_maximo: 300, codigo: 'PAP-A4-002', fecha_ingreso: '2025-02-05' },
    { nombre: 'Cables USB 2.0', tipo: 'otro', cantidad: 25, stock_minimo: 10, stock_maximo: 50, codigo: 'ACC-USB-001', fecha_ingreso: '2025-01-25' },
    { nombre: 'Rodillos de impresión', tipo: 'otro', cantidad: 8, stock_minimo: 3, stock_maximo: 15, codigo: 'ACC-ROL-001', fecha_ingreso: '2025-02-10' }
  ],
  alertas: [
    {
      tipo: 'suministro',
      gravedad: 'crítico',
      titulo: 'Stock crítico de Tóner Negro',
      descripcion: 'El tóner negro ha alcanzado nivel crítico (0 unidades)',
      referencia_id: 1
    },
    {
      tipo: 'suministro',
      gravedad: 'alto',
      titulo: 'Stock bajo de Papel A4',
      descripcion: 'Las reservas de papel A4 están por debajo del 50% del mínimo',
      referencia_id: 2
    },
    {
      tipo: 'impresora',
      gravedad: 'alto',
      titulo: 'Impresora con error de alimentación',
      descripcion: 'La impresora HP LaserJet Pro reportó error de bandeja de papel',
      referencia_id: 1
    },
    {
      tipo: 'mantenimiento',
      gravedad: 'medio',
      titulo: 'Mantenimiento preventivo pendiente',
      descripcion: 'La impresora Canon MF445dw requiere mantenimiento preventivo',
      referencia_id: 2
    },
    {
      tipo: 'sistema',
      gravedad: 'bajo',
      titulo: 'Información: Consumo superior al promedio',
      descripcion: 'El consumo de papel este mes es 15% superior al promedio histórico',
      referencia_id: null
    }
  ]
};

async function insertarUsuarios() {
  console.log('👥 Insertando usuarios de prueba...');
  let insertados = 0;

  for (const usuario of DATOS_PRUEBA.usuarios) {
    try {
      const result = await pool.query(
        'INSERT INTO usuarios (nombre, usuario, password, rol, activo) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (usuario) DO UPDATE SET nombre=$1, rol=$4, activo=$5 RETURNING id',
        [usuario.nombre, usuario.usuario, usuario.password, usuario.rol, usuario.activo]
      );
      if (result.rows.length > 0) {
        insertados++;
        console.log(`  ✓ ${usuario.nombre} (${usuario.usuario})`);
      }
    } catch (error) {
      console.log(`  ✗ Error con ${usuario.usuario}: ${error.message}`);
    }
  }

  console.log(`  Total usuarios insertados/actualizados: ${insertados}/${DATOS_PRUEBA.usuarios.length}`);
  return insertados;
}

async function insertarImpresoras() {
  console.log('🖨️  Insertando impresoras...');
  let insertados = 0;
  
  for (const impresora of DATOS_PRUEBA.impresoras) {
    try {
      const result = await pool.query(
        `INSERT INTO impresoras (nombre, modelo, ubicacion, estado, contador_actual)
         SELECT $1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::integer
         WHERE NOT EXISTS (SELECT 1 FROM impresoras WHERE nombre = $1::varchar)
         RETURNING id`,
        [impresora.nombre, impresora.modelo, impresora.ubicacion, impresora.estado, impresora.contador_actual]
      );
      if (result.rows.length > 0) {
        insertados++;
        console.log(`  ✓ ${impresora.nombre} (ID: ${result.rows[0].id})`);
      }
    } catch (error) {
      console.log(`  ✗ Error con ${impresora.nombre}: ${error.message}`);
    }
  }
  
  console.log(`  Total impresoras insertadas: ${insertados}/${DATOS_PRUEBA.impresoras.length}`);
  return insertados;
}

async function insertarSuministros() {
  console.log('📦 Insertando suministros...');
  let insertados = 0;
  
  for (const suministro of DATOS_PRUEBA.suministros) {
    try {
      const result = await pool.query(
        'INSERT INTO suministros (nombre, tipo, cantidad, stock_minimo, stock_maximo, codigo, fecha_ingreso) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (codigo) DO NOTHING RETURNING id',
        [suministro.nombre, suministro.tipo, suministro.cantidad, suministro.stock_minimo, suministro.stock_maximo, suministro.codigo, suministro.fecha_ingreso]
      );
      if (result.rows.length > 0) {
        insertados++;
        console.log(`  ✓ ${suministro.nombre} (${suministro.codigo})`);
      }
    } catch (error) {
      console.log(`  ✗ Error con ${suministro.codigo}: ${error.message}`);
    }
  }
  
  console.log(`  Total suministros insertados: ${insertados}/${DATOS_PRUEBA.suministros.length}`);
  return insertados;
}

async function insertarAlertas() {
  console.log('🚨 Insertando alertas de prueba...');
  
  try {
    // Verificar si ya existen alertas activas
    const existing = await pool.query('SELECT COUNT(*) as count FROM alertas WHERE activa = true');
    if (existing.rows[0].count > 0) {
      console.log('  ℹ️  Ya existen alertas activas. Saltando inserción.');
      return 0;
    }

    let insertados = 0;
    for (const alerta of DATOS_PRUEBA.alertas) {
      try {
        await pool.query(
          `INSERT INTO alertas (tipo, gravedad, titulo, descripcion, referencia_id, activa)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [alerta.tipo, alerta.gravedad, alerta.titulo, alerta.descripcion, alerta.referencia_id, true]
        );
        insertados++;
        console.log(`  ✓ ${alerta.titulo}`);
      } catch (error) {
        console.log(`  ✗ Error insertando alerta: ${error.message}`);
      }
    }

    console.log(`  Total alertas insertadas: ${insertados}/${DATOS_PRUEBA.alertas.length}`);
    return insertados;
  } catch (error) {
    console.error('  ❌ Error general en alertas:', error.message);
    return 0;
  }
}

async function cargarDatosPrueba() {
  try {
    console.log('🚀 Iniciando carga de datos de prueba unificada...\n');

    await insertarUsuarios();
    await insertarImpresoras();
    await insertarSuministros();
    await insertarAlertas();

    console.log('\n✅ Carga de datos de prueba completada exitosamente');
    console.log('\nUsuarios creados:');
    console.log('  admin / admin123 (administrador)');
    console.log('  carlos / carlos123 (supervisor)');
    console.log('  maria / maria123 (operario)');
    console.log('  juan / juan123 (tecnico)');
    console.log('  laura / laura123 (operario)');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error durante la carga de datos de prueba:', error.message);
    console.error('Detalle:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cargarDatosPrueba();

const API_URL = window.location.origin;

let usuarioRol = null;
let usuarioId = null;
let usuarioNombre = null;

let impresorasData = [];
let impresorasFiltradas = [];
let impresorasPagina = 1;
let filtroEstadoImpresoras = 'todas';
const IMPRESORAS_POR_PAGINA = 12;

let suministrosData = [];
let suministrosFiltrados = [];

let chartConsumo = null;
let chartToner = null;

let editandoImpresoraId = null;
let editandoSuministroId = null;
let editandoMantenimientoId = null;
let editandoUsuarioId = null;
let movimientoSuministroId = null;

const ACCESO_MODULOS = {
  dashboard: ['administrador', 'supervisor', 'operario', 'tecnico'],
  impresoras: ['administrador', 'supervisor', 'operario', 'tecnico'],
  suministros: ['administrador', 'supervisor', 'operario'],
  mantenimientos: ['administrador', 'supervisor', 'tecnico'],
  registros: ['administrador', 'supervisor', 'operario'],
  reportes: ['administrador', 'supervisor'],
  configuracion: ['administrador'],
  auditoria: ['administrador']
};

function normalizarRol(rol) {
  if (!rol) return null;
  const r = String(rol).toLowerCase().trim();
  if (r === 'admin') return 'administrador';
  if (r === 'cajer@s') return 'operario';
  return r;
}

function tieneRol(...roles) {
  const r = normalizarRol(usuarioRol);
  return roles.map(normalizarRol).includes(r);
}

function puedeAcceder(modulo) {
  return (ACCESO_MODULOS[modulo] || []).includes(normalizarRol(usuarioRol));
}

async function fetchAPI(url, options = {}) {
  const { silentUnauthorized = false, ...requestOptions } = options;
  const res = await fetch(`${API_URL}${url}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(requestOptions.headers || {}) },
    ...requestOptions
  });

  if (res.status === 401 && silentUnauthorized) return null;
  if (!res.ok) {
    const errData = res.headers.get('content-type')?.includes('json') ? await res.json().catch(() => ({})) : {};
    console.error('API Error:', errData);
    throw new Error(errData?.error || `Error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.headers.get('content-type')?.includes('json') ? await res.json() : null;
}

function mostrarMensaje(texto, esError = false) {
  const div = document.getElementById('mensaje-sistema');
  if (!div) return;
  div.textContent = texto;
  div.className = `mensaje-sistema visible ${esError ? 'error' : 'exito'}`;
  clearTimeout(mostrarMensaje._timer);
  mostrarMensaje._timer = setTimeout(() => {
    div.classList.remove('visible');
  }, 3000);
}

function abrirModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) {
    overlay.classList.add('modal-open');
    const dialog = overlay.querySelector('.modal');
    dialog?.classList.add('modal-open');
    dialog?.setAttribute('aria-modal', 'true');
    overlay._previousFocus = document.activeElement;
    requestAnimationFrame(() => dialog?.querySelector('input, select, textarea, button')?.focus({ preventScroll: true }));
  }
}

function cerrarModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) {
    overlay.classList.remove('modal-open');
    overlay.querySelector('.modal')?.classList.remove('modal-open');
    overlay._previousFocus?.focus?.({ preventScroll: true });
  }
}

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const abierto = document.querySelector('.modal-overlay.modal-open');
  if (abierto) cerrarModal(abierto.id);
});

document.addEventListener('click', (event) => {
  if (event.target.classList?.contains('modal-overlay')) cerrarModal(event.target.id);
});

function badgeEstadoStock(cantidad, minimo) {
  if (cantidad <= minimo) {
    return '<span class="badge badge-rojo">Stock bajo</span>';
  }
  return '<span class="badge badge-verde">Normal</span>';
}

function badgeMantenimiento(estado) {
  const map = {
    pendiente: 'badge-amarillo',
    'en proceso': 'badge-azul',
    finalizado: 'badge-verde'
  };
  return `<span class="badge ${map[estado] || ''}">${estado}</span>`;
}

function badgeSiNo(valor, invertir = false) {
  const si = invertir ? !valor : valor;
  return si
    ? '<span class="badge badge-rojo">Sí</span>'
    : '<span class="badge badge-verde">No</span>';
}

function formatearFecha(fecha) {
  if (!fecha) return '-';
  return new Date(fecha).toLocaleDateString('es-ES');
}

function hoyISO() {
  return new Date().toISOString().split('T')[0];
}

// --- INICIALIZACIÓN ---

async function cargarSesion() {
  try {
    const sesion = await fetchAPI('/sesion', { silentUnauthorized: true });
    if (!sesion) return false;
    usuarioRol = normalizarRol(sesion.rol);
    usuarioId = sesion.usuario_id;
    usuarioNombre = sesion.nombre;
    document.getElementById('usuario-actual').textContent = sesion.nombre;
    document.getElementById('rol-actual').textContent = normalizarRol(sesion.rol);
    localStorage.setItem('userInfo', JSON.stringify(sesion));
    configurarMenuPorRol();
    window.dispatchEvent(new CustomEvent('sicis:authenticated', { detail: sesion }));
    return true;
  } catch {
    localStorage.removeItem('userInfo');
    return false;
  }
}

window.sicisResetSession = () => {
  usuarioRol = null;
  usuarioId = null;
  usuarioNombre = null;
  const loginButton = document.querySelector('.launch-button');
  if (loginButton) loginButton.disabled = false;
  const loginFeedback = document.getElementById('login-feedback');
  if (loginFeedback) loginFeedback.textContent = 'Usa tus credenciales de SICIS';
  document.querySelectorAll('.station-button[data-seccion]').forEach(button => {
    button.hidden = false;
  });
};

function configurarMenuPorRol() {
  document.querySelectorAll('.station-button[data-seccion]').forEach(button => {
    button.hidden = !puedeAcceder(button.dataset.seccion);
  });

  const permisosBoton = [
    ['btn-nueva-impresora', tieneRol('administrador', 'supervisor')],
    ['btn-nuevo-suministro', tieneRol('administrador', 'supervisor')],
    ['btn-nuevo-mantenimiento', tieneRol('administrador', 'supervisor', 'tecnico')],
    ['btn-nuevo-registro', tieneRol('administrador', 'supervisor', 'operario')],
    ['btn-nuevo-usuario', tieneRol('administrador')],
  ];
  permisosBoton.forEach(([id, visible]) => {
    const button = document.getElementById(id);
    if (button) button.hidden = !visible;
  });
}

function cargarSeccionDatos(seccion) {
  const loaders = {
    dashboard: cargarDashboard,
    impresoras: cargarImpresoras,
    suministros: cargarSuministros,
    mantenimientos: cargarMantenimientos,
    registros: cargarRegistros,
    reportes: () => { cargarReporteConsumo(); cargarReporteToner(); cargarReporteProyeccion(); },
    configuracion: cargarUsuarios,
    auditoria: cargarAuditoria
  };
  loaders[seccion]?.();
}

window.sicisLoadSection = cargarSeccionDatos;

function mostrarSeccion(seccion) {
  if (!puedeAcceder(seccion)) {
    mostrarMensaje('No tienes permiso para acceder a esta sección', true);
    return;
  }
  if (typeof window.sicisNavigateStation === 'function') {
    window.sicisNavigateStation(seccion, document.querySelector(`[data-station-target="${seccion}"]`));
    return;
  }
  document.querySelectorAll('.seccion-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${seccion}`));
  cargarSeccionDatos(seccion);
}

function initNavegacion() {
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const seccion = link.dataset.seccion;
      if (puedeAcceder(seccion)) mostrarSeccion(seccion);
    });
  });
}

function navegarDesdeResumen(seccion, filtro) {
  if (!puedeAcceder(seccion)) {
    mostrarMensaje('No tienes permiso para acceder a esta sección', true);
    return;
  }
  
  mostrarSeccion(seccion);
  
  // Aplicar filtro específico si se proporciona
  setTimeout(() => {
    if (filtro === 'bajos' && seccion === 'suministros') {
      const input = document.getElementById('buscar-suministros');
      if (input) {
        input.value = '';
        input.placeholder = 'Mostrando suministros con stock bajo...';
        filtrarSuministros('');
        // Filtrar para mostrar solo los de stock bajo
        suministrosFiltrados = suministrosData.filter(s => s.cantidad <= s.stock_minimo);
        renderTablaSuministros(suministrosFiltrados);
      }
    } else if (filtro === 'pendientes' && seccion === 'mantenimientos') {
      // Los mantenimientos ya se cargan ordenados por fecha
      mostrarMensaje('Mostrando mantenimientos pendientes');
    } else if (filtro === 'activas' && seccion === 'impresoras') {
      const input = document.getElementById('buscar-impresoras');
      if (input) {
        input.value = '';
        input.placeholder = 'Mostrando impresoras activas...';
        filtrarImpresoras('');
        // Filtrar para mostrar solo las activas
        impresorasFiltradas = impresorasData.filter(i => i.estado === 'activa');
        paginarImpresoras(1);
      }
    }
  }, 100);
}

// --- DASHBOARD ---

async function cargarDashboard() {
  try {
    const data = await fetchAPI('/dashboard/resumen');
    document.getElementById('stat-impresoras').textContent = data.impresoras_activas;
    document.getElementById('stat-suministros').textContent = data.suministros_bajos;
    document.getElementById('stat-mantenimientos').textContent = data.mantenimientos_pendientes;
    document.getElementById('stat-consumo').textContent = data.consumo_mensual;
    document.getElementById('stat-impresoras-inactivas').textContent = data.impresoras_inactivas;
    document.getElementById('stat-impresoras-mantenimiento').textContent = data.impresoras_mantenimiento;

    renderizarAlertas(data.alertas || []);
    renderChartConsumo(data.consumo_por_impresora || []);
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

function renderizarAlertas(alertas, filtro = 'todas') {
  const lista = document.getElementById('lista-alertas');
  
  let alertasFiltradas = alertas;
  if (filtro !== 'todas') {
    alertasFiltradas = alertas.filter(a => a.gravedad === filtro);
  }
  
  if (!alertasFiltradas.length) {
    lista.innerHTML = `
      <div class="sin-alertas">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>${alertas.length === 0 ? 'Sin alertas activas' : 'Sin alertas con este filtro'}</span>
      </div>
    `;
    return;
  }

  lista.innerHTML = alertasFiltradas.map(a => {
    const gravedadClass = `alerta-${a.gravedad}`;
    const tipoIcon = getIconoTipo(a.tipo);
    const esMantenimiento = a.tipo === 'mantenimiento';
    
    return `
      <div class="alerta-card ${gravedadClass}">
        <div class="alerta-icono">
          ${tipoIcon}
        </div>
        <div class="alerta-info">
          <div class="alerta-header">
            <strong class="alerta-nombre">${a.titulo || a.descripcion || 'Alerta'}</strong>
            <span class="alerta-gravedad badge badge-${a.gravedad}">${a.gravedad.toUpperCase()}</span>
          </div>
          <div class="alerta-detalle">
            <span class="alerta-tipo">${a.tipo}</span>
            ${a.referencia_id ? `<span class="alerta-referencia">Ref: ${a.referencia_id}</span>` : ''}
          </div>
          ${a.descripcion ? `
            <div class="alerta-descripcion">
              <span>${a.descripcion}</span>
            </div>
          ` : ''}
        </div>
        <div class="alerta-accion">
          <button class="btn-secundario btn-sm" onclick="cerrarAlerta('${a.id}')" title="Marcar como resuelta">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18"/>
              <path d="M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function cerrarAlerta(alertaId) {
  try {
    await fetchAPI(`/alertas/${alertaId}`, { method: 'DELETE' });
    // Recargar dashboard para actualizar las alertas
    await cargarDashboard();
    mostrarMensaje('Alerta marcada como resuelta');
  } catch (error) {
    console.error('Error cerrando alerta:', error);
    mostrarMensaje('Error al cerrar la alerta', true);
  }
}

function getIconoTipo(tipo) {
  const iconos = {
    toner: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="6" y="2" width="12" height="20" rx="2"/>
      <line x1="6" y1="12" x2="18" y2="12"/>
    </svg>`,
    papel: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>`,
    tinta: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2.69l5.74 5.88a6 6 0 01-8.48 8.48A6 6 0 013.5 8.58l5.74-5.88"/>
      <path d="M12 21.31l5.74-5.88a6 6 0 01-8.48-8.48 6 6 0 01-5.76 5.88l5.74 5.88"/>
    </svg>`,
    suministro: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>`,
    impresora: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
      <path d="M6 14h12v8H6z"/>
    </svg>`,
    mantenimiento: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
    </svg>`,
    sistema: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>`,
    otro: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>`
  };
  return iconos[tipo] || iconos.otro;
}

function irAImpresoras(id) {
  document.querySelector('[data-seccion="impresoras"]')?.click();
  setTimeout(() => {
    const input = document.getElementById('buscar-impresoras');
    if (input) {
      input.value = id;
      input.dispatchEvent(new Event('input'));
    }
  }, 100);
}

function irASuministros(id) {
  document.querySelector('[data-seccion="suministros"]')?.click();
  setTimeout(() => {
    const input = document.getElementById('buscar-suministros');
    if (input) {
      input.value = id;
      filtrarSuministros(id);
    }
  }, 100);
}

// Filtros de alertas
document.addEventListener('DOMContentLoaded', () => {
  const filtros = document.querySelectorAll('.filtro-alerta');
  filtros.forEach(filtro => {
    filtro.addEventListener('click', async (e) => {
      filtros.forEach(f => f.classList.remove('active'));
      e.target.classList.add('active');
      
      try {
        const data = await fetchAPI('/dashboard/resumen');
        renderizarAlertas(data.alertas || [], e.target.dataset.filtro);
      } catch (err) {
        mostrarMensaje(err.message, true);
      }
    });
  });
});

function renderChartConsumo(datos) {
  const ctx = document.getElementById('chart-consumo');
  if (!ctx) return;
  if (chartConsumo) chartConsumo.destroy();
  
  const coloresPapel = datos.map(() => {
    const alpha = 0.6 + Math.random() * 0.4;
    return `rgba(59, 130, 246, ${alpha})`;
  });
  
  const coloresContador = datos.map(() => {
    const alpha = 0.6 + Math.random() * 0.4;
    return `rgba(99, 102, 241, ${alpha})`;
  });
  
  chartConsumo = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: datos.map(d => d.impresora),
      datasets: [
        { 
          label: 'Recargas de papel', 
          data: datos.map(d => d.papel), 
          backgroundColor: coloresPapel,
          borderColor: '#3b82f6',
          borderWidth: 2,
          borderRadius: 6
        },
        { 
          label: 'Contador de impresiones', 
          data: datos.map(d => d.contador), 
          backgroundColor: coloresContador,
          borderColor: '#6366f1',
          borderWidth: 2,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { 
          beginAtZero: true,
          grid: {
            color: 'rgba(148, 163, 184, 0.1)'
          },
          ticks: {
            font: {
              family: 'Inter'
            }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              family: 'Inter'
            }
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: {
              family: 'Inter',
              size: 12,
              weight: '500'
            },
            padding: 20,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: {
            family: 'Inter',
            size: 14,
            weight: '600'
          },
          bodyFont: {
            family: 'Inter',
            size: 13
          },
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y.toLocaleString();
              }
              return label;
            }
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      }
    }
  });
}

// --- IMPRESORAS ---

function crearFiltrosImpresoras() {
  const panel = document.getElementById('panel-impresoras');
  const host = panel?.querySelector('.printer-filters-host');
  if (!host || host.querySelector('.printer-state-filters')) return;
  const filters = document.createElement('div');
  filters.className = 'printer-state-filters';
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', 'Filtrar impresoras por estado');
  filters.innerHTML = [
    ['todas', 'Todas'],
    ['operativas', 'Operativas'],
    ['mantenimiento', 'Mantenimiento'],
    ['inactivas', 'Fuera de línea'],
  ].map(([value, label], index) => `<button type="button" class="printer-state-filter${index === 0 ? ' active' : ''}" data-filter="${value}">${label}</button>`).join('');
  host.appendChild(filters);
  filters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    filtroEstadoImpresoras = button.dataset.filter;
    filters.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('active', item === button));
    filtrarImpresoras(document.getElementById('buscar-impresoras')?.value || '');
  });
}

async function cargarImpresoras() {
  try {
    crearFiltrosImpresoras();
    impresorasData = await fetchAPI('/impresoras');
    filtrarImpresoras(document.getElementById('buscar-impresoras')?.value || '');
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

function filtrarImpresoras(texto) {
  const t = texto.toLowerCase().trim();
  impresorasFiltradas = impresorasData.filter(i => {
    const coincideTexto = !t ||
      i.nombre?.toLowerCase().includes(t) ||
      i.modelo?.toLowerCase().includes(t) ||
      i.ubicacion?.toLowerCase().includes(t);
    const coincideEstado = filtroEstadoImpresoras === 'todas' ||
      (filtroEstadoImpresoras === 'operativas' && i.estado === 'activa') ||
      (filtroEstadoImpresoras === 'mantenimiento' && i.estado === 'mantenimiento') ||
      (filtroEstadoImpresoras === 'inactivas' && i.estado === 'inactiva') ||
      (filtroEstadoImpresoras === 'pendientes' && i.estado !== 'activa');
    return coincideTexto && coincideEstado;
  });
  paginarImpresoras(1);
}

function paginarImpresoras(pagina) {
  const totalPaginas = Math.max(1, Math.ceil(impresorasFiltradas.length / IMPRESORAS_POR_PAGINA));
  impresorasPagina = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (impresorasPagina - 1) * IMPRESORAS_POR_PAGINA;
  const slice = impresorasFiltradas.slice(inicio, inicio + IMPRESORAS_POR_PAGINA);
  renderGridImpresoras(slice);
  document.getElementById('info-pagina-impresoras').textContent =
    `Página ${impresorasPagina} de ${totalPaginas} (${impresorasFiltradas.length} registros)`;
  document.getElementById('btn-imp-anterior').disabled = impresorasPagina <= 1;
  document.getElementById('btn-imp-siguiente').disabled = impresorasPagina >= totalPaginas;
}

function renderGridImpresoras(lista) {
  const grid = document.getElementById('grid-impresoras');
  const summary = document.getElementById('fleet-summary');
  const soloLectura = !tieneRol('administrador', 'supervisor');
  const puedeEliminar = tieneRol('administrador');
  const operativas = impresorasFiltradas.filter(i => i.estado === 'activa').length;
  const pendientes = impresorasFiltradas.length - operativas;
  if (summary) summary.innerHTML = `
    <span><b>${impresorasFiltradas.length}</b> equipos encontrados</span>
    <span class="summary-online"><i></i>${operativas} operativos</span>
    <span class="summary-pending"><i></i>${pendientes} pendientes</span>`;

  const estadoMeta = {
    activa: { label: 'Operativa', className: 'online' },
    mantenimiento: { label: 'Mantenimiento', className: 'maintenance' },
    inactiva: { label: 'Fuera de línea', className: 'offline' },
  };

  grid.innerHTML = lista.map((i, index) => {
    const estado = estadoMeta[i.estado] || estadoMeta.inactiva;
    const contador = Number(i.contador_actual || 0).toLocaleString('es-SV');
    const nivel = 38 + ((Number(i.id || index) * 17) % 55);
    return `
      <article class="printer-unit-card status-${estado.className}" data-motion-index="${index % 6}">
        <header>
          <span class="printer-status"><i></i>${estado.label}</span>
          <span class="printer-node">SICIS / ${String(i.id).padStart(2, '0')}</span>
        </header>
        <div class="printer-card-body">
          <div class="printer-device" aria-hidden="true">
            <span class="printer-paper"></span><span class="printer-screen"></span><span class="printer-tray"></span>
          </div>
          <div class="printer-identity">
            <p>${escaparHTML(i.ubicacion || 'Ubicación no asignada')}</p>
            <h3>${escaparHTML(i.nombre)}</h3>
            <span>${escaparHTML(i.modelo || 'Modelo sin registrar')}</span>
          </div>
        </div>
        <div class="printer-metrics">
          <div><span>Contador</span><strong>${contador}</strong><small>impresiones</small></div>
          <div class="printer-load"><span>Actividad estimada</span><strong>${nivel}%</strong><i><b style="width:${nivel}%"></b></i></div>
        </div>
        <footer>
          <button class="printer-card-action view" onclick="verDetalleImpresora(${i.id})">Ver detalle <span>↗</span></button>
          ${!soloLectura ? `<button class="printer-card-action edit" onclick="abrirModalImpresora(${i.id})" aria-label="Editar ${escaparHTML(i.nombre)}">Editar</button>` : ''}
          ${puedeEliminar ? `<button class="printer-card-action delete" onclick="eliminarImpresora(${i.id})" aria-label="Eliminar ${escaparHTML(i.nombre)}">×</button>` : ''}
        </footer>
      </article>`;
  }).join('') || '<div class="fleet-empty"><strong>Sin equipos en esta vista</strong><span>Prueba con otro filtro o término de búsqueda.</span></div>';
}

async function verDetalleImpresora(id) {
  try {
    const i = await fetchAPI(`/impresoras/${id}`);
    document.getElementById('modal-detalle-titulo').textContent = 'Detalle de impresora';
    document.getElementById('modal-detalle-contenido').innerHTML = `
      <dl class="detalle-dl">
        <dt>Nombre</dt><dd>${i.nombre}</dd>
        <dt>Modelo</dt><dd>${i.modelo || '-'}</dd>
        <dt>Ubicación</dt><dd>${i.ubicacion}</dd>
        <dt>Estado</dt><dd>${i.estado}</dd>
        <dt>Contador actual</dt><dd>${i.contador_actual}</dd>
        <dt>Creado</dt><dd>${formatearFecha(i.creado_en)}</dd>
      </dl>`;
    abrirModal('modal-detalle');
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

async function abrirModalImpresora(id) {
  editandoImpresoraId = id || null;
  let datos = { nombre: '', modelo: '', ubicacion: '', estado: 'activa', contador_actual: 0 };
  if (id) {
    try {
      datos = await fetchAPI(`/impresoras/${id}`);
    } catch (err) {
      mostrarMensaje(err.message, true);
      return;
    }
  }
  document.getElementById('modal-form-titulo').textContent = id ? 'Editar impresora' : 'Nueva impresora';
  document.getElementById('modal-form-contenido').innerHTML = `
    <form id="form-impresora" onsubmit="event.preventDefault(); guardarImpresora();" class="formulario">
      <div class="form-card-group">
        <label for="imp-nombre">Nombre *</label>
        <input type="text" id="imp-nombre" value="${datos.nombre}" required/>
      </div>
      <div class="form-card-group">
        <label for="imp-modelo">Modelo</label>
        <input type="text" id="imp-modelo" value="${datos.modelo || ''}"/>
      </div>
      <div class="form-card-group">
        <label for="imp-ubicacion">Ubicación *</label>
        <input type="text" id="imp-ubicacion" value="${datos.ubicacion}" required/>
      </div>
      <div class="form-card-group">
        <label for="imp-contador">Contador actual *</label>
        <input type="number" id="imp-contador" min="0" value="${datos.contador_actual}" required/>
      </div>
      <div class="form-card-group">
        <label for="imp-estado">Estado *</label>
        <select id="imp-estado" required>
          <option value="activa" ${datos.estado === 'activa' ? 'selected' : ''}>Activa</option>
          <option value="inactiva" ${datos.estado === 'inactiva' ? 'selected' : ''}>Inactiva</option>
          <option value="mantenimiento" ${datos.estado === 'mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
        </select>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secundario" onclick="cerrarModal('modal-formulario')">Cancelar</button>
        <button type="submit" class="btn-principal">Guardar</button>
      </div>
    </form>`;
  abrirModal('modal-formulario');
}

async function guardarImpresora() {
  const body = {
    nombre: document.getElementById('imp-nombre').value,
    modelo: document.getElementById('imp-modelo').value,
    ubicacion: document.getElementById('imp-ubicacion').value,
    contador_actual: Number(document.getElementById('imp-contador').value),
    estado: document.getElementById('imp-estado').value
  };
  try {
    if (editandoImpresoraId) {
      await fetchAPI(`/impresoras/${editandoImpresoraId}`, { method: 'PUT', body: JSON.stringify(body) });
      mostrarMensaje('Impresora actualizada');
    } else {
      await fetchAPI('/impresoras', { method: 'POST', body: JSON.stringify(body) });
      mostrarMensaje('Impresora creada');
    }
    cerrarModal('modal-formulario');
    cargarImpresoras();
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

async function eliminarImpresora(id) {
  if (!confirm('¿Eliminar esta impresora?')) return;
  try {
    await fetchAPI(`/impresoras/${id}`, { method: 'DELETE' });
    mostrarMensaje('Impresora eliminada');
    cargarImpresoras();
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

// --- SUMINISTROS ---

async function cargarSuministros() {
  try {
    suministrosData = await fetchAPI('/suministros');
    filtrarSuministros(document.getElementById('buscar-suministros')?.value || '');
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

function filtrarSuministros(texto) {
  const t = texto.toLowerCase().trim();
  suministrosFiltrados = suministrosData.filter(s =>
    !t ||
    s.nombre?.toLowerCase().includes(t) ||
    s.tipo?.toLowerCase().includes(t) ||
    s.codigo?.toLowerCase().includes(t)
  );
  renderTablaSuministros(suministrosFiltrados);
}

function renderTablaSuministros(lista) {
  const tbody = document.getElementById('tabla-suministros');
  const puedeEditar = tieneRol('administrador', 'supervisor');
  const puedeMovimiento = tieneRol('administrador', 'supervisor', 'operario');
  const puedeEliminar = tieneRol('administrador');

  tbody.innerHTML = lista.map(s => `
    <tr>
      <td>${s.nombre}</td>
      <td>${s.tipo}</td>
      <td>${s.cantidad}</td>
      <td>${badgeEstadoStock(s.cantidad, s.stock_minimo)}</td>
      <td>${s.codigo}</td>
      <td class="acciones">
        <button class="btn-secundario btn-sm" onclick="verDetalleSuministro(${s.id})">Ver</button>
        ${puedeMovimiento ? `<button class="btn-principal btn-sm" onclick="abrirModalMovimiento(${s.id})">Movimiento</button>` : ''}
        ${puedeEditar ? `<button class="btn-principal btn-sm" onclick="abrirModalSuministro(${s.id})">Editar</button>` : ''}
        ${puedeEliminar ? `<button class="btn-danger btn-sm" onclick="eliminarSuministro(${s.id})">Eliminar</button>` : ''}
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6" style="text-align:center">Sin registros</td></tr>';
}

async function verDetalleSuministro(id) {
  try {
    const s = await fetchAPI(`/suministros/${id}`);
    document.getElementById('modal-detalle-titulo').textContent = 'Detalle de suministro';
    document.getElementById('modal-detalle-contenido').innerHTML = `
      <dl class="detalle-dl">
        <dt>Nombre</dt><dd>${s.nombre}</dd>
        <dt>Tipo</dt><dd>${s.tipo}</dd>
        <dt>Cantidad</dt><dd>${s.cantidad}</dd>
        <dt>Stock mínimo</dt><dd>${s.stock_minimo}</dd>
        <dt>Stock máximo</dt><dd>${s.stock_maximo ?? '-'}</dd>
        <dt>Código</dt><dd>${s.codigo}</dd>
        <dt>Proveedor</dt><dd>${s.proveedor || '-'}</dd>
        <dt>Fecha ingreso</dt><dd>${formatearFecha(s.fecha_ingreso)}</dd>
        <dt>Estado</dt><dd>${badgeEstadoStock(s.cantidad, s.stock_minimo)}</dd>
      </dl>`;
    abrirModal('modal-detalle');
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

async function abrirModalSuministro(id) {
  editandoSuministroId = id || null;
  let datos = { nombre: '', tipo: 'toner', cantidad: 0, stock_minimo: 0, stock_maximo: '', codigo: '', fecha_ingreso: hoyISO() };
  if (id) {
    try {
      datos = await fetchAPI(`/suministros/${id}`);
    } catch (err) {
      mostrarMensaje(err.message, true);
      return;
    }
  }
  document.getElementById('modal-form-titulo').textContent = id ? 'Editar suministro' : 'Nuevo suministro';
  document.getElementById('modal-form-contenido').innerHTML = `
    <form id="form-suministro" onsubmit="event.preventDefault(); guardarSuministro();" class="formulario">
      <div class="form-card-group">
        <label for="sum-nombre">Nombre *</label>
        <input type="text" id="sum-nombre" value="${datos.nombre}" required/>
      </div>
      <div class="form-card-group">
        <label for="sum-tipo">Tipo *</label>
        <select id="sum-tipo" required>
          <option value="toner" ${datos.tipo === 'toner' ? 'selected' : ''}>Tóner</option>
          <option value="papel" ${datos.tipo === 'papel' ? 'selected' : ''}>Papel</option>
          <option value="tinta" ${datos.tipo === 'tinta' ? 'selected' : ''}>Tinta</option>
          <option value="otro" ${datos.tipo === 'otro' ? 'selected' : ''}>Otro</option>
        </select>
      </div>
      <div class="form-card-group">
        <label for="sum-cantidad">Cantidad</label>
        <input type="number" id="sum-cantidad" min="0" value="${datos.cantidad}"/>
      </div>
      <div class="form-card-group">
        <label for="sum-minimo">Stock mínimo</label>
        <input type="number" id="sum-minimo" min="0" value="${datos.stock_minimo}"/>
      </div>
      <div class="form-card-group">
        <label for="sum-maximo">Stock máximo</label>
        <input type="number" id="sum-maximo" min="0" value="${datos.stock_maximo ?? ''}"/>
      </div>
      <div class="form-card-group">
        <label for="sum-codigo">Código único *</label>
        <input type="text" id="sum-codigo" value="${datos.codigo}" required/>
      </div>
      <div class="form-card-group">
        <label for="sum-proveedor">Proveedor</label>
        <input type="text" id="sum-proveedor" value="${datos.proveedor || ''}"/>
      </div>
      <div class="form-card-group">
        <label for="sum-fecha">Fecha de ingreso *</label>
        <input type="date" id="sum-fecha" value="${(datos.fecha_ingreso || '').split('T')[0]}" required/>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secundario" onclick="cerrarModal('modal-formulario')">Cancelar</button>
        <button type="submit" class="btn-principal">Guardar</button>
      </div>
    </form>`;
  abrirModal('modal-formulario');
}

async function guardarSuministro() {
  const maxVal = document.getElementById('sum-maximo').value;
  const body = {
    nombre: document.getElementById('sum-nombre').value,
    tipo: document.getElementById('sum-tipo').value,
    cantidad: Number(document.getElementById('sum-cantidad').value),
    stock_minimo: Number(document.getElementById('sum-minimo').value),
    stock_maximo: maxVal === '' ? null : Number(maxVal),
    codigo: document.getElementById('sum-codigo').value,
    proveedor: document.getElementById('sum-proveedor').value || null,
    fecha_ingreso: document.getElementById('sum-fecha').value
  };
  if (body.stock_maximo != null && body.stock_maximo < body.stock_minimo) {
    mostrarMensaje('Stock máximo debe ser >= stock mínimo', true);
    return;
  }
  try {
    if (editandoSuministroId) {
      await fetchAPI(`/suministros/${editandoSuministroId}`, { method: 'PUT', body: JSON.stringify(body) });
      mostrarMensaje('Suministro actualizado');
    } else {
      await fetchAPI('/suministros', { method: 'POST', body: JSON.stringify(body) });
      mostrarMensaje('Suministro creado');
    }
    cerrarModal('modal-formulario');
    cargarSuministros();
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

async function eliminarSuministro(id) {
  if (!confirm('¿Eliminar este suministro?')) return;
  try {
    await fetchAPI(`/suministros/${id}`, { method: 'DELETE' });
    mostrarMensaje('Suministro eliminado');
    cargarSuministros();
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

function abrirModalMovimiento(id) {
  movimientoSuministroId = id;
  document.getElementById('modal-form-titulo').textContent = 'Registrar movimiento';
  document.getElementById('modal-form-contenido').innerHTML = `
    <form id="form-movimiento" onsubmit="event.preventDefault(); registrarMovimiento(${id});" class="formulario">
      <div class="form-card-group">
        <label for="mov-tipo">Tipo *</label>
        <select id="mov-tipo" required>
          <option value="entrada">Entrada</option>
          <option value="salida">Salida</option>
        </select>
      </div>
      <div class="form-card-group">
        <label for="mov-cantidad">Cantidad *</label>
        <input type="number" id="mov-cantidad" min="1" required/>
      </div>
      <div class="form-card-group">
        <label for="mov-observacion">Observación</label>
        <textarea id="mov-observacion" rows="3"></textarea>
      </div>
      <div class="form-card-group">
        <label for="mov-proveedor">Proveedor</label>
        <input type="text" id="mov-proveedor" placeholder="Nombre del proveedor"/>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secundario" onclick="cerrarModal('modal-formulario')">Cancelar</button>
        <button type="submit" class="btn-principal">Confirmar</button>
      </div>
    </form>`;
  abrirModal('modal-formulario');
}

async function registrarMovimiento(id) {
  const body = {
    tipo_movimiento: document.getElementById('mov-tipo').value,
    cantidad: Number(document.getElementById('mov-cantidad').value),
    observacion: document.getElementById('mov-observacion').value,
    proveedor: document.getElementById('mov-proveedor').value || null
  };
  try {
    await fetchAPI(`/suministros/${id}/movimiento`, { method: 'POST', body: JSON.stringify(body) });
    mostrarMensaje('Movimiento registrado');
    cerrarModal('modal-formulario');
    cargarSuministros();
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

// --- MANTENIMIENTOS ---

async function cargarImpresorasParaSelect(selectId, soloActivas = false) {
  const url = soloActivas ? '/impresoras?estado=activa' : '/impresoras';
  const lista = await fetchAPI(url);
  const select = document.getElementById(selectId);
  if (!select) return lista;
  select.innerHTML = lista.map(i => `<option value="${i.id}">${i.nombre} - ${i.ubicacion}</option>`).join('');
  return lista;
}

async function cargarMantenimientos() {
  try {
    const lista = await fetchAPI('/mantenimientos');
    const tbody = document.getElementById('tabla-mantenimientos');
    const puedeEditar = tieneRol('administrador', 'supervisor', 'tecnico');
    tbody.innerHTML = lista.map(m => `
      <tr>
        <td>${m.impresora_nombre}</td>
        <td>${m.tecnico}</td>
        <td>${badgeMantenimiento(m.estado)}</td>
        <td>${formatearFecha(m.fecha)}</td>
        <td class="acciones">
          <button class="btn-secundario btn-sm" onclick="verDetalleMantenimiento(${m.id})">Ver</button>
          ${puedeEditar ? `<button class="btn-principal btn-sm" onclick="abrirModalMantenimiento(${m.id})">Editar</button>` : ''}
        </td>
      </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center">Sin registros</td></tr>';
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

async function verDetalleMantenimiento(id) {
  try {
    const m = await fetchAPI(`/mantenimientos/${id}`);
    document.getElementById('modal-detalle-titulo').textContent = 'Detalle de mantenimiento';
    document.getElementById('modal-detalle-contenido').innerHTML = `
      <dl class="detalle-dl">
        <dt>Impresora</dt><dd>${m.impresora_nombre}</dd>
        <dt>Técnico</dt><dd>${m.tecnico}</dd>
        <dt>Fecha</dt><dd>${formatearFecha(m.fecha)}</dd>
        <dt>Estado</dt><dd>${badgeMantenimiento(m.estado)}</dd>
        <dt>Descripción</dt><dd>${m.descripcion}</dd>
        <dt>Solución</dt><dd>${m.solucion || '-'}</dd>
      </dl>`;
    abrirModal('modal-detalle');
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

async function abrirModalMantenimiento(id) {
  editandoMantenimientoId = id || null;
  let datos = { impresora_id: '', tecnico: '', fecha: hoyISO(), estado: 'pendiente', descripcion: '', solucion: '' };
  if (id) {
    try {
      datos = await fetchAPI(`/mantenimientos/${id}`);
    } catch (err) {
      mostrarMensaje(err.message, true);
      return;
    }
  }
  document.getElementById('modal-form-titulo').textContent = id ? 'Editar mantenimiento' : 'Nuevo mantenimiento';
  document.getElementById('modal-form-contenido').innerHTML = `
    <form id="form-mantenimiento" onsubmit="event.preventDefault(); guardarMantenimiento();" class="formulario">
      <div class="form-card-group">
        <label for="mant-impresora">Impresora *</label>
        <select id="mant-impresora" required></select>
      </div>
      <div class="form-card-group">
        <label for="mant-tecnico">Técnico asignado *</label>
        <input type="text" id="mant-tecnico" value="${datos.tecnico}" required/>
      </div>
      <div class="form-card-group">
        <label for="mant-fecha">Fecha *</label>
        <input type="date" id="mant-fecha" value="${(datos.fecha || '').split('T')[0]}" required/>
      </div>
      <div class="form-card-group">
        <label for="mant-estado">Estado *</label>
        <select id="mant-estado" required>
          <option value="pendiente" ${datos.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
          <option value="en proceso" ${datos.estado === 'en proceso' ? 'selected' : ''}>En proceso</option>
          <option value="finalizado" ${datos.estado === 'finalizado' ? 'selected' : ''}>Finalizado</option>
        </select>
      </div>
      <div class="form-card-group">
        <label for="mant-descripcion">Descripción *</label>
        <textarea id="mant-descripcion" rows="3" required>${datos.descripcion}</textarea>
      </div>
      <div class="form-card-group">
        <label for="mant-solucion">Solución</label>
        <textarea id="mant-solucion" rows="3">${datos.solucion || ''}</textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secundario" onclick="cerrarModal('modal-formulario')">Cancelar</button>
        <button type="submit" class="btn-principal">Guardar</button>
      </div>
    </form>`;
  abrirModal('modal-formulario');
  await cargarImpresorasParaSelect('mant-impresora');
  if (datos.impresora_id) document.getElementById('mant-impresora').value = datos.impresora_id;
}

async function guardarMantenimiento() {
  const body = {
    impresora_id: Number(document.getElementById('mant-impresora').value),
    tecnico: document.getElementById('mant-tecnico').value,
    fecha: document.getElementById('mant-fecha').value,
    estado: document.getElementById('mant-estado').value,
    descripcion: document.getElementById('mant-descripcion').value,
    solucion: document.getElementById('mant-solucion').value
  };
  try {
    if (editandoMantenimientoId) {
      await fetchAPI(`/mantenimientos/${editandoMantenimientoId}`, { method: 'PUT', body: JSON.stringify(body) });
      mostrarMensaje('Mantenimiento actualizado');
    } else {
      await fetchAPI('/mantenimientos', { method: 'POST', body: JSON.stringify(body) });
      mostrarMensaje('Mantenimiento creado');
    }
    cerrarModal('modal-formulario');
    cargarMantenimientos();
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

// --- REGISTROS DIARIOS ---

async function cargarRegistros() {
  try {
    const lista = await fetchAPI('/registros');
    document.getElementById('tabla-registros').innerHTML = lista.map(r => `
      <tr>
        <td>${r.impresora_nombre}</td>
        <td>${r.contador_diario}</td>
        <td>${r.recarga_papel}</td>
        <td>${r.cambio_toner ? 'Sí' : 'No'}</td>
        <td>${r.tecnico_recarga || '-'}</td>
        <td>${formatearFecha(r.fecha)}</td>
        <td>${r.usuario_nombre}</td>
      </tr>
    `).join('') || '<tr><td colspan="7" style="text-align:center">Sin registros</td></tr>';
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

async function abrirModalRegistro() {
  document.getElementById('modal-form-titulo').textContent = 'Nuevo registro diario';
  document.getElementById('modal-form-contenido').innerHTML = `
    <form id="form-registro" onsubmit="event.preventDefault(); guardarRegistro();" class="formulario">
      <div class="form-card-group">
        <label for="reg-impresora">Impresora *</label>
        <select id="reg-impresora" required></select>
      </div>
      <div class="form-card-group">
        <label for="reg-fecha">Fecha *</label>
        <input type="date" id="reg-fecha" value="${hoyISO()}" required/>
      </div>
      <div class="form-card-group">
        <label for="reg-contador">Contador diario *</label>
        <input type="number" id="reg-contador" min="0" required/>
      </div>
      <div class="form-card-group">
        <label for="reg-papel">Recarga de papel</label>
        <input type="number" id="reg-papel" min="0" value="0"/>
      </div>
      <div class="form-card-group">
        <label for="reg-toner" style="display: flex; align-items: center; gap: 8px; font-weight: 500;">
          <input type="checkbox" id="reg-toner" style="width: auto; margin: 0;"/>
          Cambio de tóner realizado
        </label>
      </div>
      <div class="form-card-group">
        <label for="reg-tecnico">Técnico que realizó recarga</label>
        <input type="text" id="reg-tecnico" placeholder="Nombre del técnico"/>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secundario" onclick="cerrarModal('modal-formulario')">Cancelar</button>
        <button type="submit" class="btn-principal">Guardar</button>
      </div>
    </form>`;
  abrirModal('modal-formulario');
  await cargarImpresorasParaSelect('reg-impresora', true);
}

async function guardarRegistro() {
  const body = {
    impresora_id: Number(document.getElementById('reg-impresora').value),
    fecha: document.getElementById('reg-fecha').value,
    contador_diario: Number(document.getElementById('reg-contador').value),
    recarga_papel: Number(document.getElementById('reg-papel').value) || 0,
    cambio_toner: document.getElementById('reg-toner').checked,
    tecnico_recarga: document.getElementById('reg-tecnico').value || null
  };
  try {
    await fetchAPI('/registros', { method: 'POST', body: JSON.stringify(body) });
    mostrarMensaje('Registro guardado');
    cerrarModal('modal-formulario');
    cargarRegistros();
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

// --- REPORTES ---

function mostrarTabReporte(tab) {
  document.querySelectorAll('.tab-reporte').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.reportes-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-reporte-${tab}`)?.classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.classList.add('active');
}

function periodoSeleccionado() {
  return document.getElementById('reporte-periodo')?.value || new Date().toISOString().slice(0, 7);
}

function recargarReportes() {
  cargarReporteConsumo();
  cargarReporteToner();
  cargarReporteProyeccion();
}

function exportarReporteExcel() {
  const tabla = document.querySelector('.tab-reporte.active table');
  const titulo = document.querySelector('.tab-btn.active')?.textContent.trim() || 'reporte';
  if (!tabla) return;
  const contenido = `<!doctype html><html><head><meta charset="utf-8"></head><body><h1>${escaparHTML(titulo)}</h1>${tabla.outerHTML}</body></html>`;
  const blob = new Blob([contenido], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = `sicis-${titulo.toLowerCase().replaceAll(/[^a-záéíóúñ0-9]+/gi, '-')}-${periodoSeleccionado()}.xls`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

function imprimirReporte() {
  window.print();
}

async function cargarReporteConsumo() {
  try {
    const lista = await fetchAPI(`/reportes/consumo-mensual?periodo=${encodeURIComponent(periodoSeleccionado())}`);
    document.getElementById('tabla-reporte-consumo').innerHTML = lista.map(r => `
      <tr>
        <td>${escaparHTML(r.impresora)}</td>
        <td>${r.papel_total}</td>
        <td>${r.contador_minimo}</td>
        <td>${r.contador_maximo}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center">Sin datos</td></tr>';
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

async function cargarReporteToner() {
  try {
    const lista = await fetchAPI(`/reportes/toner?periodo=${encodeURIComponent(periodoSeleccionado())}`);
    document.getElementById('tabla-reporte-toner').innerHTML = lista.map(r => `
      <tr><td>${escaparHTML(r.impresora)}</td><td>${r.cambios_toner}</td></tr>
    `).join('') || '<tr><td colspan="2" style="text-align:center">Sin datos</td></tr>';

    const ctx = document.getElementById('chart-toner');
    if (ctx) {
      if (chartToner) chartToner.destroy();
      chartToner = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: lista.map(r => r.impresora),
          datasets: [{ label: 'Cambios de tóner', data: lista.map(r => r.cambios_toner), backgroundColor: '#8b5cf6' }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
      });
    }
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

async function cargarReporteProyeccion() {
  try {
    const lista = await fetchAPI('/reportes/proyeccion');
    document.getElementById('tabla-reporte-proyeccion').innerHTML = lista.map(r => `
      <tr>
        <td>${escaparHTML(r.suministro)}</td>
        <td>${r.cantidad_actual}</td>
        <td>${r.consumo_30_dias}</td>
        <td>${r.dias_restantes ?? '-'}</td>
        <td>${r.pedido_sugerido}</td>
        <td>${badgeSiNo(r.requiere_pedido)}</td>
      </tr>
    `).join('') || '<tr><td colspan="6" style="text-align:center">Sin datos</td></tr>';
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

// --- USUARIOS / CONFIGURACIÓN ---

async function cargarUsuarios() {
  try {
    const lista = await fetchAPI('/usuarios');
    document.getElementById('tabla-usuarios').innerHTML = lista.map(u => `
      <tr>
        <td>${u.nombre}</td>
        <td>${u.usuario}</td>
        <td>${normalizarRol(u.rol)}</td>
        <td>${u.activo ? '<span class="badge badge-verde">Activo</span>' : '<span class="badge badge-rojo">Inactivo</span>'}</td>
        <td class="acciones">
          <button class="btn-principal btn-sm" onclick="abrirModalUsuario(${u.id})">Editar</button>
          <button class="btn-danger btn-sm" onclick="eliminarUsuario(${u.id})">Eliminar</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center">Sin usuarios</td></tr>';
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

async function abrirModalUsuario(id) {
  editandoUsuarioId = id || null;
  let datos = { nombre: '', usuario: '', rol: 'operario', activo: true };
  if (id) {
    const lista = await fetchAPI('/usuarios');
    datos = lista.find(u => u.id === id) || datos;
  }
  document.getElementById('modal-form-titulo').textContent = id ? 'Editar perfil' : 'Nuevo perfil';
  document.getElementById('modal-form-contenido').innerHTML = `
    <form id="form-usuario" onsubmit="event.preventDefault(); guardarUsuario();" class="formulario">
      <div class="form-card-group">
        <label for="usr-nombre">Nombre *</label>
        <input type="text" id="usr-nombre" value="${datos.nombre}" required/>
      </div>
      <div class="form-card-group">
        <label for="usr-usuario">Usuario *</label>
        <input type="text" id="usr-usuario" value="${datos.usuario}" required/>
      </div>
      <div class="form-card-group">
        <label for="usr-password">Contraseña ${id ? '(dejar vacío para no cambiar)' : '*'}</label>
        <input type="password" id="usr-password" ${id ? '' : 'required'}/>
      </div>
      <div class="form-card-group">
        <label for="usr-rol">Rol *</label>
        <select id="usr-rol" required>
          <option value="administrador" ${normalizarRol(datos.rol) === 'administrador' ? 'selected' : ''}>Administrador</option>
          <option value="supervisor" ${normalizarRol(datos.rol) === 'supervisor' ? 'selected' : ''}>Supervisor</option>
          <option value="operario" ${normalizarRol(datos.rol) === 'operario' ? 'selected' : ''}>Operario</option>
          <option value="tecnico" ${normalizarRol(datos.rol) === 'tecnico' ? 'selected' : ''}>Técnico</option>
        </select>
      </div>
      <div class="form-card-group">
        <label for="usr-activo">Estado</label>
        <select id="usr-activo">
          <option value="true" ${datos.activo !== false ? 'selected' : ''}>Activo</option>
          <option value="false" ${datos.activo === false ? 'selected' : ''}>Inactivo</option>
        </select>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-secundario" onclick="cerrarModal('modal-formulario')">Cancelar</button>
        <button type="submit" class="btn-principal">Guardar</button>
      </div>
    </form>`;
  abrirModal('modal-formulario');
}

async function guardarUsuario() {
  const body = {
    nombre: document.getElementById('usr-nombre').value,
    usuario: document.getElementById('usr-usuario').value,
    rol: document.getElementById('usr-rol').value,
    activo: document.getElementById('usr-activo').value === 'true'
  };
  const pass = document.getElementById('usr-password').value;
  if (pass) body.password = pass;
  try {
    if (editandoUsuarioId) {
      await fetchAPI(`/usuarios/${editandoUsuarioId}`, { method: 'PUT', body: JSON.stringify(body) });
      mostrarMensaje('Perfil actualizado');
    } else {
      if (!pass) { mostrarMensaje('La contraseña es obligatoria', true); return; }
      await fetchAPI('/usuarios', { method: 'POST', body: JSON.stringify(body) });
      mostrarMensaje('Perfil creado');
    }
    cerrarModal('modal-formulario');
    cargarUsuarios();
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

async function eliminarUsuario(id) {
  if (!confirm('¿Eliminar este usuario?')) return;
  try {
    await fetchAPI(`/usuarios/${id}`, { method: 'DELETE' });
    mostrarMensaje('Usuario eliminado');
    cargarUsuarios();
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

// --- BITÁCORA DE AUDITORÍA ---

function escaparHTML(valor) {
  const node = document.createElement('span');
  node.textContent = String(valor ?? '');
  return node.innerHTML;
}

function parametrosAuditoria() {
  const params = new URLSearchParams();
  const accion = document.getElementById('filtro-auditoria-accion')?.value.trim();
  const desde = document.getElementById('filtro-auditoria-desde')?.value;
  const hasta = document.getElementById('filtro-auditoria-hasta')?.value;
  if (accion) params.set('accion', accion);
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  return params;
}

async function cargarAuditoria() {
  try {
    const lista = await fetchAPI(`/auditoria?${parametrosAuditoria()}`);
    document.getElementById('tabla-auditoria').innerHTML = lista.map(item => `
      <tr>
        <td>${escaparHTML(new Date(item.fecha).toLocaleString('es-SV'))}</td>
        <td>${escaparHTML(item.usuario || item.usuario_nombre || 'Sistema')}</td>
        <td>${escaparHTML(item.accion)}</td>
        <td>${escaparHTML(item.modulo)}</td>
        <td>${escaparHTML(item.direccion_ip || '-')}</td>
        <td><code>${escaparHTML(JSON.stringify(item.detalle || {}))}</code></td>
      </tr>
    `).join('') || '<tr><td colspan="6" style="text-align:center">Sin acciones registradas</td></tr>';
  } catch (err) {
    mostrarMensaje(err.message, true);
  }
}

function exportarAuditoriaCSV() {
  window.location.href = `${API_URL}/auditoria/exportar/csv?${parametrosAuditoria()}`;
}

function imprimirAuditoria() {
  window.print();
}

// --- ARRANQUE ---

let navegacionInicializada = false;

async function iniciarAplicacionReal() {
  const selectorPeriodo = document.getElementById('reporte-periodo');
  if (selectorPeriodo && !selectorPeriodo.value) selectorPeriodo.value = new Date().toISOString().slice(0, 7);
  const ok = await cargarSesion();
  if (!ok) return false;
  if (!navegacionInicializada) {
    initNavegacion();
    navegacionInicializada = true;
  }
  cargarSeccionDatos('dashboard');
  return true;
}

window.sicisBootstrap = iniciarAplicacionReal;

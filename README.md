# SICIS

Sistema Informático de Control de Impresiones y Suministros. La aplicación integra una interfaz animada con la operación real de PostgreSQL: autenticación, impresoras, suministros, mantenimientos, registros diarios, reportes, usuarios y auditoría.

## Tecnologías

- Frontend: Vite, JavaScript, GSAP, Three.js y Chart.js.
- Backend: Node.js, Express y sesiones HTTP.
- Base de datos: PostgreSQL.
- Despliegue: Docker Compose o ejecución local en Windows.

## Estructura

```text
.
├── frontend/              Aplicación Vite y experiencia visual
│   ├── public/            Módulos funcionales y lógica de datos
│   └── src/               Interfaz, animaciones y estilos
├── backend/               API, autenticación y acceso a PostgreSQL
├── scripts/               Inicio, reinicio y carga de datos en Windows
├── Dockerfile             Compilación multietapa
└── docker-compose.yml     Aplicación y PostgreSQL
```

Las dependencias y los artefactos generados (`node_modules` y `dist`) no se guardan en Git.

## Ejecución local

Requisitos: Node.js 20 o superior y PostgreSQL 12 o superior.

1. Configure la conexión mediante variables de entorno o los valores locales de `backend/db.js`.
2. Instale y compile el frontend:

```bash
cd frontend
npm ci
npm run build
```

3. Instale, inicialice y ejecute el backend:

```bash
cd ../backend
npm ci
npm run init-db
npm run migrate
npm start
```

4. Abra `http://localhost:3001/`.

En Windows también puede ejecutar `scripts\start.bat`; este instala dependencias cuando hacen falta, compila el frontend, aplica la inicialización/migración y levanta el servidor.

Para desarrollo visual use `npm run dev` dentro de `frontend`. Las operaciones que requieren datos deben ejecutarse con el backend disponible.

## Docker

Copie `.env.docker.example` como `.env`, reemplace las claves de ejemplo y ejecute:

```bash
docker compose up --build
```

Docker compila el frontend en una etapa separada, crea el contenedor de la API y conecta un PostgreSQL persistente. La aplicación queda disponible en `http://localhost:3001/`.

## Módulos

- Dashboard con indicadores y visualización de consumo.
- Impresoras con filtros por estado y operaciones CRUD según permisos.
- Inventario de suministros y movimientos de entrada/salida.
- Mantenimientos preventivos y correctivos.
- Registros diarios de uso, papel y tóner.
- Reportes y exportación.
- Administración de usuarios y roles.
- Auditoría de accesos y acciones.

## Roles

El backend aplica autorización por rol; ocultar una opción en la interfaz no sustituye esa validación.

| Rol | Alcance principal |
| --- | --- |
| Administrador | Acceso completo, usuarios y auditoría |
| Supervisor | Operación y reportes |
| Operario | Consulta y registros diarios |
| Técnico | Consulta y mantenimientos |

## Verificación antes de publicar

```bash
cd frontend
npm run build
```

Con PostgreSQL y el backend activos, compruebe `/health`, el inicio y cierre de sesión y la carga de cada módulo. No publique archivos `.env`, contraseñas reales ni secretos de sesión.

# Plan de mejoras y entrega estable de SICIS

## Implementado en esta versión

- Seguridad: contraseñas con bcrypt, regeneración de sesión al autenticar, cookie HttpOnly/SameSite, política para nuevas contraseñas, límites de intentos de inicio de sesión, validación de origen para solicitudes con cambios y cabeceras HTTP de protección.
- Trazabilidad: bitácora de acciones críticas con usuario, fecha, IP, módulo y detalle; filtros por acción/fecha; exportación CSV y vista imprimible para guardar como PDF.
- Operación: se preservan los permisos por rol y los módulos del MVP ya existentes (impresoras, suministros, movimientos, mantenimientos, registros, alertas, reportes y usuarios).
- Despliegue: variables de configuración documentadas en `backend/.env.example` y migración idempotente para la tabla de auditoría.

## Puesta en marcha

1. Cree la base de datos PostgreSQL y configure las variables del entorno siguiendo `backend/.env.example`.
2. Ejecute `npm install`, `npm run migrate` y `npm run seed` dentro de `backend`.
3. Inicie con `npm start`. Para producción use `NODE_ENV=production`, HTTPS y una `SESSION_SECRET` aleatoria.

### Despliegue con Docker

1. Copie `.env.docker.example` como `.env` y reemplace las dos claves de ejemplo por secretos fuertes.
2. Ejecute `docker compose up -d --build`.
3. Publique el puerto 3001 mediante un proxy inverso con HTTPS (Nginx, Caddy o el hosting elegido). El dominio, DNS, certificado y destino de copias de seguridad pertenecen a la infraestructura y no se pueden crear desde este repositorio.

El contenedor inicializa y migra la base de datos antes de exponer la aplicación. La configuración de CI también valida sintaxis y dependencias en cada envío a GitHub.

## Siguientes mejoras priorizadas

1. Reemplazar el almacenamiento de sesiones en memoria por PostgreSQL o Redis antes de usar múltiples instancias.
2. Configurar HTTPS, backup programado de PostgreSQL y monitoreo de salud en el host de producción.
3. Automatizar pruebas de API, flujos por rol y evaluación Lighthouse en CI.
4. Añadir exportación XLSX/PDF generada en servidor para reportes, con filtros de período persistentes.
5. Aplicar una política de retención de auditoría consensuada (por ejemplo, 24 meses) y copias de respaldo verificadas.

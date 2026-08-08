# Scripts de SICIS

## `start.bat`

Prepara y levanta la aplicación completa:

1. Instala las dependencias del frontend.
2. Genera la compilación Vite de producción.
3. Instala las dependencias del backend.
4. Inicializa el esquema y aplica las migraciones.
5. Inicia el servidor y abre `http://localhost:3001/`.

## `reset-database.bat`

Elimina los datos operativos y conserva los usuarios de acceso. Úselo sólo cuando realmente quiera reiniciar la información local.

## `seed-database.bat`

Aplica las migraciones y carga datos de desarrollo para recorrer los módulos de la aplicación.

## Comandos del backend

- `npm start`: inicia la API y sirve el frontend compilado.
- `npm run init-db`: crea el esquema inicial.
- `npm run migrate`: aplica las migraciones disponibles.
- `npm run seed`: carga datos de desarrollo.
- `npm run reset`: limpia los datos operativos.
- `npm run stop`: detiene la instancia local.
- `npm run restart`: reinicia el servidor.

Las credenciales de desarrollo se crean mediante los scripts de base de datos. No deben reutilizarse en producción.

# Inventario API (App 2 · Node.js)

API RESTful de inventario en **Node.js + Express** sobre **PostgreSQL
administrado**, desplegada en **Kompilo PaaS** desde GitHub con despliegue
automatico en cada `git push`. Incluye una pantalla (`/`) que consume la API.

El repositorio **no trae Dockerfile**: Kompilo detecta `package.json` y genera la
imagen (Node 22) por su cuenta, igual que los buildpacks de Render o Heroku.

## Endpoints

| Metodo | Ruta | Descripcion | Respuesta |
|---|---|---|---|
| GET | `/api` | Descripcion de la API | 200 |
| GET | `/api/productos?q=&categoria=` | Listar con filtros | 200 |
| GET | `/api/productos/:id` | Obtener uno | 200 / 404 |
| POST | `/api/productos` | Crear `{ nombre, precio, categoria?, stock? }` | 201 / 400 |
| PUT | `/api/productos/:id` | Reemplazar | 200 / 400 / 404 |
| PATCH | `/api/productos/:id` | Actualizar campos enviados | 200 / 400 / 404 |
| DELETE | `/api/productos/:id` | Eliminar | 204 / 404 |
| GET | `/api/estadisticas` | Totales del inventario | 200 |
| GET | `/healthz` | Sonda de salud (consulta la BD) | 200 / 503 |

```bash
URL=https://inventario.kompilo.site
curl -s -X POST $URL/api/productos -H 'Content-Type: application/json' \
     -d '{"nombre":"Teclado","categoria":"Perifericos","precio":25.5,"stock":10}'
curl -s $URL/api/productos
curl -s -X PATCH $URL/api/productos/1 -H 'Content-Type: application/json' -d '{"stock":7}'
curl -s -X DELETE $URL/api/productos/1 -i
```

## Variables de entorno

| Variable | Origen |
|---|---|
| `DATABASE_URL` | Kompilo, al crear la base PostgreSQL en el panel |
| `PORT` | Kompilo (puerto configurado en la app) |

Ninguna credencial esta en el codigo ni en el repositorio.

## Despliegue en Kompilo

1. En https://kompilo.site: **Desplegar desde GitHub** > este repositorio, rama `main`.
2. Puerto `8080`, ruta de salud `/healthz`, **despliegue automatico** activado.
3. En el detalle de la app: **Base de datos > Crear base PostgreSQL**.

## Probar en local

```bash
npm install
DATABASE_URL=postgresql://postgres:clave@localhost:5432/postgres npm start
```

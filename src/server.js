const express = require('express');
const os = require('node:os');
const path = require('node:path');
const { pool, iniciar } = require('./db');
const productos = require('./productos');

const PORT = Number(process.env.PORT ?? 8080);
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Descripcion de la API (util para la demo y el informe)
app.get('/api', (req, res) => {
  res.json({
    app: 'node-inventario',
    version: require('../package.json').version,
    pod: os.hostname(),
    node: process.version,
    subtitulo: process.env.APP_SUBTITULO || null,
    endpoints: {
      'GET    /api/productos': 'Lista (filtros ?q= y ?categoria=)',
      'GET    /api/productos/:id': 'Obtiene uno',
      'POST   /api/productos': 'Crea { nombre, precio, categoria?, stock? }',
      'PUT    /api/productos/:id': 'Reemplaza { nombre, precio, categoria?, stock? }',
      'PATCH  /api/productos/:id': 'Actualiza solo los campos enviados',
      'DELETE /api/productos/:id': 'Elimina',
      'GET    /api/estadisticas': 'Totales del inventario',
      'GET    /healthz': 'Sonda de salud (consulta la BD)',
    },
  });
});

app.use('/api/productos', productos);

app.get('/api/estadisticas', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT COUNT(*)::int                        AS productos,
             COALESCE(SUM(stock), 0)::int         AS unidades,
             COALESCE(SUM(precio * stock), 0)::float AS valor_inventario,
             COUNT(DISTINCT categoria)::int       AS categorias
      FROM productos`);
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// Sonda de Kompilo: solo responde 200 si la base responde
app.get('/healthz', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.type('text').send('ok');
  } catch {
    res.status(503).type('text').send('bd no disponible');
  }
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// JSON mal formado -> 400; el resto -> 500 sin filtrar detalles internos
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON invalido' });
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
});

iniciar()
  .then(() => app.listen(PORT, '0.0.0.0', () => console.log(`node-inventario escuchando en :${PORT}`)))
  .catch((e) => {
    console.error('No se pudo iniciar la base de datos:', e.message);
    process.exit(1);
  });

process.on('SIGTERM', () => pool.end().finally(() => process.exit(0)));

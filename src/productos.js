// Recurso REST /api/productos: CRUD completo en JSON.
const express = require('express');
const { pool } = require('./db');

const router = express.Router();

// Valida el cuerpo; `parcial` permite PATCH con solo algunos campos.
function validar(body, parcial = false) {
  const errores = [];
  const datos = {};
  if (body.nombre !== undefined || !parcial) {
    if (typeof body.nombre !== 'string' || !body.nombre.trim()) errores.push('nombre es obligatorio');
    else datos.nombre = body.nombre.trim().slice(0, 120);
  }
  if (body.categoria !== undefined) {
    datos.categoria = String(body.categoria).trim().slice(0, 60) || 'General';
  }
  if (body.precio !== undefined || !parcial) {
    const p = Number(body.precio);
    if (!Number.isFinite(p) || p < 0) errores.push('precio debe ser un numero >= 0');
    else datos.precio = p;
  }
  if (body.stock !== undefined) {
    const s = Number(body.stock);
    if (!Number.isInteger(s) || s < 0) errores.push('stock debe ser un entero >= 0');
    else datos.stock = s;
  }
  return { errores, datos };
}

const id = (req) => Number.parseInt(req.params.id, 10);

// GET /api/productos?q=texto&categoria=X
router.get('/', async (req, res, next) => {
  try {
    const filtros = [];
    const valores = [];
    if (req.query.q) {
      valores.push(`%${req.query.q}%`);
      filtros.push(`nombre ILIKE $${valores.length}`);
    }
    if (req.query.categoria) {
      valores.push(req.query.categoria);
      filtros.push(`categoria = $${valores.length}`);
    }
    const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
    const { rows } = await pool.query(`SELECT * FROM productos ${where} ORDER BY id DESC`, valores);
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/productos/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM productos WHERE id = $1', [id(req)]);
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// POST /api/productos
router.post('/', async (req, res, next) => {
  try {
    const { errores, datos } = validar(req.body ?? {});
    if (errores.length) return res.status(400).json({ errores });
    const { rows } = await pool.query(
      `INSERT INTO productos (nombre, categoria, precio, stock)
       VALUES ($1, COALESCE($2, 'General'), $3, COALESCE($4, 0)) RETURNING *`,
      [datos.nombre, datos.categoria ?? null, datos.precio, datos.stock ?? null],
    );
    res.status(201).location(`/api/productos/${rows[0].id}`).json(rows[0]);
  } catch (e) { next(e); }
});

// PUT reemplaza (nombre y precio obligatorios); PATCH actualiza solo lo enviado.
async function actualizar(req, res, next, parcial) {
  try {
    const { errores, datos } = validar(req.body ?? {}, parcial);
    if (errores.length) return res.status(400).json({ errores });
    const campos = Object.keys(datos);
    if (!campos.length) return res.status(400).json({ errores: ['nada que actualizar'] });
    const sets = campos.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE productos SET ${sets}, actualizado = now() WHERE id = $${campos.length + 1} RETURNING *`,
      [...campos.map((c) => datos[c]), id(req)],
    );
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (e) { next(e); }
}
router.put('/:id', (req, res, next) => actualizar(req, res, next, false));
router.patch('/:id', (req, res, next) => actualizar(req, res, next, true));

// DELETE /api/productos/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM productos WHERE id = $1', [id(req)]);
    if (!rowCount) return res.status(404).json({ error: 'Producto no encontrado' });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;

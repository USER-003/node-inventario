// Pool de PostgreSQL. La cadena de conexion viene SOLO del entorno:
// Kompilo inyecta DATABASE_URL al crear la base desde el panel.
const { Pool, types } = require('pg');

// NUMERIC (precio) llega como texto por defecto; en la API se quiere numero
types.setTypeParser(types.builtins.NUMERIC, Number.parseFloat);

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL: crea la base PostgreSQL desde el panel de Kompilo');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

const ESQUEMA = `
  CREATE TABLE IF NOT EXISTS productos (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(120)  NOT NULL,
    categoria   VARCHAR(60)   NOT NULL DEFAULT 'General',
    precio      NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    stock       INTEGER       NOT NULL DEFAULT 0 CHECK (stock >= 0),
    creado_en   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    actualizado TIMESTAMPTZ   NOT NULL DEFAULT now()
  )`;

// Justo despues de crear la base, PostgreSQL tarda unos segundos en aceptar
// conexiones: se reintenta hasta 90 s antes de rendirse.
async function iniciar() {
  for (let intento = 1; ; intento++) {
    try {
      await pool.query(ESQUEMA);
      return;
    } catch (e) {
      if (intento >= 30) throw e;
      console.log(`Esperando a PostgreSQL (${intento}/30): ${e.message}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

module.exports = { pool, iniciar };

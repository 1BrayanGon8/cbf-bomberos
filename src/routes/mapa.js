const router = require('express').Router();
const path = require('path');
const { configMapa } = require('../services/mapa');
const { ZOOM_MIN, ZOOM_MAX, dentroDelArea, obtenerTile } = require('../services/tiles');

// Teselas del mapa de calles. Es público porque la página de búsqueda del público también dibuja el mapa.
// Por defecto sirve TODO el mapa (todo el mundo). Si quieres limitarlo a una zona alrededor del centro,
// pon MAPA_AREA_KM=60 (por ejemplo) en el .env; 0 o vacío = sin límite.
const AREA_KM = Number(process.env.MAPA_AREA_KM) || 0;

router.get('/tiles/:z/:x/:y', async (req, res) => {
  const z = Number(req.params.z);
  const x = Number(req.params.x);
  const y = Number(String(req.params.y).replace(/\.png$/, ''));
  const n = 2 ** z;
  if (![z, x, y].every(Number.isInteger) || z < ZOOM_MIN || z > ZOOM_MAX || x < 0 || y < 0 || x >= n || y >= n) return res.status(400).end();

  try {
    if (AREA_KM > 0 && !dentroDelArea(z, x, y, await configMapa(), AREA_KM)) return res.status(403).end();
    const t = await obtenerTile(z, x, y);
    res.set('Cache-Control', 'public, max-age=604800');
    res.type('png');
    res.sendFile(path.resolve(t.archivo));
  } catch (e) {
    // Sin internet y sin la tesela guardada: el mapa sigue dibujándose, solo sin calles en esa zona.
    res.status(e.status || 504).end();
  }
});

module.exports = router;

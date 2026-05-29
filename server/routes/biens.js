// server/routes/biens.js
// Routes pour la gestion des biens immobiliers
// Rôle: contrôleur métier des biens et des filtres de recherche.

const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildFilters(query) {
  const {
    search,
    ville,
    villes,
    type,
    types,
    prix_min,
    prix_max,
    animaux,
    min_note,
    voyageurs,
    date_debut,
    date_fin,
    lat,
    lng,
    distance_km,
  } = query;

  const whereClauses = ["b.statut_validation = 'valide'"];
  const whereParams = [];
  const havingClauses = [];
  const havingParams = [];

  if (search) {
    whereClauses.push('(b.designation_bien LIKE ? OR b.description_biens LIKE ?)');
    whereParams.push(`%${search}%`, `%${search}%`);
  }

  // Support both single ville (legacy) and villes (comma-separated list)
  const villeList = villes
    ? String(villes).split(',').map(v => v.trim()).filter(Boolean)
    : ville ? [String(ville).trim()] : [];
  if (villeList.length === 1) {
    whereClauses.push('c.ville_nom LIKE ?');
    whereParams.push(`%${villeList[0]}%`);
  } else if (villeList.length > 1) {
    const placeholders = villeList.map(() => 'c.ville_nom LIKE ?').join(' OR ');
    whereClauses.push(`(${placeholders})`);
    villeList.forEach(v => whereParams.push(`%${v}%`));
  }

  if (type) {
    whereClauses.push('b.id_TypeBien = ?');
    whereParams.push(type);
  }

  if (types) {
    const parsedTypes = String(types)
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (parsedTypes.length > 0) {
      whereClauses.push(`b.id_TypeBien IN (${parsedTypes.map(() => '?').join(',')})`);
      whereParams.push(...parsedTypes);
    }
  }

  const prixMinNum = toNumber(prix_min);
  if (prixMinNum !== null) {
    whereClauses.push('COALESCE((SELECT MIN(t.prix_semaine) FROM tarifs t WHERE t.id_biens = b.id_biens), 0) >= ?');
    whereParams.push(prixMinNum);
  }

  const prixMaxNum = toNumber(prix_max);
  if (prixMaxNum !== null) {
    whereClauses.push('COALESCE((SELECT MIN(t.prix_semaine) FROM tarifs t WHERE t.id_biens = b.id_biens), 0) <= ?');
    whereParams.push(prixMaxNum);
  }

  if (animaux === 'true') {
    whereClauses.push('b.animaux_biens = 1');
  }

  const voyageursNum = toNumber(voyageurs);
  if (voyageursNum !== null) {
    whereClauses.push('b.nb_couchage >= ?');
    whereParams.push(voyageursNum);
  }

  if (date_debut && date_fin) {
    whereClauses.push(`
      b.id_biens NOT IN (
        SELECT r.id_biens
        FROM reservations r
        WHERE r.date_debut < ?
          AND r.date_fin > ?
      )
    `);
    whereParams.push(date_fin, date_debut);
  }

  const latNum = toNumber(lat);
  const lngNum = toNumber(lng);
  const distanceKmNum = toNumber(distance_km);

  if (latNum !== null && lngNum !== null && distanceKmNum !== null) {
    whereClauses.push(
      'ST_Distance_Sphere(POINT(c.ville_longitude_deg, c.ville_latitude_deg), POINT(?, ?)) <= ?'
    );
    whereParams.push(lngNum, latNum, distanceKmNum * 1000);
  }

  const equipements = query.equipements;
  if (equipements) {
    const ids = String(equipements)
      .split(',')
      .map((n) => Number(n.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    for (const id of ids) {
      whereClauses.push(
        'EXISTS (SELECT 1 FROM bien_equipement be WHERE be.id_biens = b.id_biens AND be.id_equipement = ?)'
      );
      whereParams.push(id);
    }
  }

  const minNoteNum = toNumber(min_note);
  if (minNoteNum !== null) {
    havingClauses.push('COALESCE(AVG(com.note), 0) >= ?');
    havingParams.push(minNoteNum);
  }

  return {
    whereSql: whereClauses.join(' AND '),
    whereParams,
    havingSql: havingClauses.length > 0 ? ` HAVING ${havingClauses.join(' AND ')}` : '',
    havingParams,
  };
}

function getSortSql(sort) {
  switch (sort) {
    case 'price_asc':
      return 'COALESCE((SELECT MIN(t.prix_semaine) FROM tarifs t WHERE t.id_biens = b.id_biens), 0) ASC';
    case 'price_desc':
      return 'COALESCE((SELECT MIN(t.prix_semaine) FROM tarifs t WHERE t.id_biens = b.id_biens), 0) DESC';
    case 'rating_desc':
      return 'note_moyenne DESC';
    case 'relevance':
    default:
      return 'b.id_biens DESC';
  }
}

// ─── GET /api/biens ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
    const requestedLimit = Number.parseInt(String(req.query.limit || '20'), 10) || 20;
    const limit = Math.min(Math.max(1, requestedLimit), 50);
    const offset = (page - 1) * limit;

    const { whereSql, whereParams, havingSql, havingParams } = buildFilters(req.query);

    const query = `
      SELECT b.*, c.ville_nom, c.ville_code_postal, tb.desc_type_bien,
             COALESCE(AVG(com.note), 0) as note_moyenne,
             COUNT(com.id_commentaire) as nb_avis,
             (SELECT pb.lien_photo FROM photos pb WHERE pb.id_biens = b.id_biens LIMIT 1) as photo_principale,
             (SELECT MIN(t.prix_semaine) FROM tarifs t WHERE t.id_biens = b.id_biens) as prix_semaine_min
      FROM biens b
      LEFT JOIN commune c ON b.id_commune = c.id_commune
      LEFT JOIN type_bien tb ON b.id_TypeBien = tb.id_typebien
      LEFT JOIN commentaires com ON b.id_biens = com.id_biens AND com.statut = 'publie'
      WHERE ${whereSql}
      GROUP BY b.id_biens
      ${havingSql}
      ORDER BY ${getSortSql(req.query.sort)}
      LIMIT ? OFFSET ?
    `;

    const params = [...whereParams, ...havingParams, limit, offset];
    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows });

  } catch (err) {
    console.error('[biens]', err);
    res.status(500).json({ success: false, error: 'Erreur base de données' });
  }
});

// ─── GET /api/biens/villes ──────────────────────────────────────────────────
router.get('/villes', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 1) return res.json({ success: true, data: [] });
    const [rows] = await pool.execute(
      `SELECT DISTINCT c.ville_nom
       FROM commune c
       INNER JOIN biens b ON b.id_commune = c.id_commune
       WHERE c.ville_nom LIKE ? AND b.statut_validation = 'valide'
       ORDER BY c.ville_nom
       LIMIT 10`,
      [`${q}%`]
    );
    res.json({ success: true, data: rows.map(r => r.ville_nom) });
  } catch (err) {
    console.error('[biens villes]', err);
    res.status(500).json({ success: false, error: 'Erreur base de données' });
  }
});

// ─── GET /api/biens/types ───────────────────────────────────────────────────
router.get('/types', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id_typebien, desc_type_bien FROM type_bien ORDER BY desc_type_bien'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[biens types]', err);
    res.status(500).json({ success: false, error: 'Erreur base de données' });
  }
});

// ─── GET /api/biens/count ───────────────────────────────────────────────────
router.get('/count', async (req, res) => {
  try {
    const { whereSql, whereParams, havingSql, havingParams } = buildFilters(req.query);

    const query = `
      SELECT COUNT(*) as total
      FROM (
        SELECT b.id_biens
        FROM biens b
        LEFT JOIN commune c ON b.id_commune = c.id_commune
        LEFT JOIN type_bien tb ON b.id_TypeBien = tb.id_typebien
        LEFT JOIN commentaires com ON b.id_biens = com.id_biens AND com.statut = 'publie'
        WHERE ${whereSql}
        GROUP BY b.id_biens
        ${havingSql}
      ) filtered
    `;

    const [rows] = await pool.execute(query, [...whereParams, ...havingParams]);
    res.json({ success: true, data: { total: rows[0]?.total ?? 0 } });
  } catch (err) {
    console.error('[biens count]', err);
    res.status(500).json({ success: false, error: 'Erreur base de données' });
  }
});

// ─── GET /api/biens/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT b.*, c.ville_nom, c.ville_code_postal, tb.desc_type_bien,
             COALESCE(AVG(com.note), 0) as note_moyenne,
             COUNT(com.id_commentaire) as nb_avis,
             (SELECT MIN(t.prix_semaine) FROM tarifs t WHERE t.id_biens = b.id_biens) as prix_semaine_min
      FROM biens b
      LEFT JOIN commune c ON b.id_commune = c.id_commune
      LEFT JOIN type_bien tb ON b.id_TypeBien = tb.id_typebien
      LEFT JOIN commentaires com ON b.id_biens = com.id_biens AND com.statut = 'publie'
      WHERE b.id_biens = ? AND b.statut_validation = 'valide'
      GROUP BY b.id_biens
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Bien introuvable' });
    }
    
    // Récupérer les photos
    const [photos] = await pool.execute(
      'SELECT lien_photo FROM photos WHERE id_biens = ?',
      [req.params.id]
    );
    
    const bien = { ...rows[0], photos: photos.map(p => p.lien_photo) };
    res.json({ success: true, data: bien });
    
  } catch (err) {
    console.error('[bien detail]', err);
    res.status(500).json({ success: false, error: 'Erreur base de données' });
  }
});

module.exports = router;
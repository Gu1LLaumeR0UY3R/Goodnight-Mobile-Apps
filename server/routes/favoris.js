// server/routes/favoris.js
// Routes pour la gestion des favoris

const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/favoris ────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT f.*, b.designation_bien, b.rue_biens, c.ville_nom,
             (SELECT pb.lien_photo FROM photos pb WHERE pb.id_biens = b.id_biens LIMIT 1) as photo_principale
      FROM favoris f
      JOIN biens b ON f.id_biens = b.id_biens
      LEFT JOIN commune c ON b.id_commune = c.id_commune
      WHERE f.id_locataire = ? AND b.statut_validation = 'valide'
      ORDER BY f.date_ajout DESC
    `, [req.user.id_locataire]);
    
    res.json({ success: true, data: rows });
    
  } catch (err) {
    console.error('[favoris]', err);
    res.status(500).json({ success: false, error: 'Erreur base de données' });
  }
});

// ─── POST /api/favoris ───────────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { id_biens } = req.body;
  
  if (!id_biens) {
    return res.status(400).json({ success: false, error: 'ID du bien requis' });
  }
  
  try {
    // Vérifier si déjà en favori
    const [existing] = await pool.execute(
      'SELECT id_favori FROM favoris WHERE id_locataire = ? AND id_biens = ?',
      [req.user.id_locataire, id_biens]
    );
    
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'Déjà en favori' });
    }
    
    await pool.execute(
      'INSERT INTO favoris (id_locataire, id_biens, date_ajout) VALUES (?, ?, NOW())',
      [req.user.id_locataire, id_biens]
    );
    
    res.json({ success: true, data: { message: 'Ajouté aux favoris' } });
    
  } catch (err) {
    console.error('[add favori]', err);
    res.status(500).json({ success: false, error: 'Erreur base de données' });
  }
});

// ─── DELETE /api/favoris/:id ─────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM favoris WHERE id_biens = ? AND id_locataire = ?',
      [req.params.id, req.user.id_locataire]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Favori introuvable' });
    }
    
    res.json({ success: true, data: { message: 'Retiré des favoris' } });
    
  } catch (err) {
    console.error('[remove favori]', err);
    res.status(500).json({ success: false, error: 'Erreur base de données' });
  }
});

module.exports = router;
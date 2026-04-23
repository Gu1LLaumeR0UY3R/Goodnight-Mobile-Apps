// server/routes/reservations.js
// Routes pour la gestion des réservations

const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/reservations ───────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT r.*, b.designation_bien, c.ville_nom,
             (SELECT pb.lien_photo FROM photos pb WHERE pb.id_biens = b.id_biens LIMIT 1) as photo_principale
      FROM reservations r
      JOIN biens b ON r.id_biens = b.id_biens
      LEFT JOIN commune c ON b.id_commune = c.id_commune
      WHERE r.id_locataire = ?
      ORDER BY r.date_debut DESC
    `, [req.user.id_locataire]);
    
    res.json({ success: true, data: rows });
    
  } catch (err) {
    console.error('[reservations]', err);
    res.status(500).json({ success: false, error: 'Erreur base de données' });
  }
});

// ─── POST /api/reservations ──────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { id_biens, date_debut, date_fin } = req.body;
  
  if (!id_biens || !date_debut || !date_fin) {
    return res.status(400).json({ success: false, error: 'Données manquantes' });
  }
  
  try {
    // Vérifier disponibilité
    const [conflicts] = await pool.execute(`
      SELECT id_reservation FROM reservations 
      WHERE id_biens = ? AND (
        (date_debut <= ? AND date_fin >= ?) OR
        (date_debut <= ? AND date_fin >= ?) OR
        (date_debut >= ? AND date_fin <= ?)
      )
    `, [id_biens, date_debut, date_debut, date_fin, date_fin, date_debut, date_fin]);
    
    if (conflicts.length > 0) {
      return res.status(409).json({ success: false, error: 'Dates non disponibles' });
    }
    
    const [result] = await pool.execute(
      'INSERT INTO reservations (id_locataire, id_biens, date_debut, date_fin, id_tarif) VALUES (?, ?, ?, ?, 1)',
      [req.user.id_locataire, id_biens, date_debut, date_fin]
    );
    
    res.json({ success: true, data: { id_reservation: result.insertId } });
    
  } catch (err) {
    console.error('[create reservation]', err);
    res.status(500).json({ success: false, error: 'Erreur base de données' });
  }
});

module.exports = router;
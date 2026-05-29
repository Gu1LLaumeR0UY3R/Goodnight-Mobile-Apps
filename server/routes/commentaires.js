// server/routes/commentaires.js
// Routes pour la gestion des commentaires et avis
// Rôle: contrôleur des avis publics associés aux biens.

const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/commentaires/:id_biens ─────────────────────────────────────────
router.get('/:id_biens', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT c.*, l.prenom_locataire as auteur_prenom,
             (SELECT COUNT(*) FROM commentaire_likes lc WHERE lc.id_commentaire = c.id_commentaire) as nb_likes
      FROM commentaires c
      JOIN locataire l ON c.id_locataire = l.id_locataire
      WHERE c.id_biens = ? AND c.statut = 'publie'
      ORDER BY c.date_creation DESC
    `, [req.params.id_biens]);
    
    res.json({ success: true, data: rows });
    
  } catch (err) {
    console.error('[commentaires]', err);
    res.status(500).json({ success: false, error: 'Erreur base de données' });
  }
});

// ─── POST /api/commentaires ──────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { id_biens, note, titre, contenu } = req.body;
  
  if (!id_biens || !contenu) {
    return res.status(400).json({ success: false, error: 'Bien et contenu requis' });
  }
  
  try {
    // Vérifier si l'utilisateur a déjà commenté ce bien
    const [existing] = await pool.execute(
      'SELECT id_commentaire FROM commentaires WHERE id_locataire = ? AND id_biens = ?',
      [req.user.id_locataire, id_biens]
    );
    
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'Vous avez déjà commenté ce bien' });
    }
    
    const [result] = await pool.execute(
      'INSERT INTO commentaires (id_biens, id_locataire, note, titre, contenu, date_creation, statut) VALUES (?, ?, ?, ?, ?, NOW(), "publie")',
      [id_biens, req.user.id_locataire, note || null, titre || null, contenu]
    );
    
    res.json({ success: true, data: { id_commentaire: result.insertId } });
    
  } catch (err) {
    console.error('[create commentaire]', err);
    res.status(500).json({ success: false, error: 'Erreur base de données' });
  }
});

module.exports = router;
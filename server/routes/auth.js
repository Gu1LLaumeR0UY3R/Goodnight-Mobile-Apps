// server/routes/auth.js
// Routes d'authentification : login, register, me

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email et mot de passe requis' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM locataire WHERE email_locataire = ? LIMIT 1',
      [email.trim()]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_locataire);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id_locataire: user.id_locataire, email: user.email_locataire },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    delete user.password_locataire;
    res.json({ success: true, data: { token, user } });

  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ success: false, error: 'Erreur base de données' });
  }
});

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { nom, prenom, email, telephone, mot_de_passe } = req.body;

  if (!nom || !prenom || !email || !mot_de_passe) {
    return res.status(400).json({ success: false, error: 'Nom, prénom, email et mot de passe sont requis' });
  }

  if (mot_de_passe.length < 6) {
    return res.status(400).json({ success: false, error: 'Le mot de passe doit contenir au moins 6 caractères' });
  }

  try {
    const [existing] = await pool.execute(
      'SELECT id_locataire FROM locataire WHERE email_locataire = ? LIMIT 1',
      [email.trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'Cet email est déjà utilisé' });
    }

    const hash = await bcrypt.hash(mot_de_passe, 10);

    const [result] = await pool.execute(
      'INSERT INTO locataire (nom_locataire, prenom_locataire, email_locataire, tel_locataire, password_locataire) VALUES (?, ?, ?, ?, ?)',
      [nom, prenom, email.trim(), telephone ?? null, hash]
    );

    const [rows] = await pool.execute(
      'SELECT * FROM locataire WHERE id_locataire = ? LIMIT 1',
      [result.insertId]
    );
    const newUser = rows[0];
    delete newUser.password_locataire;

    const token = jwt.sign(
      { id_locataire: newUser.id_locataire, email: newUser.email_locataire },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({ success: true, data: { token, user: newUser } });

  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ success: false, error: 'Erreur base de données' });
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM locataire WHERE id_locataire = ? LIMIT 1',
      [req.user.id_locataire]
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur introuvable' });
    }

    delete user.password_locataire;
    res.json({ success: true, data: user });

  } catch (err) {
    console.error('[me]', err);
    res.status(500).json({ success: false, error: 'Erreur base de données' });
  }
});

module.exports = router;

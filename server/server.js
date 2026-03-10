// server/server.js
// Point d'entrée principal du serveur API Goodnight

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const pool    = require('./config/database');

const authRoutes = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ── Route de test (ping BDD) ─────────────────────────────────────────────────
app.get('/api/ping', async (_req, res) => {
  try {
    const [rows] = await pool.execute('SELECT 1 + 1 AS result');
    res.json({ success: true, data: { message: 'Connexion BDD OK', result: rows[0].result } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Impossible de joindre la BDD : ' + err.message });
  }
});

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route introuvable' });
});

// ── Démarrage ────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Serveur Goodnight API démarré sur http://0.0.0.0:${PORT}`);
  console.log(`   → Ping BDD : http://localhost:${PORT}/api/ping`);
  console.log(`   → Login    : POST http://localhost:${PORT}/api/auth/login`);
});

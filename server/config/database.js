// server/config/database.js
// Connexion MySQL2 avec pool de connexions (équivalent PDO en PHP)

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306'),
  database:           process.env.DB_NAME     || 'goodnight',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASS     || '',
  charset:            'utf8mb4',
  waitForConnections: true,
  connectionLimit:    10,
});

module.exports = pool;

// db.js - PostgreSQL bağlantısı + tablo init
require("dotenv").config();
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set in environment");
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // Render Postgres için gerekli
  },
});

// Uygulama başlarken tabloyu oluştur
async function initDb() {
  const client = await pool.connect();
  try {
    // USERS
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("Users table is ready.");

    // MEALS
    await client.query(`
      CREATE TABLE IF NOT EXISTS meals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        meal_date DATE NOT NULL,
        meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack','other')),
        description TEXT NOT NULL,
        grams NUMERIC NOT NULL,
        energy_per100 NUMERIC,
        protein_per100 NUMERIC,
        fat_per100 NUMERIC,
        carb_per100 NUMERIC,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("Meals table is ready.");
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initDb,
};

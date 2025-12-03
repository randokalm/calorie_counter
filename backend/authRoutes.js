// authRoutes.js - PostgreSQL tabanlı auth
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool } = require("./db");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-this";
const JWT_EXPIRES_IN = "7d";

function isValidEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email format." });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters." });
    }

    const client = await pool.connect();
    try {
      // email var mı?
      const existing = await client.query(
        "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
        [email]
      );
      if (existing.rows.length > 0) {
        return res
          .status(409)
          .json({ error: "This email is already registered." });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const insert = await client.query(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
        [email, passwordHash]
      );

      const newUser = insert.rows[0];

      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(201).json({
        message: "User registered successfully.",
        token,
        user: { id: newUser.id, email: newUser.email },
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT id, email, password_hash FROM users WHERE LOWER(email) = LOWER($1)",
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: "Invalid credentials." });
      }

      const user = result.rows[0];

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        return res.status(401).json({ error: "Invalid credentials." });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        message: "Login successful.",
        token,
        user: { id: user.id, email: user.email },
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// JWT middleware aynı kalıyor
function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { userId, email, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = {
  authRouter: router,
  authRequired,
};

// authRoutes.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Normalde bunlar DB'de olur; şimdilik RAM'de bir array.
const users = []; // { id, email, passwordHash }

// TOKEN için secret - gerçekte .env'den gelmeli
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-this";
const JWT_EXPIRES_IN = "7d";

// Küçük yardımcı: email valid mi
function isValidEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

// --- POST /auth/register ---
// body: { email, password }
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

    const existing = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
      return res
        .status(409)
        .json({ error: "This email is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      id: users.length + 1,
      email,
      passwordHash,
    };
    users.push(newUser);

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
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- POST /auth/login ---
// body: { email, password }
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.json({
      message: "Login successful.",
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Middleware: JWT doğrulama ---
// Bunu daha sonra "kişiye özel öğünler" için kullanacağız
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

// Bu middleware'i dışarı da export edelim
module.exports = {
  authRouter: router,
  authRequired,
};

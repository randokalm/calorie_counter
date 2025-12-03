// mealsRoutes.js - kullanıcıya özel öğün kayıtları
const express = require("express");
const { pool } = require("./db");

const router = express.Router();

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "other"];

// yyyy-mm-dd formatını kabaca kontrol
function isValidDateString(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

// Geçerli sayıysa number, değilse null döner
function toNullableNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// POST /api/meals
// body: { date, mealType, description, grams, energyPer100, proteinPer100, fatPer100, carbPer100 }
// authRequired middleware'inden gelen req.user.userId'yi kullanıyoruz
router.post("/", async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      date,
      mealType,
      description,
      grams,
      energyPer100,
      proteinPer100,
      fatPer100,
      carbPer100,
    } = req.body;

    if (!date || !isValidDateString(date)) {
      return res
        .status(400)
        .json({ error: "Invalid or missing date (YYYY-MM-DD)." });
    }

    if (!MEAL_TYPES.includes(mealType)) {
      return res
        .status(400)
        .json({ error: "mealType must be one of: " + MEAL_TYPES.join(", ") });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ error: "Description is required." });
    }

    const gramsNum = Number(grams);
    if (!Number.isFinite(gramsNum) || gramsNum <= 0) {
      return res
        .status(400)
        .json({ error: "grams must be a positive number." });
    }

    const client = await pool.connect();
    try {
      const insert = await client.query(
        `
        INSERT INTO meals
          (user_id, meal_date, meal_type, description, grams,
           energy_per100, protein_per100, fat_per100, carb_per100)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING
          id, meal_date, meal_type, description, grams,
          energy_per100, protein_per100, fat_per100, carb_per100, created_at
        `,
        [
          userId,
          date,
          mealType,
          description.trim(),
          gramsNum,
          toNullableNumber(energyPer100),
          toNullableNumber(proteinPer100),
          toNullableNumber(fatPer100),
          toNullableNumber(carbPer100),
        ]
      );

      const row = insert.rows[0];

      const factor = gramsNum / 100;
      const totalCalories = row.energy_per100
        ? Number(row.energy_per100) * factor
        : null;
      const totalProtein = row.protein_per100
        ? Number(row.protein_per100) * factor
        : null;
      const totalFat = row.fat_per100 ? Number(row.fat_per100) * factor : null;
      const totalCarb = row.carb_per100
        ? Number(row.carb_per100) * factor
        : null;

      res.status(201).json({
        id: row.id,
        date: row.meal_date,
        mealType: row.meal_type,
        description: row.description,
        grams: row.grams,
        energyPer100: row.energy_per100,
        proteinPer100: row.protein_per100,
        fatPer100: row.fat_per100,
        carbPer100: row.carb_per100,
        totals: {
          calories: totalCalories,
          protein: totalProtein,
          fat: totalFat,
          carbs: totalCarb,
        },
        createdAt: row.created_at,
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Add meal error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/meals?date=YYYY-MM-DD
router.get("/", async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const date = req.query.date;
    if (!date || !isValidDateString(date)) {
      return res
        .status(400)
        .json({ error: "Missing or invalid date parameter (YYYY-MM-DD)." });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        SELECT
          id, meal_date, meal_type, description, grams,
          energy_per100, protein_per100, fat_per100, carb_per100, created_at
        FROM meals
        WHERE user_id = $1 AND meal_date = $2
        ORDER BY meal_type, created_at;
        `,
        [userId, date]
      );

      const rows = result.rows.map((row) => {
        const grams = Number(row.grams);
        const factor = grams / 100;

        const totalCalories = row.energy_per100
          ? Number(row.energy_per100) * factor
          : null;
        const totalProtein = row.protein_per100
          ? Number(row.protein_per100) * factor
          : null;
        const totalFat = row.fat_per100
          ? Number(row.fat_per100) * factor
          : null;
        const totalCarb = row.carb_per100
          ? Number(row.carb_per100) * factor
          : null;

        return {
          id: row.id,
          date: row.meal_date,
          mealType: row.meal_type,
          description: row.description,
          grams,
          energyPer100: row.energy_per100,
          proteinPer100: row.protein_per100,
          fatPer100: row.fat_per100,
          carbPer100: row.carb_per100,
          totals: {
            calories: totalCalories,
            protein: totalProtein,
            fat: totalFat,
            carbs: totalCarb,
          },
          createdAt: row.created_at,
        };
      });

      res.json(rows);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Get meals error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/meals/:id
// DELETE /api/meals/:id
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid meal id." });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        "DELETE FROM meals WHERE id = $1 AND user_id = $2",
        [id, userId]
      );

      // meal bulunmasa bile "success" diyelim, önemli olan UI'dan gitmesi
      res.json({
        success: true,
        deleted: result.rowCount > 0,
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Delete meal error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});



module.exports = {
  mealsRouter: router,
};

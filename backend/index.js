// index.js  -- backend using FOOD-DATA-GROUP1-5.csv and serving React build

const express = require("express");
const cors = require("cors");
const path = require("path");
const { loadNutrients } = require("./nutrientLoader");

const app = express();
app.use(cors());

// ==== FRONTEND BUILD SERVE ====
// ../frontend/dist klasörünü static olarak sun
const frontendPath = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(frontendPath));

// Root isteğini React'in index.html'ine yönlendir
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ==== API ====

// Bu dizi FOOD-DATA-GROUP csv lerinden gelecek
let foods = [];

// /api/foods?q=apple
app.get("/api/foods", (req, res) => {
  const q = (req.query.q || "").toLowerCase();

  let results = foods;

  if (q) {
    results = foods.filter((item) => item.descriptionLower.includes(q));
  }

  // isimlere göre sırala
  results.sort((a, b) =>
    (a.description || "").localeCompare(b.description || "")
  );

  res.json(results.slice(0, 50));
});

// ==== INIT ====

async function init() {
  foods = await loadNutrients();
  console.log("Foods loaded from nutrient CSV files:", foods.length);

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

init().catch((err) => {
  console.error("Failed to init server:", err);
});

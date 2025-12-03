// index.js  -- backend using FOOD-DATA-GROUP1-5.csv only

const express = require("express");
const cors = require("cors");
const { loadNutrients } = require("./nutrientLoader");

const app = express();
app.use(cors());

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

async function init() {
  foods = await loadNutrients();
  console.log("Foods loaded from nutrient CSV files:", foods.length);

  const PORT = 4000;
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

init().catch((err) => {
  console.error("Failed to init server:", err);
});

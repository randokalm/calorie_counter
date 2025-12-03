// nutrientLoader.js - read FOOD-DATA-GROUP1-5.csv and return array of foods
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

// normalize for future use (şu an sadece name tuttuğumuz için lazım değil ama dursun)
function normalizeName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function parseNumber(value) {
  if (value === undefined || value === null) return NaN;
  const s = String(value).replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

// Bütün group CSV'leri okuyup tek array döner
function loadNutrients() {
  return new Promise((resolve) => {
    const items = [];
    const dataDir = path.join(__dirname, "data");

    // Sadece FOOD-DATA-GROUP*.csv dosyalarını al
    const files = fs
      .readdirSync(dataDir)
      .filter(
        (name) =>
          name.toUpperCase().startsWith("FOOD-DATA-GROUP") &&
          name.toLowerCase().endsWith(".csv")
      );

    if (files.length === 0) {
      console.warn("No FOOD-DATA-GROUP*.csv files found in", dataDir);
      return resolve(items);
    }

    console.log("Loading nutrient files:", files);

    let index = 0;

    const processNext = () => {
      if (index >= files.length) {
        console.log("Nutrient rows loaded:", items.length);
        return resolve(items);
      }

      const fileName = files[index++];
      const filePath = path.join(dataDir, fileName);
      console.log("Reading:", filePath);

      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => {
          // Dosyadaki gerçek kolon adları:
          // food, Caloric Value, Fat, Carbohydrates, Protein, ...
          const desc = row.food || row.Food || row.FOOD;
          if (!desc) return;

          const energy = parseNumber(row["Caloric Value"]);
          const fat = parseNumber(row["Fat"]);
          const carbs = parseNumber(row["Carbohydrates"]);
          const protein = parseNumber(row["Protein"]);

          // Hepsi NaN ise satırı at
          if (
            !Number.isFinite(energy) &&
            !Number.isFinite(fat) &&
            !Number.isFinite(carbs) &&
            !Number.isFinite(protein)
          ) {
            return;
          }

          items.push({
            description: desc,
            descriptionLower: String(desc).toLowerCase(),
            normalizedName: normalizeName(desc),
            energyKcal: energy,
            proteinG: protein,
            fatG: fat,
            carbG: carbs,
          });
        })
        .on("end", () => {
          console.log("Finished:", fileName);
          processNext();
        })
        .on("error", (err) => {
          console.error("Error reading", fileName, err.message);
          processNext();
        });
    };

    processNext();
  });
}

module.exports = {
  loadNutrients,
  normalizeName,
};

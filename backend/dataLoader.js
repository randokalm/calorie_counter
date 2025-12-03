// dataLoader.js
const path = require("path");
const xlsx = require("xlsx");

function loadFoodDisplayTable() {
  // data klasörünün yolu
  const dataDir = path.join(__dirname, "data");

  // Excel dosyasının tam yolu
  const filePath = path.join(dataDir, "Food_Display_Table.xlsx");

  // Excel dosyasını oku
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // Sayfayı JSON diziye çevir
  const rows = xlsx.utils.sheet_to_json(sheet);
  return rows;
}

module.exports = { loadFoodDisplayTable };

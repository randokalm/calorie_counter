import { useState } from "react";
import "./App.css";

function App() {
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // grams per food (default 100g)
  const [gramsMap, setGramsMap] = useState({});
  const [selectedFood, setSelectedFood] = useState(null);

  const getKeyForFood = (food, index) =>
    food.description ? `${food.description}-${index}` : `idx-${index}`;

  const getGramsForFood = (food, index) => {
    const key = getKeyForFood(food, index);
    return gramsMap[key] ?? 100;
  };

  const setGramsForFood = (food, index, value) => {
    const key = getKeyForFood(food, index);
    let v = value;
    if (v === "") {
      v = "";
    } else {
      v = Number(v);
      if (!Number.isFinite(v) || v < 0) v = 0;
    }

    setGramsMap((prev) => ({
      ...prev,
      [key]: v,
    }));
  };

  const handleSelectFood = (food, index) => {
    setSelectedFood({ food, index });
    const key = getKeyForFood(food, index);
    setGramsMap((prev) => ({
      ...prev,
      [key]: prev[key] ?? 100,
    }));
  };

  // backend search
  const searchFoods = async (value) => {
    const q = value.trim();
    if (!q) {
      setFoods([]);
      setSelectedFood(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        "http://localhost:4000/api/foods?q=" + encodeURIComponent(q)
      );

      if (!res.ok) {
        throw new Error("API error: " + res.status);
      }

      const data = await res.json();
      setFoods(data);
      setSelectedFood(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // search as you type
  const handleQueryChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    searchFoods(value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    searchFoods(query);
  };

  const renderSelectedFoodCard = () => {
    if (!selectedFood) {
      return (
        <div className="card card-empty">
          Start by typing in the search box on the left, then click on a food to
          see calories and macros here.
        </div>
      );
    }

    const { food, index } = selectedFood;

    const baseCalories = Number(food.energyKcal);
    const baseProtein = Number(food.proteinG);
    const baseFat = Number(food.fatG);
    const baseCarb = Number(food.carbG);

    const gramsRaw = getGramsForFood(food, index);
    const grams = gramsRaw === "" ? 0 : gramsRaw;
    const factor = grams / 100; // assume per 100 g in dataset

    const totalCalories = Number.isFinite(baseCalories)
      ? baseCalories * factor
      : undefined;
    const totalProtein = Number.isFinite(baseProtein)
      ? baseProtein * factor
      : undefined;
    const totalFat = Number.isFinite(baseFat) ? baseFat * factor : undefined;
    const totalCarb = Number.isFinite(baseCarb) ? baseCarb * factor : undefined;

    return (
      <div className="card card-detail">
        <h2 className="card-title">{food.description}</h2>

        <p className="card-subtitle">
          Values are assumed to be given per <strong>100 g</strong> in the
          dataset. Enter how many grams you want to eat.
        </p>

        <div className="field">
          <label className="field-label">Amount (grams)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={gramsRaw}
            onChange={(e) => setGramsForFood(food, index, e.target.value)}
            className="input input-grams"
          />
        </div>

        <div className="section">
          {Number.isFinite(baseCalories) && (
            <>
              <div className="section-row">
                <span>Per 100 g</span>
                <span className="value-strong">
                  {baseCalories.toFixed(1)} kcal
                </span>
              </div>
              <div className="section-row">
                <span>
                  For <span className="value-strong">{grams}g</span>
                </span>
                <span className="value-strong">
                  {totalCalories !== undefined
                    ? totalCalories.toFixed(1)
                    : "N/A"}{" "}
                  kcal
                </span>
              </div>
            </>
          )}
        </div>

        <div className="section section-macros">
          <div className="section-heading">Macros</div>

          <div className="section-row">
            <span>Protein</span>
            <span>
              {Number.isFinite(baseProtein) ? (
                <>
                  <span className="mono">
                    {baseProtein.toFixed(2)} g / 100 g
                  </span>
                  {" → "}
                  <span className="value-strong">
                    {totalProtein !== undefined
                      ? totalProtein.toFixed(2)
                      : "0.00"}{" "}
                    g
                  </span>{" "}
                  for {grams} g
                </>
              ) : (
                "N/A"
              )}
            </span>
          </div>

          <div className="section-row">
            <span>Fat</span>
            <span>
              {Number.isFinite(baseFat) ? (
                <>
                  <span className="mono">{baseFat.toFixed(2)} g / 100 g</span>
                  {" → "}
                  <span className="value-strong">
                    {totalFat !== undefined ? totalFat.toFixed(2) : "0.00"} g
                  </span>{" "}
                  for {grams} g
                </>
              ) : (
                "N/A"
              )}
            </span>
          </div>

          <div className="section-row">
            <span>Carbs</span>
            <span>
              {Number.isFinite(baseCarb) ? (
                <>
                  <span className="mono">{baseCarb.toFixed(2)} g / 100 g</span>
                  {" → "}
                  <span className="value-strong">
                    {totalCarb !== undefined ? totalCarb.toFixed(2) : "0.00"} g
                  </span>{" "}
                  for {grams} g
                </>
              ) : (
                "N/A"
              )}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-root">
      <div className="app-container">
        <header className="app-header">
          <h1>Calorie Counter</h1>
          <p>
            Start typing (e.g. <code>app</code> for apple). Results update as
            you type. Click a food on the left and enter grams to see calories
            and macros.
          </p>
        </header>

        <form className="search-form" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="Search food (e.g. egg, apple, rice)"
            value={query}
            onChange={handleQueryChange}
            className="input input-search"
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>

        {loading && <p className="status-text">Loading...</p>}
        {error && <p className="status-text error">{error}</p>}

        <div className="layout">
          {/* Left: results list */}
          <div className="results-panel">
            {query.trim() && (
              <div className="results-header">
                Results for: <span className="value-strong">{query}</span>
              </div>
            )}

            {foods.length === 0 ? (
              <div className="results-empty">
                No results yet. Try searching for something like{" "}
                <code>apple</code> or <code>egg</code>.
              </div>
            ) : (
              <div className="results-list">
                {foods.map((food, index) => {
                  const key = getKeyForFood(food, index);
                  const isSelected =
                    selectedFood &&
                    getKeyForFood(selectedFood.food, selectedFood.index) ===
                      key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectFood(food, index)}
                      className={
                        "result-item" +
                        (isSelected ? " result-item--active" : "")
                      }
                    >
                      {food.description}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: details */}
          <div className="detail-panel">{renderSelectedFoodCard()}</div>
        </div>
      </div>
    </div>
  );
}

export default App;

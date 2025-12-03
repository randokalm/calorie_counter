import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Bugünün tarihini YYYY-MM-DD olarak verir
function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function App() {
  // ===== AUTH STATE =====
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [authError, setAuthError] = useState("");
  const [currentUser, setCurrentUser] = useState(null); // { id, email } | null
  const [token, setToken] = useState(null);

  // ===== CALORIE SEARCH STATE =====
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gramsMap, setGramsMap] = useState({});
  const [selectedFood, setSelectedFood] = useState(null);

  // ===== MEALS STATE (for selected date) =====
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [meals, setMeals] = useState([]); // backend /api/meals cevabı

  // İlk açılışta token ve user'ı localStorage'dan çek
  useEffect(() => {
    const savedToken = localStorage.getItem("cc_token");
    const savedUser = localStorage.getItem("cc_user");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("cc_token");
        localStorage.removeItem("cc_user");
      }
    }
  }, []);

  // ========= COMMON HELPERS =========

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

  // ===== AUTH HANDLERS =====

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");

    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Email and password are required.");
      return;
    }

    const endpoint = authMode === "register" ? "/auth/register" : "/auth/login";

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: authEmail.trim(),
          password: authPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || "Authentication error.");
        return;
      }

      if (data.token && data.user) {
        setToken(data.token);
        setCurrentUser(data.user);
        localStorage.setItem("cc_token", data.token);
        localStorage.setItem("cc_user", JSON.stringify(data.user));
      }

      setAuthPassword("");
      setAuthError("");
    } catch (err) {
      setAuthError(err.message || "Network error.");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem("cc_token");
    localStorage.removeItem("cc_user");
    setMeals([]);
  };

  // ===== FOOD SEARCH HANDLERS =====

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
        `${API_BASE}/api/foods?q=` + encodeURIComponent(q)
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

  const handleQueryChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    searchFoods(value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    searchFoods(query);
  };

  // ===== MEAL HANDLER =====

  const fetchMealsForDate = async (dateStr) => {
    if (!currentUser || !token) {
      setMeals([]);
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE}/api/meals?date=` + encodeURIComponent(dateStr),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        console.error("Fetch meals error:", await res.text());
        setMeals([]);
        return;
      }
      const data = await res.json();
      setMeals(data);
    } catch (err) {
      console.error("Fetch meals error:", err);
      setMeals([]);
    }
  };

  // Seçili tarih veya login durumu değişince o günü çek
  useEffect(() => {
    if (token && currentUser) {
      fetchMealsForDate(selectedDate);
    } else {
      setMeals([]);
    }
  }, [selectedDate, token, currentUser]);

  const addMealEntry = async (mealType, food, grams) => {
    if (!currentUser || !token) {
      window.location.href = "/auth";
      return;
    }

    const gramsNum = Number(grams);
    if (!Number.isFinite(gramsNum) || gramsNum <= 0) {
      alert("Please enter a valid grams amount before adding to a meal.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/meals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: selectedDate,
          mealType, // "breakfast" | "lunch" | "dinner" | "snack" | "other"
          description: food.description,
          grams: gramsNum,
          energyPer100: Number(food.energyKcal),
          proteinPer100: Number(food.proteinG),
          fatPer100: Number(food.fatG),
          carbPer100: Number(food.carbG),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Add meal error:", data);
        alert(data.error || "Failed to add meal.");
        return;
      }

      alert(
        `Added to ${mealType}:\n${data.description} – ${data.grams} g, ${
          data.totals?.calories != null
            ? data.totals.calories.toFixed(1) + " kcal"
            : "kcal ?"
        }`
      );

      // Günün listesini güncelle
      fetchMealsForDate(selectedDate);
    } catch (err) {
      console.error("Add meal error:", err);
      alert("Network error while adding meal.");
    }
  };

  const deleteMealEntry = async (mealId) => {
    if (!currentUser || !token) {
      window.location.href = "/auth";
      return;
    }

    if (!window.confirm("Do you want to remove this item from your diary?")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/meals/${mealId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        // Artık 404 dönmüyoruz ama yine de kontrol dursun
        const data = await res.json().catch(() => ({}));
        console.error("Delete meal error:", data);
        alert(data.error || "Failed to delete meal.");
        return;
      }

      // Başarılı silme → mevcut günü yeniden çek
      fetchMealsForDate(selectedDate);
    } catch (err) {
      console.error("Delete meal error:", err);
      alert("Network error while deleting meal.");
    }
  };


  // ===== RENDER =====

  return (
    <Router>
      <div className="app-root">
        <div className="app-container">
          <TopBar currentUser={currentUser} onLogout={handleLogout} />

          <Routes>
            <Route
              path="/"
              element={
                <CaloriePage
                  query={query}
                  foods={foods}
                  loading={loading}
                  error={error}
                  selectedFood={selectedFood}
                  handleQueryChange={handleQueryChange}
                  handleSearchSubmit={handleSearchSubmit}
                  handleSelectFood={handleSelectFood}
                  getKeyForFood={getKeyForFood}
                  getGramsForFood={getGramsForFood}
                  setGramsForFood={setGramsForFood}
                  onAddMeal={addMealEntry}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  meals={meals}
                  onDeleteMeal={deleteMealEntry}
                />
              }
            />
            <Route
              path="/auth"
              element={
                <AuthPage
                  authEmail={authEmail}
                  setAuthEmail={setAuthEmail}
                  authPassword={authPassword}
                  setAuthPassword={setAuthPassword}
                  authMode={authMode}
                  setAuthMode={setAuthMode}
                  authError={authError}
                  handleAuthSubmit={handleAuthSubmit}
                  currentUser={currentUser}
                />
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

/* ====== TOP BAR ====== */

function TopBar({ currentUser, onLogout }) {
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith("/auth");

  return (
    <div className="topbar">
      <div className="topbar-left">
        <Link to="/" className="brand">
          Calorie Counter
        </Link>
      </div>
      <div className="topbar-right">
        {!currentUser && !isAuthPage && (
          <Link to="/auth" className="nav-link nav-link-primary">
            Login / Register
          </Link>
        )}

        {!currentUser && isAuthPage && (
          <Link to="/" className="nav-link">
            ← Back to app
          </Link>
        )}

        {currentUser && (
          <div className="topbar-user">
            <span className="topbar-user-email">{currentUser.email}</span>
            <button className="btn btn-outline btn-sm" onClick={onLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ====== AUTH PAGE ====== */

function AuthPage({
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authMode,
  setAuthMode,
  authError,
  handleAuthSubmit,
  currentUser,
}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate("/");
    }
  }, [currentUser, navigate]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">
          {authMode === "login" ? "Login" : "Create an account"}
        </h2>
        <p className="auth-subtitle">
          Use your email and a password to sign{" "}
          {authMode === "login" ? "in" : "up"}.
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={
              "auth-tab" + (authMode === "login" ? " auth-tab--active" : "")
            }
            onClick={() => setAuthMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={
              "auth-tab" + (authMode === "register" ? " auth-tab--active" : "")
            }
            onClick={() => setAuthMode("register")}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleAuthSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            className="input input-auth"
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            className="input input-auth"
            autoComplete={
              authMode === "login" ? "current-password" : "new-password"
            }
          />

          {authError && (
            <div className="status-text error auth-error">{authError}</div>
          )}

          <button type="submit" className="btn btn-primary auth-submit">
            {authMode === "login" ? "Login" : "Create account"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Want to go back without logging in?{" "}
            <Link to="/" className="nav-link-inline">
              Return to app
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ====== CALORIE PAGE ====== */

function CaloriePage({
  query,
  foods,
  loading,
  error,
  selectedFood,
  handleQueryChange,
  handleSearchSubmit,
  handleSelectFood,
  getKeyForFood,
  getGramsForFood,
  setGramsForFood,
  onAddMeal,
  selectedDate,
  setSelectedDate,
  meals,
  onDeleteMeal,
}) {
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
    const factor = grams / 100;

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

        {/* Add to meal buttons */}
        <div className="section section-addmeal">
          <div className="section-heading">Add to meal</div>
          <div className="meal-buttons">
            {["breakfast", "lunch", "dinner", "snack", "other"].map(
              (mealType) => (
                <button
                  key={mealType}
                  type="button"
                  className="btn btn-meal"
                  onClick={() => onAddMeal(mealType, food, grams)}
                >
                  {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    );
  };


  return (
    <>
      <div className="top-row">
        <p className="app-subtitle">
          Start typing (e.g. <code>app</code> for apple). Results update as you
          type. Click a food on the left and enter grams to see calories and
          macros.
        </p>

        <div className="date-picker-wrapper">
          <span className="field-label">Date</span>
          <input
            type="date"
            className="input input-date-pretty"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>
      
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
      <div className="layout layout-with-summary">
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
                  getKeyForFood(selectedFood.food, selectedFood.index) === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectFood(food, index)}
                    className={
                      "result-item" + (isSelected ? " result-item--active" : "")
                    }
                  >
                    {food.description}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Middle: details */}
        <div className="detail-panel">{renderSelectedFoodCard()}</div>

        {/* Right: daily summary */}
        <DailySummaryPanel
          date={selectedDate}
          meals={meals}
          onDeleteMeal={onDeleteMeal}
        />
      </div>
    </>
  );
}

/* ====== DAILY SUMMARY PANEL ====== */

function DailySummaryPanel({ date, meals, onDeleteMeal }) {
  // meals: array of { mealType, description, grams, totals: { calories, protein, fat, carbs } }

  const groups = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
    other: [],
  };

  const dailyTotals = {
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
  };

  for (const m of meals || []) {
    const mt = m.mealType;
    if (!groups[mt]) groups[mt] = [];
    groups[mt].push(m);

    const t = m.totals || {};
    dailyTotals.calories += Number(t.calories || 0);
    dailyTotals.protein += Number(t.protein || 0);
    dailyTotals.fat += Number(t.fat || 0);
    dailyTotals.carbs += Number(t.carbs || 0);
  }

  const hasAnyMeals = meals && meals.length > 0;

  const formatKcal = (v) => Math.round(Number(v || 0));

  const formatGrams = (v) => Number(v || 0).toFixed(1);

  return (
    <div className="summary-panel">
      <div className="summary-header">
        <div className="summary-title">Daily summary</div>
        <div className="summary-date">{date}</div>
      </div>

      {!hasAnyMeals && (
        <div className="summary-empty">
          No meals recorded for this date yet.
          <br />
          Add foods to Breakfast, Lunch, Dinner, Snack or Other to see them
          here.
        </div>
      )}

      {hasAnyMeals && (
        <>
          <div className="summary-card summary-total-card">
            <div className="summary-total-row">
              <span>Total calories</span>
              <span className="value-strong">
                {formatKcal(dailyTotals.calories)} kcal
              </span>
            </div>
            <div className="summary-total-macros">
              <span>Protein: {formatGrams(dailyTotals.protein)} g</span>
              <span>Fat: {formatGrams(dailyTotals.fat)} g</span>
              <span>Carbs: {formatGrams(dailyTotals.carbs)} g</span>
            </div>
          </div>

          <div className="summary-meals">
            {["breakfast", "lunch", "dinner", "snack", "other"].map(
              (mealType) => {
                const items = groups[mealType] || [];
                if (items.length === 0) return null;

                const title =
                  mealType.charAt(0).toUpperCase() + mealType.slice(1);

                return (
                  <div
                    key={mealType}
                    className="summary-card summary-meal-card"
                  >
                    <div className="summary-meal-title">{title}</div>
                    <ul className="summary-meal-list">
                      {items.map((m) => (
                        <li key={m.id} className="summary-meal-item">
                          <div className="summary-meal-desc">
                            {m.description}
                          </div>
                          <div className="summary-meal-meta">
                            <span>{m.grams} g</span>
                            {m.totals?.calories != null && (
                              <span>{formatKcal(m.totals.calories)} kcal</span>
                            )}
                            {onDeleteMeal && (
                              <button
                                type="button"
                                className="summary-meal-delete"
                                onClick={() => onDeleteMeal(m.id)}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;

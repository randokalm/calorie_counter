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
                  setQuery={setQuery}
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
                  onLogout={handleLogout}
                />
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

/* ====== TOP BAR (Calorie Counter solda, Login/Register sağda) ====== */

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

/* ====== AUTH PAGE (/auth) ====== */

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
  onLogout,
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

/* ====== CALORIE PAGE (/) ====== */

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
      </div>
    );
  };

  return (
    <>
      <p className="app-subtitle">
        Start typing (e.g. <code>app</code> for apple). Results update as you
        type. Click a food on the left and enter grams to see calories and
        macros.
      </p>

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

        {/* Right: details */}
        <div className="detail-panel">{renderSelectedFoodCard()}</div>
      </div>
    </>
  );
}

export default App;

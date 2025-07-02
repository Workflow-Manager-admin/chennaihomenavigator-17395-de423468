import React, { useState, useEffect } from "react";
import "./App.css";
import * as api from "./api";
import UserProfile from "./UserProfile";
import ScheduleViewingModal from "./ScheduleViewingModal";
import ChatWindow from "./ChatWindow";
// Add reviews import
import Reviews from "./Reviews";

// Hardcoded amenities list for demo (should come from backend ideally)
const AMENITIES = [
  "Parking",
  "Balcony",
  "Power Backup",
  "Swimming Pool",
  "Gym",
  "Garden",
  "Lift",
  "24x7 Security",
  "Playground",
];

// PUBLIC_INTERFACE
function App() {
  // Theme switcher
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  const toggleTheme = () =>
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));

  // Demo UI state
  const [user, setUser] = useState(null);
  const [registerForm, setRegisterForm] = useState({
    email: "",
    phone: "",
    password: "",
    name: "",
  });
  const [propertyList, setPropertyList] = useState([]);
  const [fetchErr, setFetchErr] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // --- ENHANCED FILTER STATE ---
  const [filters, setFilters] = useState({
    location: "",
    property_type: "",
    min_price: "",
    max_price: "",
    sale_type: "", // rent or purchase
    amenities: [], // Array of strings
  });
  const [chatMsg, setChatMsg] = useState("");
  const [wsMessages, setWsMessages] = useState([]);
  const [activeChat, setActiveChat] = useState(null);

  // User onboarding/profile modal state (null: hidden, "onboard" or "edit": shown)
  const [showProfile, setShowProfile] = useState(null);

  // After new registration, indicate if onboarding needed (if no profile found automatically show onboarding modal)
  const [requireOnboarding, setRequireOnboarding] = useState(false);

  // FIELD VALIDATION STATES
  const [validation, setValidation] = useState({}); // {min_price: "Must be greater than 0", ...}

  // Register a demo user
  async function handleRegister(e) {
    e.preventDefault();
    setFetchErr("");
    try {
      const u = await api.registerUser(registerForm);
      setUser(u);
      setRequireOnboarding(true);
      setShowProfile("onboard");
    } catch (err) {
      setFetchErr(err.message);
    }
  }

  // Validate filters before fetching
  function validateFilters() {
    const errs = {};
    if (
      filters.min_price !== "" &&
      (isNaN(Number(filters.min_price)) || Number(filters.min_price) < 0)
    ) {
      errs.min_price = "Minimum price must be a positive number";
    }
    if (
      filters.max_price !== "" &&
      (isNaN(Number(filters.max_price)) || Number(filters.max_price) < 0)
    ) {
      errs.max_price = "Maximum price must be a positive number";
    }
    if (
      filters.min_price !== "" &&
      filters.max_price !== "" &&
      Number(filters.min_price) > Number(filters.max_price)
    ) {
      errs.max_price = "Maximum price must be greater than minimum price";
    }
    setValidation(errs);
    return Object.keys(errs).length === 0;
  }

  // Fetch properties with filters
  // PUBLIC_INTERFACE
  async function fetchProperties(auto = false) {
    // auto=true disables validation (used on mount)
    setFetchErr("");
    if (!auto && !validateFilters()) return;
    setIsLoading(true);
    try {
      // Only send filters with non-blank values
      const filterReq = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (k === "amenities" && Array.isArray(v) && v.length > 0) {
          filterReq[k] = v.join(",");
        } else if (v !== "" && !(Array.isArray(v) && v.length === 0)) {
          filterReq[k] = v;
        }
      });
      const props = await api.listProperties(filterReq);
      setPropertyList(Array.isArray(props) ? props : []);
    } catch (err) {
      setFetchErr(err.message || "Could not fetch property listings.");
    } finally {
      setIsLoading(false);
    }
  }

  // Auto-fetch properties on mount
  useEffect(() => {
    fetchProperties(true);
    // eslint-disable-next-line
  }, []);

  // Fetch on filter change ("live search" UX, but not for every keystroke, only for controlled fields)
  useEffect(() => {
    fetchProperties(true);
    // eslint-disable-next-line
  }, [filters.sale_type, filters.property_type, filters.amenities]);

  // Connect WebSocket for chat
  useEffect(() => {
    if (!user?.id) return;
    const ws = api.openChatWebSocket(user.id, {
      onMessage: (msg) => setWsMessages((old) => [...old, msg]),
    });
    setActiveChat(ws);
    return () => {
      ws && ws.close();
    };
  }, [user?.id]);

  // Check for no profile: onboarding logic
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        await api.getProfile(user.id);
        setRequireOnboarding(false);
      } catch {
        setRequireOnboarding(true);
        setShowProfile("onboard");
      }
    })();
  }, [user?.id]);

  function sendMessage(e) {
    e.preventDefault();
    if (activeChat && chatMsg && user) {
      activeChat.send(JSON.stringify({ message: chatMsg, to: 2 }));
      setChatMsg("");
    }
  }

  // Handle amenity toggle for multi-select UI
  function handleAmenityChange(am) {
    setFilters((f) => {
      let next = Array.isArray(f.amenities) ? [...f.amenities] : [];
      if (next.includes(am)) {
        next = next.filter((a) => a !== am);
      } else {
        next.push(am);
      }
      return { ...f, amenities: next };
    });
  }

  // Viewing scheduling state
  const [showScheduleModal, setShowScheduleModal] = useState({
    open: false,
    property: null,
  });

  // Chat state (floating chat UI trigger)
  const [showChat, setShowChat] = useState(false);
  // If user clicks "Chat on this property", we can set property/contact context; otherwise, general support chat.
  const [chatContext, setChatContext] = useState(null);

  // --- AI Recommendations Section state ---

  // UI: filter form for property search + recommendation button section
  return (
    <div className="App">
      <header className="App-header">
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
        <h1>HomeQuestAI Demo UI</h1>
        {/* Registration */}
        {!user && (
          <form onSubmit={handleRegister} style={{ margin: 16 }}>
            <div>
              <input
                placeholder="Email"
                value={registerForm.email}
                onChange={(e) =>
                  setRegisterForm((f) => ({ ...f, email: e.target.value }))
                }
              />
              <input
                placeholder="Phone"
                value={registerForm.phone}
                onChange={(e) =>
                  setRegisterForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
              <input
                placeholder="Password"
                type="password"
                value={registerForm.password}
                onChange={(e) =>
                  setRegisterForm((f) => ({ ...f, password: e.target.value }))
                }
              />
              <input
                placeholder="Name"
                value={registerForm.name}
                onChange={(e) =>
                  setRegisterForm((f) => ({ ...f, name: e.target.value }))
                }
              />
              <button type="submit">Register</button>
            </div>
          </form>
        )}
        {user && (
          <div style={{ color: "var(--text-secondary)" }}>
            Logged in as: {user.email} &nbsp;
            <button
              style={{
                background: "var(--border-color)",
                color: "#222",
                border: "none",
                borderRadius: 7,
                padding: "6px 16px",
                marginLeft: 8,
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 500,
              }}
              onClick={() => setShowProfile("edit")}
              title="Edit profile"
            >
              Edit Profile
            </button>
          </div>
        )}

        {/* User Onboarding/Profile Modal */}
        {user && showProfile && (
          <div
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 999,
            }}
          >
            <div
              style={{
                background: "white",
                borderRadius: 18,
                minWidth: 370,
                boxShadow: "0 6px 44px rgba(0,0,0,0.22)",
              }}
            >
              <UserProfile
                user={user}
                onProfileSaved={() => {
                  setShowProfile(null);
                  setRequireOnboarding(false);
                }}
                onCancel={() => {
                  if (requireOnboarding) return;
                  setShowProfile(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Fetch properties */}
        <div style={{ margin: "1rem 0" }}>
          {/* --- FILTERS (rental/purchase, budget, amenities, location) --- */}
          <form
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 10,
              background: "var(--bg-secondary)",
              borderRadius: 10,
              padding: 12,
              boxShadow: "0 1px 8px rgba(0,0,0,0.03)",
            }}
            onSubmit={(e) => {
              e.preventDefault();
              fetchProperties();
            }}
            autoComplete="off"
            noValidate
          >
            <input
              style={{
                borderRadius: 6,
                border: "1px solid var(--border-color)",
                padding: "8px",
              }}
              type="text"
              placeholder="Location"
              value={filters.location}
              onChange={(e) =>
                setFilters((f) => ({ ...f, location: e.target.value }))
              }
            />

            <select
              style={{
                borderRadius: 6,
                border: "1px solid var(--border-color)",
                padding: "8px",
              }}
              value={filters.sale_type}
              onChange={(e) =>
                setFilters((f) => ({ ...f, sale_type: e.target.value }))
              }
              required
            >
              <option value="">Rent or Buy?</option>
              <option value="rental">Rental</option>
              <option value="purchase">Purchase</option>
            </select>

            <select
              style={{
                borderRadius: 6,
                border: "1px solid var(--border-color)",
                padding: "8px",
              }}
              value={filters.property_type}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  property_type: e.target.value,
                }))
              }
            >
              <option value="">Type</option>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="villa">Villa</option>
              <option value="plot">Plot</option>
            </select>

            <input
              style={{
                width: 90,
                borderRadius: 6,
                border: validation.min_price
                  ? "1.5px solid crimson"
                  : "1px solid var(--border-color)",
                padding: "8px",
              }}
              type="number"
              min="0"
              step="1"
              placeholder="Min ₹"
              value={filters.min_price}
              onChange={(e) =>
                setFilters((f) => ({ ...f, min_price: e.target.value }))
              }
            />
            <input
              style={{
                width: 90,
                borderRadius: 6,
                border: validation.max_price
                  ? "1.5px solid crimson"
                  : "1px solid var(--border-color)",
                padding: "8px",
              }}
              type="number"
              min="0"
              step="1"
              placeholder="Max ₹"
              value={filters.max_price}
              onChange={(e) =>
                setFilters((f) => ({ ...f, max_price: e.target.value }))
              }
            />

            {/* AMENITIES MULTI-SELECT */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                padding: "2px 10px",
                maxWidth: 220,
                minHeight: 40,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: "#999",
                  fontWeight: 500,
                  marginRight: 3,
                }}
              >
                Amenities:
              </span>
              {AMENITIES.map((am) => (
                <label
                  key={am}
                  style={{
                    fontSize: 12,
                    color: "var(--text-primary)",
                    marginRight: 4,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title={am}
                >
                  <input
                    type="checkbox"
                    checked={Array.isArray(filters.amenities) && filters.amenities.includes(am)}
                    onChange={() => handleAmenityChange(am)}
                    style={{
                      marginRight: 2,
                      accentColor: "#81b29a",
                    }}
                  />
                  {am}
                </label>
              ))}
            </div>

            <button
              className="theme-toggle"
              type="submit"
              style={{
                position: "static",
                fontWeight: 500,
                borderRadius: 8,
                opacity: isLoading ? 0.7 : 1,
              }}
              disabled={isLoading}
              title="Apply Filters"
            >
              {isLoading ? "Loading..." : "See Properties"}
            </button>
          </form>
          {/* FIELD ERRORS */}
          <div style={{ minHeight: 18, marginTop: -5 }}>
            {Object.values(validation).map((v, idx) => (
              <span
                style={{
                  color: "crimson",
                  fontSize: 13,
                  marginRight: 9,
                }}
                key={idx}
              >
                {v}
              </span>
            ))}
          </div>
        </div>

        {/* --- AI Recommendations Section --- */}
        {user && (
          <div
            style={{
              margin: "40px auto 0 auto",
              maxWidth: 570,
              background: "var(--bg-secondary)",
              border: "2px solid var(--accent, #f4cb89)",
              borderRadius: 18,
              padding: 18,
              boxShadow: "0 1px 14px rgba(244,203,137,0.11)",
            }}
          >
            <h2 style={{ color: "#81b29a", marginBottom: 13, fontWeight: 700 }}>
              🧠 AI Property Matchmaker
            </h2>
            <div style={{ color: "#666", fontSize: 15, marginBottom: 13 }}>
              Click below to get personalized property recommendations powered by AI, using your profile/interests:
            </div>
            <AIRecommendations user={user} />
          </div>
        )}

        {/* PROPERTY LISTINGS */}
        <div style={{ minHeight: 180 }}>
          {isLoading && (
            <div style={{ color: "var(--text-secondary)" }}>
              Loading properties...
            </div>
          )}

          {!isLoading && fetchErr && (
            <div style={{ color: "crimson", margin: "10px 0" }}>{fetchErr}</div>
          )}

          {!isLoading && propertyList.length === 0 && !fetchErr && (
            <div
              style={{
                color: "var(--text-secondary)",
                fontStyle: "italic",
              }}
            >
              No properties found.&nbsp;
              <button
                style={{
                  background: "none",
                  color: "var(--text-secondary)",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
                onClick={() => fetchProperties()}
              >
                Reload
              </button>
            </div>
          )}
          {!isLoading && propertyList.length > 0 && (
            <div>
              <h2 style={{ color: "var(--text-primary)", marginBottom: 14 }}>
                Properties
              </h2>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "20px",
                  justifyContent: "center",
                  alignItems: "stretch",
                }}
              >
                {propertyList.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: 10,
                      boxShadow: "0 2px 7px rgba(0,0,0,0.05)",
                      padding: 16,
                      width: 290, // Wider to fit reviews nicely
                      minHeight: 120,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      position: "relative"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>
                        {p.title || (<span style={{ color: "#aaa" }}>Untitled</span>)}
                      </div>
                      <div style={{
                        fontSize: 14,
                        color: "var(--text-secondary)",
                        margin: "8px 0",
                      }}>
                        {p.property_type
                          ? p.property_type.charAt(0).toUpperCase() + p.property_type.slice(1)
                          : "Type Unknown"}
                        {" · "}
                        ₹{p.price?.toLocaleString?.() ?? p.price ?? "N/A"}
                        {p.sale_type
                          ? " · " + (p.sale_type === "rental" ? "Rental" : "Purchase")
                          : ""}
                      </div>
                      <div style={{
                        fontSize: 15,
                        fontWeight: 500,
                        color: "#6b8e75",
                      }}>
                        {p.location || (<span style={{ color: "#aaa" }}>
                          Location not specified
                        </span>)}
                      </div>
                      {Array.isArray(p.amenities) && p.amenities.length > 0 && (
                        <div style={{ color: "#927e34", fontSize: 12, marginTop: 5, marginBottom: 3 }}>
                          Amenities: {p.amenities.join(", ")}
                        </div>
                      )}
                      {p.description && (
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--text-secondary)",
                            marginTop: 5,
                            marginBottom: 2,
                          }}
                        >
                          {p.description?.slice(0, 75)}
                          {p.description?.length > 75 ? "..." : ""}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>
                      Listed by {p.listed_by_name || `User #${p.listed_by || "?"}`}
                    </div>
                    <div style={{
                      marginTop: 12,
                      display: "flex",
                      gap: 8,
                      justifyContent: "center"
                    }}>
                      <button
                        style={{
                          background: "#81b29a",
                          color: "#fff",
                          border: "none",
                          borderRadius: 7,
                          fontWeight: 600,
                          padding: "7px 16px",
                          cursor: "pointer",
                          fontSize: 15,
                          marginTop: 3,
                          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                          transition: "all 0.2s",
                        }}
                        onClick={() =>
                          setShowScheduleModal({
                            open: true,
                            property: p,
                          })
                        }
                        title="Schedule a viewing"
                      >📅 Schedule Viewing</button>
                      <button
                        style={{
                          background: "var(--accent, #f4cb89)",
                          color: "#6c4322",
                          border: "none",
                          borderRadius: 7,
                          fontWeight: 500,
                          padding: "7px 14px",
                          cursor: "pointer",
                          fontSize: 15,
                          marginTop: 3,
                          boxShadow: "0 1px 3px rgba(244,203,137,0.14)",
                          transition: "all 0.19s",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                        onClick={() => {
                          setShowChat(true);
                          setChatContext({
                            contact: { id: p.listed_by, name: p.listed_by_name || `User #${p.listed_by}`, phone: p.listed_by_phone },
                            property: p
                          });
                        }}
                        title="Chat about this property"
                      >💬 Chat</button>
                    </div>
                    {/* --- Reviews panel (expand/collapse for compactness, real UX could improve further) --- */}
                    <div style={{ margin: "9px -8px 0 -8px" }}>
                      <Reviews
                        propertyId={p.id}
                        user={user}
                        // You can extend this: e.g., isModerator={user?.is_admin}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floating Chat Trigger */}
        {user && (
          <>
            {!showChat && (
              <button
                style={{
                  position: "fixed",
                  right: 32,
                  bottom: 38,
                  zIndex: 1001,
                  background: "linear-gradient(90deg,#81b29a 70%,#f4cb89 100%)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 17,
                  padding: "13px 24px",
                  borderRadius: 18,
                  boxShadow: "0 5px 30px rgba(129,178,154,0.20)",
                  border: "none",
                  cursor: "pointer",
                  letterSpacing: 0.1,
                  transition: "all 0.19s",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
                onClick={() => {
                  setShowChat(true);
                  setChatContext(null); // General support chat unless set from property
                }}
                title="Open in-app chat"
              >
                <span role="img" aria-label="chat">💬</span> Chat
              </button>
            )}
            {showChat && (
              <ChatWindow
                user={user}
                contact={chatContext?.contact}
                property={chatContext?.property}
                onClose={() => {
                  setShowChat(false);
                  setChatContext(null);
                }}
              />
            )}
          </>
        )}

        {/* Error display */}
        {fetchErr && <div style={{ color: "red" }}>{fetchErr}</div>}

        {/* Scheduling Modal */}
        {showScheduleModal.open && (
          <ScheduleViewingModal
            property={showScheduleModal.property}
            user={user}
            onClose={() =>
              setShowScheduleModal({ open: false, property: null })
            }
          />
        )}

        {/* Extend: add more sections for scheduling, AI recs, reviews, etc. */}
      </header>
    </div>
  );
}

// --- AI Recommendations Button & Results ---
function AIRecommendations({ user }) {
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState(null); // array of properties or null
  const [error, setError] = React.useState("");
  // Give memory of last load (show last fetched results after page reload until logout)
  React.useEffect(() => {
    setResults(null);
    setError("");
    setLoading(false);
  }, [user?.id]);

  // PUBLIC_INTERFACE
  async function handleGetRecommendations() {
    setLoading(true);
    setError("");
    setResults(null);
    try {
      // try/catch here in case API throws
      const aiResults = await api.getAIRecommendations(user.id);
      if (!Array.isArray(aiResults) || aiResults.length === 0) {
        setError("No personalized matches were found at this time.");
        setResults([]);
      } else {
        setResults(aiResults);
      }
    } catch (err) {
      setError(err?.message || "Failed to load AI recommendations.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div>
      <button
        style={{
          background: "linear-gradient(90deg,#81b29a 60%, #f4cb89 100%)",
          color: "#fff",
          fontWeight: 600,
          border: "none",
          borderRadius: 12,
          fontSize: 17,
          boxShadow: "0 2px 13px rgba(244,203,137,0.11)",
          marginBottom: 10,
          minWidth: 185,
          minHeight: 42,
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.68 : 1,
          transition: "background 0.18s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 9,
        }}
        disabled={loading}
        onClick={handleGetRecommendations}
        title="Get personalized AI property recommendations"
      >
        <span role="img" aria-label="wand">✨</span>
        {loading ? "Finding matches..." : "Show AI Matches"}
      </button>
      <div style={{ minHeight: 27, fontSize: 15, color: error ? "#b12d2d" : "#6b8e75", marginTop: 3, marginBottom: 3 }}>
        {error && <>⚠️ {error}</>}
      </div>
      {!loading && Array.isArray(results) && (
        <div>
          {results.length === 0 && !error && (
            <div style={{ color: "#999", fontSize: 14, textAlign: "center", marginTop: 9 }}>
              No recommendations found for your current profile. Try updating your profile details.
            </div>
          )}
          {results.length > 0 && (
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 17,
              justifyContent: "center",
              marginTop: 11
            }}>
              {results.map((rec, idx) => (
                <div
                  key={rec.id || idx}
                  style={{
                    background: "var(--bg-primary)",
                    border: "1.5px solid #81b29a",
                    borderRadius: 13,
                    minWidth: 215,
                    maxWidth: 295,
                    minHeight: 86,
                    padding: "13px 13px 9px 17px",
                    boxShadow: "0 2px 8px rgba(41,122,82,0.08)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 17, color: "#406e55" }}>
                    {(rec.title || "Recommended Property")}
                  </div>
                  <div style={{ fontSize: 14, color: "#6b8e75", margin: "5px 0 2px 0" }}>
                    {rec.location || "Location N/A"} | {rec.property_type ? (rec.property_type.charAt(0).toUpperCase() + rec.property_type.slice(1)) : "Type N/A"}
                  </div>
                  <div style={{ fontSize: 15, color: "#b38632", fontWeight: 500 }}>
                    ₹{rec.price?.toLocaleString?.() ?? rec.price ?? "N/A"}
                  </div>
                  {Array.isArray(rec.amenities) && rec.amenities.length > 0 &&
                    <div style={{ fontSize: 12, color: "#927e34", marginTop: 2, marginBottom: 1 }}>
                      Amenities: {rec.amenities.join(", ")}
                    </div>
                  }
                  {rec.description && (
                    <div style={{ fontSize: 13, color: "#5e5e5e", marginTop: 3 }}>
                      {rec.description?.slice(0, 68)}{rec.description?.length > 68 ? "..." : ""}
                    </div>
                  )}
                  {/* Extend: Add "View Details" or "Schedule Viewing" here if linking to property page */}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;

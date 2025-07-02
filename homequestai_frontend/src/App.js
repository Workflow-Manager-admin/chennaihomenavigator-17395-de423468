import React, { useState, useEffect } from "react";
import "./App.css";
import * as api from "./api";
import UserProfile from "./UserProfile";

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
  const [filters, setFilters] = useState({
    location: "",
    property_type: "",
    min_price: "",
    max_price: "",
    // Future: add more filters as needed
  });
  const [chatMsg, setChatMsg] = useState("");
  const [wsMessages, setWsMessages] = useState([]);
  const [activeChat, setActiveChat] = useState(null);

  // User onboarding/profile modal state (null: hidden, "onboard" or "edit": shown)
  const [showProfile, setShowProfile] = useState(null);

  // After new registration, indicate if onboarding needed (if no profile found automatically show onboarding modal)
  const [requireOnboarding, setRequireOnboarding] = useState(false);

  // Register a demo user
  async function handleRegister(e) {
    e.preventDefault();
    setFetchErr("");
    try {
      const u = await api.registerUser(registerForm);
      setUser(u);
      // Onboarding required after registration!
      setRequireOnboarding(true);
      setShowProfile("onboard");
    } catch (err) {
      setFetchErr(err.message);
    }
  }

  // Fetch properties
  // PUBLIC_INTERFACE
  async function fetchProperties() {
    setFetchErr("");
    setIsLoading(true);
    try {
      // Prepare filters object, remove empty keys for cleaner API requests
      const filterReq = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== "") filterReq[k] = v;
      });
      const props = await api.listProperties(filterReq);
      setPropertyList(Array.isArray(props) ? props : []);
    } catch (err) {
      setFetchErr(err.message || "Could not fetch property listings.");
    } finally {
      setIsLoading(false);
    }
  }

  // Connect WebSocket for chat
  useEffect(() => {
    if (!user?.id) return;
    const ws = api.openChatWebSocket(user.id, {
      onMessage: (msg) => setWsMessages((old) => [...old, msg]),
    });
    setActiveChat(ws);
    return () => { ws && ws.close(); };
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
        {user && <div style={{ color: "var(--text-secondary)" }}>
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
          >Edit Profile</button>
        </div>}

        {/* User Onboarding/Profile Modal */}
        {user && showProfile && (
          <div style={{
            position: "fixed",
            left: 0, top: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 999
          }}>
            <div style={{ background: "white", borderRadius: 18, minWidth: 370, boxShadow: "0 6px 44px rgba(0,0,0,0.22)" }}>
              <UserProfile
                user={user}
                onProfileSaved={() => {
                  setShowProfile(null);
                  setRequireOnboarding(false);
                }}
                onCancel={() => {
                  if (requireOnboarding) return; // prevent closing at onboarding
                  setShowProfile(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Fetch properties */}
        <div style={{ margin: "1rem 0" }}>
          {/* --- FILTERS (extensible) --- */}
          <form
            style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "center", marginBottom: 10 }}
            onSubmit={e => {
              e.preventDefault();
              fetchProperties();
            }}
          >
            <input
              style={{ borderRadius: 6, border: "1px solid var(--border-color)", padding: "8px" }}
              type="text"
              placeholder="Location"
              value={filters.location}
              onChange={e => setFilters(f => ({ ...f, location: e.target.value }))}
            />
            <select
              style={{ borderRadius: 6, border: "1px solid var(--border-color)", padding: "8px" }}
              value={filters.property_type}
              onChange={e => setFilters(f => ({ ...f, property_type: e.target.value }))}
            >
              <option value="">Type</option>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="villa">Villa</option>
              <option value="plot">Plot</option>
            </select>
            <input
              style={{ width: 90, borderRadius: 6, border: "1px solid var(--border-color)", padding: "8px" }}
              type="number"
              min="0"
              placeholder="Min ₹"
              value={filters.min_price}
              onChange={e => setFilters(f => ({ ...f, min_price: e.target.value }))}
            />
            <input
              style={{ width: 90, borderRadius: 6, border: "1px solid var(--border-color)", padding: "8px" }}
              type="number"
              min="0"
              placeholder="Max ₹"
              value={filters.max_price}
              onChange={e => setFilters(f => ({ ...f, max_price: e.target.value }))}
            />
            <button className="theme-toggle" type="submit" style={{ position: "static", fontWeight: 500, borderRadius: 8 }}>
              {isLoading ? "Loading..." : "See Properties"}
            </button>
          </form>
        </div>

        {/* PROPERTY LISTINGS */}
        <div style={{ minHeight: 180 }}>
          {isLoading && <div style={{ color: "var(--text-secondary)" }}>Loading properties...</div>}

          {!isLoading && fetchErr && (
            <div style={{ color: "crimson", margin: "10px 0" }}>{fetchErr}</div>
          )}

          {!isLoading && propertyList.length === 0 && !fetchErr && (
            <div style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
              No properties found.&nbsp;
              <button style={{ background: "none", color: "var(--text-secondary)", border: "none", cursor: "pointer", textDecoration: "underline" }}
                onClick={() => fetchProperties()}
              >Reload</button>
            </div>
          )}
          {!isLoading && propertyList.length > 0 && (
            <div>
              <h2 style={{ color: "var(--text-primary)", marginBottom: 14 }}>Properties</h2>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "20px",
                justifyContent: "center", alignItems: "stretch"
              }}>
                {propertyList.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: 10,
                      boxShadow: "0 2px 7px rgba(0,0,0,0.05)",
                      padding: 16,
                      width: 260,
                      minHeight: 120,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>{p.title || <span style={{ color: "#aaa" }}>Untitled</span>}</div>
                      <div style={{ fontSize: 14, color: "var(--text-secondary)", margin: "8px 0" }}>
                        {p.property_type ? p.property_type.charAt(0).toUpperCase() + p.property_type.slice(1) : "Type Unknown"}
                        {" · "}
                        ₹{p.price?.toLocaleString?.() ?? p.price ?? "N/A"}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: "#6b8e75" }}>
                        {p.location || <span style={{ color: "#aaa" }}>Location not specified</span>}
                      </div>
                      {p.description && (
                        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 5, marginBottom: 2 }}>
                          {p.description?.slice(0, 75)}{p.description?.length > 75 ? "..." : ""}
                        </div>
                      )}
                    </div>
                    {/* Future: Add images/gallery when backend implements property media */}
                    <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>
                      Listed by {p.listed_by_name || `User #${p.listed_by || "?"}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat */}
        {user && (
          <section>
            <h3>Chat (WebSocket Demo)</h3>
            <form onSubmit={sendMessage} style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="Type chat msg"
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
              />
              <button type="submit">Send</button>
            </form>
            <div style={{ maxHeight: 150, overflow: "auto", minWidth: 200 }}>
              {wsMessages.map((msg, idx) => (
                <div key={idx}>
                  <span>
                    {msg?.from ? <b>From {msg.from}:</b> : null}{" "}
                    {msg.echoed_message || msg.message || JSON.stringify(msg)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Error display */}
        {fetchErr && <div style={{ color: "red" }}>{fetchErr}</div>}

        {/* Extend: add more sections for scheduling, AI recs, reviews, etc. */}
      </header>
    </div>
  );
}

export default App;

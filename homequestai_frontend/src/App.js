import React, { useState, useEffect } from "react";
import "./App.css";
import * as api from "./api";

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
  const [chatMsg, setChatMsg] = useState("");
  const [wsMessages, setWsMessages] = useState([]);
  const [activeChat, setActiveChat] = useState(null);

  // Register a demo user
  async function handleRegister(e) {
    e.preventDefault();
    setFetchErr("");
    try {
      const u = await api.registerUser(registerForm);
      setUser(u);
    } catch (err) {
      setFetchErr(err.message);
    }
  }

  // Fetch properties
  async function fetchProperties() {
    setFetchErr("");
    try {
      const props = await api.listProperties();
      setPropertyList(props);
    } catch (err) {
      setFetchErr(err.message);
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
        {user && <div style={{ color: "var(--text-secondary)" }}>Logged in as: {user.email}</div>}

        {/* Fetch properties */}
        <button onClick={fetchProperties}>See Properties</button>
        {propertyList.length > 0 && (
          <div>
            <h2>Properties</h2>
            <ul>
              {propertyList.map((p) => (
                <li key={p.id}>
                  <strong>{p.title}</strong> ({p.property_type} / ₹{p.price})
                  <br />
                  <em>at {p.location}</em>
                </li>
              ))}
            </ul>
          </div>
        )}

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

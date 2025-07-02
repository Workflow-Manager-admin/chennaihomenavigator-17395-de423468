import React, { useEffect, useRef, useState } from "react";
import * as api from "./api";

/**
 * PUBLIC_INTERFACE
 * ChatWindow component for property/contact messaging and general chat.
 * - Supports real-time messaging via backend WebSocket.
 * - Allows user to trigger SMS alerts via backend.
 * - Shows delivery and error feedback (WebSocket/SMS).
 * - Can be contextually attached to a property, agent, or as general support chat.
 *
 * Props:
 *   - user: {id, email, phone, name} (required)
 *   - contact: {id, name, phone} (optional, for property/agent chat)
 *   - property: {id, title} (optional)
 *   - onClose: function
 */
function ChatWindow({ user, contact, property, onClose }) {
  const [messages, setMessages] = useState([]); // {from, to, message, time, type}
  const [input, setInput] = useState("");
  const [ws, setWs] = useState(null);
  const [status, setStatus] = useState("connecting"); // "connecting", "connected", "error"
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState(null); // "success" | error string
  const messagesEndRef = useRef();

  // Ensure scroll to bottom on msg update
  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Open chat WS on mount, close on cleanup
  useEffect(() => {
    if (!user?.id) return;
    const wsInstance = api.openChatWebSocket(user.id, {
      onOpen: () => setStatus("connected"),
      onMessage: (msg) => setMessages((old) => [...old, {
        ...msg,
        time: msg.time || new Date().toISOString(),
        type: msg.type || "ws"
      }]),
      onError: () => setStatus("error"),
    });
    setWs(wsInstance);
    return () => { wsInstance && wsInstance.close(); };
    // eslint-disable-next-line
  }, [user?.id]);

  // Send chat message via WS (and optionally as SMS if contact provided)
  async function handleSend(e) {
    e && e.preventDefault();
    if (!input.trim()) return;
    const msgPayload = {
      message: input,
      from: user.id,
      to: contact?.id || "support",
      context: (property && property.id) ? { property_id: property.id } : undefined
    };
    // Optimistically add to messages
    setMessages((old) => [...old, {
      ...msgPayload,
      time: new Date().toISOString(),
      type: "local"
    }]);
    // Send over WebSocket if live
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify(msgPayload));
    } else {
      setMessages((old) => [...old, {
        from: "system",
        message: "Not connected to chat server. Message will be sent later.",
        time: new Date().toISOString(),
        type: "error"
      }]);
    }
    setInput("");
  }

  // Trigger backend SMS API for urgent alert
  async function handleSendSMS() {
    if (!contact?.phone || !input.trim()) {
      setSmsResult("Missing target phone or message.");
      return;
    }
    setSmsSending(true);
    setSmsResult(null);
    try {
      await api.sendSMS(contact.phone, input);
      setSmsResult("success");
      setMessages((old) => [...old, {
        from: user.id,
        to: contact.phone,
        message: `[SMS] ${input}`,
        time: new Date().toISOString(),
        type: "sms"
      }]);
    } catch (err) {
      setSmsResult(err.message || "Failed to send SMS");
    } finally {
      setSmsSending(false);
    }
  }

  let chatTitle = "Support Chat";
  if (contact && contact.name) chatTitle = `Chat with ${contact.name}`;
  if (property && property.title) chatTitle += ` — ${property.title}`;

  // Minimal Ghibli-inspired/soft shadow, floating modal style
  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        bottom: 26,
        zIndex: 1500,
        background: "var(--bg-primary, #fff)",
        boxShadow: "0 6px 32px rgba(129,178,154,0.19)",
        borderRadius: 18,
        width: 345,
        minHeight: 370,
        maxHeight: 540,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily: "inherit",
        animation: "fadePop .27s"
      }}
    >
      <style>
        {`
        @keyframes fadePop {
          from { opacity: 0; transform: scale(0.93);}
          to { opacity: 1; transform: scale(1);}
        }
        `}
      </style>
      <div style={{
        background: "linear-gradient(90deg, #81b29a 60%, #f4cb89 100%)",
        color: "#fff",
        fontWeight: 700,
        fontSize: 17,
        letterSpacing: 0.1,
        padding: "14px 18px 10px 24px",
        borderBottom: "1.5px solid #e4ecec",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        userSelect: "none"
      }}>
        <span>{chatTitle}</span>
        <button
          onClick={onClose}
          style={{
            color: "#fff",
            background: "none",
            border: "none",
            fontSize: 23,
            cursor: "pointer",
            marginLeft: 12,
            opacity: 0.77,
            fontWeight: 500,
            zIndex: 2
          }}
          aria-label="Close chat"
        >×</button>
      </div>
      <div style={{
        background: "var(--bg-secondary, #fafcf7)",
        flex: 1,
        overflowY: "auto",
        padding: "14px 11px 10px 12px",
        fontSize: 14,
        borderBottom: "1px solid #e9ecef",
      }}>
        {messages.length === 0 && (
          <div style={{ color: "#888", fontSize: 13, textAlign: "center", marginTop: 18 }}>No messages yet.</div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            margin: "5px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: msg.from === user.id ? "flex-end" : "flex-start"
          }}>
            <span
              style={{
                background: msg.type === "error" ? "#fed8d8" :
                  msg.from === user.id ? "#dbeee7" : "#f4e7c9",
                color: "#446655",
                padding: "8px 12px",
                borderRadius: 12,
                maxWidth: 230,
                boxShadow: "0 1px 4px rgba(120,140,110,0.09)",
                fontWeight: msg.type === "error" ? 600 : 500,
                fontStyle: msg.type === "error" ? "italic" : "normal",
                border: msg.type === "sms" ? "1.5px dashed #81b29a" : "none"
              }}
            >
              {msg.message}
            </span>
            <span style={{
              fontSize: 10.5,
              color: "#888",
              marginTop: 1,
              alignSelf: msg.from === user.id ? "flex-end" : "flex-start"
            }}>
              {msg.from === user.id ? "You" : (msg.from || "System")}
              {msg.type === "sms" ? " (SMS)" : ""}
              {" · "}
              {typeof msg.time === "string" ?
                (new Date(msg.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })) : ""}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleSend}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: 10, background: "#f9fbe9" }}
        autoComplete="off"
      >
        <input
          style={{
            flex: 1,
            border: "1.5px solid var(--border-color, #dde5d0)",
            borderRadius: 8,
            padding: "9px 12px",
            fontSize: 15,
            outline: "none",
            background: "#fff"
          }}
          value={input}
          disabled={status !== "connected"}
          onChange={e => setInput(e.target.value)}
          placeholder={status === "connected"
            ? "Type your message..." :
            (status === "connecting" ? "Connecting..." : "Chat offline.")}
          maxLength={240}
        />
        <button
          type="submit"
          disabled={status !== "connected" || !input.trim()}
          style={{
            background: "#81b29a",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "9px 17px",
            fontWeight: 600,
            boxShadow: "0 1px 4px rgba(129,178,154,0.15)",
            opacity: status !== "connected" ? 0.5 : 1,
            cursor: status === "connected" ? "pointer" : "not-allowed",
            fontSize: 15
          }}
        >Send</button>
        {contact?.phone && (
          <button
            type="button"
            disabled={smsSending || !input.trim()}
            onClick={handleSendSMS}
            style={{
              background: "linear-gradient(90deg,var(--accent,#f4cb89),#deb272)",
              color: "#643b12",
              border: "none",
              borderRadius: 50,
              width: 36,
              height: 36,
              fontWeight: 700,
              fontSize: 17,
              marginLeft: 7,
              cursor: smsSending || !input.trim() ? "not-allowed" : "pointer",
              opacity: smsSending ? 0.6 : 1,
              transition: "all 0.13s"
            }}
            title="Send as SMS"
          >📱</button>
        )}
      </form>
      {/* SMS/WS delivery feedback */}
      <div style={{
        minHeight: 19,
        fontSize: 12.1,
        textAlign: "center",
        color: smsResult === "success" ? "#41aa51" : (smsResult ? "#ea5a5b" : "#999"),
        background: smsResult ? (smsResult === "success" ? "#e8faef" : "#f7e7ea") : undefined,
        padding: smsResult ? "4px 9px" : 0,
        margin: smsResult ? "0 12px 8px 12px" : 0,
        borderRadius: 5
      }}>
        {smsResult === "success" && "SMS sent successfully."}
        {smsResult && smsResult !== "success" && <>⚠️ {smsResult}</>}
        {(!smsResult && status === "connected") && "You are connected to chat"}
        {(!smsResult && status === "error") && <span style={{ color: "#d01717" }}>Chat server not available.</span>}
      </div>
    </div>
  );
}

export default ChatWindow;


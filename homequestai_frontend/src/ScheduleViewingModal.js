import React, { useState } from "react";
import * as api from "./api";

/**
 * Modal for scheduling a property viewing.
 * Props:
 *  - property: {id, title, location}
 *  - user: user object (must have id)
 *  - onClose: fn() -- called when modal closed
 */

// Get a pretty Google Calendar add-event link for scheduled viewing
function getGoogleCalUrl({ title, location, scheduledAt }) {
  const dt = new Date(scheduledAt);
  // Format event date as required by Google URL: YYYYMMDDTHHMMSSZ
  const fmt = (date) =>
    date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d+Z$/, "Z");
  const dtStart = fmt(dt);
  // Assume 30 min slot
  const dtEnd = fmt(new Date(dt.getTime() + 30 * 60000));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Viewing: ${title}`,
    dates: `${dtStart}/${dtEnd}`,
    location: location || "",
    details: `Scheduled viewing for property: ${title}`,
  }).toString();
  return `https://calendar.google.com/calendar/render?${params}`;
}

// PUBLIC_INTERFACE
function ScheduleViewingModal({ property, user, onClose }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // "success" | error string
  const [successData, setSuccessData] = useState(null); // API resp

  if (!property || !user) return null;

  // PUBLIC_INTERFACE
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setSuccessData(null);
    try {
      // Validate date/time fields exist and are valid
      if (!date || !time) {
        setResult("Please select a date and a time for your viewing.");
        setLoading(false);
        return;
      }
      // Use local time for scheduling (converted to UTC ISO string)
      const localDt = new Date(`${date}T${time}:00`);
      if (isNaN(localDt.getTime())) {
        setResult("Invalid date or time selection.");
        setLoading(false);
        return;
      }
      const scheduled_at = localDt.toISOString();
      // Call backend schedule API
      const resp = await api.scheduleViewing(user.id, {
        property_id: property.id,
        scheduled_at,
      });
      setResult("success");
      setSuccessData({
        ...resp,
        scheduled_at,
      });
    } catch (err) {
      setResult(
        err?.message ||
          "There was an error scheduling your property viewing. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // === Modal content ===
  let body = null;

  if (result === "success" && successData) {
    // Booking was successful - show Google Calendar add button if available, confirmation with soft animation
    const calUrl = getGoogleCalUrl({
      title: property.title || "Property Viewing",
      location: property.location || "",
      scheduledAt: successData.scheduled_at,
    });
    body = (
      <div
        style={{
          textAlign: "center",
          padding: 12,
          animation: "fadeIn 0.42s",
        }}
      >
        <div
          style={{
            color: "#21765d",
            margin: 8,
            fontWeight: 700,
            fontSize: 19,
            letterSpacing: 0.2,
          }}
        >
          🎉 Booking Confirmed!
        </div>
        <div
          style={{
            fontSize: 15,
            margin: "8px 0 12px 0",
            color: "var(--text-primary)",
          }}
        >
          Your viewing for <b>{property.title}</b>
          <br />
          is scheduled on{" "}
          <b>
            {new Date(successData.scheduled_at).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </b>
        </div>
        <a
          href={calUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            background: "#81b29a",
            color: "#fff",
            padding: "10px 22px",
            borderRadius: 9,
            margin: "11px 0 4px 0",
            textDecoration: "none",
            fontWeight: 600,
            transition: "box-shadow 0.2s",
            boxShadow: "0 2px 6px rgba(129,178,154,0.13)",
            fontSize: 16,
          }}
        >
          <span style={{ marginRight: 6 }}>📅</span>Add to Google Calendar
        </a>
        <br />
        <button
          style={{
            margin: "15px 0 0 0",
            background: "var(--border-color)",
            color: "#21765d",
            fontWeight: "500",
            border: "none",
            borderRadius: 7,
            padding: "8px 22px",
            cursor: "pointer",
            fontSize: 15,
            boxShadow: "0 1px 3px rgba(33,118,93,0.07)",
            transition: "background 0.20s",
          }}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    );
  } else {
    // Show form for input (with nice shadow & soft edge style)
    body = (
      <form
        onSubmit={handleSubmit}
        style={{
          transition: "opacity 0.3s",
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 18,
              marginBottom: 2,
              color: "#21765d",
              textShadow: "0 1px 0 #eee",
            }}
          >
            {property.title}
          </div>
          <div style={{ fontSize: 13, color: "#5a9274" }}>
            {property.location || ""}
          </div>
        </div>
        <label style={{ display: "block", marginBottom: 11 }}>
          <span style={{ fontSize: 14 }}>Select date:</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={{
              marginLeft: 6,
              borderRadius: 7,
              border: "1.5px solid var(--border-color)",
              padding: "6px 10px",
              outline: "none",
              fontSize: 15,
            }}
            min={new Date().toISOString().split("T")[0]}
            max={
              new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0]
            } // limit 3 weeks ahead
          />
        </label>
        <label style={{ display: "block", marginBottom: 13 }}>
          <span style={{ fontSize: 14 }}>Select time:</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            style={{
              marginLeft: 6,
              borderRadius: 7,
              border: "1.5px solid var(--border-color)",
              padding: "6px 10px",
              outline: "none",
              fontSize: 15,
            }}
          />
        </label>
        {!!result && (
          <div
            style={{
              color: result === "success" ? "#41aa51" : "#af3147",
              fontSize: 14,
              margin: "9px 0 11px 0",
              minHeight: 19,
              background: result === "success" ? "#e8faef" : "#f7e7ea",
              borderRadius: 5,
              padding: "5px 9px",
              boxShadow: "0 1px 2px rgba(129,178,154,0.08)",
            }}
          >
            {result !== "success" && (
              <>
                <span style={{ marginRight: 5 }}>⚠️</span>
                {result}
              </>
            )}
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            marginTop: 16,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: "var(--border-color)",
              color: "#21765d",
              border: "none",
              borderRadius: 7,
              padding: "8px 20px",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 1px 3px rgba(33,118,93,0.07)",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#81b29a",
              color: "#fff",
              border: "none",
              borderRadius: 7,
              padding: "8px 20px",
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.65 : 1,
              boxShadow: "0 2px 6px rgba(129,178,154,0.13)",
              letterSpacing: 0.1,
              fontSize: 16,
              transition: "all 0.18s",
            }}
          >
            {loading ? "Booking..." : "Book Viewing"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        animation: "fadeIn .28s",
      }}
    >
      <div
        style={{
          background: "var(--bg-primary, #fff)",
          borderRadius: 18,
          minWidth: 325,
          minHeight: 180,
          boxShadow: "0 7px 30px rgba(129,178,154,.22), 0 0 0 1px #ecd",
          padding: "21px 31px 21px 31px",
          position: "relative",
        }}
      >
        {/* Close "X" button at top right for UX */}
        <button
          aria-label="Close modal"
          onClick={onClose}
          disabled={loading}
          style={{
            position: "absolute",
            right: 14,
            top: 13,
            background: "transparent",
            border: "none",
            fontSize: 23,
            color: "#b6b6b6",
            cursor: loading ? "not-allowed" : "pointer",
            zIndex: 2,
            transition: "color 0.19s",
          }}
          title="Close"
        >
          ×
        </button>
        <h3
          style={{
            textAlign: "center",
            marginBottom: 13,
            color: "#21765d",
            fontWeight: 700,
            letterSpacing: 0.1,
            fontSize: 21,
            userSelect: "none",
            marginTop: 4,
          }}
        >
          Schedule a Viewing
        </h3>
        {body}
      </div>
      {/* Keyframes animation for fade in */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.98);}
            to { opacity: 1; transform: scale(1);}
          }
        `}
      </style>
    </div>
  );
}

export default ScheduleViewingModal;

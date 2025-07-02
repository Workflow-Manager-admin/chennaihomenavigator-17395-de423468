import React, { useState } from "react";
import * as api from "./api";

/**
 * Modal for scheduling a property viewing.
 * Props:
 *  - property: {id, title}
 *  - user: user object (must have id)
 *  - onClose: fn() -- called when modal closed
 */
function getGoogleCalUrl({ title, location, scheduledAt }) {
  const dt = new Date(scheduledAt);
  // YYYYMMDDTHHMMSSZ in UTC
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
  const [result, setResult] = useState(null); // success or error string
  const [successData, setSuccessData] = useState(null); // API resp

  if (!property || !user) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setSuccessData(null);
    // Combine date and time to ISO string
    try {
      if (!date || !time) {
        setResult("Please select date and time.");
        setLoading(false);
        return;
      }
      // YYYY-MM-DDTHH:MM:00
      const localDt = new Date(`${date}T${time}:00`);
      if (isNaN(localDt.getTime())) {
        setResult("Invalid date/time selection.");
        setLoading(false);
        return;
      }
      // Convert to UTC ISO string for backend (or adjust if needed)
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

  let body = null;

  if (result === "success" && successData) {
    // Show Google Calendar add button
    const calUrl = getGoogleCalUrl({
      title: property.title || "Property Viewing",
      location: property.location || "",
      scheduledAt: successData.scheduled_at,
    });
    body = (
      <div style={{ textAlign: "center", padding: 12 }}>
        <div style={{ color: "#21765d", margin: 7, fontWeight: 600 }}>
          Booking confirmed!
        </div>
        <div style={{ fontSize: 14, margin: "6px 0 10px 0" }}>
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
            padding: "9px 20px",
            borderRadius: 6,
            margin: "8px 0",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Add to Google Calendar
        </a>
        <br />
        <button
          style={{
            margin: "13px 0 0 0",
            background: "var(--border-color)",
            color: "#21765d",
            fontWeight: "500",
            border: "none",
            borderRadius: 7,
            padding: "8px 20px",
            cursor: "pointer",
            fontSize: 15,
          }}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    );
  } else {
    // Form for input
    body = (
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 9 }}>
          <div style={{ fontWeight: 600 }}>{property.title}</div>
          <div style={{ fontSize: 13, color: "#666" }}>
            {property.location || ""}
          </div>
        </div>
        <label style={{ display: "block", marginBottom: 9 }}>
          Select date:
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={{
              marginLeft: 8,
              borderRadius: 5,
              border: "1px solid var(--border-color)",
              padding: "4px 8px",
            }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 9 }}>
          Select time:
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            style={{
              marginLeft: 8,
              borderRadius: 5,
              border: "1px solid var(--border-color)",
              padding: "4px 8px",
            }}
          />
        </label>
        {result && (
          <div
            style={{
              color: result === "success" ? "green" : "crimson",
              fontSize: 13,
              margin: "6px 0",
              minHeight: 19,
            }}
          >
            {result !== "success" && result}
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: 14,
            justifyContent: "center",
            marginTop: 10,
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
              padding: "8px 18px",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
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
              padding: "8px 18px",
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.6 : 1,
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
        background: "rgba(0,0,0,0.32)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "var(--bg-primary, #fff)",
          borderRadius: 13,
          minWidth: 320,
          boxShadow: "0 5px 28px rgba(0,0,0,0.19), 0 0 0 1px #eee",
          padding: "19px 27px 17px 27px",
        }}
      >
        <h3 style={{ textAlign: "center", marginBottom: 15, color: "#21765d" }}>
          Schedule a Viewing
        </h3>
        {body}
      </div>
    </div>
  );
}

export default ScheduleViewingModal;

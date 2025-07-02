import React, { useEffect, useState } from "react";
import * as api from "./api";

/**
 * User Onboarding/Profile Management component.
 * Allows viewing/editing:
 * - Name, email, phone
 * - Budget, location, filters
 * Fetches data on mount and handles create/update via API.
 * 
 * Props:
 * - user: {id, email, phone, name}
 * - onProfileSaved: fn(profileObj)
 * - onCancel: fn()
 */
function UserProfile({ user, onProfileSaved, onCancel }) {
  const [profile, setProfile] = useState({
    budget: "",
    location: "",
    property_type: "",
    min_size: "",
    filters: "",
  });
  const [userFields, setUserFields] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [fetching, setFetching] = useState(!!user?.id);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Fetch profile and user info
  useEffect(() => {
    if (!user?.id) return;
    setFetching(true);
    api
      .getProfile(user.id)
      .then((p) => { if (p) setProfile(p); })
      .catch(() => setFeedback("No profile found. Please complete onboarding."))
      .finally(() => setFetching(false));
    // Fetch latest user info for editing name, email, phone
    api
      .getUser(user.id)
      .then((u) => {
        setUserFields({
          name: u.name || "",
          email: u.email || "",
          phone: u.phone || "",
        });
      })
      .catch(() => { /* fallback: use initial props */ });
    // eslint-disable-next-line
  }, [user?.id]);

  // Handle changes for profile and user fields
  function handleProfileChange(e) {
    const { name, value } = e.target;
    setProfile((p) => ({ ...p, [name]: value }));
  }
  function handleUserChange(e) {
    const { name, value } = e.target;
    setUserFields((u) => ({ ...u, [name]: value }));
  }

  // Save/update profile (and basic user info if editable)
  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFeedback("");
    try {
      // Update profile fields
      await api.updateProfile(user.id, { ...profile });
      // (Optional: Update user basics if you wish to allow editing email/name/phone)
      // await api.updateUserBasics(user.id, { ...userFields });
      setFeedback("Profile saved successfully!");
      onProfileSaved && onProfileSaved({ ...profile });
    } catch (err) {
      setFeedback("Error saving profile: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: 12,
        padding: 24,
        width: 340,
        margin: "24px auto",
        boxShadow: "0 2px 18px rgba(0,0,0,0.07)",
      }}
    >
      <h2 style={{ marginBottom: 10 }}>Your Profile</h2>
      {fetching ? (
        <div style={{ color: "var(--text-secondary)" }}>Loading...</div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Name, Email, Phone (readonly email for demo, others editable) */}
          <div>
            <label>
              <div style={{ fontSize: 13 }}>Name</div>
              <input
                name="name"
                value={userFields.name}
                onChange={handleUserChange}
                required
                style={{ width: "100%", borderRadius: 7, border: "1px solid var(--border-color)", padding: 8 }}
              />
            </label>
          </div>
          <div>
            <label>
              <div style={{ fontSize: 13 }}>Email</div>
              <input
                name="email"
                value={userFields.email}
                readOnly
                disabled
                style={{
                  width: "100%",
                  background: "#f7f7f7",
                  color: "#888",
                  borderRadius: 7,
                  border: "1px solid var(--border-color)",
                  padding: 8,
                }}
              />
            </label>
          </div>
          <div>
            <label>
              <div style={{ fontSize: 13 }}>Phone</div>
              <input
                name="phone"
                value={userFields.phone}
                onChange={handleUserChange}
                style={{ width: "100%", borderRadius: 7, border: "1px solid var(--border-color)", padding: 8 }}
              />
            </label>
          </div>

          {/* Budget, location, property type, min_size, filters */}
          <div>
            <label>
              <div style={{ fontSize: 13 }}>Budget (₹/month)</div>
              <input
                name="budget"
                type="number"
                min={0}
                value={profile.budget}
                onChange={handleProfileChange}
                placeholder="Budget in ₹"
                style={{ width: "100%", borderRadius: 7, border: "1px solid var(--border-color)", padding: 8 }}
              />
            </label>
          </div>
          <div>
            <label>
              <div style={{ fontSize: 13 }}>Preferred Location</div>
              <input
                name="location"
                value={profile.location}
                onChange={handleProfileChange}
                placeholder="Eg: Adyar, Anna Nagar"
                style={{ width: "100%", borderRadius: 7, border: "1px solid var(--border-color)", padding: 8 }}
              />
            </label>
          </div>
          <div>
            <label>
              <div style={{ fontSize: 13 }}>Property Type</div>
              <select
                name="property_type"
                value={profile.property_type}
                onChange={handleProfileChange}
                style={{ width: "100%", borderRadius: 7, border: "1px solid var(--border-color)", padding: 8 }}
              >
                <option value="">Select</option>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="villa">Villa</option>
                <option value="plot">Plot</option>
              </select>
            </label>
          </div>
          <div>
            <label>
              <div style={{ fontSize: 13 }}>Min. Area (sqft)</div>
              <input
                name="min_size"
                type="number"
                min={0}
                value={profile.min_size}
                onChange={handleProfileChange}
                placeholder="Eg: 800"
                style={{ width: "100%", borderRadius: 7, border: "1px solid var(--border-color)", padding: 8 }}
              />
            </label>
          </div>
          <div>
            <label>
              <div style={{ fontSize: 13 }}>Other Preferences / Filters</div>
              <input
                name="filters"
                value={profile.filters}
                onChange={handleProfileChange}
                placeholder="Balcony, parking, 2bhk, etc"
                style={{ width: "100%", borderRadius: 7, border: "1px solid var(--border-color)", padding: 8 }}
              />
            </label>
          </div>
          {/* Feedback */}
          {feedback && (
            <div
              style={{
                color: feedback.includes("success") ? "green" : "crimson",
                fontSize: 13,
                minHeight: 16,
                marginTop: -6,
                marginBottom: 6,
              }}
            >
              {feedback}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            {onCancel && (
              <button
                type="button"
                onClick={() => onCancel()}
                style={{
                  background: "var(--border-color)",
                  color: "#444",
                  border: "none",
                  padding: "8px 18px",
                  borderRadius: 7,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              style={{
                background: "var(--button-bg)",
                color: "var(--button-text)",
                border: "none",
                padding: "8px 18px",
                borderRadius: 7,
                fontWeight: 600,
                cursor: saving ? "wait" : "pointer",
              }}
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default UserProfile;

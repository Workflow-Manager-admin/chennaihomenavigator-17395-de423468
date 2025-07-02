import React, { useEffect, useState } from "react";
import * as api from "./api";

/**
 * PUBLIC_INTERFACE
 * Reviews component for property pages (user submission, browsing, flagging, and moderation).
 * - Display property reviews
 * - Authenticated users can submit reviews and flag/report problematic ones
 * - If moderator, show "pending reviews" and allow approve/remove
 *
 * Props:
 *   - propertyId: (string|number) required
 *   - user: user object or null (needed for posting/flagging)
 *   - isModerator: boolean (optional), if true shows moderation UI
 *   - style: style object (optional)
 */

function Reviews({
  propertyId,
  user,
  isModerator = false,
  style,
}) {
  const [reviews, setReviews] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newReview, setNewReview] = useState({ text: "", rating: 5 });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [moderationTab, setModerationTab] = useState("approved"); // approved|pending
  const [flagInfo, setFlagInfo] = useState({}); // {reviewId: "status"|"error message"}

  useEffect(() => {
    if (!propertyId) return;
    loadReviews();
    if (isModerator) loadPending();
    // eslint-disable-next-line
  }, [propertyId, isModerator]);

  // Load all approved reviews for property
  async function loadReviews() {
    setLoading(true);
    setError("");
    try {
      const resp = await api.getPropertyReviews(propertyId);
      setReviews(Array.isArray(resp) ? resp : []);
    } catch (err) {
      setError(err.message || "Cannot fetch reviews.");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  // Moderator: load pending reviews
  async function loadPending() {
    setLoading(true);
    try {
      const resp = await api.getPendingReviews();
      setPending(Array.isArray(resp) ? resp.filter(r => r.property_id === propertyId) : []);
    } catch (err) {
      // Silent fail in demo
      setPending([]);
    } finally {
      setLoading(false);
    }
  }

  // Submit new review
  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to submit a review.");
      return;
    }
    if (!newReview.text || !newReview.rating) {
      setError("Review text and rating required.");
      return;
    }
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      await api.createReview(user.id, {
        property_id: propertyId,
        text: newReview.text,
        rating: Number(newReview.rating),
      });
      setSuccess("Review submitted for moderation!");
      setNewReview({ text: "", rating: 5 });
      loadReviews();
    } catch (err) {
      setError(err.message || "Could not submit review. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  // Flag/report review (simulate with approve false as removal)
  async function handleFlagReview(reviewId) {
    if (!user) {
      setFlagInfo((prev) => ({ ...prev, [reviewId]: "You must be logged in to flag reviews." }));
      return;
    }
    setFlagInfo((prev) => ({ ...prev, [reviewId]: "flagging" }));
    try {
      // Here, we simulate reporting by requesting "remove", but real backend could support reporting endpoint.
      await api.approveReview(reviewId, false);
      setFlagInfo((prev) => ({ ...prev, [reviewId]: "Review flagged and removed for moderation." }));
      loadReviews();
    } catch (err) {
      setFlagInfo((prev) => ({ ...prev, [reviewId]: err.message || "Flag failed." }));
    }
  }

  // MOD: approve/reject pending
  async function handleModeration(reviewId, approve) {
    setLoading(true);
    try {
      await api.approveReview(reviewId, approve);
      loadPending();
      loadReviews();
    } catch {
      // Silently ignore errors in UI for now
    } finally {
      setLoading(false);
    }
  }

  // --- RENDER ---
  // Review summary average
  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) /
          reviews.length
        ).toFixed(1)
      : null;

  // Small helper to show stars
  const renderStars = (rating = 0) => (
    <span>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= rating ? "#f4cb89" : "#d1c19c", fontSize: 15 }}>
          ★
        </span>
      ))}
    </span>
  );

  // --- MAIN UI ---
  return (
    <div
      style={{
        background: "var(--bg-secondary,#fafafd)",
        border: "1.5px solid var(--border-color,#ececec)",
        borderRadius: 13,
        minWidth: 270,
        maxWidth: 430,
        margin: "20px auto 0 auto",
        padding: 20,
        boxShadow: "0 2px 18px rgba(244,203,137,0.08)",
        ...style,
      }}
      data-testid="reviews-section"
    >
      <h3 style={{ margin: "0 0 10px 0", color: "#81b29a" }}>
        📝 Reviews & Ratings
      </h3>
      {loading && (
        <div style={{ color: "#aaa", fontSize: 15 }}>Loading reviews...</div>
      )}

      {error && (
        <div style={{ color: "crimson", fontSize: 14, marginBottom: 7 }}>
          {error}
        </div>
      )}

      {/* Review statistics */}
      {reviews.length > 0 && (
        <div style={{ marginBottom: 8, color: "#b38632", fontWeight: 600 }}>
          {renderStars(Math.round(avgRating))}
          <span style={{ fontSize: 15.5, marginLeft: 9 }}>
            {avgRating}/5 ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
          </span>
        </div>
      )}

      {/* Add review form */}
      {user && (
        <form onSubmit={handleSubmit} style={{ margin: "16px 0 7px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 13.5, marginRight: 5 }}>Your Rating:</span>
            <select
              value={newReview.rating}
              onChange={(e) =>
                setNewReview((r) => ({ ...r, rating: e.target.value }))
              }
              style={{
                fontSize: 14,
                borderRadius: 7,
                padding: "2px 7px",
                border: "1.2px solid #e4e4e4",
              }}
              required
            >
              {[5, 4, 3, 2, 1].map((val) => (
                <option key={val} value={val}>
                  {val} ★
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={newReview.text}
            onChange={(e) =>
              setNewReview((r) => ({ ...r, text: e.target.value }))
            }
            rows={3}
            maxLength={280}
            minLength={8}
            placeholder="Write your property experience or feedback"
            style={{
              width: "99%",
              marginTop: 8,
              resize: "vertical",
              borderRadius: 9,
              border: "1.2px solid #efefef",
              padding: 8,
            }}
            required
            disabled={creating}
          ></textarea>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="submit"
              disabled={creating}
              style={{
                background: "#81b29a",
                color: "#fff",
                border: "none",
                borderRadius: 7,
                fontWeight: 700,
                padding: "7px 19px",
                fontSize: 15,
                marginTop: 3,
                cursor: creating ? "wait" : "pointer",
                boxShadow: "0 1px 5px rgba(129,178,154,0.1)",
                opacity: creating ? 0.6 : 1,
                transition: "all 0.18s",
              }}
            >
              {creating ? "Submitting..." : "Submit Review"}
            </button>
          </div>
          <div
            style={{
              minHeight: 17,
              fontSize: 13,
              color: success
                ? "green"
                : error
                ? "crimson"
                : "var(--text-secondary)",
              margin: "7px 0 0 0",
            }}
          >
            {success || error}
          </div>
        </form>
      )}

      {/* Existing reviews */}
      <div style={{ marginTop: 3, marginBottom: 9 }}>
        {reviews.length === 0 && !loading && (
          <div style={{ color: "#999", fontSize: 15 }}>No reviews yet.</div>
        )}
        {reviews.map((r, idx) => (
          <div
            key={r.id || idx}
            style={{
              marginBottom: 14,
              background: "#fff7ed",
              border: "1.1px solid #f4cb8977",
              borderRadius: 11,
              padding: "10px 13px 7px 13px",
              boxShadow: "0 1px 3px #ece4d777",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              {renderStars(Number(r.rating))}
              <span style={{ fontWeight: 600, color: "#b38632" }}>
                {r.rating || "?"}/5
              </span>
              <span
                style={{
                  color: "#21765d",
                  marginLeft: 5,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {r.user_name || r.user_email || `User #${r.user_id || "?"}`}
              </span>
              <span style={{ color: "#a6a6a6", fontSize: 12, marginLeft: 9 }}>
                {r.time_posted
                  ? new Date(r.time_posted).toLocaleDateString()
                  : ""}
              </span>
            </div>
            <div
              style={{
                fontSize: 14.2,
                color: "#4c422b",
                margin: "9px 0 3px 0",
                fontStyle: "italic",
              }}
            >
              {r.text}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {!isModerator && user && (
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ed6b33",
                    fontSize: 13.5,
                    cursor: "pointer",
                    marginLeft: -6,
                  }}
                  disabled={flagInfo[r.id] === "flagging"}
                  title="Flag review as inappropriate"
                  onClick={() => handleFlagReview(r.id)}
                >
                  🚩 Report
                </button>
              )}
              {flagInfo[r.id] && flagInfo[r.id] !== "flagging" && (
                <span style={{ color: "#e67339", fontSize: 12 }}>
                  {flagInfo[r.id]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* --- MODERATION TAB for admins --- */}
      {isModerator && (
        <div style={{ margin: "26px 0 0 0" }}>
          <div style={{ display: "flex", gap: 14 }}>
            <button
              style={{
                background:
                  moderationTab === "approved"
                    ? "#81b29a"
                    : "var(--border-color,#ececec)",
                color: moderationTab === "approved" ? "#fff" : "#333",
                border: "none",
                borderRadius: 7,
                fontWeight: 500,
                padding: "6px 17px",
                cursor: "pointer",
                fontSize: 14,
                transition: "all 0.13s",
              }}
              onClick={() => setModerationTab("approved")}
            >
              Approved
            </button>
            <button
              style={{
                background:
                  moderationTab === "pending"
                    ? "#b38632"
                    : "var(--border-color,#ececec)",
                color: moderationTab === "pending" ? "#fff" : "#2e220a",
                border: "none",
                borderRadius: 7,
                fontWeight: 500,
                padding: "6px 17px",
                cursor: "pointer",
                fontSize: 14,
                transition: "all 0.13s",
              }}
              onClick={() => setModerationTab("pending")}
            >
              Pending
            </button>
            <span style={{ alignSelf: "center", color: "#999", fontSize: 13 }}>
              {moderationTab === "pending"
                ? `${pending.length} to review`
                : `${reviews.length} approved`}
            </span>
          </div>
          {moderationTab === "pending" && (
            <div style={{ marginTop: 9 }}>
              {pending.length === 0 && (
                <div style={{ color: "#a96", fontSize: 14 }}>
                  No pending reviews for this property.
                </div>
              )}
              {pending.map((pr) => (
                <div
                  key={pr.id}
                  style={{
                    border: "1.1px solid #b38632",
                    borderRadius: 9,
                    padding: "9px 12px",
                    background: "#f7f5e9",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontWeight: 600, color: "#b38632" }}>
                    {renderStars(Number(pr.rating))} <span>
                    {pr.rating}/5 by {pr.user_name || pr.user_email || `#${pr.user_id}`}</span>
                  </div>
                  <div style={{ fontSize: 14, color: "#3a391d", margin: "6px 0 5px 0" }}>
                    {pr.text}
                  </div>
                  <div style={{ display: "flex", gap: 13 }}>
                    <button
                      style={{
                        background: "#7dc07f",
                        color: "#fff",
                        border: "none",
                        borderRadius: 5,
                        fontWeight: 500,
                        padding: "5px 16px",
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                      title="Approve review"
                      onClick={() => handleModeration(pr.id, true)}
                    >
                      Approve
                    </button>
                    <button
                      style={{
                        background: "#d7492a",
                        color: "#fff",
                        border: "none",
                        borderRadius: 5,
                        fontWeight: 500,
                        padding: "5px 16px",
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                      title="Remove review"
                      onClick={() => handleModeration(pr.id, false)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Reviews;

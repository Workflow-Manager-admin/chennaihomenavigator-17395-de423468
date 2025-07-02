//
// API Layer for HomeQuestAI frontend
//

const API_BASE = "http://localhost:3001"; // Change if hosted elsewhere

// Helpers
async function apiFetch(path, { method = "GET", params, body, headers = {} } = {}) {
    let url = API_BASE + path;
    if (params) {
        const qs = Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null && v !== "")
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join("&");
        if (qs) url += (url.includes("?") ? "&" : "?") + qs;
    }
    const resp = await fetch(url, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!resp.ok) {
        let errorMsg = "Request failed";
        try { 
            const json = await resp.json(); 
            errorMsg = json?.detail || JSON.stringify(json);
        } catch { 
            // ignore
        }
        throw new Error(`${resp.status}: ${errorMsg}`);
    }
    if (resp.status === 204) return null;
    if (resp.headers.get("content-type")?.includes("application/json")) {
        return await resp.json();
    }
    return await resp.text();
}

// --- USERS & AUTH ---

// PUBLIC_INTERFACE
export async function registerUser({ email, phone, password, name }) {
    /** Registers a new user */
    return apiFetch("/users/register", {
        method: "POST",
        body: { email, phone, password, name }
    });
}

// PUBLIC_INTERFACE
export async function getUser(userId) {
    /** Fetch user details */
    return apiFetch(`/users/${userId}`);
}

// PUBLIC_INTERFACE
export async function updateProfile(userId, profileData) {
    /** Create or update a user profile (budget, location, filters) */
    return apiFetch(`/users/${userId}/profile`, {
        method: "POST",
        body: profileData,
    });
}

// PUBLIC_INTERFACE
export async function getProfile(userId) {
    /** Get a user's profile */
    return apiFetch(`/users/${userId}/profile`);
}

// --- PROPERTIES ---

// PUBLIC_INTERFACE
export async function listProperties(filters = {}) {
    /** Search, list properties with optional filters */
    return apiFetch("/properties/", { params: filters });
}

// PUBLIC_INTERFACE
export async function getProperty(propertyId) {
    /** Get details for a single property */
    return apiFetch(`/properties/${propertyId}`);
}

// PUBLIC_INTERFACE
export async function createProperty(listed_by, propertyData) {
    /** Create a new property listing */
    return apiFetch(`/properties/?listed_by=${listed_by}`, {
        method: "POST",
        body: propertyData,
    });
}

// --- PROPERTY MEDIA ---

// PUBLIC_INTERFACE
export async function getPropertyMedia(propertyId) {
    /** List property photos/videos/affiliate links */
    return apiFetch(`/properties/${propertyId}/media`);
}

// PUBLIC_INTERFACE
export async function addPropertyMedia(propertyId, { url, media_type }) {
    /** Add media to a property */
    return apiFetch(`/properties/${propertyId}/media?url=${encodeURIComponent(url)}${media_type ? `&media_type=${encodeURIComponent(media_type)}` : ""}`, {
        method: "POST",
    });
}

// --- SCHEDULING ---

// PUBLIC_INTERFACE
export async function scheduleViewing(userId, { property_id, scheduled_at }) {
    /** Schedules a viewing for a property */
    return apiFetch(`/schedule/${userId}/viewing`, {
        method: "POST",
        body: { property_id, scheduled_at },
    });
}

// PUBLIC_INTERFACE
export async function getViewings(userId) {
    /** Gets all scheduled viewings for a user */
    return apiFetch(`/schedule/${userId}/viewings`);
}

// --- CHAT ---

// PUBLIC_INTERFACE
export function openChatWebSocket(userId, { onMessage, onError, onOpen } = {}) {
    /** Open WebSocket for real-time chat */
    const wsUrl = `${API_BASE.replace(/^http/, 'ws')}/ws/chat/${userId}`;
    const ws = new WebSocket(wsUrl);
    ws.onopen = onOpen || (() => {});
    ws.onmessage = (event) => {
        try { onMessage && onMessage(JSON.parse(event.data)); }
        catch (e) { console.error("Bad WS data", event.data); }
    };
    ws.onerror = onError || ((e) => {});
    return ws;
}

// PUBLIC_INTERFACE
export async function sendSMS(phone_number, message) {
    /** Sends an SMS via backend stub */
    return apiFetch(`/chat/sms`, { method: "POST", params: { phone_number, message } });
}

// PUBLIC_INTERFACE
export async function getWebSocketDocs() {
    /** Get help/usage for chat WebSocket */
    return apiFetch(`/docs/websocket`);
}

// --- AI & INSIGHTS ---

// PUBLIC_INTERFACE
export async function getAIRecommendations(user_id) {
    /** Fetch AI-driven recommended properties */
    return apiFetch(`/ai/recommendations`, { params: { user_id } });
}

export async function getMarketInsights() {
    /** Get market insights and stats */
    return apiFetch(`/market/insights`);
}

// --- VIRTUAL TOUR ---

// PUBLIC_INTERFACE
export async function getPropertyTour(propertyId) {
    /** Get property virtual tour media (videos) */
    return apiFetch(`/virtualtour/${propertyId}`);
}

// PUBLIC_INTERFACE
export async function getARPreview(propertyId) {
    /** Get AR preview for property */
    return apiFetch(`/virtualtour/${propertyId}/ar`);
}

// --- REVIEWS ---

// PUBLIC_INTERFACE
export async function createReview(userId, data) {
    /** Submit a new review for a property */
    return apiFetch(`/reviews/${userId}`, { method: "POST", body: data });
}

// PUBLIC_INTERFACE
export async function getPropertyReviews(propertyId) {
    /** Get approved reviews for property */
    return apiFetch(`/reviews/property/${propertyId}`);
}

// PUBLIC_INTERFACE
export async function getPendingReviews() {
    /** For admin: get reviews awaiting moderation */
    return apiFetch(`/reviews/pending`);
}

// PUBLIC_INTERFACE
export async function approveReview(reviewId, approve = true) {
    /** Approve or remove (delete) a review */
    return apiFetch(`/reviews/${reviewId}/approve?approve=${approve ? "true" : "false"}`, {
        method: "POST",
    });
}

// --- HEALTH CHECK ---

// PUBLIC_INTERFACE
export async function health() {
    /** Backend health check */
    return apiFetch(`/`);
}

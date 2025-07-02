import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import * as api from "./api";

/**
 * PUBLIC_INTERFACE 
 * MarketInsightsDashboard component shows market trends, stats, and insights for properties and pricing,
 * fetching data from backend and visualizing with Recharts. Shows loading, error states, refresh control.
 */
const COLORS = ["#81b29a", "#f4cb89", "#b38632", "#e87a41", "#6b8e75", "#21765d"];

function numberWithCommas(x) {
  // Helper for K, M, etc.
  if (typeof x !== "number") x = Number(x);
  if (x >= 1_000_000) return (x / 1_000_000).toFixed(1) + "M";
  if (x >= 1_000) return (x / 1_000).toFixed(1) + "K";
  return x?.toLocaleString?.() ?? String(x);
}

// PUBLIC_INTERFACE
function MarketInsightsDashboard() {
  const [data, setData] = useState(null); // backend response
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  async function fetchInsights() {
    setLoading(true);
    setErr("");
    try {
      const res = await api.getMarketInsights();
      setData(res);
      setLastUpdated(new Date());
    } catch (e) {
      setErr(e?.message || "Failed to load market insights.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchInsights(); }, []);

  // Compose chart data, handle missing/null data
  // Assume API returns something like:
  // {
  //   "price_trends": [{"month": "2024-02", "avg_price": ...}, ...],
  //   "property_type_distribution": [{"type": "Apartment", "count": ...}, ...],
  //   "top_localities": [{"locality": "...", "avg_price": ...}],
  //   "market_stats": { "num_properties": X, "avg_price": Y, "min_price": Z, ... }
  // }
  const priceTrends = Array.isArray(data?.price_trends) ? data.price_trends : [];
  const propertyTypeDist = Array.isArray(data?.property_type_distribution) ? data.property_type_distribution : [];
  const topLocalities = Array.isArray(data?.top_localities) ? data.top_localities : [];
  const marketStats = data?.market_stats || {};

  return (
    <div
      style={{
        background: "var(--bg-secondary, #f8f9fa)",
        maxWidth: 950,
        margin: "25px auto 0 auto",
        borderRadius: 16,
        padding: "28px 24px 23px 24px",
        boxShadow: "0 2px 26px rgba(129,178,154,0.12)",
        minHeight: 420,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 17 }}>
        <h2 style={{ color: "#81b29a", margin: 0, fontWeight: 700 }}>
          📈 Chennai Market Insights & Trends
        </h2>
        <button
          style={{
            background: "#81b29a",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "6px 18px",
            fontWeight: 500,
            fontSize: 15,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1,
            boxShadow: "0 1px 5px rgba(129,178,154,0.09)",
            marginLeft: 12
          }}
          title="Refresh dashboard"
          onClick={fetchInsights}
          disabled={loading}
        >⟳ Refresh</button>
      </div>
      <div style={{ color: "#999", fontSize: 13, marginBottom: 7 }}>
        {lastUpdated && (
          <>Last updated: {lastUpdated.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</>
        )}
      </div>

      {loading && <div style={{ fontSize: 16, color: "#b38632" }}>Loading market data...</div>}
      {err && <div style={{ color: "crimson", fontSize: 15, marginBottom: 8 }}>{err}</div>}

      {!loading && !err && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 34, alignItems: "stretch", justifyContent: "space-between" }}>
          {/* --- Stats Cards --- */}
          <div style={{ flex: "1 1 270px", minWidth: 230, maxWidth: 320 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <StatCard label="Total Listings" value={marketStats.num_properties} icon="🏘️" color="#81b29a" />
              <StatCard label="Avg. Price" value={`₹${numberWithCommas(marketStats.avg_price)}`} icon="💰" color="#b38632" />
              <StatCard label="Median Price" value={`₹${numberWithCommas(marketStats.median_price)}`} icon="📊" color="#f4cb89" />
              <StatCard label="Min" value={`₹${numberWithCommas(marketStats.min_price)}`} icon="🔻" color="#e87a41"/>
              <StatCard label="Max" value={`₹${numberWithCommas(marketStats.max_price)}`} icon="🔺" color="#21765d"/>
            </div>
          </div>
          {/* --- Price trends (line chart) --- */}
          <div style={{ flex: "2 1 300px", minWidth: 300, maxWidth: 470, paddingRight: 14 }}>
            <h4 style={{ color: "#81b29a", margin: "2px 0 4px 0", fontWeight: 600, fontSize: 16 }}>Price Trends (last 12 months)</h4>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={priceTrends}>
                <CartesianGrid stroke="#e9ecef" strokeDasharray="3 2" />
                <XAxis
                  dataKey="month"
                  tickFormatter={v => String(v).replace(/202\d?-/, "")}
                  style={{ fontSize: 13 }}
                />
                <YAxis unit="₹" width={60} style={{ fontSize: 13 }} />
                <Tooltip formatter={v => `₹${numberWithCommas(v)}`} labelFormatter={l => "Month: " + l}/>
                <Legend />
                <Line type="monotone" dataKey="avg_price" name="Avg Price" stroke="#81b29a" strokeWidth={2.2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* --- Property Type Distribution (pie) --- */}
          <div style={{ flex: "1 1 220px", minWidth: 200, maxWidth: 260 }}>
            <h4 style={{ color: "#b38632", margin: "2px 0 7px 0", fontWeight: 600, fontSize: 15 }}>By Property Type</h4>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={propertyTypeDist}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={54}
                  fill="#81b29a"
                  label={entry =>
                    `${entry.type} (${numberWithCommas(entry.count)})`
                  }
                >
                  {propertyTypeDist.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={val => numberWithCommas(val)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* --- Top Localities (bar) --- */}
      {!loading && !err && topLocalities.length > 0 && (
        <div style={{ marginTop: 37 }}>
          <h4 style={{ color: "#21765d", marginBottom: 9, fontWeight: 700 }}>Top Localities by Avg. Price</h4>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topLocalities}>
              <CartesianGrid strokeDasharray="3 2" />
              <XAxis dataKey="locality" tick={{ fontSize: 13 }}/>
              <YAxis width={60} unit="₹"/>
              <Tooltip formatter={v => `₹${numberWithCommas(v)}`} labelFormatter={l => "Locality: " + l} />
              <Legend />
              <Bar dataKey="avg_price" name="Avg Price" fill="#81b29a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* --- No data fallback --- */}
      {!loading && !err && (!priceTrends.length && !propertyTypeDist.length && !topLocalities.length) && (
        <div style={{ color: "#999", fontSize: 15, marginTop: 18 }}>
          No market data is available at this time.
        </div>
      )}
    </div>
  );
}

// Simple stat card for dashboard
function StatCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 13,
      boxShadow: "0 2.5px 9px rgba(244,203,137,0.09)",
      padding: "13px 18px",
      margin: "0 7px 13px 0",
      minWidth: 96,
      textAlign: "center",
      display: "inline-block",
      fontWeight: 600,
      color: "#232f2b"
    }}>
      <span style={{ fontSize: 23, marginBottom: 5, display: "block", color: color }}>{icon}</span>
      <div style={{ fontSize: 16, margin: "7px 0 0 0", color }}>{value ?? "--"}</div>
      <div style={{ fontSize: 13.2, color: "#999", fontWeight: 500, marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default MarketInsightsDashboard;


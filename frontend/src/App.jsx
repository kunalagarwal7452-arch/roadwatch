import { useState, useEffect, useRef } from "react";

// ─── Mock Data (simulates backend API) ───────────────────────────────────────
const MOCK_REPORTS = [
  { id: "A1B2C3", description: "Large pothole causing accidents near school zone", latitude: 13.0827, longitude: 80.2707, city: "Chennai", hazard_type: "Pothole", severity: "High", status: "Reported", submitted_at: "2026-05-25T09:30:00", upvotes: 14, confidence: 91, suggested_action: "Road resurfacing required — schedule within 7 days" },
  { id: "D4E5F6", description: "Traffic signal not working for 3 days", latitude: 13.0569, longitude: 80.2425, city: "Chennai", hazard_type: "Broken Traffic Signal", severity: "High", status: "Under Review", submitted_at: "2026-05-24T14:15:00", upvotes: 22, confidence: 88, suggested_action: "Signal maintenance team dispatch required" },
  { id: "G7H8I9", description: "No street lighting on main road, very dangerous at night", latitude: 13.0674, longitude: 80.2376, city: "Chennai", hazard_type: "Poor Street Lighting", severity: "Medium", status: "Action Taken", submitted_at: "2026-05-23T19:00:00", upvotes: 8, confidence: 84, suggested_action: "Street lighting inspection and repair needed" },
  { id: "J1K2L3", description: "Road completely damaged after rains", latitude: 13.0900, longitude: 80.2800, city: "Chennai", hazard_type: "Road Damage", severity: "High", status: "Resolved", submitted_at: "2026-05-20T10:00:00", upvotes: 31, confidence: 93, suggested_action: "Road inspection and patch repair required" },
  { id: "M4N5O6", description: "Debris and construction waste blocking half the road", latitude: 13.0450, longitude: 80.2550, city: "Chennai", hazard_type: "Road Debris / Obstruction", severity: "Medium", status: "Reported", submitted_at: "2026-05-26T08:00:00", upvotes: 5, confidence: 79, suggested_action: "Immediate debris clearance required" },
];

const SPENDING_DATA = [
  { city: "Chennai", allocated: 120, spent: 45, repaired: 38 },
  { city: "Mumbai", allocated: 300, spent: 210, repaired: 180 },
  { city: "Delhi", allocated: 450, spent: 300, repaired: 260 },
  { city: "Bangalore", allocated: 200, spent: 120, repaired: 95 },
  { city: "Hyderabad", allocated: 180, spent: 90, repaired: 70 },
];

const SEVERITY_COLOR = { High: "#ef4444", Medium: "#f59e0b", Low: "#22c55e" };
const STATUS_COLOR = { Reported: "#6366f1", "Under Review": "#f59e0b", "Action Taken": "#3b82f6", Resolved: "#22c55e" };
const STATUS_STEPS = ["Reported", "Under Review", "Action Taken", "Resolved"];

const HAZARD_ICONS = {
  "Pothole": "🕳️",
  "Broken Traffic Signal": "🚦",
  "Poor Street Lighting": "💡",
  "Road Damage": "🛣️",
  "Waterlogging / Drainage Issue": "🌊",
  "Road Debris / Obstruction": "🪨",
  "General Road Hazard": "⚠️",
};

// ─── Utility ─────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function classifyLocal(desc) {
  const d = desc.toLowerCase();
  let hazard_type = "General Road Hazard", severity = "Low", confidence = 76, suggested_action = "Site inspection required";
  if (["pothole","hole","crater","pit"].some(w => d.includes(w))) { hazard_type = "Pothole"; suggested_action = "Road resurfacing required — schedule within 7 days"; }
  else if (["signal","traffic light"].some(w => d.includes(w))) { hazard_type = "Broken Traffic Signal"; suggested_action = "Signal maintenance team dispatch required"; }
  else if (["dark","streetlight","lighting","lamp"].some(w => d.includes(w))) { hazard_type = "Poor Street Lighting"; suggested_action = "Street lighting inspection required"; }
  else if (["crack","broken road","damaged","uneven"].some(w => d.includes(w))) { hazard_type = "Road Damage"; suggested_action = "Road inspection and patch repair required"; }
  else if (["flood","water","drain","drainage"].some(w => d.includes(w))) { hazard_type = "Waterlogging / Drainage Issue"; suggested_action = "Drainage clearance required"; }
  else if (["debris","garbage","waste","rubble"].some(w => d.includes(w))) { hazard_type = "Road Debris / Obstruction"; suggested_action = "Immediate debris clearance required"; }
  if (["large","severe","dangerous","deep","accident","critical"].some(w => d.includes(w))) { severity = "High"; confidence = 91; }
  else if (["medium","moderate","growing"].some(w => d.includes(w))) { severity = "Medium"; confidence = 83; }
  return { hazard_type, severity, confidence, suggested_action };
}

// ─── Components ──────────────────────────────────────────────────────────────
function Nav({ active, setActive }) {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "map", label: "Hazard Map", icon: "🗺️" },
    { id: "report", label: "Report Hazard", icon: "📍" },
    { id: "tracker", label: "Track Reports", icon: "🔄" },
    { id: "spending", label: "Gov Spending", icon: "💰" },
  ];
  return (
    <nav style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "0 24px", display: "flex", alignItems: "center", gap: 0, position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ marginRight: 32, display: "flex", alignItems: "center", gap: 8, padding: "16px 0" }}>
        <span style={{ fontSize: 22 }}>🛣️</span>
        <span style={{ color: "#f8fafc", fontWeight: 800, fontSize: 18, letterSpacing: "-0.5px" }}>Road<span style={{ color: "#22d3ee" }}>Watch</span></span>
      </div>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setActive(t.id)} style={{
          background: "none", border: "none", cursor: "pointer", padding: "18px 16px",
          color: active === t.id ? "#22d3ee" : "#94a3b8",
          borderBottom: active === t.id ? "2px solid #22d3ee" : "2px solid transparent",
          fontWeight: active === t.id ? 700 : 400, fontSize: 13, transition: "all 0.2s",
          display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap"
        }}>
          <span>{t.icon}</span>{t.label}
        </button>
      ))}
      <div style={{ marginLeft: "auto", background: "#ef4444", color: "#fff", padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
        🔴 LIVE
      </div>
    </nav>
  );
}

function StatCard({ icon, value, label, color, sub }) {
  return (
    <div style={{ background: "#1e293b", borderRadius: 12, padding: "20px 24px", border: `1px solid ${color}30`, flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Dashboard({ reports }) {
  const total = reports.length;
  const resolved = reports.filter(r => r.status === "Resolved").length;
  const high = reports.filter(r => r.severity === "High").length;
  const pending = reports.filter(r => r.status === "Reported").length;

  const typeCounts = {};
  reports.forEach(r => { typeCounts[r.hazard_type] = (typeCounts[r.hazard_type] || 0) + 1; });
  const topType = Object.entries(typeCounts).sort((a,b) => b[1]-a[1]);

  const recent = [...reports].sort((a,b) => new Date(b.submitted_at) - new Date(a.submitted_at)).slice(0, 5);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#f8fafc", fontSize: 26, fontWeight: 800, margin: 0 }}>RoadWatch Dashboard</h1>
        <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 14 }}>Real-time road hazard monitoring across India</p>
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <StatCard icon="📋" value={total} label="Total Reports" color="#22d3ee" />
        <StatCard icon="🔴" value={high} label="High Severity" color="#ef4444" />
        <StatCard icon="⏳" value={pending} label="Pending Action" color="#f59e0b" />
        <StatCard icon="✅" value={resolved} label="Resolved" color="#22c55e" sub={`${total ? Math.round(resolved/total*100) : 0}% resolution rate`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Recent Reports */}
        <div style={{ background: "#1e293b", borderRadius: 12, padding: 20 }}>
          <h3 style={{ color: "#f8fafc", margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>🕐 Recent Reports</h3>
          {recent.map(r => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #0f172a" }}>
              <span style={{ fontSize: 20 }}>{HAZARD_ICONS[r.hazard_type] || "⚠️"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{r.hazard_type}</div>
                <div style={{ color: "#64748b", fontSize: 11 }}>{r.city} · {timeAgo(r.submitted_at)}</div>
              </div>
              <span style={{ background: SEVERITY_COLOR[r.severity] + "20", color: SEVERITY_COLOR[r.severity], padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{r.severity}</span>
            </div>
          ))}
        </div>

        {/* Hazard Breakdown */}
        <div style={{ background: "#1e293b", borderRadius: 12, padding: 20 }}>
          <h3 style={{ color: "#f8fafc", margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>📊 Hazard Type Breakdown</h3>
          {topType.map(([type, count]) => (
            <div key={type} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#cbd5e1", fontSize: 12 }}>{HAZARD_ICONS[type]} {type}</span>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>{count}</span>
              </div>
              <div style={{ background: "#0f172a", borderRadius: 4, height: 6, overflow: "hidden" }}>
                <div style={{ background: "#22d3ee", height: "100%", width: `${(count/total)*100}%`, borderRadius: 4, transition: "width 1s" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HazardMap({ reports }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("All");

  const filtered = filter === "All" ? reports : reports.filter(r => r.severity === filter);

  // SVG-based simple map visualization
  const mapW = 700, mapH = 420;
  const minLat = 12.9, maxLat = 13.2, minLng = 80.1, maxLng = 80.4;

  function toXY(lat, lng) {
    const x = ((lng - minLng) / (maxLng - minLng)) * (mapW - 80) + 40;
    const y = mapH - ((lat - minLat) / (maxLat - minLat)) * (mapH - 80) - 40;
    return { x, y };
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ color: "#f8fafc", fontSize: 22, fontWeight: 800, margin: 0 }}>🗺️ Live Hazard Map</h1>
          <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>Chennai region — click any pin to view details</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["All","High","Medium","Low"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: filter === f ? (f === "All" ? "#22d3ee" : SEVERITY_COLOR[f] || "#22d3ee") : "#1e293b",
              color: filter === f ? "#0f172a" : "#94a3b8"
            }}>{f}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        <div style={{ background: "#1e293b", borderRadius: 12, overflow: "hidden", position: "relative" }}>
          <svg width="100%" viewBox={`0 0 ${mapW} ${mapH}`} style={{ display: "block" }}>
            {/* Grid background */}
            <rect width={mapW} height={mapH} fill="#0f172a" />
            {[...Array(8)].map((_,i) => <line key={`v${i}`} x1={i*100} y1={0} x2={i*100} y2={mapH} stroke="#1e293b" strokeWidth={1} />)}
            {[...Array(6)].map((_,i) => <line key={`h${i}`} x1={0} y1={i*70} x2={mapW} y2={i*70} stroke="#1e293b" strokeWidth={1} />)}

            {/* City label */}
            <text x={mapW/2} y={30} textAnchor="middle" fill="#334155" fontSize={14} fontWeight="bold">CHENNAI REGION</text>

            {/* Road lines (decorative) */}
            <line x1={100} y1={200} x2={600} y2={200} stroke="#1e293b" strokeWidth={8} />
            <line x1={350} y1={50} x2={350} y2={380} stroke="#1e293b" strokeWidth={8} />
            <line x1={100} y1={200} x2={600} y2={200} stroke="#334155" strokeWidth={2} strokeDasharray="10,5" />
            <line x1={350} y1={50} x2={350} y2={380} stroke="#334155" strokeWidth={2} strokeDasharray="10,5" />

            {/* Heatmap circles */}
            {filtered.map(r => {
              const {x, y} = toXY(r.latitude, r.longitude);
              const col = SEVERITY_COLOR[r.severity];
              return (
                <g key={r.id}>
                  <circle cx={x} cy={y} r={30} fill={col} opacity={0.08} />
                  <circle cx={x} cy={y} r={18} fill={col} opacity={0.15} />
                  <circle
                    cx={x} cy={y} r={10}
                    fill={selected?.id === r.id ? "#fff" : col}
                    stroke={col} strokeWidth={2}
                    style={{ cursor: "pointer", filter: "drop-shadow(0 0 6px " + col + ")" }}
                    onClick={() => setSelected(r)}
                  />
                  <text cx={x} cy={y} textAnchor="middle" dominantBaseline="middle" fontSize={10} style={{ pointerEvents: "none", userSelect: "none" }}>
                    {HAZARD_ICONS[r.hazard_type]}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div style={{ position: "absolute", bottom: 12, left: 12, display: "flex", gap: 12 }}>
            {Object.entries(SEVERITY_COLOR).map(([s, c]) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
                <span style={{ color: "#94a3b8", fontSize: 11 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        <div style={{ background: "#1e293b", borderRadius: 12, padding: 20 }}>
          {selected ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <span style={{ fontSize: 32 }}>{HAZARD_ICONS[selected.hazard_type]}</span>
                <button onClick={() => setSelected(null)} style={{ background: "#0f172a", border: "none", color: "#64748b", cursor: "pointer", borderRadius: 6, padding: "4px 8px", fontSize: 12 }}>✕</button>
              </div>
              <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{selected.hazard_type}</div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 14 }}>{selected.description}</div>

              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <span style={{ background: SEVERITY_COLOR[selected.severity]+"20", color: SEVERITY_COLOR[selected.severity], padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{selected.severity}</span>
                <span style={{ background: STATUS_COLOR[selected.status]+"20", color: STATUS_COLOR[selected.status], padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{selected.status}</span>
              </div>

              <div style={{ background: "#0f172a", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>🤖 AI Classification</div>
                <div style={{ color: "#22d3ee", fontSize: 12, fontWeight: 600 }}>Confidence: {selected.confidence}%</div>
                <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>💡 {selected.suggested_action}</div>
              </div>

              <div style={{ color: "#64748b", fontSize: 11 }}>
                <div>📍 {selected.city}</div>
                <div>🕐 {timeAgo(selected.submitted_at)}</div>
                <div>👍 {selected.upvotes} upvotes</div>
                <div>🆔 #{selected.id}</div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#334155" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
              <div style={{ fontSize: 14 }}>Click any pin on the map to view hazard details</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportForm({ onSubmit }) {
  const [form, setForm] = useState({ description: "", city: "Chennai", latitude: "", longitude: "", reporter_name: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useGPS, setUseGPS] = useState(false);

  function getGPS() {
    setUseGPS(true);
    setForm(f => ({ ...f, latitude: "13.0827", longitude: "80.2707" }));
  }

  function handleSubmit() {
    if (!form.description || !form.city) return;
    setLoading(true);
    setTimeout(() => {
      const id = Math.random().toString(36).substr(2,6).toUpperCase();
      const classification = classifyLocal(form.description);
      setResult({ id, ...classification });
      setLoading(false);
      onSubmit({ id, ...form, ...classification, status: "Reported", submitted_at: new Date().toISOString(), upvotes: 0 });
    }, 1800);
  }

  return (
    <div style={{ padding: 24, maxWidth: 680, margin: "0 auto" }}>
      <h1 style={{ color: "#f8fafc", fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>📍 Report a Road Hazard</h1>
      <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 24px" }}>Help make Indian roads safer — your report triggers AI classification and notifies authorities</p>

      {result ? (
        <div style={{ background: "#1e293b", borderRadius: 16, padding: 28, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ color: "#22c55e", fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Report Submitted!</div>
          <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 20 }}>Report ID: <span style={{ color: "#22d3ee", fontWeight: 700 }}>#{result.id}</span></div>
          <div style={{ background: "#0f172a", borderRadius: 12, padding: 16, textAlign: "left" }}>
            <div style={{ color: "#22d3ee", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>🤖 AI Classification Result</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><div style={{ color: "#64748b", fontSize: 11 }}>Hazard Type</div><div style={{ color: "#f8fafc", fontSize: 13, fontWeight: 600 }}>{result.hazard_type}</div></div>
              <div><div style={{ color: "#64748b", fontSize: 11 }}>Severity</div><div style={{ color: SEVERITY_COLOR[result.severity], fontSize: 13, fontWeight: 700 }}>{result.severity}</div></div>
              <div><div style={{ color: "#64748b", fontSize: 11 }}>AI Confidence</div><div style={{ color: "#f8fafc", fontSize: 13 }}>{result.confidence}%</div></div>
            </div>
            <div style={{ marginTop: 12, background: "#1e293b", borderRadius: 8, padding: 10 }}>
              <div style={{ color: "#64748b", fontSize: 11 }}>💡 Suggested Action</div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>{result.suggested_action}</div>
            </div>
          </div>
          <button onClick={() => { setResult(null); setForm({ description: "", city: "Chennai", latitude: "", longitude: "", reporter_name: "" }); }}
            style={{ marginTop: 16, background: "#22d3ee", color: "#0f172a", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
            Report Another
          </button>
        </div>
      ) : (
        <div style={{ background: "#1e293b", borderRadius: 16, padding: 28 }}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>DESCRIBE THE HAZARD *</label>
            <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
              placeholder="e.g. Large pothole near school zone, very dangerous for two-wheelers..."
              rows={4} style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 12, color: "#f8fafc", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>CITY *</label>
              <select value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))}
                style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", color: "#f8fafc", fontSize: 13 }}>
                {["Chennai","Mumbai","Delhi","Bangalore","Hyderabad","Kolkata"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>YOUR NAME (Optional)</label>
              <input value={form.reporter_name} onChange={e => setForm(f => ({...f, reporter_name: e.target.value}))}
                placeholder="Anonymous" style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", color: "#f8fafc", fontSize: 13, boxSizing: "border-box" }} />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>GPS LOCATION</label>
            <button onClick={getGPS} style={{ background: useGPS ? "#22c55e20" : "#0f172a", border: `1px solid ${useGPS ? "#22c55e" : "#334155"}`, borderRadius: 8, padding: "8px 16px", color: useGPS ? "#22c55e" : "#94a3b8", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              {useGPS ? "✅ GPS Location Captured" : "📍 Use My GPS Location"}
            </button>
          </div>

          <button onClick={handleSubmit} disabled={loading || !form.description}
            style={{ width: "100%", background: loading || !form.description ? "#334155" : "#22d3ee", color: "#0f172a", border: "none", borderRadius: 10, padding: "14px", fontWeight: 800, fontSize: 15, cursor: loading || !form.description ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
            {loading ? "🤖 AI is classifying your report..." : "🚀 Submit Report"}
          </button>
        </div>
      )}
    </div>
  );
}

function Tracker({ reports }) {
  const [search, setSearch] = useState("");
  const filtered = reports.filter(r =>
    r.id.includes(search.toUpperCase()) || r.hazard_type.toLowerCase().includes(search.toLowerCase()) || r.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ color: "#f8fafc", fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>🔄 Track Reports</h1>
      <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 20px" }}>Monitor the status of every submitted report</p>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by Report ID, hazard type, or city..."
        style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "12px 16px", color: "#f8fafc", fontSize: 14, marginBottom: 20, boxSizing: "border-box" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map(r => {
          const step = STATUS_STEPS.indexOf(r.status);
          return (
            <div key={r.id} style={{ background: "#1e293b", borderRadius: 12, padding: 20, border: "1px solid #1e293b" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 24 }}>{HAZARD_ICONS[r.hazard_type]}</span>
                  <div>
                    <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: 14 }}>{r.hazard_type}</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>#{r.id} · {r.city} · {timeAgo(r.submitted_at)}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ background: SEVERITY_COLOR[r.severity]+"20", color: SEVERITY_COLOR[r.severity], padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{r.severity}</span>
                  <span style={{ background: "#1e293b", color: "#94a3b8", padding: "3px 10px", borderRadius: 20, fontSize: 11 }}>👍 {r.upvotes}</span>
                </div>
              </div>

              {/* Status Progress Bar */}
              <div style={{ display: "flex", gap: 0, position: "relative" }}>
                {STATUS_STEPS.map((s, i) => (
                  <div key={s} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {i > 0 && <div style={{ flex: 1, height: 3, background: i <= step ? STATUS_COLOR[r.status] : "#334155", transition: "background 0.5s" }} />}
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        background: i <= step ? STATUS_COLOR[r.status] : "#334155",
                        color: "#fff", fontSize: 10, fontWeight: 700, flexShrink: 0, transition: "background 0.5s"
                      }}>{i < step ? "✓" : i+1}</div>
                      {i < STATUS_STEPS.length - 1 && <div style={{ flex: 1, height: 3, background: i < step ? STATUS_COLOR[r.status] : "#334155" }} />}
                    </div>
                    <div style={{ color: i <= step ? "#e2e8f0" : "#475569", fontSize: 10, marginTop: 6, fontWeight: i === step ? 700 : 400 }}>{s}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Spending() {
  const total_alloc = SPENDING_DATA.reduce((a,c) => a+c.allocated, 0);
  const total_spent = SPENDING_DATA.reduce((a,c) => a+c.spent, 0);
  const efficiency = Math.round(total_spent/total_alloc*100);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ color: "#f8fafc", fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>💰 Government Road Spending</h1>
      <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 24px" }}>Budget allocation vs actual spending transparency dashboard</p>

      <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <StatCard icon="💰" value={`₹${total_alloc}Cr`} label="Total Allocated" color="#22d3ee" />
        <StatCard icon="✅" value={`₹${total_spent}Cr`} label="Total Spent" color="#22c55e" />
        <StatCard icon="⚠️" value={`₹${total_alloc-total_spent}Cr`} label="Unspent Budget" color="#f59e0b" />
        <StatCard icon="📊" value={`${efficiency}%`} label="Utilization Rate" color={efficiency > 70 ? "#22c55e" : "#ef4444"} />
      </div>

      <div style={{ background: "#1e293b", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #0f172a", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 8 }}>
          {["City","Allocated (Cr)","Spent (Cr)","Repaired (km)","Utilization"].map(h => (
            <div key={h} style={{ color: "#64748b", fontSize: 11, fontWeight: 700 }}>{h}</div>
          ))}
        </div>
        {SPENDING_DATA.map(d => {
          const util = Math.round(d.spent/d.allocated*100);
          return (
            <div key={d.city} style={{ padding: "16px 20px", borderBottom: "1px solid #0f172a15", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 8, alignItems: "center" }}>
              <div style={{ color: "#f8fafc", fontWeight: 700 }}>{d.city}</div>
              <div style={{ color: "#22d3ee" }}>₹{d.allocated}Cr</div>
              <div style={{ color: "#22c55e" }}>₹{d.spent}Cr</div>
              <div style={{ color: "#94a3b8" }}>{d.repaired} km</div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, background: "#0f172a", borderRadius: 4, height: 6 }}>
                    <div style={{ width: `${util}%`, height: "100%", background: util > 70 ? "#22c55e" : util > 40 ? "#f59e0b" : "#ef4444", borderRadius: 4 }} />
                  </div>
                  <span style={{ color: util > 70 ? "#22c55e" : util > 40 ? "#f59e0b" : "#ef4444", fontSize: 11, fontWeight: 700, minWidth: 32 }}>{util}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, background: "#1e293b", borderRadius: 12, padding: 20, border: "1px solid #f59e0b30" }}>
        <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 14, marginBottom: 8 }}>⚠️ Key Insight</div>
        <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>
          Only <strong style={{ color: "#ef4444" }}>₹{total_spent}Cr of ₹{total_alloc}Cr</strong> allocated budget has been utilized ({efficiency}% utilization). 
          <strong style={{ color: "#f59e0b" }}> ₹{total_alloc-total_spent}Cr remains unspent</strong> while citizens continue to report hazards. 
          RoadWatch makes this data publicly visible to drive accountability.
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState("dashboard");
  const [reports, setReports] = useState(MOCK_REPORTS);

  function addReport(r) {
    setReports(prev => [r, ...prev]);
    setTimeout(() => setActive("tracker"), 500);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Nav active={active} setActive={setActive} />
      <div style={{ minHeight: "calc(100vh - 57px)" }}>
        {active === "dashboard" && <Dashboard reports={reports} />}
        {active === "map" && <HazardMap reports={reports} />}
        {active === "report" && <ReportForm onSubmit={addReport} />}
        {active === "tracker" && <Tracker reports={reports} />}
        {active === "spending" && <Spending />}
      </div>
    </div>
  );
}

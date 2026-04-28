import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function PinCell({ pin }) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
    >
      <code>{visible ? pin : "••••••"}</code>
      <button
        onClick={() => setVisible((v) => !v)}
        style={s.eyeBtn}
        title={visible ? "Hide PIN" : "Show PIN"}
      >
        {visible ? "🙈" : "👁️"}
      </button>
    </span>
  );
}

export default function ParentDashboard() {
  const [parent, setParent] = useState(null);
  const [children, setChildren] = useState([]);
  const [form, setForm] = useState({ firstName: "", lastName: "" });
  const [newChild, setNewChild] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const token = localStorage.getItem("parentToken");

  useEffect(() => {
    const stored = localStorage.getItem("parentUser");
    if (stored) setParent(JSON.parse(stored));
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/parent/children", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setChildren(data.children);
    } catch {
      console.error("Failed to fetch children");
    }
  };

  const handleAddChild = async (e) => {
    e.preventDefault();
    setError("");
    setNewChild(null);
    try {
      const res = await fetch("http://localhost:5001/api/parent/children", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message);
      setNewChild(data.child);
      setForm({ firstName: "", lastName: "" });
      fetchChildren();
    } catch {
      setError("Server error. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("parentToken");
    localStorage.removeItem("parentUser");
    navigate("/parent/login");
  };

  return (
    <div style={s.page}>
      <header style={s.header}>
        <span style={s.brand}>Parent Dashboard</span>
        <div style={s.headerRight}>
          <span style={s.parentName}>👋 {parent?.name}</span>
          <button style={s.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main style={s.main}>
        {/* Add Child Form */}
        <section style={s.card}>
          <h3 style={s.cardTitle}>Add a Child</h3>
          <form onSubmit={handleAddChild} style={s.form}>
            <input
              style={s.input}
              placeholder="First Name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
            <input
              style={s.input}
              placeholder="Last Name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
            <button style={s.button} type="submit">
              Add Child
            </button>
          </form>
          {error && <p style={s.error}>{error}</p>}

          {newChild && (
            <div style={s.credBox}>
              <p style={s.credTitle}>✅ Child added successfully!</p>
              <p>
                <strong>Username:</strong> {newChild.username}
              </p>
              <p>
                <strong>PIN:</strong> {newChild.pin}
              </p>
            </div>
          )}
        </section>

        {/* Children List */}
        <section style={s.card}>
          <h3 style={s.cardTitle}>Your Children ({children.length})</h3>
          {children.length === 0 ? (
            <p style={s.empty}>No children added yet.</p>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Name</th>
                  <th style={s.th}>Username</th>
                  <th style={s.th}>PIN</th>
                  <th style={s.th}>Added</th>
                </tr>
              </thead>
              <tbody>
                {children.map((c) => (
                  <tr key={c.id}>
                    <td style={s.td}>
                      {c.first_name} {c.last_name}
                    </td>
                    <td style={s.td}>
                      <code>{c.username}</code>
                    </td>
                    <td style={s.td}>
                      <PinCell pin={c.pin_plain} />
                    </td>
                    <td style={s.td}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#f0f2f5", fontFamily: "sans-serif" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 2rem",
    background: "#7c3aed",
    color: "#fff",
  },
  brand: { fontSize: "1.25rem", fontWeight: "bold" },
  headerRight: { display: "flex", alignItems: "center", gap: "1rem" },
  parentName: { fontSize: "0.95rem" },
  logoutBtn: {
    padding: "0.4rem 1rem",
    background: "#fff",
    color: "#7c3aed",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  main: {
    maxWidth: "720px",
    margin: "2rem auto",
    padding: "0 1rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  card: {
    background: "#fff",
    borderRadius: "8px",
    padding: "1.5rem",
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
  },
  cardTitle: { margin: "0 0 1rem", color: "#333" },
  form: { display: "flex", gap: "0.75rem", flexWrap: "wrap" },
  input: {
    flex: 1,
    minWidth: "120px",
    padding: "0.6rem 0.8rem",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "1rem",
  },
  button: {
    padding: "0.6rem 1.2rem",
    background: "#7c3aed",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "1rem",
    cursor: "pointer",
  },
  error: { color: "red", marginTop: "0.5rem", fontSize: "0.875rem" },
  credBox: {
    marginTop: "1rem",
    padding: "1rem",
    background: "#f5f3ff",
    borderRadius: "6px",
    border: "1px solid #ddd6fe",
    fontSize: "0.95rem",
    lineHeight: "1.7",
  },
  credTitle: { margin: "0 0 0.5rem", fontWeight: "bold", color: "#5b21b6" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "0.5rem 0.75rem",
    borderBottom: "2px solid #e5e7eb",
    color: "#555",
    fontSize: "0.875rem",
  },
  td: {
    padding: "0.6rem 0.75rem",
    borderBottom: "1px solid #f3f4f6",
    fontSize: "0.9rem",
    color: "#333",
  },
  empty: { color: "#888", fontSize: "0.9rem" },
  eyeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "1rem",
    padding: "0",
    lineHeight: 1,
  },
};

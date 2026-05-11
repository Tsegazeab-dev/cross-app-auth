import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function AcademyModal({ child, onConfirm, onCancel, loading, error }) {
  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <p style={s.modalIcon}>🎓</p>
        <h2 style={s.modalTitle}>Login to Academy</h2>
        <p style={s.modalSub}>You're about to sign in to Academy as:</p>

        <div style={s.infoBox}>
          <div style={s.infoRow}>
            <span style={s.infoLabel}>Name</span>
            <span style={s.infoValue}>{child?.name}</span>
          </div>
          <div style={s.infoRow}>
            <span style={s.infoLabel}>Username</span>
            <span style={s.infoValue}>
              <code>{child?.username}</code>
            </span>
          </div>
          <div style={s.infoRow}>
            <span style={s.infoLabel}>Destination</span>
            <span style={s.infoValue}>localhost:5173</span>
          </div>
        </div>

        {error && <p style={s.error}>{error}</p>}

        <div style={s.modalActions}>
          <button style={s.cancelBtn} onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            style={loading ? { ...s.confirmBtn, opacity: 0.7 } : s.confirmBtn}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Connecting..." : "Confirm & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChildHome() {
  const [child, setChild] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [ssoError, setSsoError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("childUser");
    if (stored) setChild(JSON.parse(stored));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("childToken");
    localStorage.removeItem("childUser");
    navigate("/child/login");
  };

  const handleConfirmSSO = async () => {
    setSsoLoading(true);
    setSsoError("");
    try {
      const token = localStorage.getItem("childToken");
      const res = await fetch("http://localhost:5001/api/child/sso-token", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include", // Include cookies in request
      });
      const data = await res.json();
      if (!res.ok) return setSsoError(data.message);
      // Cookie is now set, redirect to Academy SSO page without token in URL
      window.location.href = "http://localhost:5173/sso";
    } catch {
      setSsoError("Failed to connect to Academy. Try again.");
    } finally {
      setSsoLoading(false);
    }
  };

  return (
    <div style={s.page}>
      {showModal && (
        <AcademyModal
          child={child}
          onConfirm={handleConfirmSSO}
          onCancel={() => {
            setShowModal(false);
            setSsoError("");
          }}
          loading={ssoLoading}
          error={ssoError}
        />
      )}

      <header style={s.header}>
        <span style={s.brand}>Kids Zone</span>
        <button style={s.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </header>

      <main style={s.main}>
        <div style={s.card}>
          <p style={s.emoji}>🎉</p>
          <h1 style={s.welcome}>Welcome, {child?.name}!</h1>
          <p style={s.sub}>
            You're logged in as <code>{child?.username}</code>
          </p>
          <button
            style={s.ssoBtn}
            onClick={() => {
              setSsoError("");
              setShowModal(true);
            }}
          >
            🎓 Login to Academy
          </button>
        </div>
      </main>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#ecfdf5", fontFamily: "sans-serif" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 2rem",
    background: "#059669",
    color: "#fff",
  },
  brand: { fontSize: "1.25rem", fontWeight: "bold" },
  logoutBtn: {
    padding: "0.4rem 1rem",
    background: "#fff",
    color: "#059669",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  main: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "calc(100vh - 64px)",
  },
  card: {
    background: "#fff",
    borderRadius: "12px",
    padding: "3rem 2rem",
    textAlign: "center",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
  },
  emoji: { fontSize: "3rem", margin: 0 },
  welcome: { fontSize: "2rem", color: "#065f46", margin: 0 },
  sub: { color: "#6b7280", fontSize: "0.95rem", margin: 0 },
  ssoBtn: {
    marginTop: "1rem",
    padding: "0.75rem 1.5rem",
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    cursor: "pointer",
    fontWeight: "bold",
  },

  // Modal
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  modal: {
    background: "#fff",
    borderRadius: "12px",
    padding: "2rem",
    width: "360px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
  },
  modalIcon: { fontSize: "2.5rem", margin: 0 },
  modalTitle: { fontSize: "1.4rem", color: "#1e1b4b", margin: 0 },
  modalSub: {
    color: "#6b7280",
    fontSize: "0.9rem",
    margin: 0,
    textAlign: "center",
  },
  infoBox: {
    width: "100%",
    background: "#f5f3ff",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    marginTop: "0.25rem",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.9rem",
  },
  infoLabel: { color: "#6b7280", fontWeight: "500" },
  infoValue: { color: "#1e1b4b", fontWeight: "600" },
  error: { color: "red", fontSize: "0.85rem", margin: 0 },
  modalActions: {
    display: "flex",
    gap: "0.75rem",
    marginTop: "0.5rem",
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    padding: "0.65rem",
    background: "#f3f4f6",
    color: "#374151",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.95rem",
    cursor: "pointer",
    fontWeight: "500",
  },
  confirmBtn: {
    flex: 1,
    padding: "0.65rem",
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.95rem",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

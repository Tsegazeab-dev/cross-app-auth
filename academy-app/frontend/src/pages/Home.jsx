import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [user, setUser] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));

    // Auto-logout when token expires (2 minutes = 120000ms)
    const timer = setTimeout(() => {
      setSessionExpired(true);
      handleLogout();
    }, 120000);

    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <span style={styles.brand}>MyApp</span>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </header>
      <main style={styles.main}>
        {sessionExpired ? (
          <p>Session expired. Redirecting...</p>
        ) : (
          <h1 style={styles.welcome}>Welcome, {user?.name} 👋</h1>
        )}
        <p style={styles.note}>Your session will expire in 2 minutes.</p>
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f0f2f5", fontFamily: "sans-serif" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 2rem",
    background: "#4f46e5",
    color: "#fff",
  },
  brand: { fontSize: "1.25rem", fontWeight: "bold" },
  logoutBtn: {
    padding: "0.4rem 1rem",
    background: "#fff",
    color: "#4f46e5",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  main: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "calc(100vh - 64px)",
  },
  welcome: { fontSize: "2rem", color: "#333" },
  note: { color: "#888", fontSize: "0.875rem" },
};

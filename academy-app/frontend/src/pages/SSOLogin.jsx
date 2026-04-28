import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SSOLogin() {
  const [status, setStatus] = useState("Authenticating...");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setError("No SSO token found in URL.");
      return;
    }

    fetch("http://localhost:5000/api/sso/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.message || "SSO login failed");
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setStatus("Success! Redirecting...");
        setTimeout(() => navigate("/"), 500);
      })
      .catch((err) => {
        setError(err.message || "Something went wrong. Please try again.");
      });
  }, []);

  return (
    <div style={s.container}>
      <div style={s.box}>
        {error ? (
          <>
            <p style={s.errorIcon}>❌</p>
            <p style={s.errorText}>{error}</p>
            <a href="http://localhost:5174/child/login" style={s.link}>
              ← Back to Kids Zone
            </a>
          </>
        ) : (
          <>
            <p style={s.spinner}>🎓</p>
            <p style={s.statusText}>{status}</p>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "#f0f2f5",
  },
  box: {
    background: "#fff",
    padding: "2.5rem 3rem",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  spinner: { fontSize: "3rem", margin: "0 0 1rem" },
  statusText: { color: "#555", fontSize: "1rem" },
  errorIcon: { fontSize: "2.5rem", margin: "0 0 0.5rem" },
  errorText: { color: "red", fontSize: "0.95rem", marginBottom: "1rem" },
  link: { color: "#4f46e5", fontSize: "0.875rem" },
};

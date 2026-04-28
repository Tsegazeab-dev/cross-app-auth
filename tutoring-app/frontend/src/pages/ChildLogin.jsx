import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function ChildLogin() {
  const [form, setForm] = useState({ username: "", pin: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("http://localhost:5001/api/child/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message);
      localStorage.setItem("childToken", data.token);
      localStorage.setItem("childUser", JSON.stringify(data.child));
      navigate("/child/home");
    } catch {
      setError("Server error. Please try again.");
    }
  };

  return (
    <div style={s.container}>
      <form onSubmit={handleSubmit} style={s.form}>
        <h2 style={s.title}>Child Login</h2>
        {error && <p style={s.error}>{error}</p>}
        <input
          style={s.input}
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          required
        />
        <input
          style={s.input}
          name="pin"
          type="password"
          placeholder="PIN"
          value={form.pin}
          onChange={handleChange}
          required
        />
        <button style={s.button} type="submit">
          Login
        </button>
        <p style={s.link}>
          Are you a parent? <Link to="/parent/login">Parent Login</Link>
        </p>
      </form>
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
  form: {
    background: "#fff",
    padding: "2rem",
    borderRadius: "8px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
    width: "320px",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  title: { margin: 0, textAlign: "center", color: "#333" },
  input: {
    padding: "0.6rem 0.8rem",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "1rem",
  },
  button: {
    padding: "0.7rem",
    background: "#059669",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "1rem",
    cursor: "pointer",
  },
  error: { color: "red", margin: 0, fontSize: "0.875rem" },
  link: { textAlign: "center", margin: 0, fontSize: "0.875rem" },
};

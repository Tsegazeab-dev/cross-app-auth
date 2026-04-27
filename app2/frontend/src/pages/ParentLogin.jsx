import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function ParentLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("http://localhost:5001/api/parent/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message);
      localStorage.setItem("parentToken", data.token);
      localStorage.setItem("parentUser", JSON.stringify(data.parent));
      navigate("/parent/dashboard");
    } catch {
      setError("Server error. Please try again.");
    }
  };

  return (
    <div style={s.container}>
      <form onSubmit={handleSubmit} style={s.form}>
        <h2 style={s.title}>Parent Login</h2>
        {error && <p style={s.error}>{error}</p>}
        <input
          style={s.input}
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          style={s.input}
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />
        <button style={s.button} type="submit">
          Login
        </button>
        <p style={s.link}>
          No account? <Link to="/parent/register">Register</Link>
        </p>
        <p style={s.link}>
          Are you a child? <Link to="/child/login">Child Login</Link>
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
    background: "#7c3aed",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "1rem",
    cursor: "pointer",
  },
  error: { color: "red", margin: 0, fontSize: "0.875rem" },
  link: { textAlign: "center", margin: 0, fontSize: "0.875rem" },
};

require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { db, connectDB } = require("./config/db");

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5174",
    credentials: true, // Allow cookies to be sent
  }),
);

const JWT_SECRET = process.env.JWT_SECRET;

// --- Helpers ---

function generateUsername(firstName, lastName) {
  const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(
    /\s+/g,
    "",
  );
  const suffix = Math.floor(100 + Math.random() * 900); // 3-digit suffix
  return `${base}${suffix}`;
}

function generatePin() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit pin
}

// --- Middleware ---

function authenticateParent(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "parent")
      return res.status(403).json({ message: "Access denied" });
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function authenticateChild(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "child")
      return res.status(403).json({ message: "Access denied" });
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// --- Parent Routes ---

// Register parent
app.post("/api/parent/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const [existing] = await db.query(
      "SELECT id FROM parents WHERE email = ?",
      [email],
    );
    if (existing.length > 0)
      return res.status(409).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO parents (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashed],
    );
    res.status(201).json({ message: "Parent registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login parent
app.post("/api/parent/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query("SELECT * FROM parents WHERE email = ?", [
      email,
    ]);
    const parent = rows[0];
    if (!parent)
      return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, parent.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: parent.id, name: parent.name, email: parent.email, role: "parent" },
      JWT_SECRET,
      { expiresIn: "2h" },
    );
    res.json({
      token,
      parent: { id: parent.id, name: parent.name, email: parent.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a child
app.post("/api/parent/children", authenticateParent, async (req, res) => {
  const { firstName, lastName } = req.body;
  if (!firstName || !lastName)
    return res
      .status(400)
      .json({ message: "First name and last name are required" });

  try {
    // Ensure unique username
    let username;
    let attempts = 0;
    do {
      username = generateUsername(firstName, lastName);
      const [taken] = await db.query(
        "SELECT id FROM children WHERE username = ?",
        [username],
      );
      if (taken.length === 0) break;
      attempts++;
    } while (attempts < 5);

    const pin = generatePin();
    const hashedPin = await bcrypt.hash(pin, 10);

    await db.query(
      "INSERT INTO children (parent_id, first_name, last_name, username, pin, pin_plain) VALUES (?, ?, ?, ?, ?, ?)",
      [req.user.id, firstName, lastName, username, hashedPin, pin],
    );

    res.status(201).json({
      message: "Child added successfully",
      child: { firstName, lastName, username, pin },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all children for logged-in parent
app.get("/api/parent/children", authenticateParent, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, first_name, last_name, username, pin_plain, created_at FROM children WHERE parent_id = ?",
      [req.user.id],
    );
    res.json({ children: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Child Routes ---

// Child login (username + pin)
app.post("/api/child/login", async (req, res) => {
  const { username, pin } = req.body;
  try {
    const [rows] = await db.query("SELECT * FROM children WHERE username = ?", [
      username,
    ]);
    const child = rows[0];
    if (!child) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(pin, child.pin);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      {
        id: child.id,
        name: child.first_name,
        username: child.username,
        role: "child",
      },
      JWT_SECRET,
      { expiresIn: "1h" },
    );
    res.json({
      token,
      child: { id: child.id, name: child.first_name, username: child.username },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Child protected home
app.get("/api/child/me", authenticateChild, (req, res) => {
  res.json({ user: req.user });
});

// SSO handoff — issue a short-lived bridge token as a secure cookie
app.post("/api/child/sso-token", authenticateChild, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.username, c.first_name, p.email
       FROM children c
       JOIN parents p ON p.id = c.parent_id
       WHERE c.id = ?`,
      [req.user.id],
    );
    const record = rows[0];
    if (!record) return res.status(404).json({ message: "Child not found" });

    // Build tagged email: parent+childusername@domain.com
    const [localPart, domain] = record.email.split("@");
    const taggedEmail = `${localPart}+${record.username}@${domain}`;

    const ssoToken = jwt.sign(
      {
        id: req.user.id,
        username: record.username,
        name: record.first_name,
        email: taggedEmail,
      },
      process.env.SSO_BRIDGE_SECRET,
      { expiresIn: "30s" },
    );

    // Set secure cookie for the parent domain
    res.cookie("sso_bridge_token", ssoToken, {
      httpOnly: true, // Prevents JavaScript access
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "lax", // Allows cross-subdomain but not cross-site
      domain:
        process.env.NODE_ENV === "production" ? ".evangadi.com" : "localhost", // Share across subdomains
      maxAge: 30000, // 30 seconds
      path: "/", // Available across all paths
    });

    res.json({ success: true, message: "SSO token set" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Start ---
const PORT = process.env.PORT || 5001;
connectDB().then(() => {
  app.listen(PORT, () =>
    console.log(`🚀 Server running on http://localhost:${PORT}`),
  );
});

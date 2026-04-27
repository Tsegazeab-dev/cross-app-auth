import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ParentRegister from "./pages/ParentRegister";
import ParentLogin from "./pages/ParentLogin";
import ParentDashboard from "./pages/ParentDashboard";
import ChildLogin from "./pages/ChildLogin";
import ChildHome from "./pages/ChildHome";

function ParentRoute({ children }) {
  return localStorage.getItem("parentToken") ? (
    children
  ) : (
    <Navigate to="/parent/login" replace />
  );
}

function ChildRoute({ children }) {
  return localStorage.getItem("childToken") ? (
    children
  ) : (
    <Navigate to="/child/login" replace />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/parent/login" replace />} />
      <Route path="/parent/register" element={<ParentRegister />} />
      <Route path="/parent/login" element={<ParentLogin />} />
      <Route
        path="/parent/dashboard"
        element={
          <ParentRoute>
            <ParentDashboard />
          </ParentRoute>
        }
      />
      <Route path="/child/login" element={<ChildLogin />} />
      <Route
        path="/child/home"
        element={
          <ChildRoute>
            <ChildHome />
          </ChildRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#52525b", fontFamily: "JetBrains Mono", fontSize: 12 }}>
        <span>{"> verificando sessão"}</span><span className="caret" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter basename="/donaspainel">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "#0a0a0a",
              border: "1px solid #10b981",
              borderRadius: 0,
              color: "#fff",
              fontFamily: "JetBrains Mono",
              fontSize: "12px",
              letterSpacing: "0.02em",
            },
            className: "sonner-toast",
          }}
        />
      </AuthProvider>
    </div>
  );
}

export default App;

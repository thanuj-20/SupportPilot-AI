import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import Navbar       from "./components/Navbar";
import Login        from "./pages/Login";
import Dashboard    from "./pages/Dashboard";
import Tickets      from "./pages/Tickets";
import SubmitTicket from "./pages/SubmitTicket";
import Predict       from "./pages/Predict";
import KnowledgeBase from "./pages/KnowledgeBase";

function ProtectedLayout({ onLogout, theme, onToggleTheme }) {
  return (
    <>
      <Navbar onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />
      <Routes>
        <Route path="/"        element={<Dashboard />}    />
        <Route path="/tickets" element={<Tickets />}      />
        <Route path="/submit"  element={<SubmitTicket />} />
        <Route path="/predict"   element={<Predict />}       />
        <Route path="/knowledge" element={<KnowledgeBase />}  />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  const { loggedIn, handleLogin, handleLogout } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem("sp-theme") || "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("sp-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  return (
    <BrowserRouter>
      {loggedIn ? (
        <ProtectedLayout onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />
      ) : (
        <Routes>
          <Route path="*" element={<Login onLogin={handleLogin} />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

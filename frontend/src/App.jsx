import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import Navbar          from "./components/Navbar";
import Chatbot         from "./components/Chatbot";
import Login           from "./pages/Login";
import Dashboard       from "./pages/Dashboard";
import Tickets         from "./pages/Tickets";
import Predict         from "./pages/Predict";
import KnowledgeBase   from "./pages/KnowledgeBase";
import WorkflowPage    from "./pages/WorkflowPage";
import JiraPage        from "./pages/JiraPage";
import EmailPage       from "./pages/EmailPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import EscalationPage  from "./pages/EscalationPage";
import WorkflowMonitorPage from "./pages/WorkflowMonitorPage";

function ProtectedLayout({ onLogout, theme, onToggleTheme }) {
  return (
    <>
      <Navbar onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />
      <Routes>
        <Route path="/"             element={<Dashboard />}        />
        <Route path="/tickets"      element={<Tickets />}          />
        <Route path="/predict"      element={<Predict />}          />
        <Route path="/knowledge"    element={<KnowledgeBase />}    />
        <Route path="/workflow"     element={<WorkflowPage />}        />
        <Route path="/jira"         element={<JiraPage />}            />
        <Route path="/emails"       element={<EmailPage />}           />
        <Route path="/integrations" element={<IntegrationsPage />}    />
        <Route path="/escalations"  element={<EscalationPage />}      />
        <Route path="/wf-monitor"   element={<WorkflowMonitorPage />} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
      <Chatbot />
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

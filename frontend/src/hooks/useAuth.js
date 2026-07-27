import { useState, useCallback } from "react";
import { login, logout, isAuthenticated } from "../services/auth";

export function useAuth() {
  const [loggedIn, setLoggedIn] = useState(isAuthenticated);

  const handleLogin = useCallback((username, password) => {
    const ok = login(username, password);
    if (ok) setLoggedIn(true);
    return ok;
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setLoggedIn(false);
  }, []);

  return { loggedIn, handleLogin, handleLogout };
}

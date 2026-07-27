// Simple demo auth — no JWT, no backend, localStorage only
const CREDENTIALS = { username: "admin", password: "admin123" };
const KEY = "sp_isLoggedIn";

export const login = (username, password) => {
  if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
    localStorage.setItem(KEY, "true");
    return true;
  }
  return false;
};

export const logout = () => localStorage.removeItem(KEY);

export const isAuthenticated = () => localStorage.getItem(KEY) === "true";

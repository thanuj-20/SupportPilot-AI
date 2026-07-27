import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:8000/api" });

// Milestone 1
export const trainModels    = ()                  => API.post("/train");
export const getDashboard   = ()                  => API.get("/dashboard");
export const getTickets     = (skip=0, limit=100) => API.get("/tickets", { params: { skip, limit } });
export const getTicketById  = (id)                => API.get(`/tickets/${id}`);
export const submitTicket   = (subject, body)     => API.post("/tickets", { subject, body });
export const predictTicket  = (subject, body)     => API.post("/predict", { subject, body });

// Milestone 2 — Knowledge Base (read-only)
export const getKBStatus     = ()               => API.get("/knowledge/status");
export const searchKnowledge = (query, top_k=5) => API.post("/knowledge/search", { query, top_k });
export const ragKnowledge    = (query, top_k=5) => API.post("/knowledge/ask",    { query, top_k });

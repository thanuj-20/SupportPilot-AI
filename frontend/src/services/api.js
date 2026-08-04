import axios from "axios";

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api" });

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

// Milestone 3 — Multi-Agent Workflow
export const runWorkflow        = (subject, body, ticket_id=null, user_email=null) => API.post("/workflow/run", { subject, body, ticket_id, user_email });
export const getWorkflowStatus  = (workflow_id) => API.get(`/workflow/${workflow_id}/status`);
export const getWorkflowHistory = (skip=0, limit=20)              => API.get("/workflow/history", { params: { skip, limit } });
export const getWorkflowById    = (id)                            => API.get(`/workflow/${id}`);

// Milestone 3 — Jira Integration
export const getJiraTickets = (skip=0, limit=50) => API.get("/jira/tickets", { params: { skip, limit } });
export const getJiraStats   = ()                 => API.get("/jira/stats");

// Milestone 3 — Email Automation
export const getEmails      = (skip=0, limit=50) => API.get("/emails", { params: { skip, limit } });
export const getEmailStats  = ()                 => API.get("/emails/stats");
export const getEmailByTicket = (ticket_id)      => API.get(`/emails/ticket/${ticket_id}`);

// Milestone 3 — Integration Health
export const getIntegrationsStatus = () => API.get("/integrations/status");

// Milestone 4 — Escalation Monitoring
export const getEscalations       = (params={})         => API.get("/escalations", { params });
export const getEscalationStats   = ()                  => API.get("/escalations/stats");
export const updateEscalationStatus = (ticket_id, status) => API.patch(`/escalations/${ticket_id}/status`, { status });

// Milestone 4 — Workflow Monitoring
export const getWorkflowStats = () => API.get("/workflow/stats");

// Evaluation
export const getEvaluation = () => API.get("/evaluate");

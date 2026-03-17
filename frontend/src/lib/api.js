import axios from "axios";
import { loadSession } from "@/lib/session";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = loadSession()?.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiLogin = async (email, password) => {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
};

export const apiLogout = async () => {
  const { data } = await api.post("/auth/logout");
  return data;
};

export const getDashboardSummary = async () => (await api.get("/dashboard/summary")).data;
export const getBranches = async () => (await api.get("/branches")).data;
export const createBranch = async (payload) => (await api.post("/branches", payload)).data;
export const getUsers = async () => (await api.get("/users")).data;
export const createUser = async (payload) => (await api.post("/users", payload)).data;
export const getStages = async (pipeline) => (await api.get("/stages", { params: { pipeline } })).data;
export const createStage = async (payload) => (await api.post("/stages", payload)).data;
export const getLeads = async (params) => (await api.get("/leads", { params })).data;
export const createLead = async (payload) => (await api.post("/leads", payload)).data;
export const moveLeadStage = async (leadId, payload) => (await api.post(`/leads/${leadId}/move-stage`, payload)).data;
export const bookAppointment = async (leadId, payload) =>
  (await api.post(`/leads/${leadId}/book-appointment`, payload)).data;
export const getSheetsStatus = async () => (await api.get("/sheets/status")).data;
export const getSheetsConfig = async () => (await api.get("/sheets/config")).data;
export const saveSheetsConfig = async (payload) => (await api.post("/sheets/config", payload)).data;
export const startSheetsOAuth = async () => (await api.get("/oauth/sheets/login")).data;
export const importSheetsLeads = async () => (await api.post("/sheets/sync/import")).data;

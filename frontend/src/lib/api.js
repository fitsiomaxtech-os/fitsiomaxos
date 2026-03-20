import axios from "axios";
import { loadSession } from "@/lib/session";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${BACKEND_URL}/api/v2`,
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
export const getLocations = async () => (await api.get("/meta/locations")).data;
export const getServices = async () => (await api.get("/services")).data;
export const createService = async (payload) => (await api.post("/services", payload)).data;
export const getDoctors = async (params) => (await api.get("/doctors", { params })).data;
export const createDoctor = async (payload) => (await api.post("/doctors", payload)).data;
export const addDoctorSlots = async (doctorId, payload) =>
  (await api.post(`/doctors/${doctorId}/slots`, payload)).data;
export const getDoctorAvailability = async (doctorId) =>
  (await api.get(`/doctors/${doctorId}/availability`)).data;

export const getLeads = async (params) => (await api.get("/leads", { params })).data;
export const createLead = async (payload) => (await api.post("/leads", payload)).data;
export const importLeads = async (payload) => (await api.post("/leads/import", payload)).data;

export const getAppointments = async (params) => (await api.get("/appointments", { params })).data;
export const createAppointment = async (payload) => (await api.post("/appointments", payload)).data;

export const getSheetsStatus = async () => (await api.get("/sheets/status")).data;

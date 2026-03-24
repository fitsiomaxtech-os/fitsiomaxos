import axios from "axios";
import { loadSession } from "@/lib/session";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${BACKEND_URL}/api/v3`,
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

export const getRoleSelectionMock = async () => {
  return {
    leads_preview: [
      {
        id: "lead_01",
        name: "Priya",
        phone: "9000000001",
        source_tab: "Instagram",
        stage: "New Lead",
      },
      {
        id: "lead_02",
        name: "Arun",
        phone: "9000000002",
        source_tab: "Meta",
        stage: "Pre-sales Qualified",
      },
    ],
  };
};

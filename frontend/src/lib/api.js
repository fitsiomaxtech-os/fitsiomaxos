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

export const getVerticals = async () => (await api.get("/verticals")).data;
export const createVertical = async (payload) => (await api.post("/verticals", payload)).data;

export const getBranches = async () => (await api.get("/branches")).data;
export const createBranch = async (payload) => (await api.post("/branches", payload)).data;
export const updateBranch = async (branchId, payload) => (await api.put(`/branches/${branchId}`, payload)).data;
export const deleteBranch = async (branchId) => (await api.delete(`/branches/${branchId}`)).data;

export const getDoctors = async (params) => (await api.get("/doctors", { params })).data;
export const createDoctor = async (payload) => (await api.post("/doctors", payload)).data;
export const addDoctorSlots = async (doctorId, payload) => (await api.post(`/doctors/${doctorId}/slots`, payload)).data;
export const getAvailableDoctors = async (params) => (await api.get("/doctors/available", { params })).data;

export const getLeads = async (params) => (await api.get("/leads", { params })).data;
export const createManualLead = async (payload) => (await api.post("/leads/manual", payload)).data;
export const updateLead = async (leadId, payload) => (await api.put(`/leads/${leadId}`, payload)).data;
export const qualifyLead = async (leadId) => (await api.post(`/leads/${leadId}/qualify`)).data;
export const assignLeadBranch = async (leadId, payload) => (await api.post(`/leads/${leadId}/assign-branch`, payload)).data;
export const confirmLead = async (leadId) => (await api.post(`/leads/${leadId}/confirm`)).data;
export const bookLeadAppointment = async (leadId, payload) => (await api.post(`/leads/${leadId}/book-appointment`, payload)).data;

export const getAppointments = async (params) => (await api.get("/appointments", { params })).data;
export const completeAppointment = async (appointmentId) => (await api.post(`/appointments/${appointmentId}/complete`)).data;

export const createSheetConnection = async (payload) => (await api.post("/sheets/connections", payload)).data;
export const getSheetConnections = async () => (await api.get("/sheets/connections")).data;
export const saveSheetMapping = async (connectionId, payload) =>
  (await api.post(`/sheets/connections/${connectionId}/mapping`, payload)).data;
export const syncSheetConnection = async (connectionId, payload) =>
  (await api.post(`/sheets/connections/${connectionId}/sync`, payload)).data;

export const getMasterBoard = async () => (await api.get("/boards/master")).data;
export const getBranchBoardOld = async (branchId) => (await api.get(`/boards/branch/${branchId}`)).data;

export const getTeamMembers = async (params) => (await api.get("/team-members", { params })).data;
export const addTeamMember = async (payload) => (await api.post("/team-members", payload)).data;

export const getBdSummary = async () => (await api.get("/dashboard/bd-summary")).data;
export const getLeadSources = async () => (await api.get("/lead-sources")).data;

export const getLeadRemarks = async (leadId) => (await api.get(`/leads/${leadId}/remarks`)).data;
export const addLeadRemark = async (leadId, payload) => (await api.post(`/leads/${leadId}/remarks`, payload)).data;
export const getLeadFollowUps = async (leadId) => (await api.get(`/leads/${leadId}/follow-ups`)).data;
export const addLeadFollowUp = async (leadId, payload) => (await api.post(`/leads/${leadId}/follow-ups`, payload)).data;
export const completeLeadFollowUp = async (leadId, followupId) => (await api.post(`/leads/${leadId}/follow-ups/${followupId}/complete`)).data;
export const getLeadActivity = async (leadId) => (await api.get(`/leads/${leadId}/activity`)).data;
export const moveLeadStage = async (leadId, payload) => (await api.post(`/leads/${leadId}/move-stage`, payload)).data;
export const bookAppointment = async (leadId, payload) => (await api.post(`/leads/${leadId}/book-appointment`, payload)).data;

export const getBranchBoard = async (branchId) => (await api.get(`/branch-board/${branchId}`)).data;
export const moveBranchStage = async (leadId, payload) => (await api.post(`/leads/${leadId}/branch-stage`, payload)).data;
export const collectFee = async (leadId, payload) => (await api.post(`/leads/${leadId}/collect-fee`, payload)).data;
export const assignPhysio = async (leadId, payload) => (await api.post(`/leads/${leadId}/assign-physio`, payload)).data;

export const createHeadPhysio = async (payload) => (await api.post("/branch/head-physios", payload)).data;
export const getDoctorCalendar = async (doctorId) => (await api.get(`/doctors/${doctorId}/calendar`)).data;
export const addCalendarSlots = async (doctorId, payload) => (await api.post(`/doctors/${doctorId}/calendar-slots`, payload)).data;
export const removeCalendarSlots = async (doctorId, payload) => (await api.post(`/doctors/${doctorId}/remove-slots`, payload)).data;

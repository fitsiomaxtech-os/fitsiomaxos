const SESSION_KEY = "physiofit_crm_session";

export const loadSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveSession = (data) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

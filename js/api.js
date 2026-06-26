import { state } from "./state.js";
import { currentLocalMonth } from "./helpers.js";

export async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

export function applyData(data) {
  state.user = data.user;
  state.members = data.members || [];
  state.measurements = data.measurements || [];
  state.cards = data.cards || [];
  state.attendance = data.attendance || [];
  state.payments = data.payments || [];
  state.users = data.users || [];
  state.session = data.session;
  state.audit = data.audit || [];
  state.notifications = data.notifications || [];
  state.leads = data.leads || [];
  state.scoringFormula = data.scoringFormula || null;
  state.dashboardSummary = data.dashboardSummary || null;
  state.dashboardClubs = data.dashboardClubs || [];
  state.dashboardClubFilter = state.dashboardSummary?.club || "";
  state.week = data.week || "";
  state.viewMode = data.viewMode || state.viewMode || "personal";
  if (!state.user || !["admin", "supervisor", "super_admin"].includes(state.user.role)) {
    state.scoringFormulaOpen = false;
  }
  if (state.user && state.user.role === "member" && !["dashboard", "measurements", "history"].includes(state.route)) {
    state.route = "history";
  }
  if (state.user && state.user.role !== "admin" && state.route === "members") state.route = "dashboard";
  if (state.user && !["admin", "supervisor"].includes(state.user.role) && state.route === "attendance") state.route = "dashboard";
  if (state.user && !["admin", "supervisor"].includes(state.user.role) && state.route === "today") state.route = "dashboard";
  if (state.user && state.user.role !== "admin" && state.route === "audit") state.route = "dashboard";
  if (state.user && !["admin", "super_admin"].includes(state.user.role) && state.route === "reports") state.route = "dashboard";
  if (state.user && state.user.role !== "admin" && state.route === "export") state.route = "dashboard";
  if (state.user && state.user.role !== "admin" && state.route === "compliance") state.route = "dashboard";
  if (state.user && state.user.role !== "admin" && state.user.role !== "member" && state.route === "history") state.route = "dashboard";
}

export async function loadProfileAttendance() {
  if (!state.profileMemberId) return;
  const month = state.profileAttendanceMonth || currentLocalMonth();
  const params = new URLSearchParams({ memberId: state.profileMemberId, month });
  const data = await api(`/api/member-attendance?${params.toString()}`);
  state.profileAttendanceMonth = data.month || month;
  state.profileAttendanceRows = data.entries || [];
  state.profileAttendanceKey = `${state.profileMemberId}:${state.profileAttendanceMonth}`;
}

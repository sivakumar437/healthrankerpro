import { state } from "../state.js";
import { api, applyData, loadProfileAttendance } from "../api.js";
import { render } from "../renderer.js";
import { showToast } from "../helpers.js";

export async function refreshData() {
  try {
    const params = new URLSearchParams({ view: state.viewMode || "personal" });
    if (state.dashboardClubFilter) params.set("club", state.dashboardClubFilter);
    const data = await api(`/api/bootstrap?${params.toString()}`);
    applyData(data);
    render();
  } catch (err) {
    showToast(err.message || "Failed to refresh data.");
  }
}

export async function loadDashboardClubSummary(club) {
  try {
    state.dashboardClubFilter = club;
    const params = new URLSearchParams({ view: state.viewMode || "personal" });
    if (club) params.set("club", club);
    const data = await api(`/api/bootstrap?${params.toString()}`);
    applyData(data);
    render();
  } catch (err) {
    showToast(err.message || "Failed to load club summary.");
  }
}

export async function fetchMemberReport(memberId) {
  try {
    const data = await api(`/api/member-report?memberId=${encodeURIComponent(memberId)}`);
    state.memberReport = data;
    render();
  } catch (err) {
    showToast(err.message || "Failed to load member report.");
  }
}

export async function loadProfile(memberId) {
  state.profileMemberId = memberId;
  state.profileAttendanceMonth = null;
  state.profileAttendanceRows = [];
  await loadProfileAttendance();
  state.route = "profile";
  render();
}

export async function loadProfileAttendancePrev() {
  const [year, month] = (state.profileAttendanceMonth || new Date().toISOString().slice(0, 7)).split("-").map(Number);
  const prev = new Date(year, month - 2, 1);
  state.profileAttendanceMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  await loadProfileAttendance();
  render();
}

export async function loadProfileAttendanceForMonth() {
  await loadProfileAttendance();
  render();
}

export async function loadProfileAttendanceNext() {
  const [year, month] = (state.profileAttendanceMonth || new Date().toISOString().slice(0, 7)).split("-").map(Number);
  const next = new Date(year, month, 1);
  state.profileAttendanceMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  await loadProfileAttendance();
  render();
}

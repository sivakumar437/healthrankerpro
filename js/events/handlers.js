import { state, routes } from "../state.js";
import { api } from "../api.js";
import { render } from "../renderer.js";
import { showToast, syncAgeFromDob, currentLocalMonth, canAddMeasurements } from "../helpers.js";
import { refreshData, loadProfile, loadProfileAttendancePrev, loadProfileAttendanceNext, loadDashboardClubSummary, fetchMemberReport, loadProfileAttendanceForMonth } from "./data.js";
import { handleLogin, updateLoginButton, togglePassword } from "./auth.js";
import {
  saveMember, saveEditMember, saveMeasurement, saveEditMeasurement,
  saveAttendance, saveCardPayment, saveLead, saveUser,
  handleMeasurementLookup, fillMeasurementMember,
  updateMeasurementWeekFromDate, filterAttendanceSearch, updateCardPaymentDefaults,
} from "./forms.js";
import { applyAuditFilters, clearAuditFilters, applyPaymentFilters, clearPaymentFilters, applyLeadFilters, clearLeadFilters, applyWeeklyReviewFilters, clearWeeklyReviewFilters } from "./filters.js";

export function routeIsAccessible(routeId) {
  const role = state.user?.role;
  if (!role) return false;
  if (role === "member") return ["dashboard", "measurements", "history"].includes(routeId);
  if (routeId === "audit" && role !== "admin") return false;
  if (routeId === "export" && role !== "admin") return false;
  if (routeId === "compliance" && role !== "admin") return false;
  if (routeId === "users" && role !== "admin") return false;
  if (routeId === "reports" && !["admin", "super_admin"].includes(role)) return false;
  if (routeId === "marathon" && role !== "admin") return false;
  if (routeId === "members" && !["admin", "nc_organiser", "super_admin"].includes(role)) return false;
  return true;
}

export function changeRoute(routeId) {
  if (!routeIsAccessible(routeId)) return;
  state.route = routeId;
  render();
}

export async function handleAction(action, target) {
  switch (action) {
    case "toggle-password":
      togglePassword(target);
      break;

    case "print-member-report":
      window.print();
      break;

    case "toggle-scoring-formula":
      state.scoringFormulaOpen = !state.scoringFormulaOpen;
      render();
      break;

    case "logout":
      await api("/api/logout", { method: "POST" });
      window.location.reload();
      break;

    case "refresh":
      await refreshData();
      break;

    case "switch-view":
      state.viewMode = target.dataset.view || "personal";
      await refreshData();
      break;

    case "view-profile":
      await loadProfile(target.dataset.memberId);
      break;

    case "toggle-member-entry":
      state.memberEntryOpen = !state.memberEntryOpen;
      render();
      break;

    case "toggle-measurement-entry":
      state.measurementEntryOpen = !state.measurementEntryOpen;
      render();
      break;

    case "toggle-profile-edit":
      state.profileEditOpen = !state.profileEditOpen;
      render();
      break;

    case "toggle-lead-form":
      state.leadFormOpen = !state.leadFormOpen;
      render();
      break;

    case "toggle-add-user":
      state.addUserOpen = !state.addUserOpen;
      render();
      break;

    case "set-dmo-tab":
      state.dmoTab = target.dataset.tab;
      render();
      break;

    case "set-member-goal": {
      const goalInput = document.getElementById("memberGoal") || document.querySelector("[name='goal']");
      if (goalInput) goalInput.value = target.dataset.goal;
      break;
    }

    case "select-attendance-member":
      state.selectedAttendanceMemberId = target.dataset.memberId;
      state.attendanceSearch = "";
      render();
      break;

    case "add-measurement": {
      if (!canAddMeasurements()) { showToast("Measurement session has not been opened by the Admin for this week."); break; }
      const memberId = target.dataset.memberId || "";
      state.modal = state.route === "profile" && memberId ? `profile:${memberId}` : memberId || "open";
      render();
      break;
    }

    case "edit-measurement": {
      const measurementId = target.dataset.measurementId;
      if (measurementId) { state.modal = `edit:${measurementId}`; render(); }
      break;
    }

    case "select-measurement-member": {
      const d = target.dataset;
      const fields = {
        "#measurementMemberId": d.memberId,
        "#measurementFirstName": d.firstName,
        "#measurementLastName": d.lastName,
        "#measurementPhone": d.phone,
        "#measurementMemberCode": d.memberCode,
        "#measurementGender": d.gender,
        "#measurementHeight": d.height,
        "#measurementNutritionClub": d.nutritionClub,
        "#measurementGoal": d.goal,
        "#measurementMemberSearch": `${d.firstName || ""} ${d.lastName || ""}`.trim(),
      };
      Object.entries(fields).forEach(([sel, val]) => { const el = document.querySelector(sel); if (el) el.value = val || ""; });
      document.querySelectorAll("#measurementLookupResults .lookup-result").forEach((btn) => {
        btn.classList.toggle("selected", btn.dataset.memberId === d.memberId);
      });
      const submitBtn = document.querySelector("#measurementSubmitButton");
      if (submitBtn) submitBtn.textContent = d.memberId ? "Save Measurement" : "Create Member";
      break;
    }

    case "set-measurement-goal": {
      const input = document.querySelector("#measurementGoal");
      if (input) input.value = target.dataset.goal || "";
      break;
    }

    case "set-profile-member-goal": {
      const input = document.querySelector("#profileMemberGoal");
      if (input) input.value = target.dataset.goal || "";
      break;
    }

    case "view-profile": {
      await loadProfile(target.dataset.memberId);
      state.modal = null;
      break;
    }

    case "close-modal":
      state.modal = null;
      render();
      break;

    case "delete-attendance": {
      if (!confirm("Remove this attendance entry?")) break;
      await api("/api/delete-attendance", { method: "POST", body: JSON.stringify({ attendanceId: target.dataset.attendanceId }) });
      showToast("Attendance removed.");
      await refreshData();
      break;
    }

    case "set-member-status": {
      await api("/api/set-member-status", { method: "POST", body: JSON.stringify({ memberId: target.dataset.memberId, active: target.dataset.active }) });
      showToast("Member status updated.");
      await refreshData();
      break;
    }

    case "toggle-marathon": {
      await api("/api/toggle-marathon", { method: "POST", body: JSON.stringify({ memberId: target.dataset.memberId, value: target.dataset.value }) });
      showToast("Marathon status updated.");
      await refreshData();
      break;
    }

    case "reset-marathon":
      if (!confirm("Reset Marathon for the next month? This clears all current registrations.")) break;
      await api("/api/reset-marathon", { method: "POST" });
      showToast("Marathon reset.");
      await refreshData();
      break;

    case "toggle-user-active": {
      await api("/api/toggle-user-active", { method: "POST", body: JSON.stringify({ userId: target.dataset.userId, active: target.dataset.active }) });
      showToast("User updated.");
      await refreshData();
      break;
    }

    case "start-session":
    case "reopen-session":
      await api("/api/start-session", { method: "POST" });
      showToast("Session opened.");
      await refreshData();
      break;

    case "close-session":
      if (!confirm("Close the weekly measurement session?")) break;
      await api("/api/close-session", { method: "POST" });
      showToast("Session closed.");
      await refreshData();
      break;

    case "re-score-all":
      await api("/api/re-score", { method: "POST" });
      showToast("Scores recalculated.");
      await refreshData();
      break;

    case "profile-attendance-prev":
      await loadProfileAttendancePrev();
      break;

    case "profile-attendance-next":
      await loadProfileAttendanceNext();
      break;

    case "apply-audit-filters": applyAuditFilters(); break;
    case "clear-audit-filters": clearAuditFilters(); break;
    case "apply-payment-filters": applyPaymentFilters(); break;
    case "clear-payment-filters": clearPaymentFilters(); break;
    case "apply-lead-filters": applyLeadFilters(); break;
    case "clear-lead-filters": clearLeadFilters(); break;
    case "apply-weekly-review-filters": applyWeeklyReviewFilters(); break;
    case "clear-weekly-review-filters": clearWeeklyReviewFilters(); break;

    case "fetch-member-report": {
      const select = document.getElementById("reportMemberId");
      if (select?.value) await fetchMemberReport(select.value);
      break;
    }

    default:
      break;
  }
}

function clubComboboxOpen(name) {
  const input = document.querySelector(`[data-combobox="${name}"].club-combobox-input`);
  const dropdown = document.getElementById(`club-combo-${name}-dropdown`);
  if (!dropdown || !input) return;
  const query = input.value.trim().toLowerCase();
  const options = dropdown.querySelectorAll(".club-combobox-option");
  let anyVisible = false;
  options.forEach((opt) => {
    const match = opt.dataset.value.toLowerCase().includes(query);
    opt.hidden = !match;
    if (match) anyVisible = true;
  });
  const newOpt = document.getElementById(`club-combo-${name}-new-option`);
  const exactMatch = [...options].some((o) => o.dataset.value.toLowerCase() === query);
  if (newOpt) {
    const isNew = query.length > 0 && !exactMatch;
    newOpt.hidden = !isNew;
    newOpt.dataset.value = input.value.trim();
    const label = newOpt.querySelector(".club-new-label");
    if (label) label.textContent = input.value.trim();
    if (isNew) anyVisible = true;
  }
  dropdown.hidden = !anyVisible;
}

function clubComboboxSelect(name, value) {
  const input = document.querySelector(`[data-combobox="${name}"].club-combobox-input`);
  const dropdown = document.getElementById(`club-combo-${name}-dropdown`);
  if (input) input.value = value;
  if (dropdown) dropdown.hidden = true;
}

export function bindEvents() {
  document.addEventListener("click", async (e) => {
    // Close all combobox dropdowns when clicking outside
    if (!e.target.closest(".club-combobox")) {
      document.querySelectorAll(".club-combobox-dropdown").forEach((d) => { d.hidden = true; });
    }
    const btn = e.target.closest("[data-action]");
    if (btn) {
      const action = btn.dataset.action;
      if (action === "club-combobox-select") {
        e.preventDefault();
        clubComboboxSelect(btn.dataset.combobox, btn.dataset.value);
        return;
      }
      e.preventDefault();
      await handleAction(action, btn);
      return;
    }
    const routeBtn = e.target.closest("[data-route]");
    if (routeBtn) {
      e.preventDefault();
      changeRoute(routeBtn.dataset.route);
    }
    if (e.target.closest(".modal-overlay") === e.target) {
      state.modal = null;
      render();
    }
  });

  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.action === "club-combobox-input") { clubComboboxOpen(el.dataset.combobox); return; }
    if (el.id === "username" || el.id === "password") updateLoginButton();
    if (el.id === "memberSearch") { state.query = el.value; render(); }
    if (el.id === "attendanceSearch") filterAttendanceSearch(el.value);
    if (el.id === "measurementMemberSearch") handleMeasurementLookup(el.value);
    if (el.id === "measurementSearch") { state.query = el.value; render(); }
    if (el.id === "memberDob" || el.id === "editMemberDob") {
      const ageField = el.id === "memberDob" ? "#memberAge" : "#editMemberAge";
      syncAgeFromDob(`#${el.id}`, ageField);
    }
    if (el.id === "measurementDate") updateMeasurementWeekFromDate(el.value);
    if (el.id === "showHiddenMembers") { state.showHiddenMembers = el.checked; render(); }
    if (el.id === "rankingsMarathonOnly") { state.rankingsMarathonOnly = el.checked; render(); }
    if (el.id === "dashboardClubFilter") loadDashboardClubSummary(el.value);
    if (el.id === "profileAttendanceMonth") {
      state.profileAttendanceMonth = el.value || currentLocalMonth();
      loadProfileAttendanceForMonth();
    }
  });

  document.addEventListener("submit", async (e) => {
    const form = e.target;
    e.preventDefault();
    if (form.id === "loginForm") {
      handleLogin(e);
    }
    else if (form.id === "memberForm") await saveMember(form);
    else if (form.id === "editMemberForm") await saveEditMember(form);
    else if (form.id === "measurementForm") await saveMeasurement(form);
    else if (form.id === "editMeasurementForm") await saveEditMeasurement(form);
    else if (form.id === "attendanceForm") await saveAttendance(form);
    else if (form.id === "cardPaymentForm") await saveCardPayment(form);
    else if (form.id === "leadForm") await saveLead(form);
    else if (form.id === "addUserForm") await saveUser(form);
    else if (form.id === "auditFilterForm") applyAuditFilters(e);
    else if (form.id === "paymentFilterForm") applyPaymentFilters(e);
    else if (form.id === "importForm") await handleImport(form);
    else if (form.id === "memberReportForm") {
      const fd = Object.fromEntries(new FormData(form).entries());
      if (fd.memberId) {
        state.reportMemberId = fd.memberId;
        state.reportThroughDate = fd.throughDate || "";
        await fetchMemberReport(fd.memberId);
      }
    }
  });

  document.addEventListener("focusin", (e) => {
    if (e.target.dataset.action === "club-combobox-input") clubComboboxOpen(e.target.dataset.combobox);
  });

  document.addEventListener("change", (e) => {
    const el = e.target;
    if (el.name === "cardType") {
      const memberId = el.closest("form")?.querySelector("[name='memberId']")?.value;
      if (memberId) updateCardPaymentDefaults(memberId, el.value);
    }
    if (el.id === "measurementMemberSearch") fillMeasurementMember(el.value);
  });
}

async function handleImport(form) {
  const { showToast } = await import("../helpers.js");
  const { refreshData } = await import("./data.js");
  const formData = new FormData(form);
  try {
    const response = await fetch("/api/import", { method: "POST", credentials: "same-origin", headers: { "X-Requested-With": "XMLHttpRequest" }, body: formData });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Import failed.");
    state.importResult = result;
    showToast(`Imported ${result.inserted || 0} records.`);
    await refreshData();
  } catch (err) {
    showToast(err.message || "Import failed.");
  }
}

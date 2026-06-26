import { state } from "../state.js";
import { api } from "../api.js";
import { render } from "../renderer.js";
import { showToast, splitMemberName, memberCode, cardStandardAmount, paymentBenefitValue, availableCardTypesFor, attendanceSearchResults, focusSearchInput, currentLocalDate, syncAgeFromDob } from "../helpers.js";
import { refreshData } from "./data.js";

export async function saveMember(form) {
  const data = Object.fromEntries(new FormData(form));
  const { firstName, lastName, ...rest } = data;
  const payload = { ...rest, name: [firstName, lastName].filter(Boolean).join(" ") };
  try {
    await api("/api/save-member", { method: "POST", body: JSON.stringify(payload) });
    showToast("Member saved.");
    await refreshData();
  } catch (err) {
    showToast(err.message || "Failed to save member.");
  }
}

export async function saveEditMember(form) {
  const data = Object.fromEntries(new FormData(form));
  const { firstName, lastName, ...rest } = data;
  const payload = { ...rest, name: [firstName, lastName].filter(Boolean).join(" ") };
  try {
    await api("/api/save-member", { method: "POST", body: JSON.stringify(payload) });
    showToast("Member updated.");
    await refreshData();
  } catch (err) {
    showToast(err.message || "Failed to update member.");
  }
}

export async function saveMeasurement(form) {
  const data = Object.fromEntries(new FormData(form));
  try {
    await api("/api/save-measurement", { method: "POST", body: JSON.stringify(data) });
    showToast("Measurement saved.");
    form.reset();
    document.getElementById("measurementMemberId").value = "";
    document.getElementById("measurementMemberPreview").innerHTML = "";
    await refreshData();
  } catch (err) {
    showToast(err.message || "Failed to save measurement.");
  }
}

export async function saveEditMeasurement(form) {
  const data = Object.fromEntries(new FormData(form));
  try {
    await api("/api/save-measurement", { method: "POST", body: JSON.stringify(data) });
    showToast("Measurement updated.");
    state.modal = null;
    await refreshData();
  } catch (err) {
    showToast(err.message || "Failed to update measurement.");
  }
}

export async function saveAttendance(form) {
  const data = Object.fromEntries(new FormData(form));
  try {
    await api("/api/save-attendance", { method: "POST", body: JSON.stringify(data) });
    showToast("Attendance recorded.");
    state.attendanceSearch = "";
    state.selectedAttendanceMemberId = null;
    await refreshData();
  } catch (err) {
    showToast(err.message || "Failed to record attendance.");
  }
}

export async function saveCardPayment(form) {
  const data = Object.fromEntries(new FormData(form));
  try {
    await api("/api/save-payment", { method: "POST", body: JSON.stringify(data) });
    showToast("Card payment saved.");
    await refreshData();
  } catch (err) {
    showToast(err.message || "Failed to save card payment.");
  }
}

export async function saveLead(form) {
  const data = Object.fromEntries(new FormData(form));
  try {
    await api("/api/save-lead", { method: "POST", body: JSON.stringify(data) });
    showToast("Lead saved.");
    state.leadFormOpen = false;
    await refreshData();
  } catch (err) {
    showToast(err.message || "Failed to save lead.");
  }
}

export async function saveUser(form) {
  const data = Object.fromEntries(new FormData(form));
  try {
    await api("/api/save-user", { method: "POST", body: JSON.stringify(data) });
    showToast("User created.");
    state.addUserOpen = false;
    await refreshData();
  } catch (err) {
    showToast(err.message || "Failed to create user.");
  }
}

export function handleMeasurementLookup(query) {
  state.measurementMemberSearch = query;
  render();
}

export function fillMeasurementMember(memberId) {
  const member = state.members.find((m) => Number(m.id) === Number(memberId));
  if (!member) return;
  const hiddenInput = document.getElementById("measurementMemberId");
  const preview = document.getElementById("measurementMemberPreview");
  const searchInput = document.getElementById("measurementMemberSearch");
  if (hiddenInput) hiddenInput.value = memberId;
  if (searchInput) { searchInput.value = member.name; state.measurementMemberSearch = ""; }
  if (preview) preview.innerHTML = `<div class="member-preview"><strong>${member.name}</strong><small>${member.phone || ""}</small></div>`;
  render();
}

export function updateMeasurementSubmitLabel() {
  const memberIdInput = document.getElementById("measurementMemberId");
  const btn = document.getElementById("measurementSubmitBtn");
  if (!btn || !memberIdInput) return;
  const memberId = memberIdInput.value;
  btn.textContent = memberId ? "Update Measurement" : "Add Measurement";
}

export function updateCardPaymentDefaults(memberId, cardType) {
  const amountInput = document.getElementById("cardPaymentAmount");
  const benefitInput = document.getElementById("cardBenefitValue");
  if (!amountInput || !benefitInput) return;
  const member = state.members.find((m) => Number(m.id) === Number(memberId));
  if (!member || !cardType) return;
  const amount = cardStandardAmount(cardType);
  const benefit = paymentBenefitValue(cardType, amount);
  if (amountInput && !amountInput.value) amountInput.value = amount;
  if (benefitInput) benefitInput.value = benefit;
}

export function updateMeasurementWeekFromDate(dateValue) {
  const weekInput = document.getElementById("measurementWeekNumber");
  if (!weekInput || !dateValue) return;
  const d = new Date(dateValue);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  weekInput.value = weekNum;
}

export function filterAttendanceSearch(query) {
  state.attendanceSearch = query;
  render();
}

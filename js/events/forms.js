import { state } from "../state.js";
import { api } from "../api.js";
import { render } from "../renderer.js";
import { showToast, splitMemberName, memberCode, cardStandardAmount, paymentBenefitValue, availableCardTypesFor, attendanceSearchResults, focusSearchInput, currentLocalDate, syncAgeFromDob, isoWeekLabel } from "../helpers.js";
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
    state.modal = null;
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
  const memberIdInput = document.getElementById("measurementMemberId");
  if (memberIdInput) memberIdInput.value = "";
  const submitBtn = document.querySelector("#measurementSubmitButton");
  if (submitBtn) submitBtn.textContent = "Create Member";
  const q = (query || "").trim().toLowerCase();
  const results = [...document.querySelectorAll("#measurementLookupResults .lookup-result")];
  let visible = 0;
  results.forEach((btn) => {
    const matched = !q || btn.innerText.toLowerCase().includes(q);
    btn.hidden = !matched;
    if (matched) visible++;
  });
  if (q && !visible) {
    const parts = splitMemberName(q);
    const first = document.querySelector("#measurementFirstName");
    const last = document.querySelector("#measurementLastName");
    if (first) first.value = parts.first;
    if (last) last.value = parts.last;
  }
  let noMatch = document.querySelector("#lookupNoMatch");
  if (!noMatch) {
    noMatch = document.createElement("div");
    noMatch.id = "lookupNoMatch";
    noMatch.className = "lookup-empty";
    noMatch.textContent = "No match found. Continue below to create a new member.";
    document.querySelector("#measurementLookupResults")?.appendChild(noMatch);
  }
  noMatch.hidden = !!(visible || !q);
}

export function fillMeasurementMember(memberId) {
  const member = state.members.find((m) => Number(m.id) === Number(memberId));
  if (!member) return;
  const parts = splitMemberName(member.name);
  const fields = {
    "#measurementMemberId": String(member.id),
    "#measurementFirstName": parts.first,
    "#measurementLastName": parts.last,
    "#measurementMemberSearch": member.name,
  };
  Object.entries(fields).forEach(([sel, val]) => { const el = document.querySelector(sel); if (el) el.value = val || ""; });
}

export function updateMeasurementSubmitLabel() {
  const memberIdInput = document.getElementById("measurementMemberId");
  const btn = document.getElementById("measurementSubmitButton") || document.getElementById("measurementSubmitBtn");
  if (!btn || !memberIdInput) return;
  const isEdit = !!document.querySelector('input[name="measurementId"]')?.value;
  btn.textContent = isEdit ? "Update Measurement" : memberIdInput.value ? "Save Measurement" : "Create Member";
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
  const weekInput = document.getElementById("measurementWeekLabel") || document.getElementById("measurementWeekNumber");
  if (!weekInput || !dateValue) return;
  weekInput.value = isoWeekLabel(dateValue);
}

export function filterAttendanceSearch(query) {
  state.attendanceSearch = query;
  render();
}

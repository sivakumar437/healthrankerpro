import { state } from "../state.js";
import { render } from "../renderer.js";
import { showToast } from "../helpers.js";
import { refreshData, loadPaymentEntries } from "./data.js";

export function applyAuditFilters(event) {
  event?.preventDefault?.();
  const form = document.querySelector("#auditFilterForm");
  if (form) {
    state.auditFilters = Object.fromEntries(new FormData(form).entries());
  }
  render();
}

export function clearAuditFilters() {
  state.auditFilters = { from: "", to: "", type: "" };
  render();
}

export async function applyPaymentFilters(event) {
  event?.preventDefault?.();
  const form = document.querySelector("#paymentFilterForm");
  const formData = form ? Object.fromEntries(new FormData(form).entries()) : {};
  state.paymentFilters = {
    ...state.paymentFilters,
    from: formData.from || "",
    to: formData.to || "",
    cardType: formData.cardType || "",
    showSum: !!document.querySelector("#paymentShowSum")?.checked,
  };
  try {
    await loadPaymentEntries();
    render();
    showToast("Payments filtered.");
  } catch (err) {
    showToast(err.message || "Failed to load payments.");
  }
}

export async function clearPaymentFilters() {
  state.paymentFilters = { from: "", to: "", cardType: "", memberId: "", showSum: false };
  try {
    await loadPaymentEntries();
    render();
    showToast("Payment filters cleared.");
  } catch (err) {
    render();
  }
}

export function applyLeadFilters() {
  state.leadFilters = {
    search: document.getElementById("leadFilterSearch")?.value.trim() || "",
    status: document.getElementById("leadFilterStatus")?.value || "",
    source: document.getElementById("leadFilterSource")?.value || "",
  };
  render();
}

export function clearLeadFilters() {
  state.leadFilters = {};
  render();
}

export function applyWeeklyReviewFilters() {
  state.weeklyReviewFilters = {
    week: document.getElementById("weeklyReviewFilterWeek")?.value || "",
    coach: document.getElementById("weeklyReviewFilterCoach")?.value.trim() || "",
  };
  render();
}

export function clearWeeklyReviewFilters() {
  state.weeklyReviewFilters = {};
  render();
}

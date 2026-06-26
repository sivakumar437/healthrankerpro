import { state } from "../state.js";
import { render } from "../renderer.js";

export function applyAuditFilters() {
  state.auditFilters = {
    search: document.getElementById("auditFilterSearch")?.value.trim() || "",
    from: document.getElementById("auditFilterFrom")?.value || "",
    to: document.getElementById("auditFilterTo")?.value || "",
  };
  render();
}

export function clearAuditFilters() {
  state.auditFilters = {};
  render();
}

export function applyPaymentFilters() {
  state.paymentFilters = {
    member: document.getElementById("paymentFilterMember")?.value.trim() || "",
    cardType: document.getElementById("paymentFilterCardType")?.value || "",
    mode: document.getElementById("paymentFilterMode")?.value || "",
    from: document.getElementById("paymentFilterFrom")?.value || "",
    to: document.getElementById("paymentFilterTo")?.value || "",
  };
  render();
}

export function clearPaymentFilters() {
  state.paymentFilters = {};
  render();
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

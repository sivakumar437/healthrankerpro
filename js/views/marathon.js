import { state, icons } from "../state.js";
import { escapeHtml, formatDateOnly } from "../helpers.js";
import { restricted, empty } from "./components.js";

export function renderMarathon() {
  if (state.user.role !== "admin" && state.user.role !== "super_admin") return restricted("Only administrators can manage monthly Marathon status.");
  const current = state.marathonData?.current || [];
  const previous = state.marathonData?.previous || [];
  const monthLabel = state.marathonData?.month || new Date().toISOString().slice(0, 7);
  return `
    <div class="marathon-page">
      <article class="card marathon-control-card">
        <div class="section-heading">
          <div><h2>Monthly Marathon</h2><p>${escapeHtml(monthLabel)} registrations are active only for this calendar month.</p></div>
          ${icons.trophy}
        </div>
        <div class="marathon-control-row">
          <div><strong>${current.length}</strong><span>current-month member${current.length === 1 ? "" : "s"}</span></div>
          <div><strong>${previous.length}</strong><span>previous status${previous.length === 1 ? "" : "es"} to reset</span></div>
          <button class="btn btn-primary" type="button" data-action="reset-marathon" ${previous.length ? "" : "disabled"}>${icons.history} Reset Marathon</button>
        </div>
      </article>
      <div class="table-card marathon-table">
        <div class="dashboard-table-heading"><h2 class="dashboard-section-title">Current Month Marathon Members</h2><span class="toolbar-note">${current.length} active</span></div>
        <table>
          <thead><tr><th>Member ID</th><th>Member</th><th>Mobile</th><th>Nutrition Club</th><th>Payment Date</th><th>Status</th></tr></thead>
          <tbody>${current.map((row) => marathonRow(row, true)).join("") || `<tr><td colspan="6">${empty("No Marathon payments for the current month.")}</td></tr>`}</tbody>
        </table>
      </div>
      <div class="table-card marathon-table">
        <div class="dashboard-table-heading"><h2 class="dashboard-section-title">Previous Marathon Statuses</h2><span class="toolbar-note">${previous.length} pending reset</span></div>
        <table>
          <thead><tr><th>Member ID</th><th>Member</th><th>Mobile</th><th>Nutrition Club</th><th>Last Payment</th><th>Status</th></tr></thead>
          <tbody>${previous.map((row) => marathonRow(row, false)).join("") || `<tr><td colspan="6">${empty("No previous Marathon statuses require reset.")}</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;
}

function marathonRow(row, active) {
  return `
    <tr>
      <td>${escapeHtml(row.member_code || String(row.member_id || ""))}</td>
      <td><strong>${escapeHtml(row.name)}</strong></td>
      <td>${escapeHtml(row.phone || "-")}</td>
      <td>${escapeHtml(row.nutrition_club || "-")}</td>
      <td>${row.payment_date ? formatDateOnly(row.payment_date) : "Legacy status"}</td>
      <td><span class="badge ${active ? "badge-emerald" : "badge-amber"}">${active ? "Active this month" : "Ready to reset"}</span></td>
    </tr>
  `;
}

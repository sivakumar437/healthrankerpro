import { state, icons } from "../state.js";
import { escapeHtml, formatDateOnly } from "../helpers.js";
import { restricted, empty } from "./components.js";

export function renderAudit() {
  if (state.user.role !== "admin" && state.user.role !== "super_admin") return restricted("Only admins can access the audit trail.");
  const entries = state.auditEntries?.length ? state.auditEntries : (state.audit || []).slice(0, 20);
  const types = uniqueAuditTypes();
  const f = state.auditFilters || {};
  return `
    <div class="audit-page">
      <article class="card audit-filter-card">
        <div class="section-heading">
          <div><h2>Audit History</h2><p>Latest 20 entries shown by default. Filter by date and transaction type.</p></div>
          ${icons.shield}
        </div>
        <form id="auditFilterForm" class="form-grid">
          <label><span class="label">From Date</span><input name="from" type="date" value="${escapeHtml(f.from || "")}" /></label>
          <label><span class="label">To Date</span><input name="to" type="date" value="${escapeHtml(f.to || "")}" /></label>
          <label class="wide"><span class="label">Transaction Type</span>
            <select name="type">
              <option value="">All transaction types</option>
              ${types.map((type) => `<option value="${escapeHtml(type)}" ${f.type === type ? "selected" : ""}>${escapeHtml(type)}</option>`).join("")}
            </select>
          </label>
          <div class="wide modal-actions">
            <button class="btn btn-outline" type="button" data-action="clear-audit-filters">Clear</button>
            <button class="btn btn-primary" type="submit">${icons.check} Apply Filters</button>
          </div>
        </form>
      </article>
      <div class="table-card audit-history-table">
        <table>
          <thead><tr><th>Date / Time</th><th>Transaction Type</th><th>Entry</th><th>User</th></tr></thead>
          <tbody>${entries.map(auditRow).join("") || `<tr><td colspan="4">${empty("No audit entries match the selected filters.")}</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;
}

export function auditRow(item) {
  const type = auditType(item.action);
  return `
    <tr>
      <td>${escapeHtml(item.created_at)}</td>
      <td><span class="mini-badge">${escapeHtml(type)}</span></td>
      <td><strong>${escapeHtml(item.action)}</strong></td>
      <td>${escapeHtml(item.actor || "")}</td>
    </tr>
  `;
}

export function auditType(action = "") {
  return String(action).split(" - ")[0].trim() || "Transaction";
}

export function uniqueAuditTypes() {
  const combined = [...(state.auditTypes || []), ...(state.audit || []).map((item) => auditType(item.action))].filter(Boolean);
  return [...new Set(combined)].sort();
}

export function filteredAudit() {
  const f = state.auditFilters || {};
  return (state.audit || []).filter((item) => {
    if (f.search) {
      const q = f.search.toLowerCase();
      if (!String(item.action || "").toLowerCase().includes(q) && !String(item.actor || "").toLowerCase().includes(q)) return false;
    }
    if (f.from && item.created_at < f.from) return false;
    if (f.to && item.created_at > f.to + "z") return false;
    return true;
  });
}

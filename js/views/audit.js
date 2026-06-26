import { state, icons } from "../state.js";
import { escapeHtml, formatDateOnly } from "../helpers.js";
import { restricted, empty } from "./components.js";

export function renderAudit() {
  if (state.user.role !== "admin" && state.user.role !== "super_admin") return restricted("Only admins can access the audit trail.");
  const filtered = filteredAudit();
  return `
    ${renderAuditFilters()}
    <article class="card">
      <div class="section-heading"><div><h2>Audit Trail</h2><p>${filtered.length} events</p></div>${icons.history}</div>
      ${filtered.length ? `
        <div class="table-responsive">
          <table>
            <thead><tr><th>Action</th><th>Actor</th><th>Details</th><th>Date</th></tr></thead>
            <tbody>${filtered.map(auditRow).join("")}</tbody>
          </table>
        </div>
      ` : empty("No audit events match the current filters.")}
    </article>
  `;
}

export function renderAuditFilters() {
  const f = state.auditFilters || {};
  return `
    <article class="card filter-card">
      <div class="filter-row">
        <label><span class="label">Search</span><input id="auditFilterSearch" value="${escapeHtml(f.search || "")}" placeholder="Action or actor..." /></label>
        <label><span class="label">From Date</span><input id="auditFilterFrom" type="date" value="${f.from || ""}" /></label>
        <label><span class="label">To Date</span><input id="auditFilterTo" type="date" value="${f.to || ""}" /></label>
        <div class="filter-actions">
          <button class="btn btn-primary" data-action="apply-audit-filters">${icons.search} Apply</button>
          <button class="btn btn-outline" data-action="clear-audit-filters">Clear</button>
        </div>
      </div>
    </article>
  `;
}

export function auditRow(item) {
  return `
    <tr>
      <td><strong>${escapeHtml(item.action)}</strong></td>
      <td>${escapeHtml(item.actor || "-")}</td>
      <td>${escapeHtml(item.details || "")}</td>
      <td>${item.created_at}</td>
    </tr>
  `;
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

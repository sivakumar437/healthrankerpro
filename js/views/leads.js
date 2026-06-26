import { state, icons } from "../state.js";
import { escapeHtml, formatDateOnly, capitalize } from "../helpers.js";
import { restricted, empty } from "./components.js";

export function renderDmo() {
  if (!["coach", "supervisor", "admin", "nc_organiser", "super_admin"].includes(state.user.role)) return restricted("You do not have permission to view DMO.");
  const tab = state.dmoTab || "leads";
  return `
    <div class="dmo-tabs">
      <button class="${tab === "leads" ? "active" : ""}" data-action="set-dmo-tab" data-tab="leads">Leads</button>
      <button class="${tab === "follow-ups" ? "active" : ""}" data-action="set-dmo-tab" data-tab="follow-ups">Follow-ups</button>
      <button class="${tab === "activity" ? "active" : ""}" data-action="set-dmo-tab" data-tab="activity">Field Activity</button>
    </div>
    ${tab === "leads" ? renderLeadsTab() : ""}
    ${tab === "follow-ups" ? renderFollowUpsTab() : ""}
    ${tab === "activity" ? renderFieldActivityTab() : ""}
  `;
}

export function renderLeadsTab() {
  const leads = filteredLeads();
  return `
    ${renderLeadFilters()}
    <article class="card ${state.leadFormOpen ? "open" : "collapsed"}">
      <button class="section-heading collapsible-heading" type="button" data-action="toggle-lead-form">
        <div><h2>Add Lead</h2><p>Record a new prospect or referral</p></div>
        <span class="collapse-indicator">${state.leadFormOpen ? "Hide" : "Add"}</span>
      </button>
      ${state.leadFormOpen ? renderLeadForm() : ""}
    </article>
    <article class="card">
      <div class="section-heading"><div><h2>Leads</h2><p>${leads.length} records</p></div>${icons.user}</div>
      ${leads.length ? `
        <div class="lead-list">
          ${leads.map(leadRow).join("")}
        </div>
      ` : empty("No leads found.")}
    </article>
  `;
}

export function renderLeadFilters() {
  const f = state.leadFilters || {};
  return `
    <article class="card filter-card">
      <div class="filter-row">
        <label><span class="label">Search</span><input id="leadFilterSearch" value="${escapeHtml(f.search || "")}" placeholder="Name or phone..." /></label>
        <label><span class="label">Status</span><select id="leadFilterStatus">
          <option value="">All</option>
          ${["New", "Contacted", "Interested", "Not Interested", "Converted"].map((s) => `<option value="${s}" ${f.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select></label>
        <label><span class="label">Source</span><select id="leadFilterSource">
          <option value="">All sources</option>
          ${["Referral", "Walk-in", "Social Media", "Camp", "Other"].map((s) => `<option value="${s}" ${f.source === s ? "selected" : ""}>${s}</option>`).join("")}
        </select></label>
        <div class="filter-actions">
          <button class="btn btn-primary" data-action="apply-lead-filters">${icons.search} Apply</button>
          <button class="btn btn-outline" data-action="clear-lead-filters">Clear</button>
        </div>
      </div>
    </article>
  `;
}

export function renderLeadForm() {
  return `
    <form id="leadForm" class="form-grid">
      <label><span class="label">Name</span><input name="name" placeholder="Full name" required /></label>
      <label><span class="label">Phone</span><input name="phone" type="tel" placeholder="Phone number" /></label>
      <label><span class="label">Source</span><select name="source">
        ${["Referral", "Walk-in", "Social Media", "Camp", "Other"].map((s) => `<option>${s}</option>`).join("")}
      </select></label>
      <label><span class="label">Status</span><select name="status">
        ${["New", "Contacted", "Interested", "Not Interested"].map((s) => `<option>${s}</option>`).join("")}
      </select></label>
      <label><span class="label">Follow-up Date</span><input name="followUpDate" type="date" /></label>
      <label class="wide"><span class="label">Notes</span><textarea name="notes" rows="2" placeholder="Optional notes"></textarea></label>
      <div class="wide modal-actions"><button class="btn btn-primary" type="submit">${icons.plus} Save Lead</button></div>
    </form>
  `;
}

export function leadRow(lead) {
  const statusCls = { New: "badge-blue", Contacted: "badge-amber", Interested: "badge-emerald", "Not Interested": "badge-red", Converted: "badge-violet" }[lead.status] || "badge-muted";
  return `
    <div class="lead-row" data-action="view-lead" data-lead-id="${lead.id}">
      <div class="avatar small">${(lead.name || "?")[0]}</div>
      <div>
        <strong>${escapeHtml(lead.name)}</strong>
        <p>${escapeHtml(lead.phone || "")} | ${escapeHtml(lead.source || "")}</p>
      </div>
      <span class="badge ${statusCls}">${escapeHtml(lead.status)}</span>
      ${lead.follow_up_date ? `<small>Follow-up: ${formatDateOnly(lead.follow_up_date)}</small>` : ""}
    </div>
  `;
}

export function renderFollowUpsTab() {
  const today = new Date().toISOString().slice(0, 10);
  const due = (state.leads || []).filter((l) => l.follow_up_date && l.follow_up_date <= today && !["Converted", "Not Interested"].includes(l.status));
  return `
    <article class="card">
      <div class="section-heading"><div><h2>Due Follow-ups</h2><p>${due.length} pending</p></div>${icons.calendar}</div>
      ${due.length ? `<div class="lead-list">${due.map(leadRow).join("")}</div>` : empty("No follow-ups due.")}
    </article>
  `;
}

export function renderFieldActivityTab() {
  return `
    <article class="card">
      <div class="section-heading"><div><h2>Field Activity Log</h2><p>Camps, events, and outreach</p></div>${icons.activity}</div>
      ${empty("Field activity log coming soon.")}
    </article>
  `;
}

export function renderWeeklyReview() {
  if (!["coach", "supervisor"].includes(state.user.role)) return restricted("Weekly review is for coaches and supervisors.");
  const f = state.weeklyReviewFilters || {};
  const rows = filteredWeeklyReview();
  return `
    <article class="card filter-card">
      <div class="filter-row">
        <label><span class="label">Week</span><input id="weeklyReviewFilterWeek" type="week" value="${f.week || ""}" /></label>
        <label><span class="label">Coach</span><input id="weeklyReviewFilterCoach" value="${escapeHtml(f.coach || "")}" placeholder="Coach name..." /></label>
        <div class="filter-actions">
          <button class="btn btn-primary" data-action="apply-weekly-review-filters">${icons.search} Apply</button>
          <button class="btn btn-outline" data-action="clear-weekly-review-filters">Clear</button>
        </div>
      </div>
    </article>
    <article class="card">
      <div class="section-heading"><div><h2>Weekly Review</h2><p>${rows.length} members</p></div>${icons.activity}</div>
      ${rows.length ? `
        <table>
          <thead><tr><th>Member</th><th>Coach</th><th>Week</th><th>Score</th><th>Status</th></tr></thead>
          <tbody>${rows.map((r) => `<tr>
            <td>${escapeHtml(r.member_name || r.name)}</td>
            <td>${escapeHtml(r.coach_name || "-")}</td>
            <td>${escapeHtml(r.week_label || r.week_number || "-")}</td>
            <td>${r.score ?? "-"}</td>
            <td><span class="badge badge-emerald">${escapeHtml(r.status || "Reviewed")}</span></td>
          </tr>`).join("")}</tbody>
        </table>
      ` : empty("No weekly review records.")}
    </article>
  `;
}

export function filteredLeads() {
  const f = state.leadFilters || {};
  return (state.leads || []).filter((l) => {
    if (f.search && !String(l.name || "").toLowerCase().includes(f.search.toLowerCase()) && !String(l.phone || "").includes(f.search)) return false;
    if (f.status && l.status !== f.status) return false;
    if (f.source && l.source !== f.source) return false;
    return true;
  });
}

export function filteredWeeklyReview() {
  const f = state.weeklyReviewFilters || {};
  const rows = state.weeklyReview || [];
  return rows.filter((r) => {
    if (f.week && r.week_label !== f.week && r.week_number !== f.week) return false;
    if (f.coach && !String(r.coach_name || "").toLowerCase().includes(f.coach.toLowerCase())) return false;
    return true;
  });
}

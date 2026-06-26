import { state, icons } from "../state.js";
import { escapeHtml, formatDateOnly, measurementsFor } from "../helpers.js";
import { restricted, empty, memberCard } from "./components.js";

export function renderCompliance() {
  if (state.user.role !== "admin" && state.user.role !== "super_admin") return restricted("Only admins can access the compliance view.");
  const members = state.members.filter((m) => Number(m.active ?? 1) === 1);
  const compliant = members.filter((m) => m.measured);
  const pending = members.filter((m) => !m.measured);
  return `
    <div class="compliance-summary grid">
      <div class="stat-card card"><p>Total Active</p><strong>${members.length}</strong></div>
      <div class="stat-card card"><p>Measured This Week</p><strong class="text-emerald">${compliant.length}</strong></div>
      <div class="stat-card card"><p>Pending</p><strong class="text-danger">${pending.length}</strong></div>
      <div class="stat-card card"><p>Compliance Rate</p><strong>${members.length ? Math.round((compliant.length / members.length) * 100) : 0}%</strong></div>
    </div>
    <div class="two-col grid">
      <article class="card">
        <div class="section-heading"><div><h2>Measured</h2><p>${compliant.length} members</p></div><span class="badge badge-emerald">Done</span></div>
        <div class="member-list mini">${compliant.length ? compliant.map(complianceMemberRow).join("") : empty("None yet.")}</div>
      </article>
      <article class="card">
        <div class="section-heading"><div><h2>Pending Measurement</h2><p>${pending.length} members</p></div><span class="badge badge-red">Pending</span></div>
        <div class="member-list mini">${pending.length ? pending.map(complianceMemberRow).join("") : empty("All measured.")}</div>
      </article>
    </div>
  `;
}

export function complianceMemberRow(m) {
  const measurements = measurementsFor(m.id);
  const lastWeek = measurements.length ? measurements.sort((a, b) => b.week_number - a.week_number)[0].measurement_date : "Never";
  return `
    <div class="compliance-member-row">
      <div class="avatar small">${m.name[0]}</div>
      <div>
        <strong>${escapeHtml(m.name)}</strong>
        <small>Last: ${formatDateOnly(lastWeek)}</small>
      </div>
      <button class="btn btn-outline mini" data-action="view-profile" data-member-id="${m.id}">Profile</button>
    </div>
  `;
}

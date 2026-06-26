import { state, icons } from "../state.js";
import { escapeHtml, formatDateOnly, measurementsFor, canAddMeasurements } from "../helpers.js";
import { restricted, empty, memberCard, stat, renderSessionControl } from "./components.js";

export function renderCompliance() {
  if (state.user.role !== "admin" && state.user.role !== "super_admin") return restricted("Only admins can access the compliance view.");
  const pending = state.members.filter((m) => !m.measured);
  const marathonPending = pending.filter((m) => Number(m.marathon_active || 0) === 1);
  const measured = state.members.length - pending.length;
  const canAdd = canAddMeasurements();
  return `
    ${renderSessionControl()}
    <div class="stats-grid grid">
      ${stat("Session", state.session?.status || "-", state.week || "", state.session?.status === "ACTIVE" ? icons.check : icons.lock, state.session?.status === "ACTIVE" ? "bg-emerald" : "bg-danger")}
      ${stat("Measured", measured, "this week", icons.check, "bg-emerald")}
      ${stat("Pending", pending.length, "not yet measured", icons.clock, "bg-amber")}
      ${stat("Marathon Pending", marathonPending.length, "high priority", icons.trophy, "bg-violet")}
    </div>
    ${canAdd
      ? `<div class="toolbar"><button class="btn btn-primary" data-action="add-measurement">${icons.plus} Add Measurement</button></div>`
      : `<div class="notice-inline">Measurement session has not been opened by the Admin for this week.</div>`}
    <div class="card">
      <div class="section-heading"><div><h2>Members Yet to Be Measured</h2><p>Prioritized by marathon status and score movement</p></div></div>
      <div class="member-list">${pending.map(memberCard).join("") || empty("All visible members have been measured this week.")}</div>
    </div>
  `;
}

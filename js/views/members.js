import { state, icons } from "../state.js";
import { escapeHtml, memberIdentity, supervisorName, formatSigned, staffOptions, goalOptions, canAddMeasurements, clubCombobox } from "../helpers.js";
import { restricted, empty, memberCard, goalBadge } from "./components.js";

export function renderMembers() {
  if (!["admin", "supervisor", "coach", "nc_organiser", "super_admin"].includes(state.user.role)) return restricted("You do not have permission to view the member directory.");
  const filtered = state.members.filter((m) => {
    const active = Number(m.active ?? 1) === 1;
    const query = state.query.toLowerCase();
    const matchesQuery = [m.name, m.phone, m.member_code, String(m.id)].some((value) => String(value || "").toLowerCase().includes(query));
    return matchesQuery && (state.showHiddenMembers || active);
  });
  const hiddenCount = state.members.filter((m) => Number(m.active ?? 1) === 0).length;
  return `
    ${["admin", "supervisor"].includes(state.user.role) ? renderSingleMemberEntry() : ""}
    <div class="toolbar">
      <input class="search-input" id="memberSearch" value="${escapeHtml(state.query)}" placeholder="Search by name, phone, or Member ID" />
      <label class="toggle-field member-toggle">
        <span class="label">Show Hidden Members</span>
        <input id="showHiddenMembers" type="checkbox" ${state.showHiddenMembers ? "checked" : ""} />
        <span class="toggle-switch" aria-hidden="true"></span>
      </label>
      <span class="toolbar-note">${filtered.length} visible${hiddenCount ? `, ${hiddenCount} hidden` : ""}</span>
    </div>
    <div class="member-list">${filtered.map(memberCard).join("") || empty("No members match your search.")}</div>
  `;
}

export function renderSingleMemberEntry() {
  const open = state.memberEntryOpen;
  return `
    <article class="card single-entry-card ${open ? "open" : "collapsed"}">
      <button class="section-heading collapsible-heading" type="button" data-action="toggle-member-entry" aria-expanded="${open}">
        <div><h2>Single Member Entry</h2><p>Add one member at a time. Bulk import remains available on Import.</p></div>
        <span class="collapse-indicator">${open ? "Hide" : "Add Member"}</span>
      </button>
      ${open ? `<form id="memberForm" class="form-grid">
        <label><span class="label">First Name</span><input name="firstName" placeholder="First name" required /></label>
        <label><span class="label">Last Name</span><input name="lastName" placeholder="Last name" /></label>
        <label><span class="label">Mobile Number</span><input name="phone" type="tel" placeholder="Phone number" required /></label>
        <label><span class="label">Gender</span><select name="gender"><option value="">Select...</option><option>Male</option><option>Female</option></select></label>
        <label><span class="label">Age</span><input name="age" id="memberAge" type="number" min="0" placeholder="Age" /></label>
        <label><span class="label">Date of Birth</span><input name="dob" id="memberDob" type="date" /></label>
        <label><span class="label">Height (cm)</span><input name="height" type="number" step="0.1" placeholder="Height" /></label>
        <label><span class="label">Nutrition Club</span>${clubCombobox("nutritionClub")}</label>
        <label><span class="label">Coach</span><select name="coachId"><option value="">Unassigned</option>${staffOptions(["coach", "nc_organiser", "admin"])}</select></label>
        <label><span class="label">Supervisor</span><select name="supervisorId"><option value="">Auto assign</option>${staffOptions(["supervisor", "nc_organiser", "admin"])}</select></label>
        <label class="toggle-field wide"><span class="label">Be a Coach</span><input type="checkbox" name="beCoach" value="1" /><span class="toggle-switch" aria-hidden="true"></span></label>
        <label class="wide"><span class="label">Primary Goal</span><input name="goal" id="memberGoal" placeholder="Health & Fitness" /></label>
        <div class="wide goal-chip-row">
          ${goalOptions().map((goal) => `<button type="button" data-action="set-member-goal" data-goal="${escapeHtml(goal)}">${escapeHtml(goal)}</button>`).join("")}
        </div>
        <label class="wide"><span class="label">Notes</span><textarea name="notes" rows="2" placeholder="Optional notes"></textarea></label>
        <div class="wide modal-actions"><button class="btn btn-primary" type="submit">${icons.plus} Save Member</button></div>
      </form>` : ""}
    </article>
  `;
}

export function measurementRow(m) {
  const canEdit = ["admin", "supervisor", "super_admin"].includes(state.user.role) && state.session.status === "ACTIVE";
  return `
    <tr>
      <td><strong>${escapeHtml(m.member_name)}</strong><br /><span>${m.session_id}</span></td>
      <td>${m.week_number}</td>
      <td>${m.weight}</td>
      <td>${m.body_fat}</td>
      <td>${m.visceral_fat}</td>
      <td>${m.bmr ?? "-"}</td>
      <td>${m.bmi}</td>
      <td>${m.bma ?? "-"}</td>
      <td>${m.subcutaneous_fat ?? "-"}</td>
      <td>${m.muscle_mass}${Number(m.muscle_is_estimated || 0) === 1 ? "<small>Approximate value</small>" : ""}</td>
      <td>${supervisorName(m.supervisor_id)}</td>
      <td>${m.measurement_date}</td>
      <td>${canEdit ? `<button class="btn btn-outline mini" data-action="edit-measurement" data-measurement-id="${m.id}">${icons.edit} Edit</button>` : `<span class="readonly-label">Read-only</span>`}</td>
    </tr>
  `;
}

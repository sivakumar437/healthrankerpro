import { state, icons } from "../state.js";
import { escapeHtml, formatDateOnly, memberIdentity, memberContact, supervisorName, latestMeasurementFor, measurementsFor, activeCardFor, canAddMeasurements, goalOptions, staffOptions } from "../helpers.js";
import { goalProgress, goalMetricCards, weeklyInsight, idealDistance, visceralImprovement } from "../formulas.js";
import { goalBadge, stat, empty } from "./components.js";

export function renderProfile() {
  const member = state.members.find((m) => Number(m.id) === Number(state.profileMemberId)) || state.members[0];
  if (!member) return empty("Select a member to view their profile.");
  const progress = goalProgress(member);
  const measurements = measurementsFor(member.id).sort((a, b) => String(b.measurement_date).localeCompare(String(a.measurement_date)));
  const card = activeCardFor(member.id);
  const cards = goalMetricCards(member, progress);
  return `
    <div class="profile-layout">
      ${renderProfileHeader(member, progress, card)}
      <div class="profile-grid">
        ${renderProfileGoalPanel(member, progress, cards)}
        ${renderProfileBodyComposition(member, measurements)}
      </div>
      ${renderProfileAttendanceHistory(member)}
      ${renderProfileMeasurementTable(member, measurements)}
      ${renderProfilePaymentHistory(member)}
      ${["admin", "supervisor", "super_admin"].includes(state.user.role) ? renderProfileEditSection(member) : ""}
    </div>
  `;
}

export function renderProfileHeader(member, progress, card) {
  return `
    <article class="profile-header-card card">
      <div class="profile-avatar">${member.name[0]}</div>
      <div class="profile-meta">
        <h2>${escapeHtml(member.name)}</h2>
        <p>${memberIdentity(member)} | ${memberContact(member)}</p>
        <div class="badges">
          ${goalBadge(member.goal)}
          ${card ? `<span class="badge badge-emerald">${escapeHtml(card.card_type)} Card</span>` : `<span class="badge badge-red">No Active Card</span>`}
          ${Number(member.marathon_active || 0) === 1 ? `<span class="badge badge-amber">${icons.trophy} Marathon</span>` : ""}
          ${Number(member.active ?? 1) === 0 ? `<span class="badge badge-muted">Hidden</span>` : ""}
        </div>
        ${state.user.role === "admin" ? `
          <div class="profile-actions">
            <button class="btn btn-outline mini" data-action="toggle-profile-edit">${state.profileEditOpen ? "Close Edit" : "Edit Details"}</button>
            <button class="btn btn-outline mini" data-action="set-member-status" data-member-id="${member.id}" data-active="${Number(member.active ?? 1) === 1 ? "0" : "1"}">${Number(member.active ?? 1) === 1 ? "Hide Member" : "Make Active"}</button>
          </div>
        ` : ""}
      </div>
      <div class="profile-score-card">
        <strong>${progress.score}</strong>
        <span>Goal Score</span>
        <small>${escapeHtml(progress.driver)}</small>
      </div>
    </article>
  `;
}

export function renderProfileGoalPanel(member, progress, cards) {
  return `
    <section class="card profile-goal-panel">
      <div class="section-heading"><div><h2>Goal Progress</h2><p>${escapeHtml(member.goal)}</p></div>${icons.trophy}</div>
      <div class="stats-grid grid">
        ${cards.map((c) => stat(c.label, c.value, c.sub, icons[c.icon] || icons.trophy, c.color)).join("")}
      </div>
      <div class="insight-card"><strong>Weekly Insight</strong><p>${weeklyInsight(member, progress)}</p></div>
    </section>
  `;
}

export function renderProfileBodyComposition(member, measurements) {
  return renderBodyCompositionDashboard(member, measurements);
}

export function renderBodyCompositionDashboard(member, measurements) {
  const latest = measurements[0];
  const prev = measurements[1];
  if (!latest) return `<section class="card"><div class="section-heading"><div><h2>Body Composition</h2><p>No measurements yet</p></div></div>${empty("No measurements recorded.")}</section>`;
  const diff = (field) => prev ? (Number(latest[field]) - Number(prev[field])).toFixed(1) : null;
  const distance = idealDistance(member);
  const vfImprove = visceralImprovement(member);
  return `
    <section class="card body-comp-panel">
      <div class="section-heading"><div><h2>Body Composition</h2><p>Latest: ${formatDateOnly(latest.measurement_date)} | ${measurements.length} total measurements</p></div>${icons.activity}</div>
      <div class="body-comp-grid">
        ${bodyCompStat("Weight", latest.weight, "kg", diff("weight"), "bg-primary")}
        ${bodyCompStat("Body Fat", latest.body_fat, "%", diff("body_fat"), "bg-violet")}
        ${bodyCompStat("Visceral Fat", latest.visceral_fat, "", diff("visceral_fat"), Number(latest.visceral_fat) < 10 ? "bg-emerald" : "bg-danger")}
        ${bodyCompStat("Muscle Mass", latest.muscle_mass, "kg", diff("muscle_mass"), "bg-blue")}
        ${bodyCompStat("BMI", latest.bmi, "", diff("bmi"), "bg-amber")}
        ${bodyCompStat("Ideal Distance", distance.toFixed(1), "kg", null, distance <= 1 ? "bg-emerald" : "bg-primary")}
      </div>
      ${renderWeightTrend(measurements)}
    </section>
  `;
}

export function bodyCompStat(label, value, unit, change, colorClass) {
  const changeHtml = change !== null && change !== undefined ? `<small class="${Number(change) < 0 ? "text-emerald" : Number(change) > 0 ? "text-danger" : ""}">${Number(change) > 0 ? "+" : ""}${change} vs prev</small>` : "";
  return `<div class="body-comp-stat ${colorClass}"><span>${label}</span><strong>${value}${unit ? ` ${unit}` : ""}</strong>${changeHtml}</div>`;
}

export function renderWeightTrend(measurements) {
  const recent = [...measurements].slice(0, 8).reverse();
  if (recent.length < 2) return "";
  const weights = recent.map((m) => Number(m.weight));
  const max = Math.max(...weights);
  const min = Math.min(...weights);
  const range = max - min || 1;
  const barHeight = 60;
  const bars = recent.map((m, i) => {
    const h = Math.round(((Number(m.weight) - min) / range) * barHeight) + 8;
    return `<div class="trend-bar" style="height:${h}px" title="Wk${m.week_number}: ${m.weight} kg"></div>`;
  }).join("");
  return `
    <div class="weight-trend">
      <span class="label">Weight Trend (last ${recent.length} weeks)</span>
      <div class="trend-chart">${bars}</div>
      <div class="trend-labels">${recent.map((m) => `<span>W${m.week_number}</span>`).join("")}</div>
    </div>
  `;
}

export function renderProfileAttendanceHistory(member) {
  const rows = (state.profileAttendanceRows || []).sort((a, b) => String(b.attendance_date).localeCompare(String(a.attendance_date)));
  const month = state.profileAttendanceMonth || "";
  return `
    <article class="card">
      <div class="section-heading">
        <div><h2>Attendance History</h2><p>${rows.length} entries for ${month}</p></div>
        <div class="attendance-month-nav">
          <button class="btn btn-outline mini" data-action="profile-attendance-prev">&lt;</button>
          <span>${month}</span>
          <button class="btn btn-outline mini" data-action="profile-attendance-next">&gt;</button>
        </div>
      </div>
      ${rows.length ? `
        <table class="attendance-table">
          <thead><tr><th>Date</th><th>Type</th><th>Time</th><th>Card</th></tr></thead>
          <tbody>${rows.map((row) => `<tr><td>${formatDateOnly(row.attendance_date)}</td><td>${escapeHtml(row.attendance_type)}</td><td>${row.time_of_visit || "-"}</td><td>${escapeHtml(row.card_type || "-")}</td></tr>`).join("")}</tbody>
        </table>
      ` : empty("No attendance for this month.")}
    </article>
  `;
}

export function renderProfileMeasurementTable(member, measurements) {
  const canEdit = ["admin", "supervisor", "super_admin"].includes(state.user.role) && state.session.status === "ACTIVE";
  return `
    <article class="card">
      <div class="section-heading"><div><h2>Measurement History</h2><p>${measurements.length} records</p></div>${icons.activity}</div>
      ${measurements.length ? `
        <div class="table-responsive">
          <table>
            <thead><tr><th>Week</th><th>Weight</th><th>BF%</th><th>VF</th><th>Muscle</th><th>BMI</th><th>Date</th>${canEdit ? "<th></th>" : ""}</tr></thead>
            <tbody>${measurements.map((m) => `<tr>
              <td>${m.week_number}</td>
              <td>${m.weight} kg</td>
              <td>${m.body_fat}%</td>
              <td>${m.visceral_fat}</td>
              <td>${m.muscle_mass} kg</td>
              <td>${m.bmi}</td>
              <td>${formatDateOnly(m.measurement_date)}</td>
              ${canEdit ? `<td><button class="btn btn-outline mini" data-action="edit-measurement" data-measurement-id="${m.id}">${icons.edit}</button></td>` : ""}
            </tr>`).join("")}</tbody>
          </table>
        </div>
      ` : empty("No measurements recorded.")}
    </article>
  `;
}

export function renderProfilePaymentHistory(member) {
  const payments = state.payments.filter((p) => Number(p.member_id) === Number(member.id));
  return `
    <article class="card">
      <div class="section-heading"><div><h2>Payment History</h2><p>${payments.length} transactions</p></div>${icons.activity}</div>
      ${payments.length ? `
        <table>
          <thead><tr><th>Card Type</th><th>Amount</th><th>Mode</th><th>Date</th><th>Notes</th></tr></thead>
          <tbody>${payments.map((p) => `<tr><td>${escapeHtml(p.card_type)}</td><td>₹${p.amount}</td><td>${escapeHtml(p.payment_mode || "-")}</td><td>${formatDateOnly(p.payment_date)}</td><td>${escapeHtml(p.notes || "")}</td></tr>`).join("")}</tbody>
        </table>
      ` : empty("No payments recorded.")}
    </article>
  `;
}

export function renderProfileEditSection(member) {
  return `
    <article class="card ${state.profileEditOpen ? "open" : "collapsed"}">
      <button class="section-heading collapsible-heading" type="button" data-action="toggle-profile-edit" aria-expanded="${state.profileEditOpen}">
        <div><h2>Edit Member Details</h2><p>Update name, contact, goal, and assignment</p></div>
        <span class="collapse-indicator">${state.profileEditOpen ? "Hide" : "Edit"}</span>
      </button>
      ${state.profileEditOpen ? `
        <form id="editMemberForm" class="form-grid">
          <input type="hidden" name="memberId" value="${member.id}" />
          <label><span class="label">First Name</span><input name="firstName" value="${escapeHtml(member.name.split(" ")[0])}" required /></label>
          <label><span class="label">Last Name</span><input name="lastName" value="${escapeHtml(member.name.split(" ").slice(1).join(" "))}" /></label>
          <label><span class="label">Mobile</span><input name="phone" value="${escapeHtml(member.phone || "")}" /></label>
          <label><span class="label">Gender</span><select name="gender"><option value="">Select...</option><option ${member.gender === "Male" ? "selected" : ""}>Male</option><option ${member.gender === "Female" ? "selected" : ""}>Female</option></select></label>
          <label><span class="label">Age</span><input name="age" id="editMemberAge" type="number" value="${member.age || ""}" /></label>
          <label><span class="label">Date of Birth</span><input name="dob" id="editMemberDob" type="date" value="${member.dob || ""}" /></label>
          <label><span class="label">Height (cm)</span><input name="height" type="number" step="0.1" value="${member.height || ""}" /></label>
          <label><span class="label">Primary Goal</span><select name="goal">${goalOptions().map((g) => `<option ${member.goal === g ? "selected" : ""}>${escapeHtml(g)}</option>`).join("")}</select></label>
          <label><span class="label">Coach</span><select name="coachId"><option value="">Unassigned</option>${staffOptions(["coach", "nc_organiser", "admin"], Number(member.coach_id))}</select></label>
          <label><span class="label">Supervisor</span><select name="supervisorId"><option value="">Auto assign</option>${staffOptions(["supervisor", "nc_organiser", "admin"], Number(member.supervisor_id))}</select></label>
          <label class="wide"><span class="label">Notes</span><textarea name="notes" rows="2">${escapeHtml(member.notes || "")}</textarea></label>
          <div class="wide modal-actions"><button class="btn btn-primary" type="submit">${icons.edit} Save Changes</button></div>
        </form>
      ` : ""}
    </article>
  `;
}

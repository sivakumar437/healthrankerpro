import { state, icons } from "../state.js";
import { escapeHtml, formatDateOnly, memberIdentity, memberContact, measurementsFor, activeCardFor, canAddMeasurements, goalOptions, staffOptions, generateFallbackMemberCode, splitMemberName, memberAge, isCurrentMonthMarathon, currentLocalMonth, currentLocalDate, formatSigned, formatCurrency, paymentBenefitValue } from "../helpers.js";
import { goalProgress, goalMetricCards, weeklyInsight, idealDistance } from "../formulas.js";
import { goalBadge, stat, empty } from "./components.js";

export function renderProfile() {
  const member = state.members.find((m) => Number(m.id) === Number(state.profileMemberId)) || state.members[0];
  if (!member) return empty("Select a member to view their profile.");
  const measurements = measurementsFor(member.id).sort((a, b) => String(b.measurement_date).localeCompare(String(a.measurement_date)));
  const card = activeCardFor(member.id);
  const payments = state.payments.filter((p) => Number(p.member_id) === Number(member.id));
  const canAddProfileMeasurement = state.user.role === "admin";
  const memberActive = Number(member.active ?? 1) === 1;
  if (!state.profileAttendanceMonth) state.profileAttendanceMonth = currentLocalMonth();
  const attendanceKey = `${member.id}:${state.profileAttendanceMonth}`;
  const attendance = state.profileAttendanceKey === attendanceKey
    ? state.profileAttendanceRows
    : state.attendance.filter((row) => Number(row.member_id) === Number(member.id));
  return `
    <div class="profile-page">
      <article class="card profile-summary">
        <div class="section-heading">
          <div><h2>${escapeHtml(member.name)}</h2><p>${memberIdentity(member)} - ${escapeHtml(member.nutrition_club || "Main Nutrition Club")}</p></div>
          <div class="profile-actions">
            ${goalBadge(member.goal)}
            ${isCurrentMonthMarathon(member) ? `<span class="badge badge-amber">${icons.trophy} Marathon</span>` : ""}
            ${Number(member.active ?? 1) === 0 ? `<span class="badge badge-muted">Hidden</span>` : ""}
            ${state.user.role === "admin" ? `
              <button class="btn btn-outline mini" data-action="toggle-profile-edit">${state.profileEditOpen ? "Close Edit" : "Edit Details"}</button>
              <button class="btn btn-outline mini" data-action="set-member-status" data-member-id="${member.id}" data-active="${memberActive ? "0" : "1"}">${memberActive ? "Hide Member" : "Make Active"}</button>
            ` : ""}
          </div>
        </div>
        <div class="stats-grid grid">
          ${stat("Current Card", card ? card.card_type : "None", card ? `${card.completed_visits}/${card.target_visits} visits` : "No active card", icons.clipboard, "bg-primary")}
          ${stat("Remaining Visits", card ? card.remaining_visits : "-", card ? card.status : "No active card", icons.clock, Number(card?.remaining_visits || 0) <= 3 ? "bg-amber" : "bg-emerald")}
          ${stat("Latest Weight", measurements[0] ? `${measurements[0].weight} kg` : "-", measurements[0] ? measurements[0].measurement_date : "No measurement", icons.activity, "bg-emerald")}
          ${stat("Muscle Mass (kg)", measurements[0] ? `${Number(measurements[0].muscle_mass).toFixed(1)} kg` : "-", measurements[0] ? (Number(measurements[0].muscle_is_estimated || 0) === 1 ? "Approximate value" : measurements[0].measurement_date) : "No measurement", icons.bolt || icons.trophy, "bg-violet")}
        </div>
      </article>
      ${renderBodyCompositionDashboard(member, measurements)}
      ${state.user.role === "admin" && state.profileEditOpen ? renderProfileEditSection(member) : ""}
      <div class="profile-history-stack">
        ${renderMemberAttendanceCalendar(attendance)}
        <article class="table-card profile-history-card measurement-history-card">
          <div class="dashboard-table-heading">
            <h2 class="dashboard-section-title">Measurement History</h2>
            ${canAddProfileMeasurement ? `<button class="btn btn-outline mini" data-action="add-measurement" data-member-id="${member.id}">Add Measurement</button>` : ""}
          </div>
          <table>
            <thead><tr><th>Date</th><th>Weight</th><th>Fat</th><th>Muscle</th><th>VF</th><th>BMI</th><th>BMA</th><th>BMR</th><th>Change</th></tr></thead>
            <tbody>${measurements.map((row, index) => measurementHistoryRow(row, measurements[index + 1])).join("") || `<tr><td colspan="9">${empty("No measurements yet.")}</td></tr>`}</tbody>
          </table>
        </article>
        <article class="table-card profile-history-card payment-history-card">
          <div class="dashboard-table-heading"><h2 class="dashboard-section-title">Payment History</h2></div>
          <table>
            <thead><tr><th>Date</th><th>Card</th><th>Amount / Benefit</th><th>Mode</th><th>Recorded By</th><th>Notes</th></tr></thead>
            <tbody>${payments.map((row) => {
              const benefit = paymentBenefitValue(row);
              return `<tr>
                <td>${formatDateOnly(row.payment_date)}</td>
                <td>${escapeHtml(row.card_type || "-")}</td>
                <td>${benefit > 0 ? `<s class="benefit-value">${formatCurrency(benefit)}</s>` : formatCurrency(row.amount)}</td>
                <td>${benefit > 0 ? "Complimentary" : escapeHtml(row.payment_mode || "-")}</td>
                <td>${escapeHtml(row.created_by || "-")}</td>
                <td>${escapeHtml(row.notes || "-")}</td>
              </tr>`;
            }).join("") || `<tr><td colspan="6">${empty("No payments yet.")}</td></tr>`}</tbody>
          </table>
        </article>
      </div>
    </div>
  `;
}

function measurementHistoryRow(row, previous) {
  const change = previous ? formatSigned(Number(row.weight) - Number(previous.weight)) : "-";
  const muscle = `${row.muscle_mass}${Number(row.muscle_is_estimated || 0) === 1 ? "<small>Approximate value</small>" : ""}`;
  return `<tr>
    <td>${formatDateOnly(row.measurement_date)}</td>
    <td>${row.weight}</td>
    <td>${row.body_fat}</td>
    <td>${muscle}</td>
    <td>${row.visceral_fat}</td>
    <td>${row.bmi}</td>
    <td>${row.bma || "-"}</td>
    <td>${row.bmr || "-"}</td>
    <td>${change}</td>
  </tr>`;
}

function renderMemberAttendanceCalendar(attendance) {
  const [year, month] = (state.profileAttendanceMonth || currentLocalMonth()).split("-").map(Number);
  const validYear = Number.isFinite(year) ? year : new Date().getFullYear();
  const validMonth = Number.isFinite(month) ? month : new Date().getMonth() + 1;
  const daysInMonth = new Date(validYear, validMonth, 0).getDate();
  const firstWeekday = new Date(validYear, validMonth - 1, 1).getDay();
  const today = currentLocalDate();
  const attendanceByDate = new Map();
  attendance
    .filter((row) => String(row.attendance_date || "").startsWith(`${validYear}-${String(validMonth).padStart(2, "0")}`))
    .forEach((row) => {
      const entries = attendanceByDate.get(row.attendance_date) || [];
      entries.push(row);
      attendanceByDate.set(row.attendance_date, entries);
    });
  const visitedDateCount = [...attendanceByDate.values()].filter((entries) => entries.some((entry) => Number(entry.member_visit_count || 0) > 0)).length;
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(`<div class="attendance-calendar-day empty" aria-hidden="true"></div>`);
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${validYear}-${String(validMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayEntries = attendanceByDate.get(date) || [];
    const visited = dayEntries.some((entry) => Number(entry.member_visit_count || 0) > 0);
    cells.push(`
      <div class="attendance-calendar-day ${dayEntries.length ? "has-attendance" : ""} ${visited ? "visited" : ""} ${date === today ? "today" : ""}">
        <span class="calendar-day-number">${day}</span>
        ${dayEntries.map(renderCalendarAttendanceEntry).join("")}
      </div>
    `);
  }
  return `
    <article class="card profile-attendance-calendar">
      <div class="dashboard-table-heading attendance-calendar-heading">
        <div><h2 class="dashboard-section-title">Attendance History</h2><p>${visitedDateCount} visited date${visitedDateCount === 1 ? "" : "s"} in selected month</p></div>
        <label><span class="label">Month &amp; Year</span><input id="profileAttendanceMonth" type="month" value="${escapeHtml(state.profileAttendanceMonth || currentLocalMonth())}" /></label>
      </div>
      <div class="attendance-calendar-weekdays">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => `<span>${d}</span>`).join("")}</div>
      <div class="attendance-calendar-grid">${cells.join("")}</div>
    </article>
  `;
}

function renderCalendarAttendanceEntry(entry) {
  const type = entry.attendance_type || "Attendance";
  const target = Number(entry.target_visits || 0);
  const used = entry.card_used_as_of;
  const cardCount = used !== null && used !== undefined && target > 0 ? `${used} / ${target}` : "No visit card";
  const visitCount = Number(entry.member_visit_count || 0);
  const guestCount = Number(entry.guest_count || 0);
  return `
    <div class="calendar-attendance-entry">
      <span class="attendance-type-chip ${attendanceTypeColorClass(type)}">${escapeHtml(type)}</span>
      <strong class="calendar-card-name">${escapeHtml(entry.card_type || "No card")}</strong>
      ${entry.card_number ? `<span class="calendar-card-number">${escapeHtml(entry.card_number)}</span>` : ""}
      <span class="calendar-card-count">${escapeHtml(cardCount)} as of date</span>
      <span class="calendar-member-count">Visit count ${visitCount}</span>
      ${entry.guest_name ? `<span class="calendar-guest-count">Guest: ${escapeHtml(entry.guest_name)} · Count ${guestCount}</span>` : ""}
    </div>
  `;
}

function attendanceTypeColorClass(type) {
  return ({
    "Present": "type-present",
    "Mega Club": "type-mega",
    "Lifestyle Day": "type-lifestyle",
    "Family Day": "type-family",
    "Override Attendance": "type-override",
    "Public Holiday": "type-holiday",
    "Training Session": "type-training",
    "Club Holiday": "type-holiday",
  })[type] || "type-default";
}

export function renderBodyCompositionDashboard(member, measurements) {
  const latest = measurements[0];
  if (!latest) return `<section class="card"><div class="section-heading"><div><h2>Body Composition</h2><p>No measurements yet</p></div></div>${empty("No measurements recorded.")}</section>`;
  const previous = measurements[1];
  const formatKg = (v) => (v === null || v === undefined || v === "") ? "-" : `${Number(v).toFixed(1)} kg`;
  const trend = previous
    ? `${formatSigned(Number(latest.weight) - Number(previous.weight))} kg`
    : "First measurement";
  const trendSub = previous ? `since ${formatDateOnly(previous.measurement_date)}` : "No previous measurement";
  const range = latest.healthy_weight_min != null && latest.healthy_weight_max != null
    ? `${Number(latest.healthy_weight_min).toFixed(1)}-${Number(latest.healthy_weight_max).toFixed(1)} kg`
    : "-";
  const muscleSub = Number(latest.muscle_is_estimated || 0) === 1
    ? "Approximate value"
    : latest.muscle_percent != null ? `${Number(latest.muscle_percent).toFixed(1)}% scan value` : "Calculated value";
  return `
    <section class="body-composition-dashboard">
      <div class="section-heading">
        <div><h2>Body Composition</h2><p>Karada Scan values and height-based targets from ${escapeHtml(latest.measurement_date)}</p></div>
        ${icons.activity}
      </div>
      <div class="stats-grid grid">
        ${stat("Current Weight", formatKg(latest.weight), "Karada Scan", icons.activity, "bg-primary")}
        ${stat("Ideal Weight", formatKg(latest.ideal_weight), `${escapeHtml(member.gender || "Gender required")} height formula`, icons.target || icons.check, "bg-emerald")}
        ${stat("Healthy Weight Range", range, "ideal weight +/- 2 kg", icons.check, "bg-blue")}
        ${stat("Fat Mass", formatKg(latest.fat_mass), latest.body_fat_category || "Calculated value", icons.target || icons.check, "bg-violet")}
        ${stat("Lean Body Mass", formatKg(latest.lean_body_mass), "Calculated value", icons.activity, "bg-emerald")}
        ${stat("Muscle Mass", formatKg(latest.muscle_mass), muscleSub, icons.bolt || icons.trophy, "bg-primary")}
        ${stat("Visceral Fat Status", latest.visceral_fat_status || "-", `Scan value ${latest.visceral_fat}`, icons.target || icons.check, latest.visceral_fat_status === "Normal" ? "bg-emerald" : "bg-amber")}
        ${stat("Weight To Lose / Gain", latest.weight_status || "-", formatKg(latest.weight_difference), icons.trophy, "bg-amber")}
        ${stat("Measurement Trend", trend, trendSub, icons.history, "bg-blue")}
      </div>
    </section>
  `;
}

function renderProfileEditSection(member) {
  const names = splitMemberName(member.name || "");
  const displayAge = memberAge(member);
  return `
    <article class="card member-edit-card">
      <div class="section-heading">
        <div><h2>Edit Member Details</h2><p>Admin can update this member's personal details, goal, and club.</p></div>
        ${icons.user}
      </div>
      <form id="editMemberForm" class="form-grid">
        <input type="hidden" name="memberId" value="${member.id}" />
        <label><span class="label">Member ID</span><input name="memberCode" value="${escapeHtml(member.member_code || generateFallbackMemberCode(member.id))}" readonly /></label>
        <label><span class="label">First Name</span><input name="firstName" value="${escapeHtml(names.first)}" required /></label>
        <label><span class="label">Last Name</span><input name="lastName" value="${escapeHtml(names.last)}" /></label>
        <label><span class="label">Mobile Number</span><input name="phone" type="tel" value="${escapeHtml(member.phone || "")}" /></label>
        <label><span class="label">Gender</span><select name="gender"><option value="">Select...</option><option ${member.gender === "Male" ? "selected" : ""}>Male</option><option ${member.gender === "Female" ? "selected" : ""}>Female</option></select></label>
        <label><span class="label">Age</span><input name="age" id="editMemberAge" type="number" min="1" max="120" value="${escapeHtml(String(displayAge || ""))}" /></label>
        <label><span class="label">Date of Birth</span><input name="dob" id="editMemberDob" type="date" value="${escapeHtml(member.dob || "")}" /></label>
        <label><span class="label">Height (cm)</span><input name="height" type="number" step="0.1" value="${escapeHtml(member.height || "")}" /></label>
        <label><span class="label">Nutrition Club</span><input name="nutritionClub" value="${escapeHtml(member.nutrition_club || "Main Nutrition Club")}" /></label>
        <label><span class="label">Primary Goal</span><select name="goal">${goalOptions().map((g) => `<option ${member.goal === g ? "selected" : ""}>${escapeHtml(g)}</option>`).join("")}</select></label>
        <label><span class="label">Coach</span><select name="coachId"><option value="">Unassigned</option>${staffOptions(["coach", "nc_organiser", "admin"], Number(member.coach_id))}</select></label>
        <label><span class="label">Supervisor</span><select name="supervisorId"><option value="">Auto assign</option>${staffOptions(["supervisor", "nc_organiser", "admin"], Number(member.supervisor_id))}</select></label>
        <label class="wide"><span class="label">Notes</span><textarea name="notes" rows="2">${escapeHtml(member.notes || "")}</textarea></label>
        <div class="wide modal-actions">
          <button class="btn btn-outline" type="button" data-action="toggle-profile-edit">Cancel</button>
          <button class="btn btn-primary" type="submit">${icons.check} Save Changes</button>
        </div>
      </form>
    </article>
  `;
}

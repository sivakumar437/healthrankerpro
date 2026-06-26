import { state, icons } from "../state.js";
import { escapeHtml, formatDateOnly, attendanceTimeSortValue, attendanceDisplayTimeSortValue, attendanceTimeLabel, attendanceTypeColorClass, attendanceSearchResults, selectedAttendanceMember, attendanceTypeSelect, staffOptions, activeCardFor, paymentBenefitValue, paymentModeSelect, cardTypeSelect } from "../helpers.js";
import { restricted, empty } from "./components.js";

export function renderAttendance() {
  if (!["admin", "supervisor", "coach", "nc_organiser", "super_admin"].includes(state.user.role)) return restricted("You do not have permission to record attendance.");
  const canEdit = state.session.status === "ACTIVE";
  const todayRows = state.attendance.filter((a) => a.attendance_date === state.today || !state.today).sort((a, b) => attendanceTimeSortValue(b) - attendanceTimeSortValue(a));
  return `
    ${renderAttendanceEntry(canEdit)}
    ${renderAttendanceTodayTable(todayRows, canEdit)}
  `;
}

export function renderAttendanceTodayView() {
  const grouped = {};
  state.attendance.forEach((row) => {
    const date = row.attendance_date;
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(row);
  });
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  return `
    <section>
      ${dates.length ? dates.map((date) => renderAttendanceDateGroup(date, grouped[date])).join("") : empty("No attendance records found.")}
    </section>
  `;
}

export function renderAttendanceDateGroup(date, rows) {
  const sorted = [...rows].sort((a, b) => attendanceTimeSortValue(b) - attendanceTimeSortValue(a));
  return `
    <article class="card date-group">
      <div class="date-group-header"><h3>${formatDateOnly(date)}</h3><span>${rows.length} entries</span></div>
      <table class="attendance-table">
        <thead><tr><th>Member</th><th>Time</th><th>Type</th><th>Card</th><th>Supervisor</th></tr></thead>
        <tbody>${sorted.map(attendanceTableRow).join("")}</tbody>
      </table>
    </article>
  `;
}

export function renderAttendanceTodayTable(rows, canEdit) {
  return `
    <article class="card">
      <div class="section-heading"><div><h2>Today's Attendance</h2><p>${rows.length} entries recorded today</p></div>${icons.calendar}</div>
      ${rows.length ? `
        <table class="attendance-table">
          <thead><tr><th>Member</th><th>Time</th><th>Type</th><th>Card</th><th>Supervisor</th>${canEdit ? "<th></th>" : ""}</tr></thead>
          <tbody>${rows.map((row) => attendanceTableRow(row, canEdit)).join("")}</tbody>
        </table>
      ` : empty("No attendance recorded today.")}
    </article>
  `;
}

export function attendanceTableRow(row, canEdit = false) {
  return `
    <tr>
      <td><strong>${escapeHtml(row.member_name)}</strong></td>
      <td>${attendanceTimeLabel(row)}</td>
      <td><span class="badge ${attendanceTypeColorClass(row.attendance_type)}">${escapeHtml(row.attendance_type)}</span></td>
      <td>${row.card_type ? escapeHtml(row.card_type) : "-"}</td>
      <td>${escapeHtml(row.supervisor_name || "-")}</td>
      ${canEdit ? `<td><button class="btn btn-outline mini" data-action="delete-attendance" data-attendance-id="${row.id}">${icons.trash} Remove</button></td>` : ""}
    </tr>
  `;
}

export function renderAttendanceEntry(canEdit) {
  const member = selectedAttendanceMember();
  const card = member ? activeCardFor(member.id) : null;
  const searchResults = attendanceSearchResults();
  return `
    <article class="card attendance-entry-card">
      <div class="section-heading"><div><h2>Record Attendance</h2><p>Search by name or phone, then log arrival</p></div>${icons.calendar}</div>
      ${!canEdit ? `<div class="alert">Weekly measurement session is closed. Open a session to record attendance.</div>` : ""}
      <div class="attendance-search-wrap">
        <input class="search-input" id="attendanceSearch" value="${escapeHtml(state.attendanceSearch || "")}" placeholder="Search member by name or phone..." ${canEdit ? "" : "disabled"} />
        ${searchResults.length ? `<div class="attendance-search-results">${searchResults.map((m) => `<button class="search-result-row" data-action="select-attendance-member" data-member-id="${m.id}">${escapeHtml(m.name)} <small>${escapeHtml(m.phone || "")}</small></button>`).join("")}</div>` : ""}
      </div>
      ${member ? renderAttendanceMemberPanel(member, card, canEdit) : ""}
    </article>
  `;
}

export function renderAttendanceMemberPanel(member, card, canEdit) {
  return `
    <div class="attendance-member-panel">
      <div class="attendance-member-info">
        <div class="avatar">${member.name[0]}</div>
        <div>
          <strong>${escapeHtml(member.name)}</strong>
          <p>${escapeHtml(member.phone || "")}</p>
          ${card ? `<span class="badge badge-emerald">${escapeHtml(card.card_type)} Card Active</span>` : `<span class="badge badge-red">No Active Card</span>`}
        </div>
      </div>
      <form id="attendanceForm" class="form-grid">
        <input type="hidden" name="memberId" value="${member.id}" />
        <label><span class="label">Attendance Type</span>${attendanceTypeSelect()}</label>
        <label><span class="label">Time of Visit</span><input name="timeOfVisit" type="time" value="${new Date().toTimeString().slice(0, 5)}" /></label>
        <label><span class="label">Supervisor</span><select name="supervisorId"><option value="">Select supervisor</option>${staffOptions(["supervisor", "admin"])}</select></label>
        <div class="wide modal-actions"><button class="btn btn-primary" type="submit" ${canEdit ? "" : "disabled"}>${icons.plus} Record Attendance</button></div>
      </form>
      ${renderCardPaymentSection(member, card, canEdit)}
    </div>
  `;
}

export function renderCardPaymentSection(member, card, canEdit) {
  return `
    <div class="card-payment-section">
      <div class="section-heading"><div><h2>Card & Payment</h2><p>Purchase or renew member card</p></div></div>
      <form id="cardPaymentForm" class="form-grid">
        <input type="hidden" name="memberId" value="${member.id}" />
        <label><span class="label">Card Type</span>${cardTypeSelect(member)}</label>
        <label><span class="label">Payment Mode</span>${paymentModeSelect()}</label>
        <label><span class="label">Amount (₹)</span><input name="amount" type="number" id="cardPaymentAmount" step="0.01" placeholder="Enter amount" /></label>
        <label><span class="label">Benefit Value</span><input name="benefitValue" id="cardBenefitValue" type="text" readonly placeholder="Auto-calculated" /></label>
        <label><span class="label">Payment Date</span><input name="paymentDate" type="date" value="${new Date().toISOString().slice(0, 10)}" /></label>
        <label class="wide"><span class="label">Notes</span><textarea name="notes" rows="2" placeholder="Optional notes"></textarea></label>
        <div class="wide modal-actions"><button class="btn btn-primary" type="submit" ${canEdit ? "" : "disabled"}>${icons.plus} Save Card Payment</button></div>
      </form>
    </div>
  `;
}

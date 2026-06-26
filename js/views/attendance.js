import { state, icons } from "../state.js";
import { escapeHtml, formatCurrency, attendanceTimeLabel, attendanceTimeSortValue, attendanceTypeSelect, staffOptions, activeCardFor, paymentBenefitValue, paymentModeSelect, cardTypeSelect, memberContact, attendanceSearchResults, selectedAttendanceMember } from "../helpers.js";
import { restricted, empty } from "./components.js";

export function renderAttendance() {
  if (!["admin", "supervisor"].includes(state.user.role)) return restricted("Only Admin and Supervisor users can mark attendance.");
  const today = new Date().toISOString().slice(0, 10);
  if (!state.attendanceViewDate) state.attendanceViewDate = today;
  if (!state.attendanceEntryDate) state.attendanceEntryDate = today;
  if (!state.attendanceEntryType) state.attendanceEntryType = "Present";
  const filtered = attendanceSearchResults();
  const selected = selectedAttendanceMember(filtered);
  const attendancePlaceholder = state.user.role === "admin"
    ? "Search by name, mobile, or member ID"
    : "Search by name or member ID";
  return `
    <div class="attendance-layout">
      <section class="attendance-entry card">
        <div class="attendance-search">
          <label class="field wide">
            <span class="label">Search Member</span>
            <input class="search-input" id="attendanceSearch" value="${escapeHtml(state.query || "")}" placeholder="${attendancePlaceholder}" />
          </label>
          <div class="attendance-results">
            ${filtered.map((member) => attendanceResult(member, selected?.id === member.id)).join("") || empty("No matching members found.")}
          </div>
        </div>
      </section>
      <aside class="attendance-side">
        ${renderAttendanceDaySettings()}
        ${renderUpcomingCards()}
      </aside>
    </div>
  `;
}

function renderAttendanceDaySettings() {
  return `
    <article class="card attendance-day-card">
      <div class="section-heading">
        <div><h2>Attendance Settings</h2><p>Fixed values for entries marked from this page.</p></div>
        ${icons.calendar}
      </div>
      <div class="form-grid">
        <label><span class="label">Attendance Date</span><input id="attendanceEntryDate" type="date" value="${escapeHtml(state.attendanceEntryDate || "")}" /></label>
        <label><span class="label">Attendance Type</span>${attendanceTypeSelect(state.attendanceEntryType, "attendanceEntryType")}</label>
      </div>
    </article>
  `;
}

function attendanceResult(member, selected) {
  const card = activeCardFor(member.id);
  const panel = selected ? renderSelectedAttendancePanel(member, card) : "";
  return `
    <div class="attendance-member-entry">
      <button class="attendance-result ${selected ? "selected" : ""}" data-action="select-attendance-member" data-member-id="${member.id}">
        <span class="avatar">${member.name[0]}</span>
        <span><strong>${escapeHtml(member.name)}</strong><small>${memberContact(member)}</small></span>
        <em>${card ? `${card.remaining_visits} left` : "No card"}</em>
      </button>
      ${panel}
    </div>
  `;
}

function renderSelectedAttendancePanel(member, card) {
  const progress = card ? Math.round((Number(card.completed_visits) / Number(card.target_visits)) * 100) : 0;
  const hasExistingAttendance = attendanceAlreadyMarked(member.id, state.attendanceEntryDate);
  return `
    <div class="active-card-panel inline-attendance-panel">
      <div>
        <span class="label">Current Card</span>
        <h3>${card ? `${escapeHtml(card.card_type)} - ${escapeHtml(card.card_number)}` : "No active card"}</h3>
        <p>${memberContact(member)} - ${escapeHtml(card?.club || "Main Nutrition Club")}</p>
      </div>
      ${card ? `<div class="card-progress"><strong>${card.remaining_visits} left</strong><span>${card.completed_visits} / ${card.target_visits} visits used</span><div class="progress-track"><i style="width:${progress}%"></i></div></div>` : `<span class="badge badge-red no-card-status">Create card required</span>`}
      <form id="attendanceForm" class="attendance-form inline-attendance-form">
        <input type="hidden" name="memberId" value="${member.id}" />
        <input type="hidden" name="attendanceDate" id="attendanceFormDate" value="${escapeHtml(state.attendanceEntryDate || "")}" />
        <input type="hidden" name="attendanceType" id="attendanceFormType" value="${escapeHtml(state.attendanceEntryType || "Present")}" />
        ${hasExistingAttendance ? `
          <div class="form-grid">
            <label><span class="label">Count</span><select name="countValue"><option value="1">Count 1 visit</option><option value="2">Count 2 visits</option></select></label>
            <label><span class="label">Duplicate / Guest Update</span><select name="confirmUpdate" id="attendanceConfirmUpdate"><option value="">No</option><option value="1">Yes, add guest entry</option></select></label>
            <label class="guest-name-field hidden"><span class="label">Guest Name</span><input name="guestName" placeholder="Guest / friend name" /></label>
            <label class="wide"><span class="label">Override Reason / Notes</span><textarea name="reason" rows="2" placeholder="Required for Override Attendance"></textarea></label>
          </div>
        ` : `
          <input type="hidden" name="countValue" value="1" />
        `}
        <div class="modal-actions"><button class="btn btn-primary" type="submit">${icons.check} Mark Attendance</button></div>
      </form>
    </div>
  `;
}

function attendanceAlreadyMarked(memberId, date) {
  return state.attendance.some((row) => Number(row.member_id) === Number(memberId) && row.attendance_date === date);
}

function renderUpcomingCards() {
  const upcoming = state.members
    .filter((member) => Number(member.active ?? 1) === 1)
    .map((member) => activeCardFor(member.id))
    .filter(Boolean)
    .filter((card) => card.status === "Active" && Number(card.remaining_visits) <= 3)
    .sort((a, b) => Number(a.remaining_visits) - Number(b.remaining_visits))
    .slice(0, 5);
  return `
    <div class="card renewal-card">
      <div class="section-heading"><div><h2>Upcoming Card Completions</h2><p>Cards with 3, 2, or 1 visits remaining.</p></div>${icons.bell}</div>
      <div class="renewal-list">
        ${upcoming.map((card) => `<div class="renewal-row"><div><strong>${escapeHtml(card.member_name)}</strong><span>${escapeHtml(card.card_type)} - ${escapeHtml(card.card_number)}</span></div><b>${card.remaining_visits}</b></div>`).join("") || empty("No cards are close to completion.")}
      </div>
    </div>
  `;
}

// ── Today View ────────────────────────────────────────────────────────────────

export function renderTodayView() {
  if (!["admin", "supervisor"].includes(state.user.role)) return restricted("Only Admin and Supervisor users can view daily attendance.");
  if (!state.attendanceViewDate) state.attendanceViewDate = new Date().toISOString().slice(0, 10);
  const selectedDate = state.attendanceViewDate;
  const rows = dailyAttendanceRows(selectedDate);
  const totalPayments = rows.reduce((sum, row) => sum + (row.paymentTotal || 0), 0);
  return `
    <section class="today-view-page">
      <div class="table-card daily-attendance-card daily-attendance-card-full">
        <div class="dashboard-table-heading daily-attendance-heading">
          <div>
            <h2 class="dashboard-section-title">Today View</h2>
            <p>${rows.length} member${rows.length === 1 ? "" : "s"} attended</p>
          </div>
          <label>
            <span class="label">Date</span>
            <input id="attendanceViewDate" type="date" value="${escapeHtml(selectedDate)}" />
          </label>
        </div>
        <div class="daily-total-row">
          <span>Total payments on this date</span>
          <strong>${formatCurrency(totalPayments)}</strong>
        </div>
        <table class="today-attendance-table">
          <thead><tr><th class="today-serial-column">S.No.</th><th>Name</th><th>Time</th><th>Card Type</th><th>Count</th><th>Amount</th><th>Collected By</th></tr></thead>
          <tbody>${rows.map((row, index) => dailyAttendanceRow(row, index)).join("") || `<tr><td colspan="7">${empty("No attendance for selected date.")}</td></tr>`}</tbody>
        </table>
      </div>
    </section>
  `;
}

function guestNameFromReason(reason = "") {
  const match = String(reason || "").match(/Guest:\s*([^|]+)/i);
  return match ? match[1].trim() : "";
}

function effectiveAttendanceCount(row) {
  const count = Number(row.neutral_day ? 0 : row.count_value || 0);
  return guestNameFromReason(row.reason) ? Math.max(count, 2) : count;
}

function cardUsedBeforeDate(cardId, date) {
  return state.attendance
    .filter((row) => Number(row.card_id) === Number(cardId))
    .filter((row) => String(row.attendance_date) < String(date))
    .reduce((sum, row) => sum + effectiveAttendanceCount(row), 0);
}

function splitDailyAttendanceRow(row) {
  const guestName = guestNameFromReason(row.attendance.reason);
  if (!guestName) return [row];
  const totalCount = Math.max(Number(row.countValue || 0), 2);
  const memberCount = 1;
  return [
    {
      ...row,
      countValue: memberCount,
      displayTime: row.attendance.marked_on,
      displayDetails: [row.attendance.attendance_type],
      attendance: { ...row.attendance, reason: "", updated_by: "", updated_on: "" },
    },
    {
      ...row,
      countValue: totalCount - memberCount,
      paymentTotal: 0,
      benefitTotal: 0,
      paymentModes: "",
      paymentCards: "",
      paymentCollectors: "",
      payments: [],
      displayTime: row.attendance.updated_on || row.attendance.marked_on,
      displayName: guestName,
      displayDetails: [
        `Guest of ${row.attendance.member_name}`,
        row.attendance.updated_on ? `Updated by ${row.attendance.updated_by || "-"} on ${row.attendance.updated_on}` : "",
      ].filter(Boolean),
      attendance: { ...row.attendance, reason: "", updated_by: "", updated_on: "" },
    },
  ];
}

function dailyAttendanceRows(date) {
  const baseRows = state.attendance
    .filter((row) => row.attendance_date === date)
    .map((attendance) => {
      const card = state.cards?.find((c) => Number(c.id) === Number(attendance.card_id));
      const payments = (state.payments || []).filter((p) => {
        const sameDate = p.payment_date === date;
        const sameMember = Number(p.member_id) === Number(attendance.member_id);
        const linkedAttendance = p.attendance_id && Number(p.attendance_id) === Number(attendance.id);
        return sameDate && sameMember && (linkedAttendance || !p.attendance_id || Number(p.card_id || 0) === Number(attendance.card_id || 0));
      });
      const paymentTotal = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
      const benefitTotal = payments.reduce((s, p) => s + paymentBenefitValue(p), 0);
      const paymentModes = [...new Set(payments.map((p) => p.payment_mode).filter(Boolean))].join(", ");
      const paymentCards = [...new Set(payments.map((p) => p.card_type || p.card_number).filter(Boolean))].join(", ");
      const paymentCollectors = [...new Set(payments.map((p) => p.created_by).filter(Boolean))].join(", ");
      return {
        attendance,
        card,
        payments,
        paymentTotal,
        benefitTotal,
        paymentModes,
        paymentCards,
        paymentCollectors,
        displayTime: attendance.updated_on || attendance.marked_on,
        countValue: Number(attendance.neutral_day ? 0 : attendance.count_value || 0),
      };
    })
    .sort((a, b) => attendanceTimeSortValue(a.attendance) - attendanceTimeSortValue(b.attendance));
  const usedByCard = new Map();
  const displayRows = baseRows.flatMap((row) => splitDailyAttendanceRow(row)).map((row) => {
    if (!row.card || !row.attendance.card_id || !row.countValue) return { ...row, cardCount: null };
    const cardId = Number(row.attendance.card_id);
    if (!usedByCard.has(cardId)) usedByCard.set(cardId, cardUsedBeforeDate(cardId, date));
    const used = usedByCard.get(cardId) + row.countValue;
    usedByCard.set(cardId, used);
    const target = Number(row.card.target_visits || 0);
    return { ...row, cardCount: { used, target, remaining: Math.max(target - used, 0) } };
  });
  return displayRows.sort((a, b) => {
    const va = Date.parse(a.displayTime) || 0;
    const vb = Date.parse(b.displayTime) || 0;
    return va - vb;
  });
}

function dailyAttendanceRow(row, index) {
  const attendance = row.attendance;
  const cardLabel = row.card
    ? `${escapeHtml(row.card.card_type)}<small>${escapeHtml(row.card.card_number)}</small>`
    : attendance.neutral_day ? "Neutral day" : "No card";
  const paymentParts = [];
  if (row.paymentTotal > 0) paymentParts.push(`<strong>${formatCurrency(row.paymentTotal)}</strong><small>${escapeHtml(row.paymentModes || row.paymentCards || "Payment recorded")}</small>`);
  if (row.benefitTotal > 0) paymentParts.push(`<s class="benefit-value">${formatCurrency(row.benefitTotal)}</s><small>Complimentary</small>`);
  const paymentLabel = paymentParts.join("") || "-";
  const cardCountLabel = row.cardCount
    ? `<strong>${row.cardCount.used} / ${row.cardCount.target}</strong><small>${row.cardCount.remaining} remaining as of this date</small>`
    : "-";
  const detailLines = [
    ...(row.displayDetails || [attendance.attendance_type]),
    attendance.reason ? attendance.reason : "",
    attendance.updated_on ? `Updated by ${attendance.updated_by || "-"} on ${attendance.updated_on}` : "",
  ].filter(Boolean);
  return `
    <tr>
      <td class="today-serial-column"><strong>${index + 1}</strong></td>
      <td><strong>${escapeHtml(row.displayName || attendance.member_name)}</strong>${detailLines.map((line) => `<small>${escapeHtml(line)}</small>`).join("")}</td>
      <td><strong>${attendanceTimeLabel({ marked_on: row.displayTime })}</strong></td>
      <td>${cardLabel}</td>
      <td>${cardCountLabel}</td>
      <td>${paymentLabel}</td>
      <td>${row.paymentTotal > 0 || row.benefitTotal > 0 ? escapeHtml(row.paymentCollectors || "-") : "-"}</td>
    </tr>
  `;
}

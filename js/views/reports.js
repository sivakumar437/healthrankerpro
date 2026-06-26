import { state, icons } from "../state.js";
import { escapeHtml } from "../helpers.js";
import { restricted, empty } from "./components.js";

export function renderReports() {
  if (!["admin", "super_admin"].includes(state.user.role)) return restricted("Only administrators can generate member reports.");
  const selectedMemberId = state.reportMemberId || String(state.members[0]?.id || "");
  const throughDate = state.reportThroughDate || new Date().toISOString().slice(0, 10);
  const report = state.memberReport;
  return `
    <section class="member-report-page">
      <form id="memberReportForm" class="card member-report-controls">
        <label><span class="label">Member</span><select name="memberId" id="reportMemberId" required>
          ${state.members.map((m) => `<option value="${m.id}" ${String(m.id) === String(selectedMemberId) ? "selected" : ""}>${escapeHtml(m.name)} - ${escapeHtml(m.member_code || "")}</option>`).join("")}
        </select></label>
        <label><span class="label">Report Through Date</span><input name="throughDate" type="date" value="${escapeHtml(throughDate)}" required /></label>
        <button class="btn btn-primary" type="submit">${icons.clipboard} Generate Report</button>
        ${report ? `<button class="btn btn-outline" type="button" data-action="print-member-report">${icons.download} Print / Save PDF</button>` : ""}
      </form>
      ${report ? renderMemberReportSheet(report) : `<div class="empty-state report-empty">${icons.clipboard}<strong>Select a member and date</strong><span>Generate a weekly measurement report from saved data.</span></div>`}
    </section>
  `;
}

function renderMemberReportSheet(report) {
  const member = report.member;
  const measurements = [...(report.measurements || [])];
  const columns = Array.from({ length: 12 }, (_, i) => measurements[i] || null);
  const rows = [
    ["DATE",             (r) => reportDayMonthLabel(r.measurement_date)],
    ["AGE",              (r) => reportMeasurementAge(r, member)],
    ["HEIGHT",           (r) => reportNumber(r.height)],
    ["WEIGHT",           (r) => reportNumber(r.weight)],
    ["BODY FAT",         (r) => reportNumber(r.body_fat)],
    ["VISCERAL FAT",     (r) => reportNumber(r.visceral_fat)],
    ["BMR",              (r) => reportNumber(r.bmr, 0)],
    ["BMI",              (r) => reportNumber(r.bmi)],
    ["BMA",              (r) => reportNumber(r.bma, 0)],
    ["SUBCUTANEOUS FAT", (r) => reportNumber(r.subcutaneous_fat)],
    ["MUSCLE MASS",      (r) => reportNumber(r.muscle_mass)],
  ];
  return `
    <article class="member-report-sheet" id="memberReportSheet">
      <header class="member-report-header">
        <h2>${escapeHtml(member.nutrition_club || "Nutrition Club")}</h2>
        <div class="member-report-identity">
          <p><span>Name</span><strong>${escapeHtml(member.name)}</strong></p>
          <p><span>Phone No.</span><strong>${escapeHtml(member.phone || "-")}</strong></p>
          <p><span>Invited By</span><strong>${escapeHtml(report.invitedBy || "-")}</strong></p>
          <p><span>Gender</span><strong>${escapeHtml(member.gender || "-")}</strong></p>
          <p><span>DOB</span><strong>${escapeHtml(member.dob ? reportDateLabel(member.dob) : "-")}</strong></p>
          <p><span>Member ID</span><strong>${escapeHtml(member.member_code || "-")} <small>Year ${escapeHtml(String(report.throughDate || "").slice(0, 4))}</small></strong></p>
        </div>
      </header>
      <div class="member-report-table-wrap">
        <table class="member-report-table">
          <thead><tr><th>METRIC</th>${columns.map((_, i) => `<th>${ordinal(i + 1)}<br />WEEK</th>`).join("")}</tr></thead>
          <tbody>
            ${rows.map(([label, value]) => `<tr><th>${label}</th>${columns.map((r) => `<td>${r ? escapeHtml(String(value(r))) : ""}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
      <footer class="member-report-footer">Report through ${reportDateLabel(report.throughDate)} | Generated ${escapeHtml(report.generatedOn || "")}</footer>
    </article>
  `;
}

function ordinal(n) {
  const rem = n % 100;
  if (rem >= 11 && rem <= 13) return `${n}th`;
  return `${n}${n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"}`;
}

function reportDateLabel(value) {
  const parts = String(value || "").slice(0, 10).split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : "-";
}

function reportDayMonthLabel(value) {
  const parts = String(value || "").slice(0, 10).split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : "-";
}

function reportNumber(value, decimals = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(decimals).replace(/\.0$/, "");
}

function reportMeasurementAge(row, member) {
  try {
    const scan = JSON.parse(row.scan_values || "{}");
    if (scan.age !== null && scan.age !== undefined && scan.age !== "") return scan.age;
  } catch (_) {}
  return member.age ?? "-";
}

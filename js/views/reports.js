import { state, icons } from "../state.js";
import { escapeHtml, formatDateOnly, memberIdentity } from "../helpers.js";
import { goalProgress, goalMetricCards } from "../formulas.js";
import { restricted, empty, goalBadge } from "./components.js";

export function renderReports() {
  if (!["admin", "super_admin"].includes(state.user.role)) return restricted("Only admins can access reports.");
  const report = state.memberReport;
  return `
    <article class="card">
      <div class="section-heading"><div><h2>Member Report Generator</h2><p>Generate a printable progress report for any member</p></div>${icons.activity}</div>
      <form id="reportForm" class="form-grid">
        <label class="wide"><span class="label">Select Member</span>
          <select name="memberId" id="reportMemberId">
            <option value="">Select a member...</option>
            ${state.members.map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join("")}
          </select>
        </label>
        <div class="wide modal-actions">
          <button class="btn btn-primary" type="submit" data-action="fetch-member-report">${icons.activity} Generate Report</button>
        </div>
      </form>
    </article>
    ${report ? renderMemberReport(report) : ""}
  `;
}

export function renderMemberReport(report) {
  const { member, measurements, payments } = report;
  if (!member) return empty("Report data unavailable.");
  const progress = goalProgress(member);
  const cards = goalMetricCards(member, progress);
  return `
    <article class="card member-report" id="memberReport">
      <div class="report-header">
        <h2>${escapeHtml(member.name)}</h2>
        <p>${memberIdentity(member)}</p>
        ${goalBadge(member.goal)}
      </div>
      <div class="report-score">
        <strong>${progress.score}</strong>
        <span>Transformation Score</span>
      </div>
      <div class="report-metrics grid">
        ${cards.map((c) => `<div class="report-metric"><span>${c.label}</span><strong>${c.value}</strong></div>`).join("")}
      </div>
      <h3>Measurement History</h3>
      ${measurements && measurements.length ? `
        <table>
          <thead><tr><th>Week</th><th>Weight</th><th>BF%</th><th>VF</th><th>Muscle</th><th>Date</th></tr></thead>
          <tbody>${measurements.map((m) => `<tr><td>${m.week_number}</td><td>${m.weight} kg</td><td>${m.body_fat}%</td><td>${m.visceral_fat}</td><td>${m.muscle_mass} kg</td><td>${formatDateOnly(m.measurement_date)}</td></tr>`).join("")}</tbody>
        </table>
      ` : empty("No measurements.")}
      <h3>Payment History</h3>
      ${payments && payments.length ? `
        <table>
          <thead><tr><th>Card</th><th>Amount</th><th>Mode</th><th>Date</th></tr></thead>
          <tbody>${payments.map((p) => `<tr><td>${escapeHtml(p.card_type)}</td><td>₹${p.amount}</td><td>${escapeHtml(p.payment_mode || "-")}</td><td>${formatDateOnly(p.payment_date)}</td></tr>`).join("")}</tbody>
        </table>
      ` : empty("No payments.")}
      <div class="report-actions modal-actions">
        <button class="btn btn-primary" onclick="window.print()">${icons.upload} Print / Save as PDF</button>
      </div>
    </article>
  `;
}

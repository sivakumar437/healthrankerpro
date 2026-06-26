import { state, icons } from "../state.js";
import { escapeHtml, formatDateOnly, formatSigned, measurementsFor } from "../helpers.js";
import { goalProgress } from "../formulas.js";
import { goalBadge, empty } from "./components.js";

export function renderHistory() {
  const isMember = state.user.role === "member";
  const members = isMember ? state.members.slice(0, 1) : state.members;
  const rows = buildHistoryRows(members);
  return `
    <article class="card">
      <div class="section-heading"><div><h2>Measurement Activity</h2><p>Recent weekly measurement entries and score movement</p></div>${icons.history}</div>
      ${rows.length ? `
        <div class="table-responsive">
          <table>
            <thead><tr><th>Member</th><th>Week</th><th>Weight</th><th>BF%</th><th>VF</th><th>Muscle</th><th>Score</th><th>Date</th></tr></thead>
            <tbody>${rows.map(historyRow).join("")}</tbody>
          </table>
        </div>
      ` : empty("No measurement history yet.")}
    </article>
  `;
}

export function buildHistoryRows(members) {
  return members.flatMap((member) => {
    const measurements = measurementsFor(member.id).sort((a, b) => String(b.measurement_date).localeCompare(String(a.measurement_date)));
    return measurements.map((m, idx) => ({ member, measurement: m, prev: measurements[idx + 1] || null }));
  }).sort((a, b) => String(b.measurement.measurement_date).localeCompare(String(a.measurement.measurement_date)));
}

export function historyRow({ member, measurement: m, prev }) {
  const weightChange = prev ? (Number(m.weight) - Number(prev.weight)).toFixed(1) : null;
  const progress = goalProgress(member);
  return `
    <tr>
      <td>
        <button class="table-member-link" data-action="view-profile" data-member-id="${member.id}">${escapeHtml(member.name)}</button>
        ${goalBadge(member.goal)}
      </td>
      <td>${m.week_number}</td>
      <td>${m.weight} kg${weightChange !== null ? `<small class="${Number(weightChange) < 0 ? "text-emerald" : Number(weightChange) > 0 ? "text-danger" : ""}">${Number(weightChange) > 0 ? "+" : ""}${weightChange}</small>` : ""}</td>
      <td>${m.body_fat}%</td>
      <td>${m.visceral_fat}</td>
      <td>${m.muscle_mass} kg</td>
      <td><strong>${progress.score}</strong></td>
      <td>${formatDateOnly(m.measurement_date)}</td>
    </tr>
  `;
}

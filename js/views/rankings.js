import { state, icons } from "../state.js";
import { escapeHtml, memberIdentity, latestMeasurementFor, round } from "../helpers.js";
import { goalProgress, topBy, average, overallBadge, goalLeaderboard, idealDistance } from "../formulas.js";
import { goalBadge, empty } from "./components.js";

export function renderRankings() {
  const scored = state.members
    .map((member) => ({ member, progress: goalProgress(member) }))
    .sort((a, b) => b.progress.score - a.progress.score);
  const weightLoss = goalLeaderboard("Weight Loss");
  const weightGain = goalLeaderboard("Weight Gain");
  const bodyComp = goalLeaderboard("Body Composition");
  const avgScore = average(scored.map((e) => e.progress.score));
  return `
    <div class="rankings-layout">
      ${renderRankingsSummary(scored, avgScore)}
      ${renderRankingsPodium(scored.slice(0, 3))}
      ${renderRankingsTable(scored)}
      <div class="two-col grid">
        ${renderGoalLeaderboard("Weight Loss", weightLoss)}
        ${renderGoalLeaderboard("Weight Gain", weightGain)}
      </div>
    </div>
  `;
}

export function renderRankingsSummary(scored, avgScore) {
  const atIdeal = scored.filter((e) => { const d = idealDistance(e.member); return Number.isFinite(d) && d <= 1; }).length;
  const singleDigitVF = scored.filter((e) => {
    const vf = latestMeasurementFor(e.member.id)?.visceral_fat;
    return vf !== undefined && Number(vf) < 10;
  }).length;
  return `
    <div class="rankings-summary grid">
      <div class="stat-card card"><p>Total Ranked</p><strong>${scored.length}</strong></div>
      <div class="stat-card card"><p>Avg Score</p><strong>${round(avgScore, 1)}</strong></div>
      <div class="stat-card card"><p>At Ideal Weight</p><strong>${atIdeal}</strong></div>
      <div class="stat-card card"><p>Single-Digit VF</p><strong>${singleDigitVF}</strong></div>
    </div>
  `;
}

export function renderRankingsPodium(topEntries) {
  if (!topEntries.length) return "";
  const podiumOrder = [1, 0, 2].map((i) => topEntries[i]).filter(Boolean);
  return `
    <div class="podium-row">
      ${podiumOrder.map((entry, idx) => {
        const rank = topEntries.indexOf(entry) + 1;
        return `
          <article class="podium-card rank-${rank} ${rank === 1 ? "first-place" : ""}">
            <div class="podium-rank">${rank === 1 ? icons.trophy : `#${rank}`}</div>
            <div class="avatar large">${entry.member.name[0]}</div>
            <strong>${escapeHtml(entry.member.name)}</strong>
            <span>${entry.progress.score.toFixed(1)} pts</span>
            ${goalBadge(entry.member.goal)}
          </article>
        `;
      }).join("")}
    </div>
  `;
}

export function renderRankingsTable(scored) {
  return `
    <article class="card">
      <div class="section-heading"><div><h2>Full Rankings</h2><p>Sorted by transformation score</p></div>${icons.trophy}</div>
      <div class="table-responsive">
        <table>
          <thead><tr><th>#</th><th>Member</th><th>Goal</th><th>Score</th><th>Driver</th><th>Ideal Dist.</th><th>VF</th><th>Badge</th></tr></thead>
          <tbody>
            ${scored.map((entry, index) => {
              const vf = latestMeasurementFor(entry.member.id)?.visceral_fat;
              const badge = overallBadge(entry.progress);
              return `<tr>
                <td><span class="rank-pill rank-${Math.min(index + 1, 4)}">${index + 1}</span></td>
                <td><button class="table-member-link" data-action="view-profile" data-member-id="${entry.member.id}">${escapeHtml(entry.member.name)}</button></td>
                <td>${goalBadge(entry.member.goal)}</td>
                <td><strong>${entry.progress.score.toFixed(1)}</strong></td>
                <td>${escapeHtml(entry.progress.driver)}</td>
                <td>${(() => { const d = idealDistance(entry.member); return Number.isFinite(d) ? `${d.toFixed(1)} kg` : "-"; })()}</td>
                <td>${vf !== undefined ? `<span class="${Number(vf) < 10 ? "vf-good" : ""}">${Number(vf).toFixed(1)}</span>` : "-"}</td>
                <td>${badge ? `<span class="badge badge-amber">${badge}</span>` : ""}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

export function renderGoalLeaderboard(goal, entries) {
  return `
    <article class="card">
      <div class="section-heading"><div><h2>${goal} Leaders</h2></div>${goalBadge(goal)}</div>
      ${entries.length ? `
        <div class="leader-list">
          ${entries.slice(0, 5).map((entry, i) => `
            <div class="leader-row">
              <span class="rank-pill rank-${i + 1}">${i + 1}</span>
              <div class="avatar small">${entry.member.name[0]}</div>
              <div>
                <strong>${escapeHtml(entry.member.name)}</strong>
                <small>${entry.progress.driver}</small>
              </div>
              <strong>${entry.progress.score.toFixed(1)}</strong>
            </div>
          `).join("")}
        </div>
      ` : empty(`No ${goal} members yet.`)}
    </article>
  `;
}

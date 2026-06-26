import { state, icons } from "../state.js";
import { escapeHtml, capitalize, formatDateOnly, memberContact, latestMeasurementFor, memberIdentity } from "../helpers.js";
import { goalProgress, idealDistance, weeklyInsight, goalPrinciple, goalMetricCards } from "../formulas.js";
import { stat, goalBadge, memberCard } from "./components.js";

export function renderDashboard() {
  if (state.user.role === "member") return renderMemberDashboard();
  if (state.viewMode !== "club") return renderPersonalDashboard();
  const entries = state.members.map((member) => ({ member, progress: goalProgress(member) })).sort((a, b) => b.progress.score - a.progress.score);
  const champion = entries[0];
  const summary = state.dashboardSummary || {};
  const metricValue = (value, suffix = "") => value === null || value === undefined ? "-" : `${value}${suffix}`;
  return `
    ${state.user.role === "super_admin" && state.dashboardClubs.length ? `
      <div class="dashboard-club-filter">
        <label><span class="label">Nutrition Club</span><select id="dashboardClubFilter">
          <option value="">All Nutrition Clubs</option>
          ${state.dashboardClubs.map((club) => `<option value="${escapeHtml(club)}" ${state.dashboardClubFilter === club ? "selected" : ""}>${escapeHtml(club)}</option>`).join("")}
        </select></label>
      </div>
    ` : ""}
    <div class="dashboard-metrics grid">
      ${dashboardMetric("Total Members", metricValue(summary.totalMembers), "active members", icons.user, "bg-primary")}
      ${dashboardMetric("Avg Weight Loss", metricValue(summary.avgWeightLoss, " kg"), "latest week over week", icons.activity, "bg-emerald")}
      ${dashboardMetric("Avg Muscle Gain", metricValue(summary.avgMuscleGain, " kg"), "latest week over week", icons.bolt || icons.trophy, "bg-blue")}
      ${dashboardMetric("Avg Body Fat", metricValue(summary.avgBodyFat, "%"), "latest reduction", icons.target || icons.check, "bg-violet")}
      ${dashboardMetric("At Ideal Weight", metricValue(summary.atIdealWeight), "within the height-based healthy range", icons.star || icons.trophy, "bg-amber")}
      ${dashboardMetric("Need Attention", metricValue(summary.needAttention), "not measured this week", icons.lock, "bg-danger")}
      ${dashboardMetric("Total Weeks", metricValue(summary.totalWeeks), "distinct measurement weeks", icons.trophy, "bg-emerald")}
      ${dashboardMetric("Imports", metricValue(summary.imports), "recorded import sessions", icons.upload, "bg-muted-icon")}
    </div>
    ${renderMissedMeasurements(summary.measurementMisses)}
    <div class="dashboard-main-grid">
      ${champion ? renderTransformationChampion(champion) : ""}
      ${renderTopPerformers(entries)}
    </div>
  `;
}

export function renderPersonalDashboard() {
  const member = state.members[0];
  const linked = member ? goalProgress(member) : null;
  return `
    <div class="personal-dashboard">
      <article class="card personal-account-card">
        <div class="section-heading">
          <div>
            <h2>${escapeHtml(state.user.name)}</h2>
            <p>${capitalize(state.user.role)} account in ${escapeHtml(state.user.nutrition_club || "Main Nutrition Club")}</p>
          </div>
          ${icons.user}
        </div>
        <div class="stats-grid grid">
          ${stat("Login Role", capitalize(state.user.role), "Personal view", icons.shield, "bg-primary")}
          ${stat("Nutrition Club", escapeHtml(state.user.nutrition_club || "Main Nutrition Club"), "Assigned club", icons.target, "bg-emerald")}
          ${stat("Linked Member", member ? escapeHtml(member.name) : "No linked member", member ? memberIdentity(member) : "Personal account only", icons.members, "bg-blue")}
          ${stat("Personal Score", member ? linked.score : "-", member ? "linked member progress" : "No member profile", icons.trophy, "bg-violet")}
        </div>
      </article>
    </div>
  `;
}

export function renderMemberDashboard() {
  const member = state.members[0];
  if (!member) return `<div class="empty-state">${icons.members}<span>No member profile is linked to this account.</span></div>`;
  const progress = goalProgress(member);
  const cards = goalMetricCards(member, progress);
  return `
    <div class="card goal-summary">
      <div class="section-heading"><div><h2>${escapeHtml(member.name)}</h2><p>Your measurement history, progress, trends, and achievements</p></div></div>
      <div class="goal-banner">
        <div>
          <span class="label">Primary Goal</span>
          <h3>${escapeHtml(member.goal)}</h3>
          <p>${goalPrinciple(member.goal)}</p>
        </div>
        <div class="goal-score"><strong>${progress.score}</strong><span>goal score</span></div>
      </div>
      <div class="stats-grid grid">
        ${cards.map((card) => stat(card.label, card.value, card.sub, icons[card.icon] || icons.trophy, card.color)).join("")}
      </div>
      <div class="insight-card"><strong>Weekly Insight</strong><p>${weeklyInsight(member, progress)}</p></div>
    </div>
  `;
}

export function dashboardMetric(label, value, sub, icon, colorClass) {
  return `
    <article class="dashboard-metric-card">
      <div>
        <p>${label}</p>
        <strong>${value}</strong>
        ${sub ? `<small>${sub}</small>` : ""}
      </div>
      <div class="stat-icon ${colorClass}">${icon}</div>
    </article>
  `;
}

export function renderMissedMeasurements(data) {
  if (!data) return "";
  const categories = [
    { key: "oneWeek", title: "1 Week Missed", note: "Missed last week", tone: "missed-one" },
    { key: "twoWeeks", title: "2 Weeks Missed", note: "Two consecutive weeks", tone: "missed-two" },
    { key: "threeWeeks", title: "3 Weeks Missed", note: "Three consecutive weeks", tone: "missed-three" },
    { key: "fourToNineWeeks", title: "4-9 Weeks Missed", note: "More than three weeks", tone: "missed-long" },
    { key: "moreThanNineWeeks", title: "More Than 9 Weeks", note: "Long-term follow-up", tone: "missed-critical" },
  ];
  return `
    <section class="missed-measurements-section">
      <div class="section-heading missed-measurements-heading">
        <div>
          <h2>Missed Weekly Measurements</h2>
          <p>Completed Sunday-Saturday weeks. Last checked period: ${formatDateOnly(data.periodStart)} to ${formatDateOnly(data.periodEnd)}.</p>
        </div>
        ${icons.calendar}
      </div>
      <div class="missed-measurements-grid">
        ${categories.map((category) => missedMeasurementCard(category, data[category.key] || [])).join("")}
      </div>
    </section>
  `;
}

export function missedMeasurementCard(category, members) {
  return `
    <article class="missed-measurement-card ${category.tone}">
      <div class="missed-measurement-card-header">
        <div><h3>${category.title}</h3><p>${category.note}</p></div>
        <strong>${members.length}</strong>
      </div>
      <div class="missed-member-list">
        ${members.length ? members.map((member) => `
          <div class="missed-member-row">
            <span><b>${escapeHtml(member.name)}</b><small>${escapeHtml(member.memberCode)}</small></span>
            <em>${Number(member.weeksMissed) > 9 ? "9+" : member.weeksMissed} wk</em>
          </div>
        `).join("") : `<p class="missed-empty">No members</p>`}
      </div>
    </article>
  `;
}

export function renderTransformationChampion(entry) {
  const distance = idealDistance(entry.member);
  const vf = latestMeasurementFor(entry.member.id)?.visceral_fat ?? 12;
  const achieved = Number.isFinite(distance) && distance <= 1;
  const distanceLabel = Number.isFinite(distance) ? `${distance.toFixed(1)} kg` : "No data";
  return `
    <section>
      <h2 class="dashboard-section-title">Transformation Champion</h2>
      <article class="champion-card">
        <div class="champion-header">
          <div class="champion-medal">${icons.trophy}</div>
          <div>
            <h3>${escapeHtml(entry.member.name)}</h3>
            <p>${memberContact(entry.member)}</p>
          </div>
          <span class="champion-badge">Champion</span>
        </div>
        <div class="champion-stats">
          <div><span>Score</span><strong>${entry.progress.score.toFixed(1)}</strong></div>
          <div><span>From Ideal</span><strong>${distanceLabel}</strong></div>
          <div><span>VF Status</span><strong>${Number(vf) < 10 ? "Single Digit" : Number(vf).toFixed(1)}</strong></div>
        </div>
        ${achieved ? `<div class="achievement-strip">${icons.star} Ideal Weight Achieved</div>` : ""}
      </article>
    </section>
  `;
}

export function renderTopPerformers(entries) {
  return `
    <section>
      <div class="dashboard-table-heading">
        <h2 class="dashboard-section-title">Top Performers</h2>
        <button class="link-button" data-route="rankings">View All -></button>
      </div>
      <div class="table-card top-performers-table">
        <table>
          <thead><tr><th>#</th><th>Member</th><th>Score</th><th>Ideal Dist.</th><th>VF</th></tr></thead>
          <tbody>
            ${entries.slice(0, 4).map((entry, index) => {
              const vf = latestMeasurementFor(entry.member.id)?.visceral_fat ?? (12 + index * 4);
              return `<tr>
                <td><span class="rank-pill rank-${index + 1}">${index + 1}</span></td>
                <td><button class="table-member-link" data-route="members">${escapeHtml(entry.member.name)}</button></td>
                <td><strong>${entry.progress.score.toFixed(1)}</strong></td>
                <td>${(() => { const d = idealDistance(entry.member); return Number.isFinite(d) ? `${d.toFixed(1)} kg` : "-"; })()}</td>
                <td><span class="${Number(vf) < 10 ? "vf-good" : ""}">${Number(vf).toFixed(1)}</span></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

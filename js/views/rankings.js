import { state, icons } from "../state.js";
import { escapeHtml, latestMeasurementFor, measurementsFor, round } from "../helpers.js";
import { goalProgress, topBy, average, overallBadge, goalLeaderboard, idealDistance } from "../formulas.js";
import { goalBadge, empty } from "./components.js";

export function renderRankings() {
  const rankingMembers = rankedMembersForView();
  const loss = goalLeaderboard("Weight Loss", rankingMembers);
  const gain = goalLeaderboard("Weight Gain", rankingMembers);
  const overall = rankingMembers
    .map((member) => ({ member, progress: goalProgress(member) }))
    .sort((a, b) => b.progress.score - a.progress.score);
  const marathonCount = rankingMembers.filter((m) => Number(m.marathon_active || 0) === 1 && Number(m.active ?? 1) === 1).length;
  return `
    <div class="rankings-page">
      ${renderScoringFormula()}
      <div class="rankings-section-header ranking-filter-header">
        <div>
          <h2>Goal-Based Rankings</h2>
          <span>${state.rankingsMarathonOnly ? `${marathonCount} active marathon member${marathonCount === 1 ? "" : "s"} shown` : "Members ranked within their goal group"}</span>
        </div>
        <label class="toggle-field">
          <span class="label">Marathon Only</span>
          <input id="rankingsMarathonOnly" type="checkbox" ${state.rankingsMarathonOnly ? "checked" : ""} />
          <span class="toggle-switch" aria-hidden="true"></span>
        </label>
      </div>
      <div class="rankings-grid goal-ranking-grid">
        ${rankingCard("Weight Loss Champions", "trend-down", loss, "Goal Score", (entry, index) => index === 0 ? "Fat Loss Champion" : "Runner Up")}
        ${rankingCard("Weight Gain Champions", "trend-up", gain, "Goal Score", (entry, index) => index === 0 ? "Muscle Champion" : "Runner Up")}
      </div>
      <div class="rankings-grid category-ranking-grid">
        ${rankingCard("Overall Champions", "trophy", overall, "Transformation Score", overallBadge)}
        ${rankingCard("Top Weight Loss", "trend-down", topBy((entry) => -entry.progress.weightChange, rankingMembers), "kg reduced", () => "", (entry) => Math.abs(Math.min(entry.progress.weightChange, 0)).toFixed(1))}
        ${rankingCard("Top Muscle Gain", "bolt", topBy((entry) => entry.progress.muscleGain, rankingMembers), "kg gained", () => "", (entry) => Math.max(entry.progress.muscleGain, 0).toFixed(1))}
        ${rankingCard("Visceral Fat Improvement", "target", topBy(visceralImprovement, rankingMembers), "VF reduced", (entry, index) => index === 0 ? "Fat Fighter" : "", (entry) => visceralImprovement(entry).toFixed(1))}
        ${rankingCard("Closest to Ideal Weight", "star", topBy((entry) => -idealDistance(entry.member), rankingMembers), "kg from ideal", (entry) => idealDistance(entry.member) <= 0.5 ? "Ideal Achieved" : "", (entry) => idealDistance(entry.member).toFixed(1))}
        ${rankingCard("Achieved Ideal Weight", "star", topBy((entry) => -idealDistance(entry.member), rankingMembers).filter((entry) => idealDistance(entry.member) <= 1.0), "kg from ideal", () => "Ideal Weight", (entry) => idealDistance(entry.member).toFixed(1))}
        ${rankingCard("Fastest Toward Ideal", "target", topBy((entry) => idealPace(entry.member), rankingMembers), "kg/week toward ideal", () => "On Track", (entry) => idealPace(entry.member).toFixed(1))}
      </div>
    </div>
  `;
}

function rankedMembersForView() {
  if (!state.rankingsMarathonOnly) return state.members;
  return state.members.filter((m) => Number(m.marathon_active || 0) === 1 && Number(m.active ?? 1) === 1);
}

function renderScoringFormula() {
  if (!["admin", "supervisor", "super_admin"].includes(state.user?.role) || !state.scoringFormula) return "";
  const items = state.scoringFormula.items || [];
  const open = state.scoringFormulaOpen;
  return `
    <article class="formula-card ${open ? "open" : "collapsed"}">
      <button class="formula-toggle" type="button" data-action="toggle-scoring-formula" aria-expanded="${open}">
        <div><h2>Scoring Formula</h2><p>How weekly transformation scores are calculated</p></div>
        <span class="collapse-indicator">${open ? "Hide" : "View Formula"}</span>
      </button>
      ${open ? `
        <div class="formula-grid">
          ${items.map((item) => `
            <div class="formula-item">
              <div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.points)}</strong></div>
              <div class="formula-track"><span style="width:${Number(item.width) || 0}%"></span></div>
              <p>${escapeHtml(item.note)}</p>
            </div>
          `).join("")}
        </div>
        <p class="formula-priority">${escapeHtml(state.scoringFormula.summary || "")}</p>
      ` : ""}
    </article>
  `;
}

function rankingCard(title, iconName, entries, metricLabel, badgeFactory, valueFactory) {
  return `
    <article class="ranking-card">
      <div class="ranking-title">
        <span class="ranking-icon ${iconName}">${rankingIcon(iconName)}</span>
        <h3>${title}</h3>
      </div>
      <div class="ranking-list">
        ${entries.length ? entries.slice(0, 4).map((entry, index) => rankingItem(entry, index, metricLabel, badgeFactory, valueFactory)).join("") : `<div class="ranking-empty">No data yet. Import members with 2+ weeks of data.</div>`}
      </div>
    </article>
  `;
}

function rankingItem(entry, index, metricLabel, badgeFactory, valueFactory) {
  const badge = typeof badgeFactory === "function" ? badgeFactory(entry, index) : "";
  const value = valueFactory ? valueFactory(entry, index) : entry.progress.score.toFixed(2);
  return `
    <div class="ranking-item">
      <span class="rank-pill rank-${index + 1}">${index + 1}</span>
      <div class="ranking-member">
        <strong>${escapeHtml(entry.member.name)}</strong>
        ${badge ? `<span class="mini-badge">${escapeHtml(badge)}</span>` : ""}
      </div>
      <div class="ranking-value">
        <strong>${value}</strong>
        <span>${metricLabel}</span>
      </div>
    </div>
  `;
}

function rankingIcon(name) {
  const svgs = {
    "trend-down": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/></svg>',
    "trend-up": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/></svg>',
    trophy: icons.trophy,
    bolt: icons.bolt || icons.trophy,
    target: icons.target || icons.check,
    star: icons.star || icons.trophy,
  };
  return svgs[name] || icons.trophy;
}

function visceralImprovement(entry) {
  const history = measurementsFor(entry.member.id);
  if (history.length < 2) return 0;
  return Math.max(0, Number(history[1].visceral_fat || 0) - Number(history[0].visceral_fat || 0));
}

function idealPace(member) {
  const history = measurementsFor(member.id);
  if (history.length < 2) return 0;
  const latest = history[0];
  const previous = history[1];
  const target = Number(latest.ideal_weight);
  if (!Number.isFinite(target)) return 0;
  const prev = Math.abs(Number(previous.weight) - target);
  const curr = Math.abs(Number(latest.weight) - target);
  return Math.max(prev - curr, 0);
}

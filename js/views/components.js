import { state, icons } from "../state.js";
import { escapeHtml, capitalize, formatDateOnly, memberIdentity, isCurrentMonthMarathon, goalOptions, activeCardFor } from "../helpers.js";
import { goalProgress, goalLeaderboard, goalLeaderboardNote } from "../formulas.js";

export function stat(label, value, sub, icon, colorClass) {
  return `<article class="card stat-card"><div><p>${label}</p><strong>${value}</strong>${sub ? `<small>${sub}</small>` : ""}</div><div class="stat-icon ${colorClass}">${icon}</div></article>`;
}

export function goalBadge(goal) {
  const cls = goal === "Weight Loss" ? "badge-red" : goal === "Weight Gain" ? "badge-blue" : "badge-emerald";
  return `<span class="badge ${cls}">${escapeHtml(goal)}</span>`;
}

export function roleBadge(role) {
  const cls = role === "admin" ? "badge-violet" : role === "supervisor" ? "badge-blue" : role === "member" ? "badge-amber" : "badge-emerald";
  return `<span class="badge ${cls}">${capitalize(role)}</span>`;
}

export function restricted(message) {
  return `<div class="empty-state">${icons.lock}<strong>Access Restricted</strong><span>${escapeHtml(message)}</span></div>`;
}

export function empty(message) {
  return `<div class="empty-state">${icons.members}<span>${escapeHtml(message)}</span></div>`;
}

export function memberCard(m) {
  const progress = goalProgress(m);
  const active = Number(m.active ?? 1) === 1;
  return `
    <article class="member-row clickable-row ${active ? "" : "inactive-member"}" data-action="view-profile" data-member-id="${m.id}">
      <div class="avatar">${m.name[0]}</div>
      <div>
        <h3>${escapeHtml(m.name)}</h3>
        <p>${memberIdentity(m)} - Last measured: ${m.last_measured}</p>
        <div class="badges">${goalBadge(m.goal)}<span class="badge badge-violet">Goal Score ${progress.score}</span>${active ? "" : `<span class="badge badge-red">Hidden</span>`}${isCurrentMonthMarathon(m) ? `<span class="badge badge-amber">${icons.trophy} Marathon</span>` : ""}${m.measured ? `<span class="badge badge-emerald">Measured</span>` : `<span class="badge badge-red">Pending</span>`}</div>
      </div>
      <div class="rank-score">
        <strong>${progress.score}</strong>
        <span>${escapeHtml(progress.driver)}</span>
        <button class="btn btn-outline mini" data-action="view-profile" data-member-id="${m.id}">History</button>
        <button class="btn btn-outline mini" data-action="set-member-status" data-member-id="${m.id}" data-active="${active ? "0" : "1"}">${active ? "Hide" : "Make Active"}</button>
      </div>
    </article>
  `;
}

export function renderSessionControl() {
  const canControlSession = ["admin", "supervisor", "super_admin"].includes(state.user.role);
  const isActive = state.session.status === "ACTIVE";
  return `
    <article class="session-panel ${isActive ? "session-active" : "session-closed"}">
      <div>
        <span class="label">Current Week Session Status</span>
        <h2><span class="status-dot"></span>${state.session.status}</h2>
        <p>${state.week} - Session Date: ${formatDateOnly(state.session.session_date)}</p>
        ${state.session.opened_by ? `<p>Opened by ${state.session.opened_by} on ${state.session.opened_on}</p>` : `<p>No active measurement session has been opened for this week.</p>`}
        ${state.session.closed_by ? `<p>Closed by ${state.session.closed_by} on ${state.session.closed_on}</p>` : ""}
      </div>
      ${canControlSession ? `<div class="session-actions">${isActive ? `<button class="btn btn-outline" data-action="close-session">Close Weekly Measurements</button>` : `<button class="btn btn-primary" data-action="${state.session.closed_by ? "reopen-session" : "start-session"}">${state.session.closed_by ? "Reopen Weekly Measurements" : "Start Weekly Measurements"}</button>`}</div>` : ""}
    </article>
  `;
}

export function renderAuditTrail() {
  return `
    <div class="two-col grid audit-grid">
      <article class="card">
        <div class="section-heading"><div><h2>Notifications</h2><p>Messages sent to supervisors</p></div>${icons.bell}</div>
        <div class="audit-list">${state.notifications.map((item) => `<div><strong>${escapeHtml(item.message)}</strong><span>${item.created_at}</span></div>`).join("") || empty("No session notifications yet.")}</div>
      </article>
      <article class="card">
        <div class="section-heading"><div><h2>Audit Trail</h2><p>Session control actions</p></div>${icons.history}</div>
        <div class="audit-list">${state.audit.map((item) => `<div><strong>${escapeHtml(item.action)}</strong><span>${escapeHtml(item.actor)} - ${item.created_at}</span></div>`).join("") || empty("No audit events yet.")}</div>
      </article>
    </div>
  `;
}

export function renderGoalOverview() {
  const leaders = ["Weight Loss", "Weight Gain"]
    .map((goal) => ({ goal, top: goalLeaderboard(goal)[0] }))
    .filter((entry) => entry.top);
  return `
    <div class="two-col grid goal-overview">
      ${leaders.map((entry) => `
        <article class="card">
          <div class="section-heading">
            <div><h2>${entry.goal} Recognition</h2><p>${goalLeaderboardNote(entry.goal)}</p></div>
            ${goalBadge(entry.goal)}
          </div>
          <div class="recognition-row">
            <div class="avatar">${entry.top.member.name[0]}</div>
            <div>
              <strong>${escapeHtml(entry.top.member.name)}</strong>
              <p>${escapeHtml(entry.top.progress.driver)}</p>
            </div>
            <div class="goal-score small"><strong>${entry.top.progress.score}</strong><span>score</span></div>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

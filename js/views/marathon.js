import { state, icons } from "../state.js";
import { escapeHtml, formatDateOnly, isCurrentMonthMarathon, currentLocalMonth } from "../helpers.js";
import { restricted, empty, goalBadge } from "./components.js";

export function renderMarathon() {
  if (!["admin", "super_admin"].includes(state.user.role)) return restricted("Only admins can manage the Marathon programme.");
  const month = currentLocalMonth();
  const marathonMembers = state.members.filter(isCurrentMonthMarathon);
  const eligible = state.members.filter((m) => Number(m.active ?? 1) === 1 && !isCurrentMonthMarathon(m));
  return `
    <article class="card">
      <div class="section-heading">
        <div><h2>Marathon — ${month}</h2><p>${marathonMembers.length} members registered for this month's marathon</p></div>
        ${icons.trophy}
      </div>
      <div class="marathon-actions">
        <button class="btn btn-outline" data-action="reset-marathon">Reset Marathon (Next Month)</button>
      </div>
      <div class="marathon-two-col">
        ${renderMarathonRegistered(marathonMembers)}
        ${renderMarathonEligible(eligible)}
      </div>
    </article>
  `;
}

export function renderMarathonRegistered(members) {
  return `
    <section>
      <h3>Registered (${members.length})</h3>
      <div class="member-list mini">
        ${members.length ? members.map((m) => `
          <div class="member-row-mini">
            <div class="avatar small">${m.name[0]}</div>
            <div>
              <strong>${escapeHtml(m.name)}</strong>
              ${goalBadge(m.goal)}
            </div>
            <button class="btn btn-outline mini" data-action="toggle-marathon" data-member-id="${m.id}" data-value="0">Remove</button>
          </div>
        `).join("") : empty("No members registered.")}
      </div>
    </section>
  `;
}

export function renderMarathonEligible(members) {
  return `
    <section>
      <h3>Eligible to Register (${members.length})</h3>
      <div class="member-list mini">
        ${members.length ? members.map((m) => `
          <div class="member-row-mini">
            <div class="avatar small">${m.name[0]}</div>
            <div>
              <strong>${escapeHtml(m.name)}</strong>
              ${goalBadge(m.goal)}
            </div>
            <button class="btn btn-primary mini" data-action="toggle-marathon" data-member-id="${m.id}" data-value="1">Register</button>
          </div>
        `).join("") : empty("All active members are registered.")}
      </div>
    </section>
  `;
}

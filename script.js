const app = document.querySelector("#app");

const state = {
  loading: true,
  error: "",
  user: null,
  route: "dashboard",
  query: "",
  attendanceMemberId: "",
  profileMemberId: "",
  modal: null,
  members: [],
  measurements: [],
  cards: [],
  attendance: [],
  payments: [],
  users: [],
  session: null,
  audit: [],
  auditEntries: [],
  auditTypes: [],
  auditFilters: { from: "", to: "", type: "" },
  notifications: [],
  week: "",
};

const demoCredentials = {
  admin: "admin",
  supervisor: "supervisor",
  viewer: "viewer",
  member: "member",
};

const icons = {
  activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-2.5a2 2 0 0 0-1.9 1.5l-2.4 8.3a.25.25 0 0 1-.5 0L9.2 2.2a.25.25 0 0 0-.5 0l-2.3 8.3A2 2 0 0 1 4.5 12H2"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m2 2 20 20"/><path d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6"/><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c6.5 0 10 8 10 8a18.3 18.3 0 0 1-3.1 4.4"/><path d="M6.6 6.6C3.7 8.6 2 12 2 12s3.5 8 10 8a10.5 10.5 0 0 0 4.1-.8"/></svg>',
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>',
  members: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M5 4H3v3a4 4 0 0 0 4 4"/><path d="M19 4h2v3a4 4 0 0 1-4 4"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14h6"/><path d="M9 18h6"/><path d="M9 10h1"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/><path d="M12 7v5l3 2"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8Z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 21a2 2 0 0 0 3.4 0"/><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>',
};

const routes = [
  ["dashboard", "Dashboard", icons.dashboard],
  ["members", "Members", icons.members],
  ["attendance", "Attendance", icons.calendar],
  ["measurements", "Measurements", icons.clipboard],
  ["rankings", "Rankings", icons.trophy],
  ["import", "Import", icons.upload],
  ["compliance", "Compliance", icons.check],
  ["history", "History", icons.history],
  ["audit", "Audit", icons.shield],
  ["users", "Users", icons.shield],
];

const memberBaselines = {
  1: { weight: 88.4, bodyFat: 31.2, muscleMass: 27.8, waist: 101, strength: 58 },
  2: { weight: 67.8, bodyFat: 27.4, muscleMass: 24.9, waist: 84, strength: 62 },
  3: { weight: 80.1, bodyFat: 24.3, muscleMass: 30.4, waist: 92, strength: 66 },
  4: { weight: 76.5, bodyFat: 34.2, muscleMass: 23.8, waist: 96, strength: 52 },
  5: { weight: 72.2, bodyFat: 23.8, muscleMass: 29.2, waist: 86, strength: 70 },
  6: { weight: 58.6, bodyFat: 21.8, muscleMass: 22.7, waist: 76, strength: 48 },
};

const demoProgress = {
  1: { weight: -3.2, bodyFat: -2.4, muscleMass: 0.7, waist: -4.6, strength: 8 },
  2: { weight: -0.8, bodyFat: -1.1, muscleMass: 0.5, waist: -1.8, strength: 5 },
  3: { weight: 2.4, bodyFat: 0.2, muscleMass: 1.3, waist: 0.6, strength: 12 },
  4: { weight: -1.6, bodyFat: -1.7, muscleMass: 0.1, waist: -2.8, strength: 3 },
  5: { weight: 0.4, bodyFat: -0.7, muscleMass: 0.6, waist: -0.9, strength: 7 },
  6: { weight: 1.3, bodyFat: 0.1, muscleMass: 0.8, waist: 0.2, strength: 9 },
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function applyData(data) {
  state.user = data.user;
  state.members = data.members || [];
  state.measurements = data.measurements || [];
  state.cards = data.cards || [];
  state.attendance = data.attendance || [];
  state.payments = data.payments || [];
  state.users = data.users || [];
  state.session = data.session;
  state.audit = data.audit || [];
  state.notifications = data.notifications || [];
  state.week = data.week || "";
  if (state.user && state.user.role === "member" && !["dashboard", "history"].includes(state.route)) {
    state.route = "history";
  }
}

async function bootstrap() {
  renderLoading();
  try {
    const demo = new URLSearchParams(window.location.search).get("demo");
    if (demo && demoCredentials[demo]) {
      const data = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ username: demo, password: demoCredentials[demo] }),
      });
      sessionStorage.setItem("healthrank-user-id", data.user.id);
      applyData(data);
    } else {
      const userId = sessionStorage.getItem("healthrank-user-id") || "";
      applyData(await api(`/api/bootstrap?userId=${encodeURIComponent(userId)}`));
    }
    state.loading = false;
    render();
  } catch (error) {
    state.loading = false;
    state.error = error.message;
    render();
  }
}

function renderLoading() {
  app.innerHTML = `<main class="login-shell"><section class="login-panel">${brandLockup()}<p class="footnote">Loading...</p></section></main>`;
}

function render() {
  app.innerHTML = state.user ? renderShell() : renderLogin(state.error);
  bindEvents();
}

function renderLogin(error = "") {
  return `
    <main class="login-shell">
      <section class="login-panel">
        ${brandLockup()}
        <div class="auth-card">
          <h2>Sign in to your account</h2>
          ${error ? `<div class="alert">${escapeHtml(error)}</div>` : ""}
          <form id="loginForm">
            <div class="field">
              <label class="label" for="username">Username</label>
              <div class="input-wrap">${icons.user}<input id="username" placeholder="Enter username" autocomplete="username" autofocus /></div>
            </div>
            <div class="field">
              <label class="label" for="password">Password</label>
              <div class="input-wrap">
                ${icons.lock}
                <input id="password" class="password-input" type="password" placeholder="Enter password" autocomplete="current-password" />
                <button class="ghost-icon toggle-password" type="button" aria-label="Show password">${icons.eye}</button>
              </div>
            </div>
            <button id="submitLogin" class="btn btn-primary btn-block" disabled>Sign in</button>
          </form>
        </div>
        <p class="footnote">Contact your administrator to get access.</p>
      </section>
    </main>
  `;
}

function brandLockup() {
  return `
    <div class="brand-lockup">
      <div class="brand-icon">${icons.activity}</div>
      <h1>HealthRank Pro</h1>
      <p>Health &amp; Nutrition Club Tracker</p>
    </div>
  `;
}

function renderShell() {
  const routeLabel = state.route === "rankings" ? "Rankings & Leaderboards" : state.route === "profile" ? "Member Profile" : routes.find(([id]) => id === state.route)?.[1] || "Dashboard";
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="brand-icon">${icons.activity}</div>
          <div><h2>HealthRank Pro</h2><p>Club Tracker</p></div>
        </div>
        <nav class="nav">${navButtons(false)}</nav>
        <div class="user-card">
          <strong>${escapeHtml(state.user.name)}</strong>
          <span>${capitalize(state.user.role)} access</span>
          <button class="btn btn-ghost" data-action="logout">${icons.logout} Sign out</button>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div class="page-title">
            <h1>${routeLabel}</h1>
            <p>${pageSubtitle(state.route)}</p>
          </div>
          ${renderTopbarAction()}
        </header>
        <section class="content">${renderRoute()}</section>
      </main>
      <nav class="mobile-nav">${navButtons(true)}</nav>
    </div>
    ${state.modal ? renderMeasurementModal(state.modal) : ""}
    <div id="toast" class="toast">Updated</div>
  `;
}

function renderTopbarAction() {
  if (state.route === "dashboard") return `<button class="btn btn-primary" data-route="import">${icons.upload} Import Data</button>`;
  if (state.route === "rankings") return `<button class="btn btn-primary" data-action="re-score-all">${icons.history} Re-score All</button>`;
  return `<button class="btn btn-outline" data-action="refresh">Refresh</button>`;
}

function navButtons(mobile) {
  const visibleRoutes = mobile
    ? ["dashboard", "members", "attendance", "measurements", "history"]
    : ["dashboard", "members", "attendance", "measurements", "rankings", "compliance", "history", "audit", "users"];
  return visibleRoutes
    .map((routeId) => routes.find(([id]) => id === routeId))
    .filter(Boolean)
    .filter(([id]) => {
      if (state.user.role === "member") return ["dashboard", "history"].includes(id);
      if (id === "users" && state.user.role !== "admin") return false;
      return true;
    })
    .map(([id, label, icon]) => {
      const disabled =
        (id === "audit" && state.user.role !== "admin") ||
        (id === "import" && !["admin", "supervisor"].includes(state.user.role)) ||
        (id === "attendance" && !["admin", "supervisor"].includes(state.user.role));
      return `<button class="${state.route === id ? "active" : ""}" data-route="${id}" ${disabled ? "disabled" : ""}>${icon}<span>${label}</span></button>`;
    })
    .join("");
}

function pageSubtitle(route) {
  const subtitles = {
    dashboard: "Member health progress overview",
    members: "Search, review, and manage nutrition club members",
    attendance: "Fast daily entry with card progress and payments",
    measurements: "Review weekly measurement entries and corrections",
    rankings: "Week-over-week transformation scores",
    import: "Add weekly measurements from a spreadsheet",
    compliance: "Weekly measurement tracking and pending follow-ups",
    history: "Recent measurement activity and score movement",
    audit: "Admin-only transaction history and filters",
    profile: "Member details, card, attendance, payments, and measurements",
    users: "Manage staff accounts and access levels",
  };
  return subtitles[route] || "";
}

function renderRoute() {
  const renderers = {
    dashboard: renderDashboard,
    members: renderMembers,
    attendance: renderAttendance,
    measurements: renderMeasurements,
    rankings: renderRankings,
    import: renderImport,
    compliance: renderCompliance,
    history: renderHistory,
    audit: renderAuditHistoryPage,
    profile: renderMemberProfile,
    users: renderUsers,
  };
  return (renderers[state.route] || renderDashboard)();
}

function renderDashboard() {
  if (state.user.role === "member") return renderMemberDashboard();
  const entries = state.members.map((member) => ({ member, progress: goalProgress(member) })).sort((a, b) => b.progress.score - a.progress.score);
  const champion = entries[0];
  const avgLoss = average(entries.map((entry) => Math.max(-entry.progress.weightChange, 0)).filter(Boolean));
  const avgMuscle = average(entries.map((entry) => Math.max(entry.progress.muscleGain, 0)).filter(Boolean));
  const avgBodyFat = average(entries.map((entry) => Math.max(entry.progress.bodyFatReduced, 0)).filter(Boolean));
  const idealCount = entries.filter((entry) => idealDistance(entry.member) <= 1).length;
  const attentionCount = entries.filter((entry) => !entry.member.measured).length;
  const totalWeeks = Math.max(5, state.measurements.length || 0);
  const importCount = state.audit.filter((item) => item.action.includes("Import")).length || 22;
  return `
    <div class="dashboard-metrics grid">
      ${dashboardMetric("Total Members", state.members.length, "", icons.user, "bg-primary")}
      ${dashboardMetric("Avg Weight Loss", avgLoss ? `${avgLoss.toFixed(1)} kg` : "-", "week over week", icons.activity, "bg-emerald")}
      ${dashboardMetric("Avg Muscle Gain", avgMuscle ? `${avgMuscle.toFixed(1)} kg` : "-", "week over week", icons.bolt || icons.trophy, "bg-blue")}
      ${dashboardMetric("Avg Body Fat", avgBodyFat ? `${avgBodyFat.toFixed(1)}%` : "-", "reduction", icons.target || icons.check, "bg-violet")}
      ${dashboardMetric("At Ideal Weight", idealCount, "members achieved goal", icons.star || icons.trophy, "bg-amber")}
      ${dashboardMetric("Need Attention", attentionCount, "flagged this week", icons.lock, "bg-danger")}
      ${dashboardMetric("Total Weeks", totalWeeks, "measurements recorded", icons.trophy, "bg-emerald")}
      ${dashboardMetric("Imports", importCount, "sessions completed", icons.upload, "bg-muted-icon")}
    </div>
    <div class="dashboard-main-grid">
      ${champion ? renderTransformationChampion(champion) : ""}
      ${renderTopPerformers(entries)}
    </div>
  `;
}

function renderMemberDashboard() {
  const member = state.members[0];
  if (!member) return empty("No member profile is linked to this account.");
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
        ${cards.map((card) => stat(card.label, card.value, card.sub, card.icon, card.color)).join("")}
      </div>
      <div class="insight-card"><strong>Weekly Insight</strong><p>${weeklyInsight(member, progress)}</p></div>
    </div>
  `;
}

function dashboardMetric(label, value, sub, icon, colorClass) {
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

function renderTransformationChampion(entry) {
  const distance = idealDistance(entry.member);
  const visceral = latestMeasurementFor(entry.member.id)?.visceral_fat ?? (normalizeGoal(entry.member.goal) === "gain" ? 7 : 8);
  const achieved = distance <= 1;
  return `
    <section>
      <h2 class="dashboard-section-title">Transformation Champion</h2>
      <article class="champion-card">
        <div class="champion-header">
          <div class="champion-medal">${icons.trophy}</div>
          <div>
            <h3>${escapeHtml(entry.member.name)}</h3>
            <p>${escapeHtml(entry.member.phone)}</p>
          </div>
          <span class="champion-badge">Champion</span>
        </div>
        <div class="champion-stats">
          <div><span>Score</span><strong>${entry.progress.score.toFixed(1)}</strong></div>
          <div><span>Weeks</span><strong>${Math.max(2, state.measurements.length || 2)}</strong></div>
          <div><span>From Ideal</span><strong>${distance.toFixed(1)} kg</strong></div>
          <div><span>VF Status</span><strong>${Number(visceral) < 10 ? "Single Digit" : Number(visceral).toFixed(1)}</strong></div>
        </div>
        ${achieved ? `<div class="achievement-strip">${icons.star} Ideal Weight Achieved</div>` : ""}
      </article>
    </section>
  `;
}

function renderTopPerformers(entries) {
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
              const vf = latestMeasurementFor(entry.member.id)?.visceral_fat ?? (index === 0 ? 8 : 12 + index * 4);
              return `<tr>
                <td><span class="rank-pill rank-${index + 1}">${index + 1}</span></td>
                <td><button class="table-member-link" data-route="members">${escapeHtml(entry.member.name)}${index < 2 ? " *" : ""}</button></td>
                <td><strong>${entry.progress.score.toFixed(1)}</strong></td>
                <td>${idealDistance(entry.member).toFixed(1)} kg</td>
                <td><span class="${Number(vf) < 10 ? "vf-good" : ""}">${Number(vf).toFixed(1)}${Number(vf) < 10 ? " ok" : ""}</span></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderMembers() {
  if (state.user.role === "member") return restricted("Members can view their own history and progress only.");
  const filtered = state.members.filter((m) => m.name.toLowerCase().includes(state.query.toLowerCase()));
  return `
    ${["admin", "supervisor"].includes(state.user.role) ? renderSingleMemberEntry() : ""}
    <div class="toolbar">
      <input class="search-input" id="memberSearch" value="${escapeHtml(state.query)}" placeholder="Search members" />
      <span class="toolbar-note">${filtered.length} members visible</span>
    </div>
    <div class="member-list">${filtered.map(memberCard).join("") || empty("No members match your search.")}</div>
  `;
}

function renderSingleMemberEntry() {
  return `
    <article class="card single-entry-card">
      <div class="section-heading">
        <div><h2>Single Member Entry</h2><p>Add one member at a time. Bulk import remains available on Import.</p></div>
        ${icons.user}
      </div>
      <form id="memberForm" class="form-grid">
        <label><span class="label">First Name</span><input name="firstName" placeholder="First name" required /></label>
        <label><span class="label">Last Name</span><input name="lastName" placeholder="Last name" /></label>
        <label><span class="label">Mobile Number</span><input name="phone" type="tel" placeholder="Phone number" required /></label>
        <label><span class="label">Gender</span><select name="gender"><option value="">Select...</option><option>Male</option><option>Female</option></select></label>
        <label><span class="label">Age</span><input name="age" type="number" min="0" placeholder="Age" /></label>
        <label><span class="label">Date of Birth</span><input name="dob" type="date" /></label>
        <label><span class="label">Height (cm)</span><input name="height" type="number" step="0.1" placeholder="Height" /></label>
        <label><span class="label">Nutrition Club</span><input name="nutritionClub" value="Main Nutrition Club" /></label>
        <label><span class="label">Membership/Card Type</span>${cardTypeSelect()}</label>
        <label class="wide"><span class="label">Primary Goal</span><input name="goal" id="memberGoal" placeholder="Health & Fitness" /></label>
        <div class="wide goal-chip-row">
          ${goalOptions().map((goal) => `<button type="button" data-action="set-member-goal" data-goal="${escapeHtml(goal)}">${escapeHtml(goal)}</button>`).join("")}
        </div>
        <label class="wide"><span class="label">Notes</span><textarea name="notes" rows="2" placeholder="Optional notes"></textarea></label>
        <div class="wide modal-actions"><button class="btn btn-primary" type="submit">${icons.plus} Save Member</button></div>
      </form>
    </article>
  `;
}

function renderAttendance() {
  if (!["admin", "supervisor"].includes(state.user.role)) return restricted("Only Admin and Supervisor users can mark attendance.");
  const today = new Date().toISOString().slice(0, 10);
  const filtered = attendanceSearchResults();
  const selected = selectedAttendanceMember(filtered);
  const card = selected ? activeCardFor(selected.id) : null;
  const progress = card ? Math.round((Number(card.completed_visits) / Number(card.target_visits)) * 100) : 0;
  const recent = state.attendance.slice(0, 10);
  return `
    <div class="attendance-layout">
      <section class="attendance-entry card">
        <div class="section-heading"><div><h2>Daily Attendance Entry</h2><p>Search, verify active card, mark attendance, and collect payment.</p></div>${icons.calendar}</div>
        <div class="attendance-search">
          <label class="field wide">
            <span class="label">Search Member</span>
            <input class="search-input" id="attendanceSearch" value="${escapeHtml(state.query)}" placeholder="Search by name, mobile, or member ID" />
          </label>
          <div class="attendance-results">
            ${filtered.map((member) => attendanceResult(member, selected?.id === member.id)).join("") || empty("No matching members found.")}
          </div>
        </div>
        ${selected ? `
          <div class="active-card-panel">
            <div>
              <span class="label">Active Card</span>
              <h3>${card ? `${escapeHtml(card.card_type)} - ${escapeHtml(card.card_number)}` : "No active card"}</h3>
              <p>${escapeHtml(selected.phone)} - ${escapeHtml(card?.club || "Main Nutrition Club")}</p>
            </div>
            ${card ? `<div class="card-progress"><strong>${card.completed_visits} / ${card.target_visits}</strong><span>${card.remaining_visits} visits remaining</span><div class="progress-track"><i style="width:${progress}%"></i></div></div>` : `<span class="badge badge-red">Create card required</span>`}
          </div>
          <form id="attendanceForm" class="attendance-form">
            <input type="hidden" name="memberId" value="${selected.id}" />
            <div class="form-grid">
              <label><span class="label">Attendance Date</span><input name="attendanceDate" type="date" value="${today}" required /></label>
              <label><span class="label">Attendance Type</span>${attendanceTypeSelect()}</label>
              <label><span class="label">Lifestyle/Family Count</span><select name="countValue"><option value="1">Count 1 visit</option><option value="2">Count 2 visits</option></select></label>
              <label><span class="label">Payment Amount</span><input name="paymentAmount" type="number" min="0" step="1" placeholder="0" /></label>
              <label><span class="label">Payment Mode</span>${paymentModeSelect()}</label>
              <label><span class="label">Admin Duplicate Update</span><select name="confirmUpdate"><option value="">No</option><option value="1">Yes, replace same-date record</option></select></label>
              <label class="wide"><span class="label">Override Reason / Notes</span><textarea name="reason" rows="2" placeholder="Required for Override Attendance"></textarea></label>
              <label class="wide"><span class="label">Payment Notes</span><textarea name="paymentNotes" rows="2" placeholder="Optional payment reference"></textarea></label>
            </div>
            <div class="modal-actions"><button class="btn btn-primary" type="submit">${icons.check} Mark Attendance</button></div>
          </form>
        ` : ""}
      </section>
      <aside class="attendance-side">
        ${renderUpcomingCards()}
        <div class="table-card">
          <div class="dashboard-table-heading"><h2 class="dashboard-section-title">Recent Attendance</h2></div>
          <table>
            <thead><tr><th>Member</th><th>Date</th><th>Type</th><th>Count</th></tr></thead>
            <tbody>${recent.map((row) => `<tr><td><strong>${escapeHtml(row.member_name)}</strong></td><td>${row.attendance_date}</td><td>${escapeHtml(row.attendance_type)}</td><td>${row.neutral_day ? "Neutral" : row.count_value}</td></tr>`).join("") || `<tr><td colspan="4">${empty("No attendance marked yet.")}</td></tr>`}</tbody>
          </table>
        </div>
      </aside>
    </div>
  `;
}

function attendanceResult(member, selected) {
  const card = activeCardFor(member.id);
  return `
    <button class="attendance-result ${selected ? "selected" : ""}" data-action="select-attendance-member" data-member-id="${member.id}">
      <span class="avatar">${member.name[0]}</span>
      <span><strong>${escapeHtml(member.name)}</strong><small>ID ${member.id} - ${escapeHtml(member.phone)}</small></span>
      <em>${card ? `${card.completed_visits}/${card.target_visits}` : "No card"}</em>
    </button>
  `;
}

function renderUpcomingCards() {
  const upcoming = state.cards
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

function renderMeasurements() {
  if (state.user.role === "member") return renderMemberMeasurements();
  const canAddMeasurement = canAddMeasurements();
  const measurementRows = state.measurements.filter((m) => {
    const query = state.query.toLowerCase();
    const member = state.members.find((item) => Number(item.id) === Number(m.member_id));
    return !query || [m.member_name, String(m.member_id), m.week_number, member?.phone].some((value) => String(value || "").toLowerCase().includes(query));
  });
  return `
    ${renderSessionControl()}
    <div class="toolbar">
      <input class="search-input" id="measurementSearch" value="${escapeHtml(state.query)}" placeholder="Search measurements by member name, mobile, or ID" />
      ${canAddMeasurement ? `<button class="btn btn-primary" data-action="add-measurement">${icons.plus} Add Measurement</button>` : `<span class="session-message">Existing measurements are read-only until Admin opens the session.</span>`}
    </div>
    <p class="toolbar-note">${measurementRows.length} visible entries from full measurement history</p>
    <div class="table-card">
      <table>
        <thead><tr><th>Member</th><th>Week</th><th>Weight</th><th>Body Fat</th><th>Muscle</th><th>BMI</th><th>Supervisor</th><th>Date</th><th></th></tr></thead>
        <tbody>${measurementRows.map(measurementRow).join("") || `<tr><td colspan="9">${empty("No measurements match your search.")}</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function renderMemberMeasurements() {
  return `
    ${renderMemberDashboard()}
    <div class="table-card member-history-table">
      <table>
        <thead><tr><th>Week</th><th>Weight</th><th>Body Fat</th><th>Muscle</th><th>BMI</th><th>Date</th><th>Notes</th></tr></thead>
        <tbody>${state.measurements.map((m) => `<tr><td>${m.week_number}</td><td>${m.weight} kg</td><td>${m.body_fat}%</td><td>${m.muscle_mass} kg</td><td>${m.bmi}</td><td>${m.measurement_date}</td><td>${escapeHtml(m.notes || "-")}</td></tr>`).join("") || `<tr><td colspan="7">${empty("No saved measurement entries yet.")}</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function renderRankings() {
  const loss = goalLeaderboard("Weight Loss");
  const gain = goalLeaderboard("Weight Gain");
  const overall = state.members
    .map((member) => ({ member, progress: goalProgress(member) }))
    .sort((a, b) => b.progress.score - a.progress.score);
  return `
    <div class="rankings-page">
      ${renderScoringFormula()}
      <div class="rankings-section-header">
        <h2>Goal-Based Rankings</h2>
        <span>Members ranked within their goal group</span>
      </div>
      <div class="rankings-grid goal-ranking-grid">
        ${rankingCard("Weight Loss Champions", "trend-down", loss, "Goal Score", (entry, index) => index === 0 ? "Fat Loss Champion" : "Runner Up")}
        ${rankingCard("Weight Gain Champions", "trend-up", gain, "Goal Score", (entry, index) => index === 0 ? "Muscle Champion" : "Runner Up")}
      </div>
      <div class="rankings-grid category-ranking-grid">
        ${rankingCard("Overall Champions", "trophy", overall, "Transformation Score", overallBadge)}
        ${rankingCard("Top Weight Loss", "trend-down", topBy((entry) => -entry.progress.weightChange), "kg reduced", () => "", (entry) => Math.abs(Math.min(entry.progress.weightChange, 0)).toFixed(1))}
        ${rankingCard("Top Muscle Gain", "bolt", topBy((entry) => entry.progress.muscleGain), "kg gained", () => "", (entry) => Math.max(entry.progress.muscleGain, 0).toFixed(1))}
        ${rankingCard("Visceral Fat Improvement", "target", topBy(visceralImprovement), "VF reduced", (entry, index) => index === 0 ? "Fat Fighter" : "", (entry) => visceralImprovement(entry).toFixed(1))}
        ${rankingCard("Closest to Ideal Weight", "star", topBy((entry) => -idealDistance(entry.member)), "kg from ideal", (entry) => idealDistance(entry.member) <= 0.5 ? "Ideal Achieved" : "", (entry) => idealDistance(entry.member).toFixed(1))}
        ${rankingCard("Achieved Ideal Weight", "star", topBy((entry) => -idealDistance(entry.member)).filter((entry) => idealDistance(entry.member) <= 1.0), "kg from ideal", () => "Ideal Weight", (entry) => idealDistance(entry.member).toFixed(1))}
        ${rankingCard("Fastest Toward Ideal", "target", topBy((entry) => idealPace(entry.member)), "kg/week toward ideal", (entry) => "On Track", (entry) => idealPace(entry.member).toFixed(1))}
      </div>
    </div>
  `;
}

function renderScoringFormula() {
  const items = [
    ["Visceral Fat (Single Digit)", "35pts", "Lower is better", 35],
    ["Muscle Mass Gain", "25pts", "Higher is better", 25],
    ["Weight Loss (>1 kg/week)", "20pts", "Lower is better", 20],
    ["Ideal Weight Proximity", "20pts", "Lower is better", 20],
  ];
  return `
    <article class="formula-card">
      <h2>Scoring Formula</h2>
      <div class="formula-grid">
        ${items.map(([label, points, note, width]) => `
          <div class="formula-item">
            <div><span>${label}</span><strong>${points}</strong></div>
            <div class="formula-track"><span style="width:${width}%"></span></div>
            <p>${note}</p>
          </div>
        `).join("")}
      </div>
      <p class="formula-priority">Priority: Visceral fat single-digit (35) -> Muscle gain (25) -> Weight loss &gt;1kg (20) -> Ideal weight proximity (20)</p>
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

function renderImport() {
  if (!["admin", "supervisor"].includes(state.user.role)) return restricted("Only supervisors and admins can import data.");
  const canAddMeasurement = canAddMeasurements();
  return `
    <article class="card add-member-entry-card">
      <div class="section-heading">
        <div><h2>Add Member Data</h2><p>Enter weekly measurements manually, or import via CSV / image.</p></div>
        ${icons.upload}
      </div>
      <div class="entry-tabs">
        <button class="active" type="button">Manual Entry</button>
        <button type="button" data-action="import">CSV / Text</button>
        <button type="button" data-action="import">Image / OCR</button>
      </div>
      <div class="import-box compact">
        <h2>Manual single entry</h2>
        <p class="footnote">Search an existing member by name or phone. If no match exists, save this entry as a new member.</p>
        ${canAddMeasurement ? `<button class="btn btn-primary" data-action="add-measurement">${icons.plus} Create Member & Save Entry</button>` : `<span class="session-message">Measurement session has not been opened by the Admin for this week.</span>`}
      </div>
    </article>
  `;
}

function renderCompliance() {
  const pending = state.members.filter((m) => !m.measured);
  const marathonPending = pending.filter((m) => m.marathon);
  const measured = state.members.length - pending.length;
  const canAddMeasurement = canAddMeasurements();
  return `
    ${renderSessionControl()}
    <div class="stats-grid grid">
      ${stat("Session", state.session.status, state.week, state.session.status === "ACTIVE" ? icons.check : icons.lock, state.session.status === "ACTIVE" ? "bg-emerald" : "bg-danger")}
      ${stat("Measured", measured, "this week", icons.check, "bg-emerald")}
      ${stat("Pending", pending.length, "not yet measured", icons.clock, "bg-amber")}
      ${stat("Marathon Pending", marathonPending.length, "high priority", icons.trophy, "bg-violet")}
    </div>
    ${canAddMeasurement ? `<div class="toolbar"><button class="btn btn-primary" data-action="add-measurement">${icons.plus} Add Measurement</button></div>` : `<div class="notice-inline">Measurement session has not been opened by the Admin for this week.</div>`}
    <div class="card">
      <div class="section-heading"><div><h2>Members Yet to Be Measured</h2><p>Prioritized by marathon status and score movement</p></div></div>
      <div class="member-list">${pending.map(memberCard).join("") || empty("All visible members have been measured this week.")}</div>
    </div>
  `;
}

function renderHistory() {
  if (state.user.role === "member") return renderMemberMeasurements();
  return `
    <div class="table-card">
      <table>
        <thead><tr><th>Member</th><th>Goal</th><th>Goal Score</th><th>Insight</th><th>When</th></tr></thead>
        <tbody>
          ${state.members.slice(0, 6).map((m) => {
            const progress = goalProgress(m);
            return `<tr><td>${escapeHtml(m.name)}</td><td>${goalBadge(m.goal)}</td><td><strong>${progress.score}</strong></td><td>${escapeHtml(weeklyInsight(m, progress))}</td><td>${m.last_measured}</td></tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderAuditHistoryPage() {
  if (state.user.role !== "admin") return restricted("Only administrators can view audit history.");
  const entries = state.auditEntries.length ? state.auditEntries : state.audit.slice(0, 20);
  const types = uniqueAuditTypes();
  return `
    <div class="audit-page">
      <article class="card audit-filter-card">
        <div class="section-heading">
          <div><h2>Audit History</h2><p>Latest 20 entries shown by default. Filter by date and transaction type.</p></div>
          ${icons.shield}
        </div>
        <form id="auditFilterForm" class="form-grid">
          <label><span class="label">From Date</span><input name="from" type="date" value="${escapeHtml(state.auditFilters.from)}" /></label>
          <label><span class="label">To Date</span><input name="to" type="date" value="${escapeHtml(state.auditFilters.to)}" /></label>
          <label class="wide"><span class="label">Transaction Type</span>
            <select name="type">
              <option value="">All transaction types</option>
              ${types.map((type) => `<option value="${escapeHtml(type)}" ${state.auditFilters.type === type ? "selected" : ""}>${escapeHtml(type)}</option>`).join("")}
            </select>
          </label>
          <div class="wide modal-actions">
            <button class="btn btn-outline" type="button" data-action="clear-audit-filters">Clear</button>
            <button class="btn btn-primary" type="submit">${icons.check} Apply Filters</button>
          </div>
        </form>
      </article>
      <div class="table-card audit-history-table">
        <table>
          <thead><tr><th>Date / Time</th><th>Transaction Type</th><th>Entry</th><th>User</th></tr></thead>
          <tbody>${entries.map(auditRow).join("") || `<tr><td colspan="4">${empty("No audit entries match the selected filters.")}</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;
}

function auditRow(item) {
  const type = auditType(item.action);
  return `
    <tr>
      <td>${escapeHtml(item.created_at)}</td>
      <td><span class="mini-badge">${escapeHtml(type)}</span></td>
      <td><strong>${escapeHtml(item.action)}</strong></td>
      <td>${escapeHtml(item.actor)}</td>
    </tr>
  `;
}

function auditType(action = "") {
  return String(action).split(" - ")[0].trim() || "Transaction";
}

function uniqueAuditTypes() {
  const combined = [...state.auditTypes, ...state.audit.map((item) => auditType(item.action))].filter(Boolean);
  return [...new Set(combined)].sort();
}

function renderMemberProfile() {
  const member = state.members.find((m) => Number(m.id) === Number(state.profileMemberId)) || state.members[0];
  if (!member) return empty("No member selected.");
  const card = activeCardFor(member.id);
  const memberMeasurements = measurementsFor(member.id);
  const latest = memberMeasurements[0];
  const attendance = state.attendance.filter((row) => Number(row.member_id) === Number(member.id)).slice(0, 8);
  const payments = state.payments.filter((row) => Number(row.member_id) === Number(member.id)).slice(0, 8);
  return `
    <div class="profile-page">
      <article class="card profile-summary">
        <div class="section-heading">
          <div><h2>${escapeHtml(member.name)}</h2><p>${escapeHtml(member.phone)} - ${escapeHtml(member.nutrition_club || "Main Nutrition Club")}</p></div>
          ${goalBadge(member.goal)}
        </div>
        <div class="stats-grid grid">
          ${stat("Current Card", card ? card.card_type : "None", card ? `${card.completed_visits}/${card.target_visits} visits` : "No active card", icons.clipboard, "bg-primary")}
          ${stat("Latest Weight", latest ? `${latest.weight} kg` : "-", latest ? latest.measurement_date : "No measurement", icons.activity, "bg-emerald")}
          ${stat("Body Fat", latest ? `${latest.body_fat}%` : "-", "latest", icons.target, "bg-violet")}
          ${stat("BMI", latest ? latest.bmi : "-", "auto calculated", icons.check, "bg-blue")}
        </div>
      </article>
      <div class="two-col grid">
        <article class="table-card">
          <div class="dashboard-table-heading"><h2 class="dashboard-section-title">Measurement History</h2><button class="btn btn-outline mini" data-action="add-measurement" data-member-id="${member.id}">Add Measurement</button></div>
          <table>
            <thead><tr><th>Date</th><th>Weight</th><th>Fat %</th><th>Muscle</th><th>VF</th><th>BMI</th><th>BMR</th><th>Change</th></tr></thead>
            <tbody>${memberMeasurements.map((row, index) => measurementHistoryRow(row, memberMeasurements[index + 1])).join("") || `<tr><td colspan="8">${empty("No measurements yet.")}</td></tr>`}</tbody>
          </table>
        </article>
        <div class="profile-side">
          <article class="table-card">
            <div class="dashboard-table-heading"><h2 class="dashboard-section-title">Attendance History</h2></div>
            <table><thead><tr><th>Date</th><th>Type</th><th>Count</th></tr></thead><tbody>${attendance.map((row) => `<tr><td>${row.attendance_date}</td><td>${escapeHtml(row.attendance_type)}</td><td>${row.neutral_day ? "Neutral" : row.count_value}</td></tr>`).join("") || `<tr><td colspan="3">${empty("No attendance yet.")}</td></tr>`}</tbody></table>
          </article>
          <article class="table-card">
            <div class="dashboard-table-heading"><h2 class="dashboard-section-title">Payment History</h2></div>
            <table><thead><tr><th>Date</th><th>Amount</th><th>Mode</th></tr></thead><tbody>${payments.map((row) => `<tr><td>${row.payment_date}</td><td>${Number(row.amount).toFixed(0)}</td><td>${escapeHtml(row.payment_mode)}</td></tr>`).join("") || `<tr><td colspan="3">${empty("No payments yet.")}</td></tr>`}</tbody></table>
          </article>
        </div>
      </div>
    </div>
  `;
}

function renderUsers() {
  if (state.user.role !== "admin") return restricted("Only administrators can manage users.");
  return `
    <div class="two-col grid">
      <article class="card">
        <div class="section-heading"><div><h2>Create User</h2><p>Add a staff or member login account.</p></div></div>
        <form id="userForm" class="form-grid">
          <label><span class="label">Username</span><input name="username" placeholder="e.g. john" required /></label>
          <label><span class="label">Display Name</span><input name="name" placeholder="e.g. John Smith" required /></label>
          <label><span class="label">Password</span><input name="password" type="password" placeholder="Temporary password" required /></label>
          <label><span class="label">Role</span>
            <select name="role" required>
              <option value="viewer">Viewer - read-only</option>
              <option value="supervisor">Supervisor - add data</option>
              <option value="member">Member - own history</option>
              <option value="admin">Admin - full access</option>
            </select>
          </label>
          <div class="wide modal-actions"><button class="btn btn-primary" type="submit">${icons.plus} Create User</button></div>
        </form>
      </article>
      <article class="card">
        <div class="section-heading"><div><h2>All Users</h2><p>Admin can remove other users, but cannot delete self.</p></div></div>
        <div class="member-list">${state.users.map(userRow).join("") || empty("No users found.")}</div>
      </article>
    </div>
  `;
}

function userRow(user) {
  const isSelf = user.id === state.user.id;
  return `
    <div class="member-row user-row">
      <div class="avatar">${escapeHtml(user.name[0] || "?")}</div>
      <div>
        <h3>${escapeHtml(user.name)}</h3>
        <p>@${escapeHtml(user.username)}${isSelf ? " - current user" : ""}</p>
      </div>
      <div class="user-actions">
        ${roleBadge(user.role)}
        <button class="btn btn-outline mini" data-action="delete-user" data-user-id="${escapeHtml(user.id)}" ${isSelf ? "disabled" : ""}>Remove</button>
      </div>
    </div>
  `;
}

function renderGoalOverview() {
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

function renderSessionControl() {
  const isAdmin = state.user.role === "admin";
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
      ${isAdmin ? `<div class="session-actions">${isActive ? `<button class="btn btn-outline" data-action="close-session">Close Weekly Measurements</button>` : `<button class="btn btn-primary" data-action="${state.session.closed_by ? "reopen-session" : "start-session"}">${state.session.closed_by ? "Reopen Weekly Measurements" : "Start Weekly Measurements"}</button>`}</div>` : ""}
    </article>
  `;
}

function renderAuditTrail() {
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

function renderMeasurementModal(modalValue = "") {
  const editId = typeof modalValue === "string" && modalValue.startsWith("edit:") ? modalValue.slice(5) : "";
  const existing = editId ? state.measurements.find((m) => m.id === editId) : null;
  const selectedMember = existing?.member_id || modalValue;
  const selected = state.members.find((m) => Number(m.id) === Number(selectedMember)) || null;
  const nameParts = selected ? splitMemberName(selected.name) : { first: "", last: "" };
  const value = (name, fallback = "") => existing?.[name] ?? fallback;
  const memberResults = state.members.map((m) => {
    const parts = splitMemberName(m.name);
    const lastMeasurement = latestMeasurementFor(m.id);
    return `
      <button class="lookup-result ${Number(selectedMember) === Number(m.id) ? "selected" : ""}" type="button"
        data-action="select-measurement-member"
        data-member-id="${m.id}"
        data-first-name="${escapeHtml(parts.first)}"
        data-last-name="${escapeHtml(parts.last)}"
        data-phone="${escapeHtml(m.phone)}"
        data-gender="${escapeHtml(m.gender || "")}"
        data-height="${escapeHtml(m.height || lastMeasurement?.height || "")}"
        data-nutrition-club="${escapeHtml(m.nutrition_club || "Main Nutrition Club")}"
        data-goal="${escapeHtml(m.goal)}">
        <span class="avatar">${m.name[0]}</span>
        <span><strong>${escapeHtml(m.name)}</strong><small>ID ${m.id} - ${escapeHtml(m.phone)}</small></span>
        ${goalBadge(m.goal)}
      </button>
    `;
  }).join("");
  return `
    <div class="modal-backdrop">
      <form class="modal-card measurement-entry-modal" id="measurementForm">
        <input type="hidden" name="measurementId" value="${existing?.id || ""}" />
        <input type="hidden" name="memberId" id="measurementMemberId" value="${selected?.id || ""}" />
        <div class="section-heading">
          <div><h2>${existing ? "Edit Measurement" : "Add Member Data"}</h2><p>Manual Entry - ${state.week} - Session ${state.session.id}</p></div>
          <button class="ghost-icon modal-close" type="button" data-action="close-modal" aria-label="Close">x</button>
        </div>
        <div class="entry-tabs">
          <button class="active" type="button">Manual Entry</button>
          <button type="button">CSV / Text</button>
          <button type="button">Image / OCR</button>
        </div>
        <div class="form-grid">
          <label class="wide"><span class="label">Search Member</span><input id="measurementMemberSearch" placeholder="Search by member name or phone number" value="${selected ? escapeHtml(selected.name) : ""}" /></label>
          <div class="wide lookup-results" id="measurementLookupResults">${memberResults}</div>
          <label><span class="label">First Name</span><input name="firstName" id="measurementFirstName" value="${escapeHtml(nameParts.first)}" placeholder="First name" /></label>
          <label><span class="label">Last Name</span><input name="lastName" id="measurementLastName" value="${escapeHtml(nameParts.last)}" placeholder="Last name" /></label>
          <label><span class="label">Phone Number</span><input name="phone" id="measurementPhone" type="tel" value="${escapeHtml(selected?.phone || "")}" placeholder="Phone number" /></label>
          <label><span class="label">Nutrition Club</span><input name="nutritionClub" id="measurementNutritionClub" value="${escapeHtml(selected?.nutrition_club || "Main Nutrition Club")}" /></label>
          <label><span class="label">Member ID</span><input name="memberCode" value="${selected ? selected.id : ""}" placeholder="e.g. SIV3210" /></label>
          <label><span class="label">Measurement Date</span><input name="measurementDate" type="date" value="${new Date().toISOString().slice(0, 10)}" /></label>
          <label><span class="label">Week Number</span><input name="weekLabel" value="${state.week}" /></label>
          <label><span class="label">Height (cm)</span><input name="height" id="measurementHeight" type="number" step="0.1" value="${value("height", selected?.height || latestMeasurementFor(selected?.id)?.height || "170")}" placeholder="e.g. 172" required /></label>
          <label><span class="label">Age</span><input name="age" type="number" step="1" placeholder="e.g. 35" /></label>
          <label><span class="label">Gender</span><select name="gender" id="measurementGender"><option value="">Select...</option><option ${selected?.gender === "Male" ? "selected" : ""}>Male</option><option ${selected?.gender === "Female" ? "selected" : ""}>Female</option></select></label>
          <label class="wide"><span class="label">Purpose of Visit</span><input name="goal" id="measurementGoal" value="${escapeHtml(selected?.goal || "")}" placeholder="e.g. Weight Loss, Health & Fitness, Muscle Building..." /></label>
          <div class="wide goal-chip-row">
            ${goalOptions().map((goal) => `<button type="button" data-action="set-measurement-goal" data-goal="${escapeHtml(goal)}">${escapeHtml(goal)}</button>`).join("")}
          </div>
          <div class="wide form-section-label">Health Metrics</div>
          <label><span class="label">Weight (kg)*</span><input name="weight" type="number" step="0.1" value="${value("weight")}" placeholder="e.g. 82.5" required /></label>
          <label><span class="label">Body Fat %</span><input name="bodyFat" type="number" step="0.1" value="${value("body_fat")}" placeholder="e.g. 28.3" required /></label>
          <label><span class="label">BMI</span><input name="bmi" readonly value="${value("bmi")}" placeholder="Calculated on save" /></label>
          <label><span class="label">BMR (kcal)</span><input name="bmr" type="number" step="1" placeholder="e.g. 1650" /></label>
          <label><span class="label">Visceral Fat</span><input name="visceralFat" type="number" step="1" value="${value("visceral_fat")}" placeholder="e.g. 12" required /></label>
          <label><span class="label">Muscle Mass (kg)</span><input name="muscleMass" type="number" step="0.1" value="${value("muscle_mass")}" placeholder="e.g. 54.2" required /></label>
          <label><span class="label">Body Age</span><input name="metabolicAge" type="number" step="1" value="${value("metabolic_age")}" placeholder="e.g. 38" required /></label>
          <label><span class="label">Subcutaneous Fat</span><input name="subcutaneousFat" type="number" step="0.1" placeholder="e.g. 22.4" /></label>
          <label><span class="label">Waist (cm)</span><input name="waist" type="number" step="0.1" value="${value("waist", "0")}" required /></label>
          <label><span class="label">Hip (cm)</span><input name="hip" type="number" step="0.1" value="${value("hip", "0")}" required /></label>
          <label><span class="label">Chest (cm)</span><input name="chest" type="number" step="0.1" value="${value("chest", "0")}" required /></label>
          <label><span class="label">Water Percentage (%)</span><input name="water" type="number" step="0.1" value="${value("water", "0")}" required /></label>
          <label class="wide"><span class="label">Notes</span><textarea name="notes" rows="3">${escapeHtml(value("notes"))}</textarea></label>
        </div>
        <div class="modal-actions">
          ${selected ? `<button class="btn btn-outline" type="button" data-action="view-profile" data-member-id="${selected.id}">View Member History</button>` : ""}
          <button class="btn btn-outline" type="button" data-action="close-modal">Cancel</button>
          <button class="btn btn-primary" type="submit">${existing ? "Update Measurement" : "Create Member & Save Entry"}</button>
        </div>
      </form>
    </div>
  `;
}

function stat(label, value, sub, icon, colorClass) {
  return `<article class="card stat-card"><div><p>${label}</p><strong>${value}</strong>${sub ? `<small>${sub}</small>` : ""}</div><div class="stat-icon ${colorClass}">${icon}</div></article>`;
}

function goalProgress(member) {
  const baseline = memberBaselines[member.id] || { weight: 70, bodyFat: 25, muscleMass: 25, waist: 85, strength: 50 };
  const latest = latestMeasurementFor(member.id);
  const synthetic = currentFromBaseline(member.id, baseline);
  const current = latest ? {
    weight: Number(latest.weight),
    bodyFat: Number(latest.body_fat),
    muscleMass: Number(latest.muscle_mass),
    waist: Number(latest.waist),
    strength: synthetic.strength,
  } : synthetic;
  const fatMassStart = baseline.weight * baseline.bodyFat / 100;
  const fatMassNow = current.weight * current.bodyFat / 100;
  const metrics = {
    weightChange: round(current.weight - baseline.weight, 1),
    muscleGain: round(current.muscleMass - baseline.muscleMass, 1),
    bodyFatChange: round(current.bodyFat - baseline.bodyFat, 1),
    bodyFatReduced: round(baseline.bodyFat - current.bodyFat, 1),
    fatMassLost: round(fatMassStart - fatMassNow, 1),
    waistReduced: round(baseline.waist - current.waist, 1),
    strengthImprovement: round(current.strength - baseline.strength, 0),
  };
  const goal = normalizeGoal(member.goal);
  if (goal === "gain") return scoreWeightGain(metrics);
  if (goal === "loss") return scoreWeightLoss(metrics);
  return scoreBodyComposition(metrics);
}

function scoreWeightLoss(metrics) {
  const fatLoss = clamp(metrics.fatMassLost / 4, 0, 1) * 40;
  const muscle = clamp((metrics.muscleGain + 0.2) / 1.7, 0, 1) * 35;
  const bodyFat = clamp(metrics.bodyFatReduced / 4, 0, 1) * 20;
  const weight = clamp((-metrics.weightChange) / 5, 0, 1) * 5;
  const score = Math.round(fatLoss + muscle + bodyFat + weight);
  return {
    ...metrics,
    score,
    driver: `Fat loss ${formatSigned(metrics.fatMassLost)} kg, muscle ${formatSigned(metrics.muscleGain)} kg`,
    weights: "Fat Loss 40%, Muscle 35%, Body Fat % 20%, Scale Weight 5%",
  };
}

function scoreWeightGain(metrics) {
  const muscle = clamp(metrics.muscleGain / 2.5, 0, 1) * 50;
  const healthyWeight = clamp(metrics.weightChange / 4, 0, 1) * 30;
  const bodyComp = clamp((metrics.muscleGain - Math.max(metrics.bodyFatChange, 0) * 0.35) / 2, 0, 1) * 20;
  const score = Math.round(muscle + healthyWeight + bodyComp);
  return {
    ...metrics,
    score,
    healthyWeightGain: Math.max(metrics.weightChange, 0),
    bodyCompositionImprovement: round(metrics.muscleGain - Math.max(metrics.bodyFatChange, 0) * 0.35, 1),
    driver: `Muscle ${formatSigned(metrics.muscleGain)} kg, weight ${formatSigned(metrics.weightChange)} kg`,
    weights: "Muscle Gain 50%, Healthy Weight Gain 30%, Body Composition 20%",
  };
}

function scoreBodyComposition(metrics) {
  const muscle = clamp(metrics.muscleGain / 1.5, 0, 1) * 40;
  const bodyFat = clamp(metrics.bodyFatReduced / 3, 0, 1) * 35;
  const waist = clamp(metrics.waistReduced / 4, 0, 1) * 25;
  return {
    ...metrics,
    score: Math.round(muscle + bodyFat + waist),
    driver: `Muscle ${formatSigned(metrics.muscleGain)} kg, body fat ${formatSigned(-metrics.bodyFatReduced)}%`,
    weights: "Muscle 40%, Body Fat 35%, Waist 25%",
  };
}

function goalMetricCards(member, progress) {
  const goal = normalizeGoal(member.goal);
  if (goal === "gain") {
    return [
      { label: "Muscle Gained", value: `${formatSigned(progress.muscleGain)} kg`, sub: "top priority", icon: icons.trophy, color: "bg-emerald" },
      { label: "Healthy Weight Gained", value: `${formatSigned(progress.healthyWeightGain)} kg`, sub: "lean gain focus", icon: icons.activity, color: "bg-primary" },
      { label: "Strength Improvement", value: `+${progress.strengthImprovement}`, sub: "training signal", icon: icons.check, color: "bg-violet" },
      { label: "Body Composition", value: `${formatSigned(progress.bodyCompositionImprovement)}`, sub: "muscle over fat", icon: icons.clipboard, color: "bg-blue" },
    ];
  }
  if (goal === "loss") {
    return [
      { label: "Fat Lost", value: `${formatSigned(progress.fatMassLost)} kg`, sub: "highest priority", icon: icons.trophy, color: "bg-emerald" },
      { label: "Muscle Gained", value: `${formatSigned(progress.muscleGain)} kg`, sub: "preserve or build", icon: icons.activity, color: "bg-primary" },
      { label: "Body Fat Reduced", value: `${formatSigned(progress.bodyFatReduced)}%`, sub: "composition change", icon: icons.check, color: "bg-blue" },
      { label: "Waist Reduced", value: `${formatSigned(progress.waistReduced)} cm`, sub: "shape marker", icon: icons.clipboard, color: "bg-violet" },
    ];
  }
  return [
    { label: "Muscle Gained", value: `${formatSigned(progress.muscleGain)} kg`, sub: "body composition", icon: icons.activity, color: "bg-primary" },
    { label: "Body Fat Reduced", value: `${formatSigned(progress.bodyFatReduced)}%`, sub: "composition change", icon: icons.check, color: "bg-blue" },
    { label: "Waist Reduced", value: `${formatSigned(progress.waistReduced)} cm`, sub: "fitness marker", icon: icons.clipboard, color: "bg-violet" },
    { label: "Goal Score", value: progress.score, sub: "balanced progress", icon: icons.trophy, color: "bg-emerald" },
  ];
}

function weeklyInsight(member, progress) {
  const goal = normalizeGoal(member.goal);
  if (goal === "gain") {
    return `Great progress! You gained ${Math.max(progress.muscleGain, 0).toFixed(1)} kg of lean muscle and changed overall body weight by ${formatSigned(progress.weightChange)} kg, supporting your weight gain goal.`;
  }
  if (goal === "loss") {
    return `Excellent progress! You gained or preserved ${formatSigned(progress.muscleGain)} kg of muscle while losing ${formatSigned(progress.fatMassLost)} kg of body fat. This indicates healthy body recomposition.`;
  }
  return `Strong body composition progress: muscle changed by ${formatSigned(progress.muscleGain)} kg while body fat moved ${formatSigned(progress.bodyFatChange)}%.`;
}

function goalPrinciple(goal) {
  if (normalizeGoal(goal) === "gain") return "Success prioritizes muscle gain, healthy weight gain, and improved body composition.";
  if (normalizeGoal(goal) === "loss") return "Success prioritizes fat loss and muscle preservation before scale-weight reduction.";
  return "Success prioritizes body composition improvement over simple scale-weight changes.";
}

function goalLeaderboard(goal) {
  return state.members
    .filter((member) => member.goal === goal)
    .map((member) => ({ member, progress: goalProgress(member) }))
    .sort((a, b) => b.progress.score - a.progress.score);
}

function goalLeaderboardNote(goal) {
  if (normalizeGoal(goal) === "gain") return "Ranked by muscle gain, healthy weight gain, and body composition improvement.";
  if (normalizeGoal(goal) === "loss") return "Ranked by fat loss, muscle preservation/gain, body fat reduction, and only lightly by scale weight.";
  return "Ranked by balanced body composition progress.";
}

function topBy(scoreFn) {
  return state.members
    .map((member) => ({ member, progress: goalProgress(member) }))
    .sort((a, b) => scoreFn(b) - scoreFn(a));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function overallBadge(entry, index) {
  return ["Champion", "Runner Up", "Third Place", "Top Performer"][index] || "Top Performer";
}

function visceralImprovement(entry) {
  const latest = latestMeasurementFor(entry.member.id);
  if (latest) return Math.max(0, 10 - Number(latest.visceral_fat));
  return Math.max(0, entry.progress.bodyFatReduced / 2);
}

function idealDistance(member) {
  const progress = goalProgress(member);
  const baseline = memberBaselines[member.id] || { weight: 70 };
  const currentWeight = baseline.weight + progress.weightChange;
  const ideal = normalizeGoal(member.goal) === "gain" ? baseline.weight + 3 : baseline.weight - 4;
  return Math.abs(currentWeight - ideal);
}

function idealPace(member) {
  const progress = goalProgress(member);
  if (normalizeGoal(member.goal) === "gain") return Math.max(progress.weightChange, 0);
  return Math.max(-progress.weightChange, 0);
}

function rankingIcon(name) {
  const svgs = {
    "trend-down": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/></svg>',
    "trend-up": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/></svg>',
    trophy: icons.trophy,
    bolt: icons.bolt,
    target: icons.target,
    star: icons.star,
  };
  return svgs[name] || icons.trophy;
}

function latestMeasurementFor(memberId) {
  return state.measurements.find((measurement) => Number(measurement.member_id) === Number(memberId));
}

function measurementsFor(memberId) {
  return state.measurements
    .filter((measurement) => Number(measurement.member_id) === Number(memberId))
    .sort((a, b) => String(b.measurement_date).localeCompare(String(a.measurement_date)));
}

function measurementHistoryRow(row, previous) {
  const change = previous ? formatSigned(Number(row.weight) - Number(previous.weight)) + " kg" : "-";
  return `<tr><td>${row.measurement_date}</td><td>${row.weight} kg</td><td>${row.body_fat}%</td><td>${row.muscle_mass} kg</td><td>${row.visceral_fat}</td><td>${row.bmi}</td><td>${row.bmr || "-"}</td><td>${change}</td></tr>`;
}

function activeCardFor(memberId) {
  return state.cards.find((card) => Number(card.member_id) === Number(memberId) && card.status === "Active");
}

function splitMemberName(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return { first: parts.shift() || "", last: parts.join(" ") };
}

function attendanceSearchResults() {
  const query = state.query.trim().toLowerCase();
  const members = query
    ? state.members.filter((member) => [member.name, member.phone, String(member.id)].some((value) => String(value).toLowerCase().includes(query)))
    : state.members;
  return members;
}

function selectedAttendanceMember(results) {
  if (state.attendanceMemberId) {
    return state.members.find((member) => Number(member.id) === Number(state.attendanceMemberId)) || results[0];
  }
  return results[0];
}

function attendanceTypeSelect() {
  const types = ["Present", "Mega Club", "Lifestyle Day", "Family Day", "Override Attendance", "STS", "Public Holiday", "Training Session", "Club Holiday", "Absent"];
  return `<select name="attendanceType">${types.map((type) => `<option>${type}</option>`).join("")}</select>`;
}

function goalOptions() {
  return ["Weight Loss", "Weight Gain", "Health & Fitness", "Muscle Building", "Rehabilitation", "Diabetes Management", "Post-natal Recovery"];
}

function paymentModeSelect() {
  const modes = ["Cash", "PhonePe", "Google Pay", "UPI", "Bank Transfer"];
  return `<select name="paymentMode">${modes.map((mode) => `<option>${mode}</option>`).join("")}</select>`;
}

function cardTypeSelect() {
  const types = ["Complimentary Card", "Trial Card", "10 Days Card / NMS", "26 Days Card", "30 Days Card"];
  return `<select name="cardType">${types.map((type) => `<option>${type}</option>`).join("")}</select>`;
}

function currentFromBaseline(memberId, baseline) {
  const delta = demoProgress[memberId] || { weight: 0, bodyFat: 0, muscleMass: 0, waist: 0, strength: 0 };
  return {
    weight: baseline.weight + delta.weight,
    bodyFat: baseline.bodyFat + delta.bodyFat,
    muscleMass: baseline.muscleMass + delta.muscleMass,
    waist: baseline.waist + delta.waist,
    strength: baseline.strength + delta.strength,
  };
}

function normalizeGoal(goal) {
  const value = String(goal).toLowerCase();
  if (value.includes("gain")) return "gain";
  if (value.includes("loss")) return "loss";
  return "fitness";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, decimals = 1) {
  return Number(value.toFixed(decimals));
}

function formatSigned(value) {
  const rounded = round(Number(value) || 0, 1);
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}`;
}

function memberCard(m) {
  const progress = goalProgress(m);
  return `
    <article class="member-row">
      <div class="avatar">${m.name[0]}</div>
      <div>
        <h3>${escapeHtml(m.name)}</h3>
        <p>${escapeHtml(m.phone)} - Last measured: ${m.last_measured}</p>
        <div class="badges">${goalBadge(m.goal)}<span class="badge badge-violet">Goal Score ${progress.score}</span>${m.marathon ? `<span class="badge badge-amber">${icons.trophy} Marathon</span>` : ""}${m.measured ? `<span class="badge badge-emerald">Measured</span>` : `<span class="badge badge-red">Pending</span>`}</div>
      </div>
      <div class="rank-score"><strong>${progress.score}</strong><span>${escapeHtml(progress.driver)}</span><button class="btn btn-outline mini" data-action="view-profile" data-member-id="${m.id}">History</button></div>
    </article>
  `;
}

function measurementRow(m) {
  const canEdit = state.user.role === "admin" && state.session.status === "ACTIVE";
  return `
    <tr>
      <td><strong>${escapeHtml(m.member_name)}</strong><br /><span>${m.session_id}</span></td>
      <td>${m.week_number}</td>
      <td>${m.weight} kg</td>
      <td>${m.body_fat}%</td>
      <td>${m.muscle_mass} kg</td>
      <td><strong>${m.bmi}</strong></td>
      <td>${supervisorName(m.supervisor_id)}</td>
      <td>${m.measurement_date}</td>
      <td>${canEdit ? `<button class="btn btn-outline mini" data-action="edit-measurement" data-measurement-id="${m.id}">${icons.edit} Edit</button>` : `<span class="readonly-label">Read-only</span>`}</td>
    </tr>
  `;
}

function goalBadge(goal) {
  const cls = goal === "Weight Loss" ? "badge-red" : goal === "Weight Gain" ? "badge-blue" : "badge-emerald";
  return `<span class="badge ${cls}">${escapeHtml(goal)}</span>`;
}

function roleBadge(role) {
  const cls = role === "admin" ? "badge-violet" : role === "supervisor" ? "badge-blue" : role === "member" ? "badge-amber" : "badge-emerald";
  return `<span class="badge ${cls}">${capitalize(role)}</span>`;
}

function restricted(message) {
  return `<div class="empty-state">${icons.lock}<strong>Access Restricted</strong><span>${escapeHtml(message)}</span></div>`;
}

function empty(message) {
  return `<div class="empty-state">${icons.members}<span>${escapeHtml(message)}</span></div>`;
}

function handleMeasurementLookup(event) {
  const query = event.target.value.trim().toLowerCase();
  const memberId = document.querySelector("#measurementMemberId");
  if (memberId) memberId.value = "";
  const results = [...document.querySelectorAll("#measurementLookupResults .lookup-result")];
  let visible = 0;
  results.forEach((button) => {
    const text = button.innerText.toLowerCase();
    const matched = !query || text.includes(query);
    button.hidden = !matched;
    if (matched) visible += 1;
  });
  const typed = event.target.value.trim();
  if (typed) {
    if (/^\+?\d[\d\s-]+$/.test(typed)) {
      const phone = document.querySelector("#measurementPhone");
      if (phone) phone.value = typed;
    } else if (!visible) {
      const parts = splitMemberName(typed);
      const first = document.querySelector("#measurementFirstName");
      const last = document.querySelector("#measurementLastName");
      if (first) first.value = parts.first;
      if (last) last.value = parts.last;
    }
  }
  let emptyNode = document.querySelector("#lookupNoMatch");
  if (!emptyNode) {
    emptyNode = document.createElement("div");
    emptyNode.id = "lookupNoMatch";
    emptyNode.className = "lookup-empty";
    emptyNode.textContent = "No match found. Continue below to create a new member.";
    document.querySelector("#measurementLookupResults")?.appendChild(emptyNode);
  }
  emptyNode.hidden = !!visible || !query;
}

function fillMeasurementMember(data) {
  const fields = {
    "#measurementMemberId": data.memberId,
    "#measurementFirstName": data.firstName,
    "#measurementLastName": data.lastName,
    "#measurementPhone": data.phone,
    "#measurementGender": data.gender,
    "#measurementHeight": data.height,
    "#measurementNutritionClub": data.nutritionClub,
    "#measurementGoal": data.goal,
    "#measurementMemberSearch": `${data.firstName || ""} ${data.lastName || ""}`.trim(),
  };
  Object.entries(fields).forEach(([selector, value]) => {
    const input = document.querySelector(selector);
    if (input) input.value = value || "";
  });
  document.querySelectorAll("#measurementLookupResults .lookup-result").forEach((button) => {
    button.classList.toggle("selected", button.dataset.memberId === data.memberId);
  });
}

function bindEvents() {
  document.querySelector("#loginForm")?.addEventListener("submit", handleLogin);
  document.querySelectorAll("#username,#password").forEach((input) => input.addEventListener("input", updateLoginButton));
  document.querySelector(".toggle-password")?.addEventListener("click", togglePassword);
  document.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", changeRoute));
  document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", handleAction));
  document.querySelector("#auditFilterForm")?.addEventListener("submit", applyAuditFilters);
  document.querySelector("#memberForm")?.addEventListener("submit", saveMember);
  document.querySelector("#userForm")?.addEventListener("submit", saveUser);
  document.querySelector("#measurementForm")?.addEventListener("submit", saveMeasurement);
  document.querySelector("#attendanceForm")?.addEventListener("submit", saveAttendance);
  document.querySelector("#memberSearch")?.addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
    focusSearchInput("#memberSearch");
  });
  document.querySelector("#measurementSearch")?.addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
    focusSearchInput("#measurementSearch");
  });
  document.querySelector("#attendanceSearch")?.addEventListener("input", (event) => {
    state.query = event.target.value;
    state.attendanceMemberId = "";
    filterAttendanceSearch(event.target.value);
  });
  document.querySelector("#measurementMemberSearch")?.addEventListener("input", handleMeasurementLookup);
}

function focusSearchInput(selector) {
  const input = document.querySelector(selector);
  if (!input) return;
  input.focus();
  const end = input.value.length;
  if (typeof input.setSelectionRange === "function") {
    input.setSelectionRange(end, end);
  }
  window.setTimeout(() => {
    const restored = document.querySelector(selector);
    if (!restored) return;
    restored.focus();
    const restoredEnd = restored.value.length;
    if (typeof restored.setSelectionRange === "function") {
      restored.setSelectionRange(restoredEnd, restoredEnd);
    }
  }, 0);
}

function filterAttendanceSearch(value) {
  const query = value.trim().toLowerCase();
  let visible = 0;
  document.querySelectorAll(".attendance-result").forEach((button) => {
    const matched = !query || button.innerText.toLowerCase().includes(query);
    button.hidden = !matched;
    if (matched) visible += 1;
  });
  let emptyNode = document.querySelector("#attendanceNoMatch");
  if (!emptyNode) {
    emptyNode = document.createElement("div");
    emptyNode.id = "attendanceNoMatch";
    emptyNode.className = "lookup-empty";
    emptyNode.textContent = "No matching members found.";
    document.querySelector(".attendance-results")?.appendChild(emptyNode);
  }
  emptyNode.hidden = !!visible || !query;
}

function updateLoginButton() {
  const username = document.querySelector("#username")?.value.trim();
  const password = document.querySelector("#password")?.value;
  document.querySelector("#submitLogin").disabled = !username || !password;
}

function togglePassword() {
  const input = document.querySelector("#password");
  const button = document.querySelector(".toggle-password");
  const visible = input.type === "text";
  input.type = visible ? "password" : "text";
  button.innerHTML = visible ? icons.eye : icons.eyeOff;
  button.setAttribute("aria-label", visible ? "Show password" : "Hide password");
}

async function handleLogin(event) {
  event.preventDefault();
  const username = document.querySelector("#username").value.trim().toLowerCase();
  const password = document.querySelector("#password").value;
  const submit = document.querySelector("#submitLogin");
  submit.textContent = "Signing in...";
  submit.disabled = true;
  try {
    const data = await api("/api/login", { method: "POST", body: JSON.stringify({ username, password }) });
    sessionStorage.setItem("healthrank-user-id", data.user.id);
    state.route = data.user.role === "member" ? "history" : "dashboard";
    state.error = "";
    applyData(data);
  } catch (error) {
    state.error = error.message;
  }
  render();
}

async function changeRoute(event) {
  const route = event.currentTarget.dataset.route;
  if (!route) return;
  state.route = route;
  state.query = "";
  if (route === "audit" && state.user.role === "admin") {
    try {
      await loadAuditEntries();
    } catch (error) {
      showToast(error.message);
    }
  }
  render();
}

async function handleAction(event) {
  const action = event.currentTarget.dataset.action;
  try {
    if (action === "logout") {
      sessionStorage.removeItem("healthrank-user-id");
      state.user = null;
      state.modal = null;
      render();
      return;
    }
    if (action === "refresh") return refreshData("Dashboard refreshed");
    if (action === "re-score-all") return refreshData("Goal scores recalculated.");
    if (action === "start-session") return postAndApply("/api/session/start", "Weekly Measurement Session is now open.");
    if (action === "close-session") return postAndApply("/api/session/close", "Weekly Measurement Session has been closed.");
    if (action === "reopen-session") return postAndApply("/api/session/reopen", "Weekly Measurement Session has been reopened.");
    if (action === "clear-audit-filters") {
      state.auditFilters = { from: "", to: "", type: "" };
      await loadAuditEntries();
      render();
      showToast("Audit filters cleared.");
      return;
    }
    if (action === "delete-user") {
      const targetUserId = event.currentTarget.dataset.userId;
      if (targetUserId === state.user.id) return showToast("You cannot delete your own user account.");
      const data = await api("/api/users/delete", {
        method: "POST",
        body: JSON.stringify({ userId: state.user.id, targetUserId }),
      });
      applyData(data);
      render();
      showToast("User removed.");
      return;
    }
    if (action === "select-attendance-member") {
      state.attendanceMemberId = event.currentTarget.dataset.memberId;
      render();
      return;
    }
    if (action === "select-measurement-member") {
      fillMeasurementMember(event.currentTarget.dataset);
      return;
    }
    if (action === "set-measurement-goal") {
      const input = document.querySelector("#measurementGoal");
      if (input) input.value = event.currentTarget.dataset.goal || "";
      return;
    }
    if (action === "set-member-goal") {
      const input = document.querySelector("#memberGoal");
      if (input) input.value = event.currentTarget.dataset.goal || "";
      return;
    }
    if (action === "view-profile") {
      state.profileMemberId = event.currentTarget.dataset.memberId;
      state.route = "profile";
      state.modal = null;
      render();
      return;
    }
    if (action === "add-measurement") {
      if (!canAddMeasurements()) return showToast("Measurement session has not been opened by the Admin for this week.");
      state.modal = event.currentTarget.dataset.memberId || "open";
      render();
      return;
    }
    if (action === "edit-measurement") {
      if (state.user.role !== "admin") return showToast("Only Admin can edit measurements.");
      if (state.session.status !== "ACTIVE") return showToast("Reopen the session before editing measurements.");
      state.modal = `edit:${event.currentTarget.dataset.measurementId}`;
      render();
      return;
    }
    if (action === "close-modal") {
      state.modal = null;
      render();
      return;
    }
    showToast("Demo action completed");
  } catch (error) {
    showToast(error.message);
  }
}

async function applyAuditFilters(event) {
  event.preventDefault();
  state.auditFilters = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    await loadAuditEntries();
    render();
    showToast("Audit history filtered.");
  } catch (error) {
    showToast(error.message);
  }
}

async function loadAuditEntries() {
  const params = new URLSearchParams({
    userId: state.user.id,
    limit: "20",
  });
  if (state.auditFilters.from) params.set("from", state.auditFilters.from);
  if (state.auditFilters.to) params.set("to", state.auditFilters.to);
  if (state.auditFilters.type) params.set("type", state.auditFilters.type);
  const data = await api(`/api/audit?${params.toString()}`);
  state.auditEntries = data.entries || [];
  state.auditTypes = data.types || [];
}

async function postAndApply(path, message) {
  const data = await api(path, { method: "POST", body: JSON.stringify({ userId: state.user.id }) });
  applyData(data);
  render();
  showToast(message);
}

async function refreshData(message = "") {
  const data = await api(`/api/bootstrap?userId=${encodeURIComponent(state.user.id)}`);
  applyData(data);
  render();
  if (message) showToast(message);
}

async function saveMeasurement(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const measurement = Object.fromEntries(new FormData(form).entries());
  try {
    const data = await api("/api/measurements", {
      method: "POST",
      body: JSON.stringify({ userId: state.user.id, measurement }),
    });
    applyData(data);
    state.modal = null;
    state.route = "measurements";
    render();
    showToast("Measurement saved to SQLite.");
  } catch (error) {
    showToast(error.message);
  }
}

async function saveMember(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const member = Object.fromEntries(new FormData(form).entries());
  try {
    const data = await api("/api/members", {
      method: "POST",
      body: JSON.stringify({ userId: state.user.id, member }),
    });
    applyData(data);
    form.reset();
    render();
    showToast("Member saved. Existing mobile numbers are reused.");
  } catch (error) {
    showToast(error.message);
  }
}

async function saveUser(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const account = Object.fromEntries(new FormData(form).entries());
  try {
    const data = await api("/api/users", {
      method: "POST",
      body: JSON.stringify({ userId: state.user.id, account }),
    });
    applyData(data);
    render();
    showToast("User created.");
  } catch (error) {
    showToast(error.message);
  }
}

async function saveAttendance(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const attendance = Object.fromEntries(new FormData(form).entries());
  attendance.confirmUpdate = attendance.confirmUpdate === "1";
  try {
    const data = await api("/api/attendance", {
      method: "POST",
      body: JSON.stringify({ userId: state.user.id, attendance }),
    });
    applyData(data);
    state.attendanceMemberId = attendance.memberId;
    render();
    showToast("Attendance saved to SQLite.");
  } catch (error) {
    showToast(error.message);
  }
}

function canAddMeasurements() {
  return ["admin", "supervisor"].includes(state.user.role) && state.session.status === "ACTIVE";
}

function supervisorName(id) {
  return state.users.find((user) => user.id === id)?.name || id || "-";
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1600);
}

function formatDateOnly(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

bootstrap();

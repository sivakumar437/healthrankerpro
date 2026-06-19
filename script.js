const app = document.querySelector("#app");

const state = {
  loading: true,
  error: "",
  user: null,
  route: "dashboard",
  query: "",
  memberEntryOpen: false,
  profileEditOpen: false,
  showHiddenMembers: false,
  rankingsMarathonOnly: false,
  attendanceMemberId: "",
  attendanceEntryDate: "",
  attendanceEntryType: "Present",
  attendanceHiddenByDate: {},
  attendanceViewDate: "",
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
  paymentEntries: [],
  paymentCardTypes: [],
  paymentTotal: 0,
  paymentFilters: { from: "", to: "", cardType: "", memberId: "", showSum: false },
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
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14h6"/><path d="M9 18h6"/><path d="M9 10h1"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v2"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-6"/><path d="M18 12h4v6h-4a3 3 0 0 1 0-6Z"/><path d="M18 15h.01"/></svg>',
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
  ["today", "Today View", icons.clock],
  ["measurements", "Measurements", icons.clipboard],
  ["payments", "Payments", icons.wallet],
  ["rankings", "Rankings", icons.trophy],
  ["import", "Import", icons.upload],
  ["compliance", "Compliance", icons.check],
  ["history", "History", icons.history],
  ["audit", "Audit", icons.shield],
  ["export", "Export", icons.download],
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
  if (state.user && state.user.role === "member" && !["dashboard", "measurements", "history"].includes(state.route)) {
    state.route = "history";
  }
  if (state.user && state.user.role !== "admin" && state.route === "members") {
    state.route = "dashboard";
  }
  if (state.user && !["admin", "supervisor"].includes(state.user.role) && state.route === "attendance") {
    state.route = "dashboard";
  }
  if (state.user && !["admin", "supervisor"].includes(state.user.role) && state.route === "today") {
    state.route = "dashboard";
  }
  if (state.user && state.user.role !== "admin" && state.route === "audit") {
    state.route = "dashboard";
  }
  if (state.user && state.user.role !== "admin" && state.route === "export") {
    state.route = "dashboard";
  }
  if (state.user && state.user.role !== "admin" && state.route === "compliance") {
    state.route = "dashboard";
  }
  if (state.user && state.user.role !== "admin" && state.user.role !== "member" && state.route === "history") {
    state.route = "dashboard";
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
    ? state.user.role === "admin"
      ? ["dashboard", "members", "today", "attendance", "payments", "export"]
      : state.user.role === "member"
        ? ["dashboard", "measurements", "history"]
        : ["dashboard", "today", "attendance", "measurements"]
    : ["dashboard", "members", "today", "attendance", "measurements", "payments", "rankings", "compliance", "history", "audit", "export", "users"];
  return visibleRoutes
    .map((routeId) => routes.find(([id]) => id === routeId))
    .filter(Boolean)
    .filter(([id]) => {
      if (state.user.role === "member") return ["dashboard", "measurements", "history"].includes(id);
      if (id === "members" && state.user.role !== "admin") return false;
      if (id === "attendance" && !["admin", "supervisor"].includes(state.user.role)) return false;
      if (id === "today" && !["admin", "supervisor"].includes(state.user.role)) return false;
      if (id === "audit" && state.user.role !== "admin") return false;
      if (id === "export" && state.user.role !== "admin") return false;
      if (id === "compliance" && state.user.role !== "admin") return false;
      if (id === "history" && state.user.role !== "admin" && state.user.role !== "member") return false;
      if (id === "payments" && state.user.role !== "admin") return false;
      if (id === "users" && state.user.role !== "admin") return false;
      return true;
    })
    .map(([id, label, icon]) => {
      const disabled =
        (id === "import" && !["admin", "supervisor"].includes(state.user.role)) ||
        (id === "attendance" && !["admin", "supervisor"].includes(state.user.role)) ||
        (id === "today" && !["admin", "supervisor"].includes(state.user.role));
      return `<button class="${state.route === id ? "active" : ""}" data-route="${id}" ${disabled ? "disabled" : ""}>${icon}<span>${label}</span></button>`;
    })
    .join("");
}

function pageSubtitle(route) {
  const subtitles = {
    dashboard: "Member health progress overview",
    members: "Search, review, and manage nutrition club members",
    attendance: "Fast daily entry with card progress and payments",
    today: "Date-wise attendance, card counts, and payments",
    measurements: "Review weekly measurement entries and corrections",
    payments: "Admin-only payment history and totals",
    rankings: "Week-over-week transformation scores",
    import: "Add weekly measurements from a spreadsheet",
    compliance: "Weekly measurement tracking and pending follow-ups",
    history: "Recent measurement activity and score movement",
    audit: "Admin-only transaction history and filters",
    export: "Download a complete Excel backup of all database tables",
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
    today: renderTodayView,
    measurements: renderMeasurements,
    payments: renderPaymentsPage,
    rankings: renderRankings,
    import: renderImport,
    compliance: renderCompliance,
    history: renderHistory,
    audit: renderAuditHistoryPage,
    export: renderExportPage,
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
            <p>${memberContact(entry.member)}</p>
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
  if (state.user.role !== "admin") return restricted("Only administrators can view the member directory.");
  const filtered = state.members.filter((m) => {
    const active = Number(m.active ?? 1) === 1;
    const query = state.query.toLowerCase();
    const matchesQuery = [m.name, m.phone, m.member_code, String(m.id)].some((value) => String(value || "").toLowerCase().includes(query));
    return matchesQuery && (state.showHiddenMembers || active);
  });
  const hiddenCount = state.members.filter((m) => Number(m.active ?? 1) === 0).length;
  return `
    ${["admin", "supervisor"].includes(state.user.role) ? renderSingleMemberEntry() : ""}
    <div class="toolbar">
      <input class="search-input" id="memberSearch" value="${escapeHtml(state.query)}" placeholder="Search by name, phone, or Member ID" />
      <label class="toggle-field member-toggle">
        <span class="label">Show Hidden Members</span>
        <input id="showHiddenMembers" type="checkbox" ${state.showHiddenMembers ? "checked" : ""} />
        <span class="toggle-switch" aria-hidden="true"></span>
      </label>
      <span class="toolbar-note">${filtered.length} visible${hiddenCount ? `, ${hiddenCount} hidden` : ""}</span>
    </div>
    <div class="member-list">${filtered.map(memberCard).join("") || empty("No members match your search.")}</div>
  `;
}

function renderSingleMemberEntry() {
  const open = state.memberEntryOpen;
  return `
    <article class="card single-entry-card ${open ? "open" : "collapsed"}">
      <button class="section-heading collapsible-heading" type="button" data-action="toggle-member-entry" aria-expanded="${open}">
        <div><h2>Single Member Entry</h2><p>Add one member at a time. Bulk import remains available on Import.</p></div>
        <span class="collapse-indicator">${open ? "Hide" : "Add Member"}</span>
      </button>
      ${open ? `<form id="memberForm" class="form-grid">
        <label><span class="label">First Name</span><input name="firstName" placeholder="First name" required /></label>
        <label><span class="label">Last Name</span><input name="lastName" placeholder="Last name" /></label>
        <label><span class="label">Mobile Number</span><input name="phone" type="tel" placeholder="Phone number" required /></label>
        <label><span class="label">Gender</span><select name="gender"><option value="">Select...</option><option>Male</option><option>Female</option></select></label>
        <label><span class="label">Age</span><input name="age" id="memberAge" type="number" min="0" placeholder="Age" /></label>
        <label><span class="label">Date of Birth</span><input name="dob" id="memberDob" type="date" /></label>
        <label><span class="label">Height (cm)</span><input name="height" type="number" step="0.1" placeholder="Height" /></label>
        <label><span class="label">Nutrition Club</span><input name="nutritionClub" value="Main Nutrition Club" /></label>
        <label><span class="label">Membership/Card Type</span>${cardTypeSelect()}</label>
        <label><span class="label">Marathon Member</span><select name="marathon"><option value="0">No</option><option value="1">Yes</option></select></label>
        <label class="wide"><span class="label">Primary Goal</span><input name="goal" id="memberGoal" placeholder="Health & Fitness" /></label>
        <div class="wide goal-chip-row">
          ${goalOptions().map((goal) => `<button type="button" data-action="set-member-goal" data-goal="${escapeHtml(goal)}">${escapeHtml(goal)}</button>`).join("")}
        </div>
        <label class="wide"><span class="label">Notes</span><textarea name="notes" rows="2" placeholder="Optional notes"></textarea></label>
        <div class="wide modal-actions"><button class="btn btn-primary" type="submit">${icons.plus} Save Member</button></div>
      </form>` : ""}
    </article>
  `;
}

function renderAttendance() {
  if (!["admin", "supervisor"].includes(state.user.role)) return restricted("Only Admin and Supervisor users can mark attendance.");
  const today = new Date().toISOString().slice(0, 10);
  if (!state.attendanceViewDate) state.attendanceViewDate = today;
  if (!state.attendanceEntryDate) state.attendanceEntryDate = today;
  if (!state.attendanceEntryType) state.attendanceEntryType = "Present";
  const filtered = attendanceSearchResults();
  const selected = selectedAttendanceMember(filtered);
  const attendancePlaceholder = state.user.role === "admin" ? "Search by name, mobile, or member ID" : "Search by name or member ID";
  return `
    <div class="attendance-layout">
      <section class="attendance-entry card">
        <div class="attendance-search">
          <label class="field wide">
            <span class="label">Search Member</span>
            <input class="search-input" id="attendanceSearch" value="${escapeHtml(state.query)}" placeholder="${attendancePlaceholder}" />
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
        <label><span class="label">Attendance Date</span><input id="attendanceEntryDate" type="date" value="${escapeHtml(state.attendanceEntryDate)}" /></label>
        <label><span class="label">Attendance Type</span>${attendanceTypeSelect(state.attendanceEntryType, "attendanceEntryType")}</label>
      </div>
    </article>
  `;
}

function renderTodayView() {
  if (!["admin", "supervisor"].includes(state.user.role)) return restricted("Only Admin and Supervisor users can view daily attendance.");
  if (!state.attendanceViewDate) state.attendanceViewDate = new Date().toISOString().slice(0, 10);
  return `
    <section class="today-view-page">
      ${renderDailyAttendanceView({ fullPage: true })}
    </section>
  `;
}

function renderDailyAttendanceView(options = {}) {
  const selectedDate = state.attendanceViewDate || new Date().toISOString().slice(0, 10);
  const rows = dailyAttendanceRows(selectedDate);
  const totalPayments = rows.reduce((sum, row) => sum + row.paymentTotal, 0);
  return `
    <div class="table-card daily-attendance-card ${options.fullPage ? "daily-attendance-card-full" : ""}">
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
      <table>
        <thead><tr><th>Time</th><th>Member</th><th>Card</th><th>Card Count</th><th>Payment</th></tr></thead>
        <tbody>${rows.map(dailyAttendanceRow).join("") || `<tr><td colspan="5">${empty("No attendance for selected date.")}</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function dailyAttendanceRows(date) {
  const baseRows = state.attendance
    .filter((row) => row.attendance_date === date)
    .map((attendance) => {
      const card = state.cards.find((item) => Number(item.id) === Number(attendance.card_id));
      const payments = state.payments.filter((payment) => {
        const sameDate = payment.payment_date === date;
        const sameMember = Number(payment.member_id) === Number(attendance.member_id);
        const linkedAttendance = payment.attendance_id && Number(payment.attendance_id) === Number(attendance.id);
        return sameDate && sameMember && (linkedAttendance || !payment.attendance_id || Number(payment.card_id || 0) === Number(attendance.card_id || 0));
      });
      const paymentTotal = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const paymentModes = [...new Set(payments.map((payment) => payment.payment_mode).filter(Boolean))].join(", ");
      const paymentCards = [...new Set(payments.map((payment) => payment.card_type || payment.card_number).filter(Boolean))].join(", ");
      return {
        attendance,
        card,
        payments,
        paymentTotal,
        paymentModes,
        paymentCards,
        countValue: Number(attendance.neutral_day ? 0 : attendance.count_value || 0),
      };
    })
    .sort((a, b) => attendanceTimeSortValue(a.attendance) - attendanceTimeSortValue(b.attendance));
  const usedByCard = new Map();
  return baseRows.flatMap((row) => splitDailyAttendanceRow(row)).map((row) => {
    if (!row.card || !row.attendance.card_id || !row.countValue) return { ...row, cardCount: null };
    const cardId = Number(row.attendance.card_id);
    if (!usedByCard.has(cardId)) usedByCard.set(cardId, cardUsedBeforeDate(cardId, date));
    const used = usedByCard.get(cardId) + row.countValue;
    usedByCard.set(cardId, used);
    const target = Number(row.card.target_visits || 0);
    return {
      ...row,
      cardCount: {
        used,
        target,
        remaining: Math.max(target - used, 0),
      },
    };
  });
}

function splitDailyAttendanceRow(row) {
  const guestName = guestNameFromReason(row.attendance.reason);
  if (!guestName) return [row];
  const totalCount = Math.max(Number(row.countValue || 0), 2);
  const memberCount = 1;
  const memberReason = reasonWithoutGuest(row.attendance.reason);
  return [
    {
      ...row,
      countValue: memberCount,
      attendance: { ...row.attendance, reason: memberReason },
    },
    {
      ...row,
      countValue: totalCount - memberCount,
      paymentTotal: 0,
      paymentModes: "",
      paymentCards: "",
      payments: [],
      displayName: guestName,
      displayDetails: [`Guest of ${row.attendance.member_name}`, memberReason].filter(Boolean),
      attendance: { ...row.attendance, reason: "" },
    },
  ];
}

function guestNameFromReason(reason = "") {
  const match = String(reason || "").match(/Guest:\s*([^|]+)/i);
  return match ? match[1].trim() : "";
}

function reasonWithoutGuest(reason = "") {
  return String(reason || "")
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part && !/^Guest:/i.test(part))
    .join(" | ");
}

function cardUsedBeforeDate(cardId, date) {
  return state.attendance
    .filter((row) => Number(row.card_id) === Number(cardId))
    .filter((row) => String(row.attendance_date) < String(date))
    .reduce((sum, row) => sum + effectiveAttendanceCount(row), 0);
}

function effectiveAttendanceCount(row) {
  const count = Number(row.neutral_day ? 0 : row.count_value || 0);
  return guestNameFromReason(row.reason) ? Math.max(count, 2) : count;
}

function attendanceTimeSortValue(attendance) {
  const value = Date.parse(normalizeMarkedOn(attendance.updated_on || attendance.marked_on));
  return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
}

function normalizeMarkedOn(markedOn = "") {
  const raw = String(markedOn || "").trim();
  if (!raw) return "";
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) return raw;
  const match = raw.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!match) return "";
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const [, day, month, year, hour, minute] = match;
  const date = new Date(Number(year), months[month], Number(day), Number(hour), Number(minute));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function attendanceTimeLabel(attendance) {
  const normalized = normalizeMarkedOn(attendance.updated_on || attendance.marked_on);
  if (!normalized) return "-";
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dailyAttendanceRow(row) {
  const attendance = row.attendance;
  const cardLabel = row.card
    ? `${escapeHtml(row.card.card_type)}<small>${escapeHtml(row.card.card_number)}</small>`
    : attendance.neutral_day
      ? "Neutral day"
      : "No card";
  const paymentLabel = row.paymentTotal > 0
    ? `<strong>${formatCurrency(row.paymentTotal)}</strong><small>${escapeHtml(row.paymentModes || row.paymentCards || "Payment recorded")}</small>`
    : "-";
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
      <td><strong>${attendanceTimeLabel(attendance)}</strong></td>
      <td><strong>${escapeHtml(row.displayName || attendance.member_name)}</strong>${detailLines.map((line) => `<small>${escapeHtml(line)}</small>`).join("")}</td>
      <td>${cardLabel}</td>
      <td>${cardCountLabel}</td>
      <td>${paymentLabel}</td>
    </tr>
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
      ${card ? `<div class="card-progress"><strong>${card.remaining_visits} left</strong><span>${card.completed_visits} / ${card.target_visits} visits used</span><div class="progress-track"><i style="width:${progress}%"></i></div></div>` : `<span class="badge badge-red">Create card required</span>`}
      <form id="attendanceForm" class="attendance-form inline-attendance-form">
        <input type="hidden" name="memberId" value="${member.id}" />
        <input type="hidden" name="attendanceDate" id="attendanceFormDate" value="${escapeHtml(state.attendanceEntryDate)}" />
        <input type="hidden" name="attendanceType" id="attendanceFormType" value="${escapeHtml(state.attendanceEntryType)}" />
        ${hasExistingAttendance ? `
          <div class="form-grid">
            <label><span class="label">Count</span><select name="countValue"><option value="1">Count 1 visit</option><option value="2">Count 2 visits</option></select></label>
            <label><span class="label">Admin Duplicate Update</span><select name="confirmUpdate" id="attendanceConfirmUpdate"><option value="">No</option><option value="1">Yes, add guest entry</option></select></label>
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

function renderMeasurements() {
  if (state.user.role === "member") return renderMemberMeasurements();
  const canAddMeasurement = canAddMeasurements();
  const measurementPlaceholder = state.user.role === "admin" ? "Search measurements by member name, mobile, or ID" : "Search measurements by member name or ID";
  const measurementRows = state.measurements.filter((m) => {
    const query = state.query.toLowerCase();
    const member = state.members.find((item) => Number(item.id) === Number(m.member_id));
    const searchable = state.user.role === "admin" ? [m.member_name, String(m.member_id), m.week_number, member?.phone] : [m.member_name, String(m.member_id), m.week_number];
    return !query || searchable.some((value) => String(value || "").toLowerCase().includes(query));
  });
  return `
    ${renderSessionControl()}
    <div class="toolbar">
      <input class="search-input" id="measurementSearch" value="${escapeHtml(state.query)}" placeholder="${measurementPlaceholder}" />
      ${canAddMeasurement ? `<button class="btn btn-primary" data-action="add-measurement">${icons.plus} Add Measurement</button>` : `<span class="session-message">Existing measurements are read-only until Admin opens the session.</span>`}
    </div>
    <p class="toolbar-note">${measurementRows.length} visible entries from full measurement history</p>
    <div class="table-card">
      <table>
        <thead><tr><th>Member</th><th>Week</th><th>Weight</th><th>Fat</th><th>Muscle</th><th>BMI</th><th>BMA</th><th>Supervisor</th><th>Date</th><th></th></tr></thead>
        <tbody>${measurementRows.map(measurementRow).join("") || `<tr><td colspan="10">${empty("No measurements match your search.")}</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function renderMemberMeasurements() {
  state.profileMemberId = state.user.member_id || state.members[0]?.id || "";
  return renderMemberProfile();
}

function renderRankings() {
  const rankingMembers = rankedMembersForView();
  const loss = goalLeaderboard("Weight Loss", rankingMembers);
  const gain = goalLeaderboard("Weight Gain", rankingMembers);
  const overall = rankingMembers
    .map((member) => ({ member, progress: goalProgress(member) }))
    .sort((a, b) => b.progress.score - a.progress.score);
  const marathonCount = state.members.filter((member) => Number(member.marathon || 0) === 1 && Number(member.active ?? 1) === 1).length;
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
        ${rankingCard("Fastest Toward Ideal", "target", topBy((entry) => idealPace(entry.member), rankingMembers), "kg/week toward ideal", (entry) => "On Track", (entry) => idealPace(entry.member).toFixed(1))}
      </div>
    </div>
  `;
}

function rankedMembersForView() {
  if (!state.rankingsMarathonOnly) return state.members;
  return state.members.filter((member) => Number(member.marathon || 0) === 1 && Number(member.active ?? 1) === 1);
}

function renderScoringFormula() {
  const items = [
    ["Muscle Gain", "40 x kg gained", "Compared to previous measurement", 40],
    ["Fat Loss", "20 x fat % reduced", "Compared to previous measurement", 20],
    ["Visceral Fat Loss", "20 x VF reduced", "Single digit gives 10 if no weekly loss", 20],
    ["BMI Reduced", "10 x BMI reduced", "Compared to previous measurement", 10],
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
      <p class="formula-priority">Score = 40 x muscle gain + 20 x fat % reduced + 20 x visceral fat reduced, or 10 default for single-digit VF if no VF loss + 10 x BMI reduced.</p>
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
  const lookupText = state.user.role === "admin" ? "Search an existing member by name or phone." : "Search an existing member by name or member ID.";
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
        <p class="footnote">${lookupText} If no match exists, save this entry as a new member.</p>
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

function renderExportPage() {
  if (state.user.role !== "admin") return restricted("Only administrators can export backups.");
  const sheets = [
    ["users", state.users.length],
    ["members", state.members.length],
    ["sessions", state.session ? 1 : 0],
    ["measurements", state.measurements.length],
    ["membership_cards", state.cards.length],
    ["attendance", state.attendance.length],
    ["payments", state.payments.length],
    ["audit", state.audit.length],
    ["notifications", state.notifications.length],
  ];
  return `
    <div class="export-page">
      <article class="card export-card">
        <div class="section-heading">
          <div><h2>Excel Backup Export</h2><p>Download all HealthRank Pro data into one workbook, with each database table in its own sheet.</p></div>
          ${icons.download}
        </div>
        <div class="export-actions">
          <button class="btn btn-primary" data-action="download-export">${icons.download} Download Excel Backup</button>
          <span>Generated from the live database at download time.</span>
        </div>
      </article>
      <div class="table-card export-table">
        <table>
          <thead><tr><th>Sheet</th><th>Current Rows</th><th>Data Included</th></tr></thead>
          <tbody>
            ${sheets.map(([name, count]) => `
              <tr>
                <td><strong>${escapeHtml(name)}</strong></td>
                <td>${count}</td>
                <td>${exportSheetDescription(name)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function exportSheetDescription(name) {
  const descriptions = {
    users: "Login users, roles, and linked member IDs",
    members: "Member profile, club, goal, contact, and active status",
    sessions: "Weekly measurement session status and audit fields",
    measurements: "All measurement entries and weekly progress data",
    membership_cards: "Purchased cards, visit counts, remaining visits, and status",
    attendance: "Daily attendance entries and card linkage",
    payments: "Payment history, mode, card type, and amounts",
    audit: "Recorded admin and system actions",
    notifications: "Session notifications sent to supervisors",
  };
  return descriptions[name] || "Table data";
}

function renderPaymentsPage() {
  if (state.user.role !== "admin") return restricted("Only administrators can view payments.");
  const selectedMember = state.members.find((member) => String(member.id) === String(state.paymentFilters.memberId));
  const entries = state.paymentEntries;
  const pending = pendingPaymentNotifications();
  const cardTypes = paymentCardTypeOptions();
  return `
    <div class="payments-page">
      <article class="card audit-filter-card">
        <div class="section-heading">
          <div><h2>Payments</h2><p>Latest 20 payments are shown by default. Filter by date, card type, or member.</p></div>
          ${icons.wallet}
        </div>
        ${selectedMember ? `
          <div class="selected-filter">
            <span>Showing payments for <strong>${escapeHtml(selectedMember.name)}</strong></span>
            <button class="btn btn-outline mini" data-action="clear-payment-member" type="button">Show All Members</button>
          </div>
        ` : ""}
        <form id="paymentFilterForm" class="form-grid">
          <label><span class="label">From Date</span><input name="from" type="date" value="${escapeHtml(state.paymentFilters.from)}" /></label>
          <label><span class="label">To Date</span><input name="to" type="date" value="${escapeHtml(state.paymentFilters.to)}" /></label>
          <label><span class="label">Card Type</span>
            <select name="cardType">
              <option value="">All card types</option>
              ${cardTypes.map((type) => `<option value="${escapeHtml(type)}" ${state.paymentFilters.cardType === type ? "selected" : ""}>${escapeHtml(type)}</option>`).join("")}
            </select>
          </label>
          <div class="payment-filter-actions">
            <label class="toggle-field">
              <span class="label">Show Sum</span>
              <input id="paymentShowSum" name="showSum" type="checkbox" ${state.paymentFilters.showSum ? "checked" : ""} />
              <span class="toggle-switch" aria-hidden="true"></span>
            </label>
            <button class="btn btn-outline" id="paymentClearButton" type="button">Clear</button>
            <button class="btn btn-primary" id="paymentApplyButton" type="button">${icons.check} Apply Filters</button>
          </div>
        </form>
      </article>
      ${state.paymentFilters.showSum ? `
        <div class="dashboard-metrics grid payment-total-grid">
          ${dashboardMetric("Total Payments", formatCurrency(state.paymentTotal), `${entries.length} result${entries.length === 1 ? "" : "s"}`, icons.wallet, "bg-emerald")}
        </div>
      ` : ""}
      <div class="table-card payments-table">
        <table>
          <thead><tr><th>Date</th><th>Member</th><th>Card Type</th><th>Payment Type</th><th>Amount</th><th>Recorded By</th><th>Created</th><th>Notes</th></tr></thead>
          <tbody>${entries.map(paymentRow).join("") || `<tr><td colspan="8">${empty("No payments match the selected filters.")}</td></tr>`}</tbody>
          ${state.paymentFilters.showSum && entries.length ? `<tfoot><tr><td colspan="4"><strong>Total</strong></td><td><strong>${formatCurrency(state.paymentTotal)}</strong></td><td colspan="3"></td></tr></tfoot>` : ""}
        </table>
      </div>
      <div class="table-card pending-payments-table">
        <div class="dashboard-table-heading">
          <h2 class="dashboard-section-title">Pending Payment Notifications</h2>
          <span class="toolbar-note">${pending.length} pending</span>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Time</th><th>Member</th><th>Attendance</th><th>Count</th><th>Marked By</th><th>Action Needed</th></tr></thead>
          <tbody>${pending.map(pendingPaymentRow).join("") || `<tr><td colspan="7">${empty("No pending payment notifications.")}</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;
}

function paymentRow(row) {
  return `
    <tr>
      <td>${escapeHtml(row.payment_date)}</td>
      <td><button class="table-member-link" data-action="select-payment-member" data-member-id="${row.member_id}">${escapeHtml(row.member_name)}</button></td>
      <td>${escapeHtml(row.card_type || "-")}</td>
      <td><span class="mini-badge">${escapeHtml(row.payment_mode)}</span></td>
      <td><strong>${formatCurrency(row.amount)}</strong></td>
      <td>${escapeHtml(row.created_by)}</td>
      <td>${escapeHtml(row.created_date)}</td>
      <td>${escapeHtml(row.notes || "-")}</td>
    </tr>
  `;
}

function paymentCardTypeOptions() {
  const combined = [...state.paymentCardTypes, ...state.cards.map((card) => card.card_type)].filter(Boolean);
  return [...new Set(combined)].sort();
}

function pendingPaymentNotifications() {
  return state.attendance
    .filter((row) => !row.card_id && Number(row.neutral_day || 0) !== 1 && Number(row.count_value || 0) > 0)
    .filter((row) => !state.paymentFilters.memberId || String(row.member_id) === String(state.paymentFilters.memberId))
    .filter((row) => !state.paymentFilters.from || String(row.attendance_date) >= state.paymentFilters.from)
    .filter((row) => !state.paymentFilters.to || String(row.attendance_date) <= state.paymentFilters.to)
    .sort((a, b) => String(b.attendance_date).localeCompare(String(a.attendance_date)) || attendanceTimeSortValue(b) - attendanceTimeSortValue(a));
}

function pendingPaymentRow(row) {
  return `
    <tr>
      <td>${escapeHtml(row.attendance_date)}</td>
      <td>${attendanceTimeLabel(row)}</td>
      <td><button class="table-member-link" data-action="select-payment-member" data-member-id="${row.member_id}">${escapeHtml(row.member_name)}</button></td>
      <td>${escapeHtml(row.attendance_type)}</td>
      <td>${escapeHtml(row.count_value || 1)}</td>
      <td>${escapeHtml(row.marked_by || "-")}</td>
      <td><span class="mini-badge">Create card payment</span>${row.reason ? `<small>${escapeHtml(row.reason)}</small>` : ""}</td>
    </tr>
  `;
}

function renderMemberProfile() {
  const member = state.members.find((m) => Number(m.id) === Number(state.profileMemberId)) || state.members[0];
  if (!member) return empty("No member selected.");
  if (state.user.role !== "admin" && Number(state.user.member_id) !== Number(member.id)) {
    return restricted("Only administrators can view member profiles.");
  }
  const card = activeCardFor(member.id);
  const memberMeasurements = measurementsFor(member.id);
  const latest = memberMeasurements[0];
  const attendance = state.attendance.filter((row) => Number(row.member_id) === Number(member.id)).slice(0, 8);
  const payments = state.payments.filter((row) => Number(row.member_id) === Number(member.id)).slice(0, 8);
  const canAddCardPayment = state.user.role === "admin";
  const canAddProfileMeasurement = state.user.role === "admin";
  const memberActive = Number(member.active ?? 1) === 1;
  return `
    <div class="profile-page">
      <article class="card profile-summary">
        <div class="section-heading">
          <div><h2>${escapeHtml(member.name)}</h2><p>${memberIdentity(member)} - ${escapeHtml(member.nutrition_club || "Main Nutrition Club")}</p></div>
          <div class="profile-actions">
            ${goalBadge(member.goal)}
            ${Number(member.marathon || 0) === 1 ? `<span class="badge badge-amber">${icons.trophy} Marathon</span>` : ""}
            ${state.user.role === "admin" ? `<button class="btn btn-outline mini" data-action="toggle-profile-edit">${state.profileEditOpen ? "Close Edit" : "Edit Details"}</button><button class="btn btn-outline mini" data-action="set-member-status" data-member-id="${member.id}" data-active="${memberActive ? "0" : "1"}">${memberActive ? "Hide Member" : "Make Active"}</button>` : ""}
          </div>
        </div>
        <div class="stats-grid grid">
          ${stat("Current Card", card ? card.card_type : "None", card ? `${card.completed_visits}/${card.target_visits} visits` : "No active card", icons.clipboard, "bg-primary")}
          ${stat("Remaining Visits", card ? card.remaining_visits : "-", card ? card.status : "No active card", icons.clock, Number(card?.remaining_visits || 0) <= 3 ? "bg-amber" : "bg-emerald")}
          ${stat("Latest Weight", latest ? `${latest.weight} kg` : "-", latest ? latest.measurement_date : "No measurement", icons.activity, "bg-emerald")}
          ${stat("Body Fat", latest ? `${latest.body_fat}%` : "-", "latest", icons.target, "bg-violet")}
          ${stat("Height (cm)", latest ? latest.height : (member.height || "-"), latest ? latest.measurement_date : "profile", icons.check, "bg-blue")}
        </div>
      </article>
      ${state.user.role === "admin" && state.profileEditOpen ? renderMemberEditForm(member) : ""}
      ${canAddCardPayment ? renderCardPaymentForm(member, card) : ""}
      <div class="two-col grid">
        <article class="table-card profile-history-card">
          <div class="dashboard-table-heading"><h2 class="dashboard-section-title">Measurement History</h2>${canAddProfileMeasurement ? `<button class="btn btn-outline mini" data-action="add-measurement" data-member-id="${member.id}">Add Measurement</button>` : ""}</div>
          <table>
            <thead><tr><th>Date</th><th>Weight</th><th>Fat</th><th>Muscle</th><th>VF</th><th>BMI</th><th>BMA</th><th>BMR</th><th>Change</th></tr></thead>
            <tbody>${memberMeasurements.map((row, index) => measurementHistoryRow(row, memberMeasurements[index + 1])).join("") || `<tr><td colspan="9">${empty("No measurements yet.")}</td></tr>`}</tbody>
          </table>
        </article>
        <div class="profile-side">
          <article class="table-card profile-history-card">
            <div class="dashboard-table-heading"><h2 class="dashboard-section-title">Attendance History</h2></div>
            <table><thead><tr><th>Date</th><th>Type</th><th>Count</th></tr></thead><tbody>${attendance.map((row) => `<tr><td>${row.attendance_date}</td><td>${escapeHtml(row.attendance_type)}</td><td>${row.neutral_day ? "Neutral" : row.count_value}</td></tr>`).join("") || `<tr><td colspan="3">${empty("No attendance yet.")}</td></tr>`}</tbody></table>
          </article>
          <article class="table-card profile-history-card">
            <div class="dashboard-table-heading"><h2 class="dashboard-section-title">Payment History</h2></div>
            <table><thead><tr><th>Date</th><th>Card</th><th>Amount</th><th>Mode</th></tr></thead><tbody>${payments.map((row) => `<tr><td>${row.payment_date}</td><td>${escapeHtml(row.card_type || "-")}</td><td>${formatCurrency(row.amount)}</td><td>${escapeHtml(row.payment_mode)}</td></tr>`).join("") || `<tr><td colspan="4">${empty("No payments yet.")}</td></tr>`}</tbody></table>
          </article>
        </div>
      </div>
    </div>
  `;
}

function renderMemberEditForm(member) {
  const names = splitMemberName(member.name || "");
  const displayAge = memberAge(member);
  return `
    <article class="card member-edit-card">
      <div class="section-heading">
        <div><h2>Edit Member Details</h2><p>Admin can update this member's personal details, goal, card type, and club.</p></div>
        ${icons.user}
      </div>
      <form id="memberEditForm" class="form-grid">
        <input type="hidden" name="memberId" value="${member.id}" />
        <label><span class="label">Member ID</span><input name="memberCode" value="${escapeHtml(member.member_code || generateFallbackMemberCode(member.id))}" readonly /></label>
        <label><span class="label">First Name</span><input name="firstName" value="${escapeHtml(names.first)}" required /></label>
        <label><span class="label">Last Name</span><input name="lastName" value="${escapeHtml(names.last)}" /></label>
        <label><span class="label">Mobile Number</span><input name="phone" type="tel" value="${escapeHtml(member.phone || "")}" required /></label>
        <label><span class="label">Gender</span><input name="gender" value="${escapeHtml(member.gender || "")}" placeholder="Female / Male / Other" /></label>
        <label><span class="label">Age</span><input name="age" id="profileMemberAge" type="number" min="1" max="120" value="${escapeHtml(displayAge || "")}" /></label>
        <label><span class="label">Date of Birth</span><input name="dob" id="profileMemberDob" type="date" value="${escapeHtml(member.dob || "")}" /></label>
        <label><span class="label">Height (cm)</span><input name="height" type="number" min="80" max="250" step="0.1" value="${escapeHtml(member.height || "")}" /></label>
        <label><span class="label">Nutrition Club</span><input name="nutritionClub" value="${escapeHtml(member.nutrition_club || "Main Nutrition Club")}" /></label>
        <label><span class="label">Membership/Card Type</span>${cardTypeSelect(member.card_type || "Trial Card")}</label>
        <label><span class="label">Marathon Member</span><select name="marathon"><option value="0" ${Number(member.marathon || 0) === 1 ? "" : "selected"}>No</option><option value="1" ${Number(member.marathon || 0) === 1 ? "selected" : ""}>Yes</option></select></label>
        <label><span class="label">Primary Goal</span><input id="profileMemberGoal" name="goal" value="${escapeHtml(member.goal || "")}" placeholder="Weight Loss, Weight Gain..." /></label>
        <div class="wide goal-chip-row">
          ${goalOptions().map((goal) => `<button type="button" data-action="set-profile-member-goal" data-goal="${escapeHtml(goal)}">${escapeHtml(goal)}</button>`).join("")}
        </div>
        <label class="wide"><span class="label">Notes</span><textarea name="notes" rows="2">${escapeHtml(member.notes || "")}</textarea></label>
        <div class="wide modal-actions">
          <button class="btn btn-outline" type="button" data-action="toggle-profile-edit">Cancel</button>
          <button class="btn btn-primary" type="submit">${icons.check} Update Member</button>
        </div>
      </form>
    </article>
  `;
}

function renderCardPaymentForm(member, card) {
  const today = new Date().toISOString().slice(0, 10);
  return `
      <article class="card card-payment-card">
        <div class="section-heading">
        <div><h2>Add Card Payment</h2><p>Record payment and create a new card for this purchase.</p></div>
        ${icons.wallet}
      </div>
      <form id="cardPaymentForm" class="form-grid">
        <input type="hidden" name="memberId" value="${member.id}" />
        <label><span class="label">Payment Date</span><input name="paymentDate" type="date" value="${today}" required /></label>
        <label><span class="label">Card Type</span>${cardTypeSelect(card?.card_type || member.card_type || "Trial Card")}</label>
        <label><span class="label">Amount</span><input name="amount" type="number" min="1" step="1" placeholder="Enter amount" required /></label>
        <label><span class="label">Payment Type</span>${paymentModeSelect()}</label>
        <label class="wide"><span class="label">Notes</span><textarea name="notes" rows="2" placeholder="Optional receipt or card notes"></textarea></label>
        <div class="wide modal-actions">
          <button class="btn btn-primary" type="submit">${icons.wallet} Save Card Payment</button>
        </div>
      </form>
    </article>
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
  const profileMode = typeof modalValue === "string" && modalValue.startsWith("profile:");
  const profileMemberId = profileMode ? modalValue.slice(8) : "";
  const existing = editId ? state.measurements.find((m) => m.id === editId) : null;
  const selectedMember = existing?.member_id || profileMemberId || modalValue;
  const selected = state.members.find((m) => Number(m.id) === Number(selectedMember)) || null;
  const nameParts = selected ? splitMemberName(selected.name) : { first: "", last: "" };
  const value = (name, fallback = "") => existing?.[name] ?? fallback;
  const measurementDate = existing?.measurement_date || new Date().toISOString().slice(0, 10);
  const weekLabel = existing?.week_number || isoWeekLabel(measurementDate);
  const submitLabel = existing ? "Update Measurement" : profileMode ? "Save Measurement" : selected ? "Save Measurement" : "Create Member";
  const canViewPhones = state.user.role === "admin";
  const measurementSearchPlaceholder = canViewPhones ? "Search by member name or phone number" : "Search by member name or ID";
  const memberResults = state.members.map((m) => {
    const parts = splitMemberName(m.name);
    const lastMeasurement = latestMeasurementFor(m.id);
    return `
      <button class="lookup-result ${Number(selectedMember) === Number(m.id) ? "selected" : ""}" type="button"
        data-action="select-measurement-member"
        data-member-id="${m.id}"
        data-member-code="${escapeHtml(m.member_code || "")}"
        data-first-name="${escapeHtml(parts.first)}"
        data-last-name="${escapeHtml(parts.last)}"
        data-phone="${canViewPhones ? escapeHtml(m.phone) : ""}"
        data-gender="${escapeHtml(m.gender || "")}"
        data-height="${escapeHtml(m.height || lastMeasurement?.height || "")}"
        data-nutrition-club="${escapeHtml(m.nutrition_club || "Main Nutrition Club")}"
        data-goal="${escapeHtml(m.goal)}">
        <span class="avatar">${m.name[0]}</span>
        <span><strong>${escapeHtml(m.name)}</strong><small>${memberIdentity(m)}</small></span>
        ${goalBadge(m.goal)}
      </button>
    `;
  }).join("");
  return `
    <div class="modal-backdrop">
      <form class="modal-card measurement-entry-modal" id="measurementForm">
        <input type="hidden" name="source" value="${profileMode ? "profile" : ""}" />
        <input type="hidden" name="measurementId" value="${existing?.id || ""}" />
        <input type="hidden" name="memberId" id="measurementMemberId" value="${selected?.id || ""}" />
        <div class="section-heading">
          <div><h2>${existing ? "Edit Measurement" : profileMode ? `Add Measurement - ${escapeHtml(selected?.name || "")}` : "Add Member Data"}</h2><p>Manual Entry - ${state.week} - Session ${state.session.id}</p></div>
          <button class="ghost-icon modal-close" type="button" data-action="close-modal" aria-label="Close">x</button>
        </div>
        ${profileMode ? "" : `<div class="entry-tabs">
          <button class="active" type="button">Manual Entry</button>
          <button type="button">CSV / Text</button>
          <button type="button">Image / OCR</button>
        </div>`}
        <div class="form-grid">
          ${profileMode ? `<div class="wide selected-filter"><span>Saving measurement for <strong>${escapeHtml(selected?.name || "")}</strong></span></div>` : `
          <label class="wide"><span class="label">Search Member</span><input id="measurementMemberSearch" placeholder="${measurementSearchPlaceholder}" value="${selected ? escapeHtml(selected.name) : ""}" /></label>
          <div class="wide lookup-results" id="measurementLookupResults">${memberResults}</div>
          <label><span class="label">First Name</span><input name="firstName" id="measurementFirstName" value="${escapeHtml(nameParts.first)}" placeholder="First name" /></label>
          <label><span class="label">Last Name</span><input name="lastName" id="measurementLastName" value="${escapeHtml(nameParts.last)}" placeholder="Last name" /></label>
          <label><span class="label">Phone Number</span><input name="phone" id="measurementPhone" type="tel" value="${canViewPhones ? escapeHtml(selected?.phone || "") : ""}" placeholder="${canViewPhones ? "Phone number" : "Hidden for privacy"}" /></label>
          <label><span class="label">Nutrition Club</span><input name="nutritionClub" id="measurementNutritionClub" value="${escapeHtml(selected?.nutrition_club || "Main Nutrition Club")}" /></label>
          <label><span class="label">Member ID</span><input name="memberCode" id="measurementMemberCode" value="${escapeHtml(selected?.member_code || "")}" placeholder="Auto generated on save" /></label>
          `}
          <label><span class="label">Measurement Date</span><input name="measurementDate" id="measurementDate" type="date" value="${escapeHtml(measurementDate)}" /></label>
          <label><span class="label">Week Number</span><input name="weekLabel" id="measurementWeekLabel" value="${escapeHtml(weekLabel)}" readonly /></label>
          <label><span class="label">Height (cm)</span><input name="height" id="measurementHeight" type="number" step="0.1" value="${value("height", selected?.height || latestMeasurementFor(selected?.id)?.height || "170")}" placeholder="e.g. 172" required /></label>
          ${profileMode ? "" : `
          <label><span class="label">Age</span><input name="age" type="number" step="1" placeholder="e.g. 35" /></label>
          <label><span class="label">Gender</span><select name="gender" id="measurementGender"><option value="">Select...</option><option ${selected?.gender === "Male" ? "selected" : ""}>Male</option><option ${selected?.gender === "Female" ? "selected" : ""}>Female</option></select></label>
          <label class="wide"><span class="label">Purpose of Visit</span><input name="goal" id="measurementGoal" value="${escapeHtml(selected?.goal || "")}" placeholder="e.g. Weight Loss, Health & Fitness, Muscle Building..." /></label>
          <div class="wide goal-chip-row">
            ${goalOptions().map((goal) => `<button type="button" data-action="set-measurement-goal" data-goal="${escapeHtml(goal)}">${escapeHtml(goal)}</button>`).join("")}
          </div>
          `}
          <div class="wide form-section-label">Health Metrics</div>
          <label><span class="label">Weight (kg)*</span><input name="weight" type="number" step="0.1" value="${value("weight")}" placeholder="e.g. 82.5" required /></label>
          <label><span class="label">Body Fat %</span><input name="bodyFat" type="number" step="0.1" value="${value("body_fat")}" placeholder="e.g. 28.3" required /></label>
          <label><span class="label">BMI</span><input name="bmi" type="number" step="0.1" value="${value("bmi")}" placeholder="Enter KaradaScan BMI" /></label>
          <label><span class="label">BMA</span><input name="bma" type="number" step="0.1" value="${value("bma")}" placeholder="Enter BMA" /></label>
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
          ${selected && !profileMode ? `<button class="btn btn-outline" type="button" data-action="view-profile" data-member-id="${selected.id}">View Member History</button>` : ""}
          <button class="btn btn-outline" type="button" data-action="close-modal">Cancel</button>
          <button class="btn btn-primary" id="measurementSubmitButton" type="submit">${submitLabel}</button>
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
  const memberMeasurements = measurementsFor(member.id);
  const latest = memberMeasurements[0];
  const previous = memberMeasurements[1];
  const synthetic = currentFromBaseline(member.id, baseline);
  const current = latest ? {
    weight: Number(latest.weight),
    bodyFat: Number(latest.body_fat),
    muscleMass: Number(latest.muscle_mass),
    waist: Number(latest.waist),
    visceralFat: Number(latest.visceral_fat || 0),
    bmi: Number(latest.bmi || 0),
    strength: synthetic.strength,
  } : synthetic;
  const previousCurrent = previous ? {
    weight: Number(previous.weight),
    bodyFat: Number(previous.body_fat),
    muscleMass: Number(previous.muscle_mass),
    waist: Number(previous.waist),
    visceralFat: Number(previous.visceral_fat || 0),
    bmi: Number(previous.bmi || 0),
  } : null;
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
    weeklyMuscleGain: previousCurrent ? round(current.muscleMass - previousCurrent.muscleMass, 1) : 0,
    weeklyFatLoss: previousCurrent ? round(previousCurrent.bodyFat - current.bodyFat, 1) : 0,
    weeklyVisceralFatLoss: previousCurrent ? round(previousCurrent.visceralFat - current.visceralFat, 1) : 0,
    weeklyBmiReduced: previousCurrent ? round(previousCurrent.bmi - current.bmi, 1) : 0,
    visceralSingleDigit: latest ? Number(latest.visceral_fat) < 10 : false,
  };
  const goal = normalizeGoal(member.goal);
  if (goal === "gain") return scoreWeightGain(metrics);
  if (goal === "loss") return scoreWeightLoss(metrics);
  return scoreBodyComposition(metrics);
}

function scoreWeightLoss(metrics) {
  const formula = weeklyScoreFormula(metrics);
  return {
    ...metrics,
    ...formula,
    driver: `Fat loss ${formatSigned(metrics.fatMassLost)} kg, muscle ${formatSigned(metrics.muscleGain)} kg`,
    weights: "Muscle Gain 40x, Fat Loss 20x, Visceral Fat Loss 20x, BMI Reduction 10x",
  };
}

function scoreWeightGain(metrics) {
  const formula = weeklyScoreFormula(metrics);
  return {
    ...metrics,
    ...formula,
    healthyWeightGain: Math.max(metrics.weightChange, 0),
    bodyCompositionImprovement: round(metrics.muscleGain - Math.max(metrics.bodyFatChange, 0) * 0.35, 1),
    driver: `Muscle ${formatSigned(metrics.muscleGain)} kg, weight ${formatSigned(metrics.weightChange)} kg`,
    weights: "Muscle Gain 40x, Fat Loss 20x, Visceral Fat Loss 20x, BMI Reduction 10x",
  };
}

function scoreBodyComposition(metrics) {
  const formula = weeklyScoreFormula(metrics);
  return {
    ...metrics,
    ...formula,
    driver: `Muscle ${formatSigned(metrics.muscleGain)} kg, body fat ${formatSigned(-metrics.bodyFatReduced)}%`,
    weights: "Muscle Gain 40x, Fat Loss 20x, Visceral Fat Loss 20x, BMI Reduction 10x",
  };
}

function weeklyScoreFormula(metrics) {
  const muscleScore = Math.max(metrics.weeklyMuscleGain, 0) * 40;
  const fatScore = Math.max(metrics.weeklyFatLoss, 0) * 20;
  const visceralLossScore = metrics.weeklyVisceralFatLoss > 0 ? metrics.weeklyVisceralFatLoss * 20 : metrics.visceralSingleDigit ? 10 : 0;
  const bmiScore = Math.max(metrics.weeklyBmiReduced, 0) * 10;
  return {
    score: Math.round(muscleScore + fatScore + visceralLossScore + bmiScore),
    scoreBreakdown: {
      muscleScore: round(muscleScore, 1),
      fatScore: round(fatScore, 1),
      visceralLossScore: round(visceralLossScore, 1),
      bmiScore: round(bmiScore, 1),
    },
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

function goalLeaderboard(goal, members = state.members) {
  return members
    .filter((member) => member.goal === goal)
    .map((member) => ({ member, progress: goalProgress(member) }))
    .sort((a, b) => b.progress.score - a.progress.score);
}

function goalLeaderboardNote(goal) {
  if (normalizeGoal(goal) === "gain") return "Ranked by muscle gain, healthy weight gain, and body composition improvement.";
  if (normalizeGoal(goal) === "loss") return "Ranked by fat loss, muscle preservation/gain, body fat reduction, and only lightly by scale weight.";
  return "Ranked by balanced body composition progress.";
}

function topBy(scoreFn, members = state.members) {
  return members
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
  const change = previous ? formatSigned(Number(row.weight) - Number(previous.weight)) : "-";
  return `<tr><td>${row.measurement_date}</td><td>${row.weight}</td><td>${row.body_fat}</td><td>${row.muscle_mass}</td><td>${row.visceral_fat}</td><td>${row.bmi}</td><td>${row.bma || "-"}</td><td>${row.bmr || "-"}</td><td>${change}</td></tr>`;
}

function activeCardFor(memberId) {
  const paidCardIds = new Set(
    state.payments
      .filter((payment) => Number(payment.member_id) === Number(memberId) && payment.card_id)
      .map((payment) => Number(payment.card_id))
  );
  const cards = state.cards
    .filter((card) => Number(card.member_id) === Number(memberId))
    .filter((card) => !paidCardIds.size || paidCardIds.has(Number(card.id)))
    .sort((a, b) => {
      const activeScore = (b.status === "Active" ? 1 : 0) - (a.status === "Active" ? 1 : 0);
      if (activeScore) return activeScore;
      return Number(a.id || 0) - Number(b.id || 0);
    });
  return cards[0] || null;
}

function splitMemberName(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return { first: parts.shift() || "", last: parts.join(" ") };
}

function ageFromDob(dob) {
  if (!dob) return "";
  const birthDate = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hadBirthday =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  if (!hadBirthday) age -= 1;
  return age >= 0 ? age : "";
}

function memberAge(member) {
  return ageFromDob(member?.dob) || member?.age || "";
}

function syncAgeFromDob(dobSelector, ageSelector) {
  const dobInput = document.querySelector(dobSelector);
  const ageInput = document.querySelector(ageSelector);
  if (!dobInput || !ageInput) return;
  const age = ageFromDob(dobInput.value);
  if (age !== "") ageInput.value = age;
}

function attendanceSearchResults() {
  const query = state.query.trim().toLowerCase();
  const searchable = (member) => state.user.role === "admin" ? [member.name, member.phone, member.member_code, String(member.id)] : [member.name, member.member_code, String(member.id)];
  const hiddenForDate = new Set(state.attendanceHiddenByDate[state.attendanceEntryDate] || []);
  const alreadyMarkedForDate = new Set(
    state.attendance
      .filter((row) => row.attendance_date === state.attendanceEntryDate)
      .map((row) => String(row.member_id))
  );
  const members = query
    ? state.members.filter((member) => searchable(member).some((value) => String(value).toLowerCase().includes(query)))
    : state.members;
  return members.filter((member) => query || (!hiddenForDate.has(String(member.id)) && !alreadyMarkedForDate.has(String(member.id))));
}

function selectedAttendanceMember(results) {
  if (state.attendanceMemberId) {
    return state.members.find((member) => Number(member.id) === Number(state.attendanceMemberId)) || null;
  }
  return null;
}

function attendanceTypeSelect(selected = "Present", id = "") {
  const types = ["Present", "Mega Club", "Lifestyle Day", "Family Day", "Override Attendance", "Public Holiday", "Training Session", "Club Holiday"];
  return `<select ${id ? `id="${id}"` : ""} name="attendanceType">${types.map((type) => `<option ${selected === type ? "selected" : ""}>${type}</option>`).join("")}</select>`;
}

function goalOptions() {
  return ["Weight Loss", "Weight Gain", "Health & Fitness", "Muscle Building", "Rehabilitation", "Diabetes Management", "Post-natal Recovery"];
}

function paymentModeSelect() {
  const modes = ["Cash", "PhonePay", "Google Pay", "Credit Card", "Debit Card"];
  return `<select name="paymentMode">${modes.map((mode) => `<option>${mode}</option>`).join("")}</select>`;
}

function cardTypeSelect(selected = "") {
  const types = ["Complimentary Card", "Trial Card", "10 Days Card / NMS", "26 Days Card", "30 Days Card", "Marathon"];
  return `<select name="cardType">${types.map((type) => `<option ${selected === type ? "selected" : ""}>${type}</option>`).join("")}</select>`;
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

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toFixed(0)}`;
}

function isoWeekLabel(dateValue) {
  if (!dateValue) return state.week || "";
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return state.week || "";
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function generateFallbackMemberCode(id) {
  return `HRP-${String(id || 0).padStart(6, "0")}`;
}

function memberCode(member) {
  return member?.member_code || generateFallbackMemberCode(member?.id);
}

function memberIdentity(member) {
  const code = memberCode(member);
  const age = memberAge(member);
  const ageText = age !== "" ? ` - Age ${escapeHtml(age)}` : "";
  if (state.user?.role === "admin" && member?.phone) return `${escapeHtml(code)} - ${escapeHtml(member.phone)}${ageText}`;
  return `Member ID ${escapeHtml(code)}${ageText}`;
}

function memberContact(member) {
  if (state.user?.role === "admin" && member?.phone) return escapeHtml(member.phone);
  return `Member ID ${escapeHtml(memberCode(member))}`;
}

function memberCard(m) {
  const progress = goalProgress(m);
  const active = Number(m.active ?? 1) === 1;
  return `
    <article class="member-row clickable-row ${active ? "" : "inactive-member"}" data-action="view-profile" data-member-id="${m.id}">
      <div class="avatar">${m.name[0]}</div>
      <div>
        <h3>${escapeHtml(m.name)}</h3>
        <p>${memberIdentity(m)} - Last measured: ${m.last_measured}</p>
        <div class="badges">${goalBadge(m.goal)}<span class="badge badge-violet">Goal Score ${progress.score}</span>${active ? "" : `<span class="badge badge-red">Hidden</span>`}${m.marathon ? `<span class="badge badge-amber">${icons.trophy} Marathon</span>` : ""}${m.measured ? `<span class="badge badge-emerald">Measured</span>` : `<span class="badge badge-red">Pending</span>`}</div>
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

function measurementRow(m) {
  const canEdit = state.user.role === "admin" && state.session.status === "ACTIVE";
  return `
    <tr>
      <td><strong>${escapeHtml(m.member_name)}</strong><br /><span>${m.session_id}</span></td>
      <td>${m.week_number}</td>
      <td>${m.weight}</td>
      <td>${m.body_fat}</td>
      <td>${m.muscle_mass}</td>
      <td><strong>${m.bmi}</strong></td>
      <td>${m.bma || "-"}</td>
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
  updateMeasurementSubmitLabel();
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
    "#measurementMemberCode": data.memberCode,
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
  updateMeasurementSubmitLabel();
}

function updateMeasurementSubmitLabel() {
  const button = document.querySelector("#measurementSubmitButton");
  if (!button) return;
  const isEdit = !!document.querySelector('input[name="measurementId"]')?.value;
  const hasSelectedMember = !!document.querySelector("#measurementMemberId")?.value;
  button.textContent = isEdit ? "Update Measurement" : hasSelectedMember ? "Save Measurement" : "Create Member";
}

function bindEvents() {
  document.querySelector("#loginForm")?.addEventListener("submit", handleLogin);
  document.querySelectorAll("#username,#password").forEach((input) => input.addEventListener("input", updateLoginButton));
  document.querySelector(".toggle-password")?.addEventListener("click", togglePassword);
  document.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", changeRoute));
  document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", handleAction));
  document.querySelector("#auditFilterForm")?.addEventListener("submit", applyAuditFilters);
  document.querySelector("#paymentFilterForm")?.addEventListener("submit", applyPaymentFilters);
  document.querySelector("#paymentApplyButton")?.addEventListener("click", applyPaymentFilters);
  document.querySelector("#paymentClearButton")?.addEventListener("click", clearPaymentFilters);
  document.querySelector("#paymentShowSum")?.addEventListener("change", (event) => {
    const form = document.querySelector("#paymentFilterForm");
    const formData = form ? Object.fromEntries(new FormData(form).entries()) : {};
    state.paymentFilters = {
      ...state.paymentFilters,
      from: formData.from || "",
      to: formData.to || "",
      cardType: formData.cardType || "",
      showSum: event.target.checked,
    };
    render();
  });
  document.querySelector("#memberForm")?.addEventListener("submit", saveMember);
  document.querySelector("#memberEditForm")?.addEventListener("submit", updateMemberDetails);
  document.querySelector("#userForm")?.addEventListener("submit", saveUser);
  document.querySelector("#measurementForm")?.addEventListener("submit", saveMeasurement);
  document.querySelector("#attendanceForm")?.addEventListener("submit", saveAttendance);
  document.querySelector("#cardPaymentForm")?.addEventListener("submit", saveCardPayment);
  document.querySelector("#showHiddenMembers")?.addEventListener("change", (event) => {
    state.showHiddenMembers = event.target.checked;
    render();
  });
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
    render();
    focusSearchInput("#attendanceSearch");
  });
  document.querySelector("#attendanceViewDate")?.addEventListener("change", (event) => {
    state.attendanceViewDate = event.target.value;
    render();
  });
  document.querySelector("#attendanceEntryDate")?.addEventListener("change", (event) => {
    state.attendanceEntryDate = event.target.value;
    state.attendanceMemberId = "";
    const hidden = document.querySelector("#attendanceFormDate");
    if (hidden) hidden.value = state.attendanceEntryDate;
    render();
  });
  document.querySelector("#attendanceEntryType")?.addEventListener("change", (event) => {
    state.attendanceEntryType = event.target.value;
    const hidden = document.querySelector("#attendanceFormType");
    if (hidden) hidden.value = state.attendanceEntryType;
  });
  document.querySelector("#attendanceConfirmUpdate")?.addEventListener("change", (event) => {
    const field = document.querySelector(".guest-name-field");
    if (field) field.classList.toggle("hidden", event.target.value !== "1");
  });
  document.querySelector("#rankingsMarathonOnly")?.addEventListener("change", (event) => {
    state.rankingsMarathonOnly = event.target.checked;
    render();
  });
  document.querySelector("#measurementMemberSearch")?.addEventListener("input", handleMeasurementLookup);
  document.querySelector("#measurementDate")?.addEventListener("change", updateMeasurementWeekFromDate);
  document.querySelector("#memberDob")?.addEventListener("change", () => syncAgeFromDob("#memberDob", "#memberAge"));
  document.querySelector("#profileMemberDob")?.addEventListener("change", () => syncAgeFromDob("#profileMemberDob", "#profileMemberAge"));
}

function updateMeasurementWeekFromDate(event) {
  const weekInput = document.querySelector("#measurementWeekLabel");
  if (!weekInput) return;
  weekInput.value = isoWeekLabel(event.target.value);
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
  if (route === "payments" && state.user.role === "admin") {
    try {
      await loadPaymentEntries();
    } catch (error) {
      showToast(error.message);
    }
  }
  render();
}

async function handleAction(event) {
  event.stopPropagation();
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
    if (action === "download-export") {
      const url = `/api/export?userId=${encodeURIComponent(state.user.id)}&ts=${Date.now()}`;
      window.location.href = url;
      showToast("Excel backup download started.");
      return;
    }
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
    if (action === "toggle-member-entry") {
      state.memberEntryOpen = !state.memberEntryOpen;
      render();
      return;
    }
    if (action === "toggle-profile-edit") {
      state.profileEditOpen = !state.profileEditOpen;
      render();
      return;
    }
    if (action === "clear-payment-filters") {
      state.paymentFilters = { from: "", to: "", cardType: "", memberId: "", showSum: false };
      await loadPaymentEntries();
      render();
      showToast("Payment filters cleared.");
      return;
    }
    if (action === "clear-payment-member") {
      state.paymentFilters.memberId = "";
      await loadPaymentEntries();
      render();
      showToast("Showing all members.");
      return;
    }
    if (action === "select-payment-member") {
      state.paymentFilters.memberId = event.currentTarget.dataset.memberId || "";
      await loadPaymentEntries();
      render();
      showToast("Member payments loaded.");
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
    if (action === "set-member-status") {
      const memberId = event.currentTarget.dataset.memberId;
      const active = event.currentTarget.dataset.active === "1";
      const data = await api("/api/members/status", {
        method: "POST",
        body: JSON.stringify({ userId: state.user.id, memberId, active }),
      });
      applyData(data);
      render();
      showToast(active ? "Member made active." : "Member hidden.");
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
    if (action === "set-profile-member-goal") {
      const input = document.querySelector("#profileMemberGoal");
      if (input) input.value = event.currentTarget.dataset.goal || "";
      return;
    }
    if (action === "view-profile") {
      state.profileMemberId = event.currentTarget.dataset.memberId;
      state.route = "profile";
      state.modal = null;
      state.profileEditOpen = false;
      render();
      return;
    }
    if (action === "add-measurement") {
      if (!canAddMeasurements()) return showToast("Measurement session has not been opened by the Admin for this week.");
      const memberId = event.currentTarget.dataset.memberId || "";
      state.modal = state.route === "profile" && memberId ? `profile:${memberId}` : memberId || "open";
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

async function applyPaymentFilters(event) {
  event.preventDefault();
  const form = document.querySelector("#paymentFilterForm");
  const formData = form ? Object.fromEntries(new FormData(form).entries()) : {};
  state.paymentFilters = {
    ...state.paymentFilters,
    from: formData.from || "",
    to: formData.to || "",
    cardType: formData.cardType || "",
    showSum: !!document.querySelector("#paymentShowSum")?.checked,
  };
  try {
    await loadPaymentEntries();
    render();
    showToast("Payments filtered.");
  } catch (error) {
    showToast(error.message);
  }
}

async function clearPaymentFilters(event) {
  event?.preventDefault?.();
  state.paymentFilters = { from: "", to: "", cardType: "", memberId: "", showSum: false };
  try {
    await loadPaymentEntries();
    render();
    showToast("Payment filters cleared.");
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

async function loadPaymentEntries() {
  const params = new URLSearchParams({
    userId: state.user.id,
  });
  if (state.paymentFilters.from) params.set("from", state.paymentFilters.from);
  if (state.paymentFilters.to) params.set("to", state.paymentFilters.to);
  if (state.paymentFilters.cardType) params.set("cardType", state.paymentFilters.cardType);
  if (state.paymentFilters.memberId) params.set("memberId", state.paymentFilters.memberId);
  const data = await api(`/api/payments?${params.toString()}`);
  state.paymentEntries = data.entries || [];
  state.paymentCardTypes = data.cardTypes || [];
  state.paymentTotal = Number(data.total || 0);
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
  if (state.route === "payments" && state.user.role === "admin") await loadPaymentEntries();
  if (state.route === "audit" && state.user.role === "admin") await loadAuditEntries();
  render();
  if (message) showToast(message);
}

async function saveMeasurement(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const measurement = Object.fromEntries(new FormData(form).entries());
  const submitButton = form.querySelector("#measurementSubmitButton");
  const wasEdit = !!measurement.measurementId;
  const wasExistingMember = !!measurement.memberId;
  const returnToProfile = measurement.source === "profile" && measurement.memberId;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Saving...";
  }
  try {
    const data = await api("/api/measurements", {
      method: "POST",
      body: JSON.stringify({ userId: state.user.id, measurement }),
    });
    applyData(data);
    state.modal = null;
    if (returnToProfile) {
      state.route = "profile";
      state.profileMemberId = measurement.memberId;
    } else {
      state.route = "measurements";
    }
    render();
    showToast(wasEdit ? "Measurement updated successfully." : wasExistingMember ? "Measurement added successfully." : "Member created and measurement added successfully.");
  } catch (error) {
    if (submitButton) {
      submitButton.disabled = false;
      updateMeasurementSubmitLabel();
    }
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
    state.route = "members";
    state.query = "";
    state.showHiddenMembers = false;
    state.memberEntryOpen = false;
    render();
    showToast("Member saved. Existing mobile numbers are reused.");
  } catch (error) {
    showToast(error.message);
  }
}

async function updateMemberDetails(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const member = Object.fromEntries(new FormData(form).entries());
  try {
    const data = await api("/api/members/update", {
      method: "POST",
      body: JSON.stringify({ userId: state.user.id, member }),
    });
    applyData(data);
    state.profileMemberId = member.memberId;
    state.route = "profile";
    state.profileEditOpen = false;
    render();
    showToast("Member details updated.");
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
    state.attendanceEntryDate = attendance.attendanceDate || state.attendanceEntryDate;
    state.attendanceEntryType = attendance.attendanceType || state.attendanceEntryType;
    state.attendanceViewDate = attendance.attendanceDate || state.attendanceViewDate;
    const hideDate = state.attendanceEntryDate;
    state.attendanceHiddenByDate[hideDate] = [...new Set([...(state.attendanceHiddenByDate[hideDate] || []), String(attendance.memberId)])];
    state.attendanceMemberId = "";
    const updatedCard = activeCardFor(attendance.memberId);
    render();
    showToast(updatedCard ? `Attendance saved. ${updatedCard.remaining_visits} visits remaining.` : "Attendance saved to SQLite.");
  } catch (error) {
    showToast(error.message);
  }
}

async function saveCardPayment(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payment = Object.fromEntries(new FormData(form).entries());
  try {
    const data = await api("/api/card-payment", {
      method: "POST",
      body: JSON.stringify({ userId: state.user.id, payment }),
    });
    applyData(data);
    state.profileMemberId = payment.memberId;
    state.route = "profile";
    render();
    showToast("Card payment saved.");
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

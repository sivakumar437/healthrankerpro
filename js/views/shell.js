import { state, icons, routes } from "../state.js";
import { escapeHtml, capitalize } from "../helpers.js";

export function renderShell(renderRouteFn, renderMeasurementModalFn) {
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
          <div class="topbar-actions">
            ${renderViewSwitcher()}
            ${renderTopbarAction()}
          </div>
        </header>
        <section class="content">${renderRouteFn()}</section>
      </main>
      <nav class="mobile-nav">${navButtons(true)}</nav>
    </div>
    ${state.modal ? renderMeasurementModalFn(state.modal) : ""}
    <div id="toast" class="toast">Updated</div>
  `;
}

export function renderViewSwitcher() {
  if (!state.user || !["coach", "supervisor", "admin", "nc_organiser", "super_admin"].includes(state.user.role)) return "";
  const personalActive = state.viewMode !== "club";
  const clubActive = state.viewMode === "club";
  return `
    <div class="view-switcher" role="group" aria-label="Application view">
      <button class="${personalActive ? "active" : ""}" type="button" data-action="switch-view" data-view="personal">Personal View</button>
      <button class="${clubActive ? "active" : ""}" type="button" data-action="switch-view" data-view="club">Nutrition Club View</button>
    </div>
  `;
}

export function renderTopbarAction() {
  if (state.route === "dashboard") return "";
  if (state.route === "rankings") return `<button class="btn btn-primary" data-action="re-score-all">${icons.history} Re-score All</button>`;
  return `<button class="btn btn-outline" data-action="refresh">Refresh</button>`;
}

export function navButtons(mobile) {
  const personalRoutes = ["dashboard", "members", "today", "attendance", "measurements", "payments", "dmo", "rankings", "history", "profile"];
  const clubRoutes = ["dashboard", "members", "today", "attendance", "measurements", "payments", "dmo", "weekly-review", "marathon", "rankings", "compliance", "history", "reports", "audit", "export", "users"];
  const visibleRoutes = state.viewMode === "club" ? clubRoutes : personalRoutes;
  return visibleRoutes
    .map((routeId) => routes.find(([id]) => id === routeId))
    .filter(Boolean)
    .filter(([id]) => {
      if (state.user.role === "member") return ["dashboard", "measurements", "history"].includes(id);
      if (state.viewMode === "personal") {
        if (["members", "today", "attendance", "weekly-review", "compliance", "audit", "export", "users", "reports", "marathon"].includes(id)) return false;
        return true;
      }
      if (id === "members" && !["admin", "nc_organiser", "super_admin"].includes(state.user.role)) return false;
      if (id === "attendance" && !["admin", "supervisor", "coach", "nc_organiser", "super_admin"].includes(state.user.role)) return false;
      if (id === "today" && !["admin", "supervisor", "coach", "nc_organiser", "super_admin"].includes(state.user.role)) return false;
      if (id === "audit" && state.user.role !== "admin") return false;
      if (id === "export" && state.user.role !== "admin") return false;
      if (id === "compliance" && state.user.role !== "admin") return false;
      if (id === "history" && state.user.role !== "admin" && state.user.role !== "member" && !["coach", "supervisor", "nc_organiser", "super_admin"].includes(state.user.role)) return false;
      if (id === "reports" && !["admin", "super_admin"].includes(state.user.role)) return false;
      if (id === "payments" && !["admin", "supervisor", "coach", "nc_organiser", "super_admin"].includes(state.user.role)) return false;
      if (id === "marathon" && state.user.role !== "admin") return false;
      if (id === "dmo" && !["coach", "supervisor", "admin", "nc_organiser", "super_admin"].includes(state.user.role)) return false;
      if (id === "weekly-review" && !["coach", "supervisor"].includes(state.user.role)) return false;
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

export function pageSubtitle(route) {
  const subtitles = {
    dashboard: "Member health progress overview",
    members: "Search, review, and manage nutrition club members",
    attendance: "Fast daily entry with card progress and payments",
    today: "Date-wise attendance, card counts, and payments",
    measurements: "Review weekly measurement entries and corrections",
    payments: "Card purchases, payment history, and totals",
    marathon: "Current-month Marathon registrations and monthly reset",
    rankings: "Week-over-week transformation scores",
    import: "Add weekly measurements from a spreadsheet",
    compliance: "Weekly measurement tracking and pending follow-ups",
    history: "Recent measurement activity and score movement",
    reports: "Generate printable member measurement reports",
    audit: "Admin-only transaction history and filters",
    export: "Download a complete Excel backup of all database tables",
    profile: "Member details, card, attendance, payments, and measurements",
    users: "Manage staff accounts and access levels",
    dmo: "Leads, follow-ups, and field activity tracking",
    "weekly-review": "Coach and supervisor weekly activity review",
  };
  return subtitles[route] || "";
}

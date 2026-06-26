import { state } from "./state.js";
import { api, applyData } from "./api.js";
import { setRenderer } from "./renderer.js";
import { renderLogin, renderLoading } from "./views/login.js";
import { renderShell } from "./views/shell.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderMembers } from "./views/members.js";
import { renderAttendance, renderAttendanceTodayView } from "./views/attendance.js";
import { renderMeasurements, renderMeasurementModal } from "./views/measurements.js";
import { renderProfile } from "./views/profile.js";
import { renderPayments } from "./views/payments.js";
import { renderMarathon } from "./views/marathon.js";
import { renderRankings } from "./views/rankings.js";
import { renderDmo, renderWeeklyReview } from "./views/leads.js";
import { renderAudit } from "./views/audit.js";
import { renderExport } from "./views/export.js";
import { renderUsers } from "./views/users.js";
import { renderReports } from "./views/reports.js";
import { renderCompliance } from "./views/compliance.js";
import { renderHistory } from "./views/history.js";
import { renderImport } from "./views/import.js";
import { bindEvents } from "./events/handlers.js";

const root = document.getElementById("app");

function renderRoute() {
  switch (state.route) {
    case "dashboard": return renderDashboard();
    case "members": return renderMembers();
    case "attendance": return renderAttendance();
    case "today": return renderAttendanceTodayView();
    case "measurements": return renderMeasurements();
    case "profile": return renderProfile();
    case "payments": return renderPayments();
    case "marathon": return renderMarathon();
    case "rankings": return renderRankings();
    case "dmo": return renderDmo();
    case "weekly-review": return renderWeeklyReview();
    case "audit": return renderAudit();
    case "export": return renderExport();
    case "users": return renderUsers();
    case "reports": return renderReports();
    case "compliance": return renderCompliance();
    case "history": return renderHistory();
    case "import": return renderImport();
    default: return renderDashboard();
  }
}

function render() {
  if (!state.user) {
    root.innerHTML = renderLogin(state.loginError || "");
    return;
  }
  root.innerHTML = renderShell(renderRoute, renderMeasurementModal);
}

setRenderer(render);

async function bootstrap() {
  root.innerHTML = renderLoading();
  try {
    const data = await api(`/api/bootstrap?view=${encodeURIComponent(state.viewMode || "personal")}`);
    applyData(data);
  } catch (_) {
    state.user = null;
  }
  render();
  bindEvents();
}

bootstrap();

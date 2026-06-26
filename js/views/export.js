import { state, icons } from "../state.js";
import { restricted, empty } from "./components.js";

export function renderExport() {
  if (state.user.role !== "admin" && state.user.role !== "super_admin") return restricted("Only admins can access the data export.");
  return `
    <article class="card">
      <div class="section-heading">
        <div><h2>Export Database</h2><p>Download a complete Excel backup of all database tables</p></div>
        ${icons.download}
      </div>
      <p>The export includes all members, measurements, attendance, payments, cards, users, and audit trail records.</p>
      <div class="modal-actions">
        <a class="btn btn-primary" href="/api/export" download>
          ${icons.download} Download Excel Backup
        </a>
      </div>
    </article>
  `;
}

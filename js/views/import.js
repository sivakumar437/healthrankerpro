import { state, icons } from "../state.js";
import { restricted, empty } from "./components.js";

export function renderImport() {
  if (!["admin", "supervisor"].includes(state.user.role)) return restricted("Only admins and supervisors can import measurements.");
  return `
    <article class="card">
      <div class="section-heading">
        <div><h2>Import Weekly Measurements</h2><p>Upload a CSV or Excel spreadsheet to bulk-add measurement records</p></div>
        ${icons.upload}
      </div>
      <div class="import-instructions">
        <h3>Required Columns</h3>
        <p>The spreadsheet must include: <code>name</code>, <code>weight</code>, <code>body_fat</code>, <code>visceral_fat</code>, <code>muscle_mass</code>, <code>bmi</code>, <code>week_number</code>, <code>measurement_date</code></p>
        <p>Optional: <code>bmr</code>, <code>bma</code>, <code>subcutaneous_fat</code>, <code>phone</code></p>
      </div>
      <form id="importForm" enctype="multipart/form-data" class="form-grid">
        <label class="wide"><span class="label">Spreadsheet File (.csv, .xlsx)</span>
          <input name="file" type="file" accept=".csv,.xlsx,.xls" required />
        </label>
        <div class="wide modal-actions">
          <button class="btn btn-primary" type="submit">${icons.upload} Import Measurements</button>
        </div>
      </form>
      ${state.importResult ? renderImportResult(state.importResult) : ""}
    </article>
  `;
}

export function renderImportResult(result) {
  if (!result) return "";
  return `
    <div class="import-result ${result.errors && result.errors.length ? "has-errors" : "success"}">
      <h3>Import Result</h3>
      <p>${result.inserted || 0} records imported, ${result.skipped || 0} skipped</p>
      ${result.errors && result.errors.length ? `
        <details>
          <summary>${result.errors.length} errors</summary>
          <ul>${result.errors.map((e) => `<li>${e}</li>`).join("")}</ul>
        </details>
      ` : ""}
    </div>
  `;
}

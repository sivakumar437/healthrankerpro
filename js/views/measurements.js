import { state, icons } from "../state.js";
import { escapeHtml, supervisorName, canAddMeasurements, formatSigned, staffOptions } from "../helpers.js";
import { restricted, empty } from "./components.js";
import { renderSessionControl, renderAuditTrail } from "./components.js";
import { measurementRow } from "./members.js";

export function renderMeasurements() {
  const canEdit = ["admin", "supervisor", "super_admin"].includes(state.user.role);
  return `
    ${renderSessionControl()}
    ${canEdit ? renderMeasurementEntry() : ""}
    ${renderMeasurementTable()}
    ${renderAuditTrail()}
  `;
}

export function renderMeasurementEntry() {
  const canAdd = canAddMeasurements();
  return `
    <article class="card measurement-entry-card ${state.measurementEntryOpen ? "open" : "collapsed"}">
      <button class="section-heading collapsible-heading" type="button" data-action="toggle-measurement-entry" aria-expanded="${state.measurementEntryOpen}">
        <div><h2>Add Weekly Measurement</h2><p>Record a new measurement for a member</p></div>
        <span class="collapse-indicator">${state.measurementEntryOpen ? "Hide" : "Add Measurement"}</span>
      </button>
      ${state.measurementEntryOpen ? `
        ${!canAdd ? `<div class="alert">Session is not active. Open a weekly session to add measurements.</div>` : ""}
        <form id="measurementForm" class="form-grid">
          <div class="wide">
            <label><span class="label">Search Member</span><input id="measurementMemberSearch" placeholder="Name or phone..." autocomplete="off" /></label>
            <div id="measurementMemberResults" class="search-results"></div>
            <input type="hidden" id="measurementMemberId" name="memberId" />
            <div id="measurementMemberPreview"></div>
          </div>
          <label><span class="label">Week Number</span><input name="weekNumber" id="measurementWeekNumber" type="number" min="1" placeholder="Auto from date" /></label>
          <label><span class="label">Measurement Date</span><input name="measurementDate" id="measurementDate" type="date" value="${new Date().toISOString().slice(0, 10)}" /></label>
          <label><span class="label">Weight (kg)</span><input name="weight" type="number" step="0.1" placeholder="e.g. 72.5" ${canAdd ? "" : "disabled"} /></label>
          <label><span class="label">Body Fat (%)</span><input name="bodyFat" type="number" step="0.1" placeholder="e.g. 28.5" ${canAdd ? "" : "disabled"} /></label>
          <label><span class="label">Visceral Fat</span><input name="visceralFat" type="number" step="0.1" placeholder="e.g. 10" ${canAdd ? "" : "disabled"} /></label>
          <label><span class="label">Muscle Mass (kg)</span><input name="muscleMass" type="number" step="0.1" placeholder="e.g. 45.0" ${canAdd ? "" : "disabled"} /></label>
          <label><span class="label">BMR</span><input name="bmr" type="number" placeholder="e.g. 1500" ${canAdd ? "" : "disabled"} /></label>
          <label><span class="label">BMI</span><input name="bmi" type="number" step="0.01" placeholder="Auto or enter" ${canAdd ? "" : "disabled"} /></label>
          <label><span class="label">BMA</span><input name="bma" type="number" step="0.1" placeholder="Bone mass (optional)" ${canAdd ? "" : "disabled"} /></label>
          <label><span class="label">Subcutaneous Fat (%)</span><input name="subcutaneousFat" type="number" step="0.1" placeholder="Optional" ${canAdd ? "" : "disabled"} /></label>
          <label><span class="label">Supervisor</span><select name="supervisorId" ${canAdd ? "" : "disabled"}><option value="">Select supervisor</option>${staffOptions(["supervisor", "admin"])}</select></label>
          <div class="wide modal-actions">
            <button id="measurementSubmitBtn" class="btn btn-primary" type="submit" ${canAdd ? "" : "disabled"}>${icons.plus} Add Measurement</button>
          </div>
        </form>
      ` : ""}
    </article>
  `;
}

export function renderMeasurementTable() {
  const rows = [...state.measurements].sort((a, b) => String(b.measurement_date).localeCompare(String(a.measurement_date)));
  return `
    <article class="card">
      <div class="section-heading"><div><h2>Weekly Measurements</h2><p>${rows.length} records</p></div>${icons.activity}</div>
      ${rows.length ? `
        <div class="table-responsive">
          <table>
            <thead><tr><th>Member</th><th>Week</th><th>Weight</th><th>BF%</th><th>VF</th><th>BMR</th><th>BMI</th><th>BMA</th><th>SBF%</th><th>Muscle</th><th>Supervisor</th><th>Date</th><th></th></tr></thead>
            <tbody>${rows.map(measurementRow).join("")}</tbody>
          </table>
        </div>
      ` : empty("No measurements recorded yet.")}
    </article>
  `;
}

export function renderMeasurementModal(measurement) {
  if (!measurement) return "";
  return `
    <div class="modal-overlay" data-action="close-modal">
      <article class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2>Edit Measurement</h2>
          <button class="modal-close" data-action="close-modal" aria-label="Close">${icons.close || "×"}</button>
        </div>
        <form id="editMeasurementForm" class="form-grid">
          <input type="hidden" name="measurementId" value="${measurement.id}" />
          <label><span class="label">Weight (kg)</span><input name="weight" type="number" step="0.1" value="${measurement.weight}" /></label>
          <label><span class="label">Body Fat (%)</span><input name="bodyFat" type="number" step="0.1" value="${measurement.body_fat}" /></label>
          <label><span class="label">Visceral Fat</span><input name="visceralFat" type="number" step="0.1" value="${measurement.visceral_fat}" /></label>
          <label><span class="label">Muscle Mass (kg)</span><input name="muscleMass" type="number" step="0.1" value="${measurement.muscle_mass}" /></label>
          <label><span class="label">BMR</span><input name="bmr" type="number" value="${measurement.bmr ?? ""}" /></label>
          <label><span class="label">BMI</span><input name="bmi" type="number" step="0.01" value="${measurement.bmi}" /></label>
          <label><span class="label">BMA</span><input name="bma" type="number" step="0.1" value="${measurement.bma ?? ""}" /></label>
          <label><span class="label">Subcutaneous Fat (%)</span><input name="subcutaneousFat" type="number" step="0.1" value="${measurement.subcutaneous_fat ?? ""}" /></label>
          <label><span class="label">Measurement Date</span><input name="measurementDate" type="date" value="${measurement.measurement_date}" /></label>
          <div class="wide modal-actions">
            <button class="btn btn-outline" type="button" data-action="close-modal">Cancel</button>
            <button class="btn btn-primary" type="submit">${icons.edit} Save Changes</button>
          </div>
        </form>
      </article>
    </div>
  `;
}

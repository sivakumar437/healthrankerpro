import { state, icons } from "../state.js";
import { escapeHtml, supervisorName, canAddMeasurements, splitMemberName, memberIdentity, latestMeasurementFor, isoWeekLabel, goalOptions } from "../helpers.js";
import { restricted, empty } from "./components.js";
import { renderSessionControl } from "./components.js";
import { measurementRow } from "./members.js";

export function renderMeasurements() {
  if (state.user.role === "member") {
    state.profileMemberId = state.user.member_id || state.members[0]?.id || "";
    state.route = "profile";
    return "";
  }
  const canAdd = canAddMeasurements();
  const placeholder = state.user.role === "admin"
    ? "Search measurements by member name, mobile, or ID"
    : "Search measurements by member name or ID";
  const rows = state.measurements.filter((m) => {
    const query = (state.query || "").toLowerCase();
    const member = state.members.find((item) => Number(item.id) === Number(m.member_id));
    const searchable = state.user.role === "admin"
      ? [m.member_name, String(m.member_id), m.week_number, member?.phone]
      : [m.member_name, String(m.member_id), m.week_number];
    return !query || searchable.some((v) => String(v || "").toLowerCase().includes(query));
  });
  return `
    ${renderSessionControl()}
    <div class="toolbar">
      <input class="search-input" id="measurementSearch" value="${escapeHtml(state.query || "")}" placeholder="${placeholder}" />
      ${canAdd
        ? `<button class="btn btn-primary" data-action="add-measurement">${icons.plus} Add Measurement</button>`
        : `<span class="session-message">Existing measurements are read-only until Admin opens the session.</span>`}
    </div>
    <p class="toolbar-note">${rows.length} visible entries from full measurement history</p>
    <div class="table-card">
      <table>
        <thead><tr><th>Member</th><th>Week</th><th>Weight</th><th>Body Fat</th><th>Visceral Fat</th><th>BMR</th><th>BMI</th><th>BMA</th><th>Subcutaneous Fat</th><th>Muscle Mass</th><th>Supervisor</th><th>Date</th><th></th></tr></thead>
        <tbody>${rows.map(measurementRow).join("") || `<tr><td colspan="13">${empty("No measurements match your search.")}</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

export function renderMeasurementModal(modalValue = "") {
  if (!modalValue) return "";
  const editId = typeof modalValue === "string" && modalValue.startsWith("edit:") ? modalValue.slice(5) : "";
  const profileMode = typeof modalValue === "string" && modalValue.startsWith("profile:");
  const profileMemberId = profileMode ? modalValue.slice(8) : "";
  const existing = editId ? state.measurements.find((m) => String(m.id) === String(editId)) : null;
  const selectedMemberId = existing?.member_id || profileMemberId || (typeof modalValue === "string" && !editId && !profileMode && modalValue !== "open" ? modalValue : "");
  const selected = state.members.find((m) => Number(m.id) === Number(selectedMemberId)) || null;
  const nameParts = selected ? splitMemberName(selected.name) : { first: "", last: "" };
  const val = (name, fallback = "") => existing?.[name] ?? fallback;
  const measurementDate = existing?.measurement_date || new Date().toISOString().slice(0, 10);
  const weekLabel = existing?.week_number || isoWeekLabel(measurementDate);
  const submitLabel = existing ? "Update Measurement" : profileMode ? "Save Measurement" : selected ? "Save Measurement" : "Create Member";
  const canViewPhones = state.user.role === "admin";
  const memberResults = state.members.map((m) => {
    const parts = splitMemberName(m.name);
    const lastMeasurement = latestMeasurementFor(m.id);
    return `
      <button class="lookup-result ${Number(selectedMemberId) === Number(m.id) ? "selected" : ""}" type="button"
        data-action="select-measurement-member"
        data-member-id="${m.id}"
        data-member-code="${escapeHtml(m.member_code || "")}"
        data-first-name="${escapeHtml(parts.first)}"
        data-last-name="${escapeHtml(parts.last)}"
        data-phone="${canViewPhones ? escapeHtml(m.phone || "") : ""}"
        data-gender="${escapeHtml(m.gender || "")}"
        data-height="${escapeHtml(m.height || lastMeasurement?.height || "")}"
        data-nutrition-club="${escapeHtml(m.nutrition_club || "")}"
        data-goal="${escapeHtml(m.goal || "")}">
        <span class="avatar">${m.name[0]}</span>
        <span><strong>${escapeHtml(m.name)}</strong><small>${memberIdentity(m)}</small></span>
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
          <div>
            <h2>${existing ? "Edit Measurement" : profileMode ? `Add Measurement - ${escapeHtml(selected?.name || "")}` : "Add Measurement"}</h2>
            <p>${state.week} - Session ${state.session?.id || ""}</p>
          </div>
          <button class="ghost-icon modal-close" type="button" data-action="close-modal" aria-label="Close">${icons.close || "×"}</button>
        </div>
        <div class="form-grid">
          ${profileMode ? `
            <div class="wide selected-filter"><span>Saving measurement for <strong>${escapeHtml(selected?.name || "")}</strong></span></div>
          ` : `
            <label class="wide"><span class="label">Search Member</span>
              <input id="measurementMemberSearch" placeholder="${canViewPhones ? "Search by member name or phone number" : "Search by member name or ID"}" value="${selected ? escapeHtml(selected.name) : ""}" />
            </label>
            <div class="wide lookup-results" id="measurementLookupResults">${memberResults}</div>
            <label><span class="label">First Name</span><input name="firstName" id="measurementFirstName" value="${escapeHtml(nameParts.first)}" placeholder="First name" /></label>
            <label><span class="label">Last Name</span><input name="lastName" id="measurementLastName" value="${escapeHtml(nameParts.last)}" placeholder="Last name" /></label>
            <label><span class="label">Phone Number</span><input name="phone" id="measurementPhone" type="tel" value="${canViewPhones ? escapeHtml(selected?.phone || "") : ""}" placeholder="${canViewPhones ? "Phone number" : "Hidden for privacy"}" /></label>
            <label><span class="label">Nutrition Club</span><input name="nutritionClub" id="measurementNutritionClub" value="${escapeHtml(selected?.nutrition_club || "")}" placeholder="Type or select a club..." /></label>
            <label><span class="label">Member ID</span><input name="memberCode" id="measurementMemberCode" value="${escapeHtml(selected?.member_code || "")}" placeholder="Auto generated on save" /></label>
            <label><span class="label">Age</span><input name="age" type="number" step="1" placeholder="e.g. 35" /></label>
            <label><span class="label">Gender</span><select name="gender" id="measurementGender" required><option value="">Select...</option><option ${selected?.gender === "Male" ? "selected" : ""}>Male</option><option ${selected?.gender === "Female" ? "selected" : ""}>Female</option></select></label>
            <label class="wide"><span class="label">Purpose of Visit</span><input name="goal" id="measurementGoal" value="${escapeHtml(selected?.goal || "")}" placeholder="e.g. Weight Loss, Health &amp; Fitness, Muscle Building..." /></label>
            <div class="wide goal-chip-row">
              ${goalOptions().map((goal) => `<button type="button" data-action="set-measurement-goal" data-goal="${escapeHtml(goal)}">${escapeHtml(goal)}</button>`).join("")}
            </div>
          `}
          <label><span class="label">Measurement Date</span><input name="measurementDate" id="measurementDate" type="date" value="${escapeHtml(measurementDate)}" /></label>
          <label><span class="label">Week Number</span><input name="weekLabel" id="measurementWeekLabel" value="${escapeHtml(String(weekLabel))}" readonly /></label>
          <label><span class="label">Height (cm)</span><input name="height" id="measurementHeight" type="number" step="0.1" value="${val("height", selected?.height || latestMeasurementFor(selected?.id)?.height || "170")}" placeholder="e.g. 172" required /></label>
          <div class="wide form-section-label">Health Metrics</div>
          <label><span class="label">Weight (kg)*</span><input name="weight" type="number" step="0.1" value="${val("weight")}" placeholder="e.g. 82.5" required /></label>
          <label><span class="label">Body Fat %</span><input name="bodyFat" type="number" step="0.1" value="${val("body_fat")}" placeholder="e.g. 28.3" required /></label>
          <label><span class="label">Visceral Fat</span><input name="visceralFat" type="number" step="0.1" value="${val("visceral_fat")}" placeholder="e.g. 12.5" required /></label>
          <label><span class="label">BMR (kcal)</span><input name="bmr" type="number" step="1" value="${val("bmr")}" placeholder="e.g. 1650" /></label>
          <label><span class="label">BMI</span><input name="bmi" type="number" step="0.1" value="${val("bmi")}" placeholder="Enter KaradaScan BMI" /></label>
          <label><span class="label">BMA</span><input name="bma" type="number" step="0.1" value="${val("bma")}" placeholder="Enter BMA" /></label>
          <label><span class="label">Subcutaneous Fat</span><input name="subcutaneousFat" type="number" step="0.1" value="${val("subcutaneous_fat")}" placeholder="e.g. 22.4" /></label>
          <label><span class="label">Muscle Mass (kg)</span><input name="muscleMass" type="number" step="0.1" value="${val("muscle_mass")}" placeholder="e.g. 45.0" /></label>
          <label><span class="label">Muscle %</span><input name="musclePercent" type="number" min="0" max="100" step="0.1" value="${val("muscle_percent")}" /></label>
          <label><span class="label">Waist (cm)</span><input name="waist" type="number" step="0.1" value="${val("waist", "0")}" required /></label>
          <label><span class="label">Hip (cm)</span><input name="hip" type="number" step="0.1" value="${val("hip", "0")}" required /></label>
          <label><span class="label">Chest (cm)</span><input name="chest" type="number" step="0.1" value="${val("chest", "0")}" required /></label>
          <label><span class="label">Water Percentage (%)</span><input name="water" type="number" step="0.1" value="${val("water", "0")}" required /></label>
          <label class="wide"><span class="label">Notes</span><textarea name="notes" rows="3">${escapeHtml(val("notes"))}</textarea></label>
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

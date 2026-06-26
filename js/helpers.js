import { state, demoProgress } from "./state.js";

export function normalizeGoal(goal) {
  const value = String(goal).toLowerCase();
  if (value.includes("gain")) return "gain";
  if (value.includes("loss")) return "loss";
  return "fitness";
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function round(value, decimals = 1) {
  return Number(value.toFixed(decimals));
}

export function formatSigned(value) {
  const rounded = round(Number(value) || 0, 1);
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}`;
}

export function formatCurrency(value) {
  return `Rs ${Number(value || 0).toFixed(0)}`;
}

export function isoWeekLabel(dateValue) {
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

export function generateFallbackMemberCode(id) {
  return `HRP-${String(id || 0).padStart(6, "0")}`;
}

export function memberCode(member) {
  return member?.member_code || generateFallbackMemberCode(member?.id);
}

export function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

export function ageFromDob(dob) {
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

export function memberAge(member) {
  return ageFromDob(member?.dob) || member?.age || "";
}

export function syncAgeFromDob(dobSelector, ageSelector) {
  const dobInput = document.querySelector(dobSelector);
  const ageInput = document.querySelector(ageSelector);
  if (!dobInput || !ageInput) return;
  const age = ageFromDob(dobInput.value);
  if (age !== "") ageInput.value = age;
}

export function memberIdentity(member) {
  const code = memberCode(member);
  const age = memberAge(member);
  const ageText = age !== "" ? ` - Age ${escapeHtml(age)}` : "";
  if (state.user?.role === "admin" && member?.phone) return `${escapeHtml(code)} - ${escapeHtml(member.phone)}${ageText}`;
  return `Member ID ${escapeHtml(code)}${ageText}`;
}

export function memberContact(member) {
  if (state.user?.role === "admin" && member?.phone) return escapeHtml(member.phone);
  return `Member ID ${escapeHtml(memberCode(member))}`;
}

export function isCurrentMonthMarathon(member) {
  return Number(member?.marathon_active || 0) === 1;
}

export function currentLocalMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function currentLocalDate() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export function formatDateOnly(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function supervisorName(id) {
  return state.users.find((user) => user.id === id)?.name || id || "-";
}

export function latestMeasurementFor(memberId) {
  return state.measurements.find((measurement) => Number(measurement.member_id) === Number(memberId));
}

export function measurementsFor(memberId) {
  return state.measurements
    .filter((measurement) => Number(measurement.member_id) === Number(memberId))
    .sort((a, b) => String(b.measurement_date).localeCompare(String(a.measurement_date)));
}

export function activeCardFor(memberId) {
  const cards = state.cards
    .filter((card) => Number(card.member_id) === Number(memberId))
    .filter((card) => card.card_type !== "Marathon")
    .sort((a, b) => {
      const activeScore = (b.status === "Active" ? 1 : 0) - (a.status === "Active" ? 1 : 0);
      if (activeScore) return activeScore;
      const dateScore = String(a.start_date || "").localeCompare(String(b.start_date || ""));
      if (dateScore) return dateScore;
      return Number(a.id || 0) - Number(b.id || 0);
    });
  return cards[0] || null;
}

export function splitMemberName(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return { first: parts.shift() || "", last: parts.join(" ") };
}

export function canAddMeasurements() {
  return ["admin", "supervisor"].includes(state.user.role) && state.session.status === "ACTIVE";
}

export function paymentBenefitValue(payment) {
  if (Number(payment.is_benefit || 0) === 1) return Number(payment.benefit_value || 0);
  return payment.payment_mode === "Complimentary" ? Number(payment.benefit_value || payment.amount || 0) : 0;
}

export function normalizeMarkedOn(markedOn = "") {
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

export function attendanceTimeSortValue(attendance) {
  const value = Date.parse(normalizeMarkedOn(attendance.updated_on || attendance.marked_on));
  return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
}

export function attendanceDisplayTimeSortValue(row) {
  const value = Date.parse(normalizeMarkedOn(row.displayTime));
  return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
}

export function attendanceTimeLabel(attendance) {
  const normalized = normalizeMarkedOn(attendance.updated_on || attendance.marked_on);
  if (!normalized) return "-";
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function attendanceTypeColorClass(type) {
  return {
    "Present": "type-present",
    "Mega Club": "type-mega",
    "Lifestyle Day": "type-lifestyle",
    "Family Day": "type-family",
    "Override Attendance": "type-override",
    "Public Holiday": "type-holiday",
    "Training Session": "type-training",
    "Club Holiday": "type-holiday",
  }[type] || "type-default";
}

export function attendanceSearchResults() {
  const query = state.query.trim().toLowerCase();
  const searchable = (member) => state.user.role === "admin"
    ? [member.name, member.phone, member.member_code, String(member.id)]
    : [member.name, member.member_code, String(member.id)];
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

export function selectedAttendanceMember() {
  if (state.attendanceMemberId) {
    return state.members.find((member) => Number(member.id) === Number(state.attendanceMemberId)) || null;
  }
  return null;
}

export function attendanceTypeSelect(selected = "Present", id = "") {
  const types = ["Present", "Mega Club", "Lifestyle Day", "Family Day", "Override Attendance", "Public Holiday", "Training Session", "Club Holiday"];
  return `<select ${id ? `id="${id}"` : ""} name="attendanceType">${types.map((type) => `<option ${selected === type ? "selected" : ""}>${type}</option>`).join("")}</select>`;
}

export function goalOptions() {
  return ["Weight Loss", "Weight Gain", "Health & Fitness", "Muscle Building", "Rehabilitation", "Diabetes Management", "Post-natal Recovery"];
}

export function staffOptions(roles, selected = "") {
  return state.users
    .filter((user) => roles.includes(user.role))
    .map((user) => `<option value="${escapeHtml(user.id)}" ${String(selected) === String(user.id) ? "selected" : ""}>${escapeHtml(user.name)} (${escapeHtml(capitalize(user.role))})</option>`)
    .join("");
}

export function paymentModeSelect(selected = "Cash", allowEmpty = false, id = "") {
  const modes = ["Cash", "PhonePay", "Google Pay", "Credit Card", "Debit Card"];
  return `<select ${id ? `id="${id}"` : ""} name="paymentMode">${allowEmpty ? `<option value="" ${selected ? "" : "selected"}>Not applicable</option>` : ""}${modes.map((mode) => `<option ${selected === mode ? "selected" : ""}>${mode}</option>`).join("")}</select>`;
}

export function cardTypeSelect(selected = "", id = "", allowedTypes = null) {
  const types = allowedTypes || ["Complimentary Card", "Trial Card", "Coupon", "10 Days Card / NMS", "26 Days Card", "30 Days Card", "Marathon"];
  return `<select ${id ? `id="${id}"` : ""} name="cardType">${types.map((type) => `<option ${selected === type ? "selected" : ""}>${type}</option>`).join("")}</select>`;
}

export function availableCardTypesFor(memberId) {
  const usedLifetimeTypes = new Set(
    state.cards
      .filter((card) => Number(card.member_id) === Number(memberId))
      .map((card) => card.card_type),
  );
  return ["Complimentary Card", "Trial Card", "Coupon", "10 Days Card / NMS", "26 Days Card", "30 Days Card", "Marathon"]
    .filter((type) => !["Complimentary Card", "Trial Card"].includes(type) || !usedLifetimeTypes.has(type));
}

export function cardStandardAmount(cardType) {
  return {
    "Complimentary Card": 250,
    "Coupon": 250,
    "Trial Card": 700,
    "10 Days Card / NMS": 2400,
    "26 Days Card": 5400,
    "30 Days Card": 6200,
    "Marathon": 300,
  }[cardType] ?? null;
}

export function currentFromBaseline(memberId, baseline) {
  const delta = demoProgress[memberId] || { weight: 0, bodyFat: 0, muscleMass: 0, waist: 0, strength: 0 };
  return {
    weight: baseline.weight + delta.weight,
    bodyFat: baseline.bodyFat + delta.bodyFat,
    muscleMass: baseline.muscleMass + delta.muscleMass,
    waist: baseline.waist + delta.waist,
    strength: baseline.strength + delta.strength,
  };
}

export function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1600);
}

export function focusSearchInput(selector) {
  const input = document.querySelector(selector);
  if (!input) return;
  input.focus();
  const end = input.value.length;
  if (typeof input.setSelectionRange === "function") input.setSelectionRange(end, end);
  window.setTimeout(() => {
    const restored = document.querySelector(selector);
    if (!restored) return;
    restored.focus();
    const restoredEnd = restored.value.length;
    if (typeof restored.setSelectionRange === "function") restored.setSelectionRange(restoredEnd, restoredEnd);
  }, 0);
}

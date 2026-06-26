import { state, icons } from "../state.js";
import { escapeHtml, capitalize, clubCombobox } from "../helpers.js";
import { restricted, empty, roleBadge } from "./components.js";

export function renderUsers() {
  if (state.user.role !== "admin" && state.user.role !== "super_admin") return restricted("Only admins can manage user accounts.");
  return `
    ${renderAddUserForm()}
    <article class="card">
      <div class="section-heading"><div><h2>Staff Accounts</h2><p>${state.users.length} users</p></div>${icons.user}</div>
      ${state.users.length ? `
        <div class="table-responsive">
          <table>
            <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Nutrition Club</th><th>Status</th><th></th></tr></thead>
            <tbody>${state.users.map(userRow).join("")}</tbody>
          </table>
        </div>
      ` : empty("No users yet.")}
    </article>
  `;
}

export function renderAddUserForm() {
  const open = state.addUserOpen;
  return `
    <article class="card ${open ? "open" : "collapsed"}">
      <button class="section-heading collapsible-heading" type="button" data-action="toggle-add-user" aria-expanded="${open}">
        <div><h2>Add Staff Account</h2><p>Create a new login for a coach, supervisor, or admin</p></div>
        <span class="collapse-indicator">${open ? "Hide" : "Add User"}</span>
      </button>
      ${open ? `
        <form id="addUserForm" class="form-grid">
          <label><span class="label">Full Name</span><input name="name" placeholder="Full name" required /></label>
          <label><span class="label">Username</span><input name="username" placeholder="Login username" required /></label>
          <label><span class="label">Password</span>
            <div class="input-wrap">
              ${icons.lock}
              <input id="newUserPassword" name="password" class="password-input" type="password" placeholder="Password" required />
              <button class="ghost-icon" type="button" data-action="toggle-password" data-target="newUserPassword" aria-label="Show password">${icons.eye}</button>
            </div>
          </label>
          <label><span class="label">Role</span><select name="role">
            <option value="coach">Coach</option>
            <option value="supervisor">Supervisor</option>
            <option value="nc_organiser">NC Organiser</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select></label>
          <label><span class="label">Nutrition Club</span>${clubCombobox("nutritionClub")}</label>
          <div class="wide modal-actions"><button class="btn btn-primary" type="submit">${icons.plus} Create Account</button></div>
        </form>
      ` : ""}
    </article>
  `;
}

export function userRow(user) {
  const isSelf = user.id === state.user.id;
  return `
    <tr>
      <td><strong>${escapeHtml(user.name)}</strong></td>
      <td>${escapeHtml(user.username)}</td>
      <td>${roleBadge(user.role)}</td>
      <td>${escapeHtml(user.nutrition_club || "-")}</td>
      <td><span class="badge ${Number(user.active ?? 1) === 1 ? "badge-emerald" : "badge-red"}">${Number(user.active ?? 1) === 1 ? "Active" : "Inactive"}</span></td>
      <td>
        ${!isSelf ? `<button class="btn btn-outline mini" data-action="toggle-user-active" data-user-id="${user.id}" data-active="${Number(user.active ?? 1) === 1 ? "0" : "1"}">${Number(user.active ?? 1) === 1 ? "Deactivate" : "Activate"}</button>` : `<span class="readonly-label">Current user</span>`}
      </td>
    </tr>
  `;
}

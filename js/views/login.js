import { icons } from "../state.js";
import { escapeHtml } from "../helpers.js";

export function brandLockup() {
  return `
    <div class="brand-lockup">
      <div class="brand-icon">${icons.activity}</div>
      <h1>HealthRank Pro</h1>
      <p>Health &amp; Nutrition Club Tracker</p>
    </div>
  `;
}

export function renderLogin(error = "") {
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

export function renderLoading() {
  return `<main class="login-shell"><section class="login-panel">${brandLockup()}<p class="footnote">Loading...</p></section></main>`;
}

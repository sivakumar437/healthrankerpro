import { state } from "../state.js";
import { api } from "../api.js";
import { render } from "../renderer.js";

export function updateLoginButton() {
  const btn = document.getElementById("submitLogin");
  const user = document.getElementById("username");
  const pass = document.getElementById("password");
  if (btn && user && pass) btn.disabled = !user.value.trim() || !pass.value;
}

export function togglePassword() {
  const input = document.getElementById("password");
  if (input) input.type = input.type === "password" ? "text" : "password";
}

export async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("username")?.value.trim();
  const password = document.getElementById("password")?.value;
  if (!username || !password) return;
  const btn = document.getElementById("submitLogin");
  if (btn) { btn.disabled = true; btn.textContent = "Signing in..."; }
  try {
    const data = await api("/api/login", { method: "POST", body: JSON.stringify({ username, password }) });
    state.user = data.user;
    state.loginError = "";
    state.route = "dashboard";
    window.location.reload();
  } catch (err) {
    state.loginError = err.message || "Invalid credentials.";
    render();
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Sign in"; }
  }
}

import { state, icons } from "../state.js";
import { escapeHtml, formatDateOnly, formatCurrency, paymentBenefitValue, staffOptions, paymentModeSelect, cardTypeSelect, availableCardTypesFor, cardStandardAmount } from "../helpers.js";
import { restricted, empty } from "./components.js";

export function renderPayments() {
  if (!["admin", "supervisor", "coach", "nc_organiser", "super_admin"].includes(state.user.role)) return restricted("You do not have permission to view payments.");
  const f = state.paymentFilters || {};
  const selectedMember = state.members.find((m) => String(m.id) === String(f.memberId));
  const filtered = filteredPayments();
  const cardTypes = [...new Set(state.members.flatMap((m) => m.card_type ? [m.card_type] : []))].sort();
  return `
    ${renderPaymentFilters(f, selectedMember, cardTypes)}
    ${f.showSum ? `
      <article class="payment-total-summary">
        <div class="payment-total-copy">
          <span>TOTAL PAYMENTS</span>
          <strong>${formatCurrency(state.paymentTotal)}</strong>
          <small>${filtered.length} result${filtered.length === 1 ? "" : "s"}</small>
        </div>
        <div class="payment-total-icon">${icons.wallet}</div>
      </article>
    ` : ""}
    <div class="table-card payments-table">
      <table>
        <thead><tr><th>Date</th><th>Member</th><th>Card Type</th><th>Payment Type</th><th>Payments</th><th>Benefit / Status</th><th>Recorded By</th><th>Created</th><th>Notes</th></tr></thead>
        <tbody>${filtered.map(paymentRow).join("") || `<tr><td colspan="9">${empty("No payments match the selected filters.")}</td></tr>`}</tbody>
        ${f.showSum && filtered.length ? `<tfoot><tr><td colspan="4"><strong>Total Payments</strong></td><td><strong>${formatCurrency(state.paymentTotal)}</strong></td><td colspan="4"></td></tr></tfoot>` : ""}
      </table>
    </div>
  `;
}

export function renderPaymentFilters(f = {}, selectedMember, cardTypes = []) {
  f = f || state.paymentFilters || {};
  if (!cardTypes.length) cardTypes = [...new Set(state.members.flatMap((m) => m.card_type ? [m.card_type] : []))].sort();
  return `
    <article class="card audit-filter-card">
      <div class="section-heading">
        <div><h2>Payments</h2><p>Latest 20 payments are shown by default. Filter by date, card type, or member.</p></div>
        ${icons.wallet}
      </div>
      ${selectedMember ? `
        <div class="selected-filter">
          <span>Showing payments for <strong>${escapeHtml(selectedMember.name)}</strong></span>
          <button class="btn btn-outline mini" data-action="clear-payment-member" type="button">Show All Members</button>
        </div>
      ` : ""}
      <form id="paymentFilterForm" class="form-grid">
        <label><span class="label">From Date</span><input name="from" type="date" value="${escapeHtml(f.from || "")}" /></label>
        <label><span class="label">To Date</span><input name="to" type="date" value="${escapeHtml(f.to || "")}" /></label>
        <label><span class="label">Card Type</span>
          <select name="cardType">
            <option value="">All card types</option>
            ${cardTypes.map((type) => `<option value="${escapeHtml(type)}" ${f.cardType === type ? "selected" : ""}>${escapeHtml(type)}</option>`).join("")}
          </select>
        </label>
        <div class="payment-filter-actions">
          <label class="toggle-field">
            <span class="label">Show Sum</span>
            <input id="paymentShowSum" name="showSum" type="checkbox" ${f.showSum ? "checked" : ""} />
            <span class="toggle-switch" aria-hidden="true"></span>
          </label>
          <button class="btn btn-outline" type="button" data-action="clear-payment-filters">Clear</button>
          <button class="btn btn-primary" type="submit">${icons.check} Apply Filters</button>
        </div>
      </form>
    </article>
  `;
}

export function paymentRow(p) {
  const benefitValue = paymentBenefitValue(p);
  const paymentAmount = Number(p.amount || 0);
  return `
    <tr>
      <td>${formatDateOnly(p.payment_date)}</td>
      <td><button class="table-member-link" data-action="select-payment-member" data-member-id="${p.member_id}">${escapeHtml(p.member_name)}</button></td>
      <td>${escapeHtml(p.card_type || "-")}</td>
      <td><span class="mini-badge">${escapeHtml(p.payment_mode || "-")}</span></td>
      <td class="payment-amount-cell">${paymentAmount > 0 ? `<strong>${formatCurrency(paymentAmount)}</strong>` : "-"}</td>
      <td class="payment-benefit-cell">${benefitValue > 0 ? `<s class="benefit-value">${formatCurrency(benefitValue)}</s><small>Complimentary</small>` : "-"}</td>
      <td>${escapeHtml(p.created_by || p.recorded_by || "-")}</td>
      <td>${escapeHtml(p.created_date || "-")}</td>
      <td>${escapeHtml(p.notes || "-")}</td>
    </tr>
  `;
}

export function filteredPayments() {
  const f = state.paymentFilters || {};
  return state.payments.filter((p) => {
    if (f.member && !String(p.member_name || "").toLowerCase().includes(f.member.toLowerCase())) return false;
    if (f.cardType && p.card_type !== f.cardType) return false;
    if (f.mode && p.payment_mode !== f.mode) return false;
    if (f.from && p.payment_date < f.from) return false;
    if (f.to && p.payment_date > f.to) return false;
    return true;
  });
}

import { state, icons } from "../state.js";
import { escapeHtml, formatDateOnly, formatCurrency, paymentBenefitValue, staffOptions, paymentModeSelect, cardTypeSelect, availableCardTypesFor, cardStandardAmount } from "../helpers.js";
import { restricted, empty } from "./components.js";

export function renderPayments() {
  if (!["admin", "supervisor", "coach", "nc_organiser", "super_admin"].includes(state.user.role)) return restricted("You do not have permission to view payments.");
  const filtered = filteredPayments();
  const total = filtered.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  return `
    ${renderPaymentFilters()}
    <div class="payment-summary">
      <span>${filtered.length} payments</span>
      <strong>Total: ${formatCurrency(total)}</strong>
    </div>
    <article class="card">
      <div class="section-heading"><div><h2>Payment History</h2><p>Card purchases and renewal history</p></div>${icons.activity}</div>
      ${filtered.length ? `
        <div class="table-responsive">
          <table>
            <thead><tr><th>Member</th><th>Card Type</th><th>Amount</th><th>Mode</th><th>Benefit</th><th>Date</th><th>Notes</th></tr></thead>
            <tbody>${filtered.map(paymentRow).join("")}</tbody>
          </table>
        </div>
      ` : empty("No payments match the current filters.")}
    </article>
  `;
}

export function renderPaymentFilters() {
  const f = state.paymentFilters || {};
  return `
    <article class="card filter-card">
      <div class="section-heading"><div><h2>Filter Payments</h2></div></div>
      <div class="filter-row">
        <label><span class="label">Member</span><input id="paymentFilterMember" value="${escapeHtml(f.member || "")}" placeholder="Search by name..." /></label>
        <label><span class="label">Card Type</span><select id="paymentFilterCardType">
          <option value="">All types</option>
          <option value="Weight Loss" ${f.cardType === "Weight Loss" ? "selected" : ""}>Weight Loss</option>
          <option value="Weight Gain" ${f.cardType === "Weight Gain" ? "selected" : ""}>Weight Gain</option>
          <option value="Body Composition" ${f.cardType === "Body Composition" ? "selected" : ""}>Body Composition</option>
        </select></label>
        <label><span class="label">Payment Mode</span><select id="paymentFilterMode">
          <option value="">All modes</option>
          <option value="Cash" ${f.mode === "Cash" ? "selected" : ""}>Cash</option>
          <option value="UPI" ${f.mode === "UPI" ? "selected" : ""}>UPI</option>
          <option value="Card" ${f.mode === "Card" ? "selected" : ""}>Card</option>
        </select></label>
        <label><span class="label">From Date</span><input id="paymentFilterFrom" type="date" value="${f.from || ""}" /></label>
        <label><span class="label">To Date</span><input id="paymentFilterTo" type="date" value="${f.to || ""}" /></label>
        <div class="filter-actions">
          <button class="btn btn-primary" data-action="apply-payment-filters">${icons.search} Apply</button>
          <button class="btn btn-outline" data-action="clear-payment-filters">Clear</button>
        </div>
      </div>
    </article>
  `;
}

export function paymentRow(p) {
  return `
    <tr>
      <td><strong>${escapeHtml(p.member_name)}</strong></td>
      <td>${escapeHtml(p.card_type)}</td>
      <td><strong>${formatCurrency(p.amount)}</strong></td>
      <td>${escapeHtml(p.payment_mode || "-")}</td>
      <td>${escapeHtml(p.benefit_value || "-")}</td>
      <td>${formatDateOnly(p.payment_date)}</td>
      <td>${escapeHtml(p.notes || "")}</td>
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

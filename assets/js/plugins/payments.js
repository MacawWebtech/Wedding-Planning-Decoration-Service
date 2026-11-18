/**
 * Wedding Template — plugins/payments.js
 * Stripe Payment Link + PayPal.Me placeholders (Packages + Dashboard Payments).
 *
 * Markup contract:
 *   <a class="btn" href="#" data-pay-provider="stripe" data-pay-key="signature">Pay with card</a>
 *   <a class="btn" href="#" data-pay-provider="paypal" data-pay-amount="500">PayPal</a>
 *   <p data-pay-status aria-live="polite"></p>   (message area, optional)
 *
 * No secret keys belong in front-end code. Stripe Payment Links and PayPal.Me
 * links are public URLs, which is why they are safe to place here.
 * Payment confirmation must come from Stripe/PayPal (email receipts or webhooks
 * on your own server) — this script never marks anything as "paid".
 */
'use strict';

const PaymentConfig = {
  /** TODO: create Payment Links in the Stripe Dashboard and paste them here. */
  stripeLinks: {
    essential: '',
    signature: '',
    luxe: '',
    bespoke: '',
    deposit: '',
    installment: ''
  },
  /** TODO: your PayPal.Me username, e.g. 'everbloomweddings'. */
  paypalMe: '',
  /** Currency code appended to PayPal.Me amounts. TODO: change if needed. */
  currency: 'USD'
};

const Payments = {
  /** Configure buttons; unconfigured ones show an honest notice on click. */
  init() {
    document.querySelectorAll('[data-pay-provider]').forEach((btn) => {
      const url = this.urlFor(btn);
      if (url) {
        btn.href = url;
        btn.target = '_blank';
        btn.rel = 'noopener';
        return;
      }
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.notify(btn, 'Online payments are not connected yet. Your planner will share a secure payment link, or add your Stripe / PayPal links in assets/js/plugins/payments.js.');
      });
    });
  },

  /** Build the destination URL for a button, or '' when not configured. */
  urlFor(btn) {
    const provider = btn.dataset.payProvider;
    if (provider === 'stripe') return PaymentConfig.stripeLinks[btn.dataset.payKey] || '';
    if (provider === 'paypal' && PaymentConfig.paypalMe) {
      const amount = btn.dataset.payAmount ? '/' + btn.dataset.payAmount + PaymentConfig.currency : '';
      return 'https://paypal.me/' + PaymentConfig.paypalMe + amount;
    }
    return '';
  },

  /** Show a message in the nearest [data-pay-status] region. */
  notify(btn, text) {
    const scope = btn.closest('[data-pay-scope]') || document;
    const box = scope.querySelector('[data-pay-status]') || document.querySelector('[data-pay-status]');
    if (!box) return;
    box.className = 'form-status is-visible is-info';
    box.innerHTML = '<i class="bi bi-info-circle" aria-hidden="true"></i><span></span>';
    box.querySelector('span').textContent = text;
  }
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => Payments.init());
else Payments.init();

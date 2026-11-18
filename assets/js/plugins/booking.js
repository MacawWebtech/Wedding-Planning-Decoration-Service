/**
 * Wedding Template — plugins/booking.js
 * "Book a consultation" calendar integration point (Calendly / Google Calendar).
 *
 * Any element with [data-booking] stays hidden until a URL is configured below.
 * When set, links receive the URL and open in a new tab.
 */
'use strict';

const BookingConfig = {
  /**
   * TODO: paste your scheduling link, for example:
   *   Calendly:        'https://calendly.com/your-studio/consultation'
   *   Google Calendar: 'https://calendar.app.google/XXXXXXXX' (appointment schedule link)
   * Leave empty to keep booking buttons hidden.
   */
  url: ''
};

const Booking = {
  /** Reveal and wire every [data-booking] element when a URL is set. */
  init() {
    const els = Array.from(document.querySelectorAll('[data-booking]'));
    if (!BookingConfig.url) { els.forEach((el) => { el.hidden = true; }); return; }
    els.forEach((el) => {
      const link = el.matches('a') ? el : el.querySelector('a');
      if (link) {
        link.href = BookingConfig.url;
        link.target = '_blank';
        link.rel = 'noopener';
      }
      el.hidden = false;
    });
  }
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => Booking.init());
else Booking.init();

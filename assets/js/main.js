/**
 * Wedding Template — main.js
 * Version 1.0.0
 * Vanilla ES6+. One object per feature, each with an init() method.
 * JavaScript only enhances existing HTML (filter / show-hide / validate);
 * it never generates content cards.
 */
'use strict';

/* ==========================================================================
   CONFIG — TODO: edit these values for your business
   ========================================================================== */
const Config = {
  /** Storage keys used for theme, direction and dashboard sidebar state. */
  storageKeys: { theme: 'wt-theme', dir: 'wt-dir', sidebar: 'wt-sidebar' },

  /**
   * Google Maps embed URL. TODO: paste the "Embed a map" src from Google Maps,
   * e.g. 'https://www.google.com/maps/embed?pb=...'. Empty = friendly placeholder.
   */
  mapEmbedUrl: 'https://www.google.com/maps?q=Jaipur,Rajasthan,India&z=13&output=embed',

  /**
   * Newsletter (Mailchimp / ConvertKit). TODO: paste your form action URL.
   * Used only when the <form> has no action attribute of its own.
   * Mailchimp: https://YOURDOMAIN.us1.list-manage.com/subscribe/post?u=XXX&id=XXX
   * ConvertKit: https://app.convertkit.com/forms/XXXXXXX/subscriptions
   */
  newsletter: { provider: 'mailchimp', actionUrl: '' },

  /** WhatsApp number in international format, digits only. TODO: replace. */
  whatsappNumber: '15550123456',
  whatsappMessage: 'Hello! We would love to talk about our wedding.'
};

/* ==========================================================================
   UTILITIES
   ========================================================================== */
const Utils = {
  /** Query a single element. */
  qs: (sel, ctx = document) => ctx.querySelector(sel),
  /** Query all elements as an array. */
  qsa: (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel)),
  /** True when the user asked the OS to reduce motion. */
  reducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  /** Safe localStorage read (private mode / blocked storage). */
  get(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } },
  /** Safe localStorage write. */
  set(key, value) { try { window.localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ } },
  /** True when the document direction is right-to-left. */
  isRtl: () => document.documentElement.getAttribute('dir') === 'rtl'
};

/* ==========================================================================
   THEME — light / dark, saved in localStorage, defaults to system preference
   ========================================================================== */
const Theme = {
  /** Wire up toggles and follow system changes when no choice is stored. */
  init() {
    const stored = Utils.get(Config.storageKeys.theme);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    this.apply(stored || (media.matches ? 'dark' : 'light'), false);
    media.addEventListener('change', (e) => {
      if (!Utils.get(Config.storageKeys.theme)) this.apply(e.matches ? 'dark' : 'light', false);
    });
    Utils.qsa('.js-theme-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        this.apply(next, true);
      });
    });
  },
  /** Apply a theme to <html>, update toggle labels and notify listeners. */
  apply(theme, save) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-bs-theme', theme);
    if (save) Utils.set(Config.storageKeys.theme, theme);
    Utils.qsa('.js-theme-toggle').forEach((btn) => {
      const isDark = theme === 'dark';
      btn.setAttribute('aria-pressed', String(isDark));
      btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      const label = btn.querySelector('.tool-label');
      if (label) label.textContent = isDark ? 'Light mode' : 'Dark mode';
    });
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }
};

/* ==========================================================================
   DIRECTION — LTR / RTL toggle (swaps Bootstrap build and sets dir)
   ========================================================================== */
const Direction = {
  /** Apply the stored direction and bind toggles. */
  init() {
    this.apply(Utils.get(Config.storageKeys.dir) || document.documentElement.getAttribute('dir') || 'ltr', false);
    Utils.qsa('.js-dir-toggle').forEach((btn) => {
      btn.addEventListener('click', () => this.apply(Utils.isRtl() ? 'ltr' : 'rtl', true));
    });
  },
  /** Set dir on <html>, swap Bootstrap LTR/RTL stylesheet, update labels. */
  apply(dir, save) {
    document.documentElement.setAttribute('dir', dir);
    const bs = document.getElementById('bootstrap-css');
    if (bs) {
      // Works for CDN or self-hosted files named bootstrap.min.css / bootstrap.rtl.min.css
      const href = bs.getAttribute('href');
      const target = dir === 'rtl'
        ? href.replace(/bootstrap\.min\.css/, 'bootstrap.rtl.min.css')
        : href.replace(/bootstrap\.rtl\.min\.css/, 'bootstrap.min.css');
      if (href !== target) bs.setAttribute('href', target);
    }
    if (save) Utils.set(Config.storageKeys.dir, dir);
    Utils.qsa('.js-dir-toggle').forEach((btn) => {
      const rtl = dir === 'rtl';
      btn.setAttribute('aria-pressed', String(rtl));
      btn.setAttribute('aria-label', rtl ? 'Switch to left-to-right layout' : 'Switch to right-to-left layout');
      const label = btn.querySelector('.tool-label');
      if (label) label.textContent = rtl ? 'LTR' : 'RTL';
    });
    document.dispatchEvent(new CustomEvent('dirchange', { detail: { dir } }));
  }
};

/* ==========================================================================
   NAV — hamburger overlay menu + keyboard-operable sub-menus
   ========================================================================== */
const Nav = {
  /** Bind hamburger, sub-menu buttons, Esc and outside clicks. */
  init() {
    this.header = Utils.qs('.site-header');
    if (!this.header) return;
    this.toggle = Utils.qs('.nav-toggle', this.header);
    this.panel = Utils.qs('.nav-panel', this.header);
    this.desktop = window.matchMedia('(min-width: 1024px)');

    if (this.toggle && this.panel) {
      this.toggle.addEventListener('click', () => this.setOpen(this.toggle.getAttribute('aria-expanded') !== 'true'));
    }

    Utils.qsa('.nav-sub-toggle', this.header).forEach((btn) => {
      btn.addEventListener('click', () => {
        const li = btn.closest('.has-sub');
        const open = !li.classList.contains('is-open');
        Utils.qsa('.has-sub.is-open', this.header).forEach((o) => { if (o !== li) this.closeSub(o); });
        li.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const openSub = Utils.qs('.has-sub.is-open', this.header);
      if (openSub) { this.closeSub(openSub); Utils.qs('.nav-sub-toggle', openSub).focus(); return; }
      if (this.isOpen()) { this.setOpen(false); this.toggle.focus(); }
    });

    document.addEventListener('click', (e) => {
      if (!this.header.contains(e.target)) {
        Utils.qsa('.has-sub.is-open', this.header).forEach((o) => this.closeSub(o));
        if (this.isOpen()) this.setOpen(false);
      }
    });

    Utils.qsa('.nav-panel a', this.header).forEach((a) => a.addEventListener('click', () => this.setOpen(false)));
    this.desktop.addEventListener('change', () => this.setOpen(false));

    window.addEventListener('scroll', () => {
      this.header.classList.toggle('is-scrolled', window.scrollY > 8);
    }, { passive: true });
  },
  /** Whether the mobile overlay is open. */
  isOpen() { return this.toggle && this.toggle.getAttribute('aria-expanded') === 'true'; },
  /** Open or close the mobile overlay panel. */
  setOpen(open) {
    if (!this.toggle || !this.panel) return;
    this.toggle.setAttribute('aria-expanded', String(open));
    this.toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    this.panel.classList.toggle('is-open', open);
  },
  /** Close one sub-menu. */
  closeSub(li) {
    li.classList.remove('is-open');
    const b = Utils.qs('.nav-sub-toggle', li);
    if (b) b.setAttribute('aria-expanded', 'false');
  }
};

/* ==========================================================================
   REVEAL — fade-up on scroll (content stays visible without JS)
   ========================================================================== */
const Reveal = {
  /** Enable reveal only when IntersectionObserver exists and motion is allowed. */
  init() {
    const items = Utils.qsa('.reveal');
    if (!items.length || !('IntersectionObserver' in window) || Utils.reducedMotion()) return;
    document.documentElement.classList.add('reveal-ready');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach((el) => io.observe(el));
  }
};

/* ==========================================================================
   COUNTERS — animate [data-count] numbers when visible.
   Leave data-count empty to keep an "XX" placeholder (no invented stats).
   ========================================================================== */
const Counters = {
  /** Observe counters and start them once. */
  init() {
    const els = Utils.qsa('[data-count]').filter((el) => /^\d+$/.test(el.dataset.count || ''));
    if (!els.length) return;
    if (!('IntersectionObserver' in window) || Utils.reducedMotion()) {
      els.forEach((el) => { el.textContent = el.dataset.count + (el.dataset.suffix || ''); });
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        this.run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    els.forEach((el) => io.observe(el));
  },
  /** Count from 0 to target with ease-out. */
  run(el) {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1400;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
};

/* ==========================================================================
   SLIDER — scroll-snap slider with prev/next buttons (touch friendly)
   ========================================================================== */
const Slider = {
  /** Bind every .js-slider on the page. */
  init() {
    Utils.qsa('.js-slider').forEach((slider) => {
      const track = Utils.qs('.slider-track', slider);
      const prev = Utils.qs('.slider-prev', slider);
      const next = Utils.qs('.slider-next', slider);
      const status = Utils.qs('.slider-status', slider);
      if (!track) return;
      const slideWidth = () => {
        const first = track.firstElementChild;
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        return first ? first.getBoundingClientRect().width + gap : track.clientWidth;
      };
      const move = (dir) => {
        const sign = Utils.isRtl() ? -1 : 1;
        track.scrollBy({ left: dir * sign * slideWidth(), behavior: Utils.reducedMotion() ? 'auto' : 'smooth' });
      };
      const update = () => {
        const max = track.scrollWidth - track.clientWidth - 2;
        const pos = Math.abs(track.scrollLeft);
        if (prev) prev.disabled = pos <= 2;
        if (next) next.disabled = pos >= max;
        if (status) {
          const index = Math.round(pos / slideWidth()) + 1;
          status.textContent = 'Showing testimonial ' + Math.min(index, track.children.length) + ' of ' + track.children.length;
        }
      };
      if (prev) prev.addEventListener('click', () => move(-1));
      if (next) next.addEventListener('click', () => move(1));
      track.addEventListener('scroll', () => window.requestAnimationFrame(update), { passive: true });
      track.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); move(Utils.isRtl() ? -1 : 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); move(Utils.isRtl() ? 1 : -1); }
      });
      window.addEventListener('resize', update);
      document.addEventListener('dirchange', () => { track.scrollLeft = 0; update(); });
      update();
    });
  }
};

/* ==========================================================================
   FORMS — client-side validation, aria-invalid, inline errors,
   honeypot, spinner, Formspree / Netlify submission.
   Forms with no real endpoint show an honest "demo" notice (never fake success).
   ========================================================================== */
const Forms = {
  /** Messages shown under invalid fields. */
  messages: {
    required: 'This field is required.',
    email: 'Please enter a valid email address, like name@example.com.',
    tel: 'Please enter a valid phone number (digits, spaces, + and - only).',
    datePast: 'Please choose a date in the future.',
    min: 'Please enter a number greater than 0.',
    minlength: (n) => 'Please use at least ' + n + ' characters.',
    match: 'The passwords do not match.',
    group: 'Please choose at least one option.',
    checkbox: 'Please tick this box to continue.'
  },

  /** Bind all forms marked .js-validate. */
  init() {
    Utils.qsa('form.js-validate').forEach((form) => {
      form.setAttribute('novalidate', '');
      form.addEventListener('submit', (e) => this.onSubmit(e, form));
      Utils.qsa('input, select, textarea', form).forEach((field) => {
        const evt = (field.type === 'checkbox' || field.type === 'radio' || field.tagName === 'SELECT') ? 'change' : 'blur';
        field.addEventListener(evt, () => { if (form.dataset.touched) this.validateField(field, form); });
        field.addEventListener('input', () => { if (field.getAttribute('aria-invalid') === 'true') this.validateField(field, form); });
      });
    });
    Utils.qsa('input[type="date"][data-min-today]').forEach((input) => {
      input.min = new Date().toISOString().split('T')[0];
    });
  },

  /** Validate a single field; returns true when valid. */
  validateField(field, form) {
    if (field.disabled || field.closest('.hp-field') || field.type === 'hidden') return true;
    let msg = '';
    const val = (field.value || '').trim();

    if (field.dataset.group) {
      const group = Utils.qsa('[data-group="' + field.dataset.group + '"]', form);
      const ok = group.some((g) => g.checked);
      const errEl = document.getElementById(field.dataset.group + '-error');
      this.showError(errEl, ok ? '' : this.messages.group);
      group.forEach((g) => g.setAttribute('aria-invalid', String(!ok)));
      return ok;
    }

    if (field.type === 'checkbox') {
      if (field.required && !field.checked) msg = this.messages.checkbox;
    } else if (field.required && !val) {
      msg = this.messages.required;
    } else if (val) {
      if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) msg = this.messages.email;
      else if (field.type === 'tel' && !/^\+?[\d\s\-()]{7,20}$/.test(val)) msg = this.messages.tel;
      else if (field.type === 'date' && field.hasAttribute('data-min-today')) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (new Date(val + 'T00:00:00') < today) msg = this.messages.datePast;
      } else if (field.type === 'number' && field.min && Number(val) < Number(field.min)) msg = this.messages.min;
      else if (field.minLength > 0 && val.length < field.minLength) msg = this.messages.minlength(field.minLength);
      else if (field.dataset.match) {
        const other = document.getElementById(field.dataset.match);
        if (other && other.value !== field.value) msg = this.messages.match;
      }
    }

    const errEl = document.getElementById(field.id + '-error');
    this.showError(errEl, msg);
    field.setAttribute('aria-invalid', String(Boolean(msg)));
    field.classList.toggle('is-valid-field', !msg && Boolean(val) && field.type !== 'checkbox');
    return !msg;
  },

  /** Show or hide an inline error element. */
  showError(el, msg) {
    if (!el) return;
    el.innerHTML = msg ? '<i class="bi bi-exclamation-circle" aria-hidden="true"></i><span></span>' : '';
    if (msg) el.querySelector('span').textContent = msg;
    el.classList.toggle('is-visible', Boolean(msg));
  },

  /** Show a status message in the form's aria-live region. */
  status(form, type, text) {
    const box = Utils.qs('.form-status', form);
    if (!box) return;
    const icons = { success: 'bi-check-circle', error: 'bi-exclamation-triangle', info: 'bi-info-circle' };
    box.className = 'form-status is-visible is-' + type;
    box.innerHTML = '<i class="bi ' + icons[type] + '" aria-hidden="true"></i><span></span>';
    box.querySelector('span').textContent = text;
  },

  /** Handle submit: validate, honeypot, then send or show demo notice. */
  async onSubmit(e, form) {
    e.preventDefault();
    form.dataset.touched = '1';
    const fields = Utils.qsa('input, select, textarea', form);
    const seenGroups = new Set();
    let firstInvalid = null;
    fields.forEach((f) => {
      if (f.dataset.group) { if (seenGroups.has(f.dataset.group)) return; seenGroups.add(f.dataset.group); }
      if (!this.validateField(f, form) && !firstInvalid) firstInvalid = f;
    });
    if (firstInvalid) {
      firstInvalid.focus();
      this.status(form, 'error', 'Please check the highlighted fields and try again.');
      return;
    }

    const hp = Utils.qs('.hp-field input', form);
    if (hp && hp.value) return; // Bot detected: silently ignore.

    const btn = Utils.qs('[type="submit"]', form);
    if (btn) { btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true'); }

    let endpoint = form.getAttribute('action') || '';
    if (form.classList.contains('js-newsletter') && (!endpoint || endpoint === '#')) endpoint = Config.newsletter.actionUrl;
    const isNetlify = form.hasAttribute('data-netlify');
    const done = () => { if (btn) { btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); } };

    // Front-end demo forms (login/register/dashboard) or unconfigured endpoints.
    if (form.dataset.demo !== undefined || ((!endpoint || endpoint === '#') && !isNetlify)) {
      if (form.dataset.redirect) {
        window.setTimeout(() => { window.location.href = form.dataset.redirect; }, 400);
        return;
      }
      window.setTimeout(() => {
        done();
        this.status(form, 'info', form.dataset.demoMessage || 'Thanks! Your details look good. This demo form is not connected yet — add your Formspree, Netlify or Mailchimp endpoint to start receiving messages (see documentation).');
      }, 700);
      return;
    }

    try {
      const data = new FormData(form);
      const opts = isNetlify
        ? { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString() }
        : { method: 'POST', headers: { Accept: 'application/json' }, body: data };
      const res = await fetch(isNetlify ? '/' : endpoint, opts);
      if (!res.ok) throw new Error('Request failed');
      done();
      form.reset();
      Utils.qsa('.is-valid-field', form).forEach((f) => f.classList.remove('is-valid-field'));
      this.status(form, 'success', form.dataset.successMessage || 'Thank you! Your message has been sent. We will reply within two working days.');
    } catch (err) {
      done();
      this.status(form, 'error', 'Sorry, something went wrong while sending. Please try again or contact us by phone or email.');
    }
  }
};

/* ==========================================================================
   PASSWORD — show/hide toggle and strength meter
   ========================================================================== */
const Password = {
  /** Bind toggles and meters. */
  init() {
    Utils.qsa('.js-pw-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.getAttribute('aria-controls'));
        if (!input) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-pressed', String(show));
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        const icon = btn.querySelector('.bi');
        if (icon) icon.className = 'bi ' + (show ? 'bi-eye-slash' : 'bi-eye');
      });
    });
    Utils.qsa('input[data-strength]').forEach((input) => {
      const meter = document.getElementById(input.dataset.strength);
      const text = document.getElementById(input.dataset.strength + '-text');
      input.addEventListener('input', () => {
        const level = this.score(input.value);
        if (meter) meter.dataset.level = String(level);
        if (text) text.textContent = 'Password strength: ' + ['too short', 'weak', 'fair', 'good', 'strong'][level];
      });
    });
  },
  /** Score a password 0-4 using length and character variety. */
  score(pw) {
    if (!pw || pw.length < 8) return pw ? 1 : 0;
    let s = 1;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw) && pw.length >= 10) s++;
    return Math.min(s, 4);
  }
};

/* ==========================================================================
   MAP — render Google Maps iframe when Config.mapEmbedUrl is set
   ========================================================================== */
const MapEmbed = {
  /** Replace the placeholder with an iframe if a URL is configured. */
  init() {
    const box = Utils.qs('[data-map]');
    if (!box || !Config.mapEmbedUrl) return;
    const iframe = document.createElement('iframe');
    iframe.src = Config.mapEmbedUrl;
    iframe.title = 'Map showing our studio location';
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.setAttribute('allowfullscreen', '');
    box.innerHTML = '';
    box.appendChild(iframe);
  }
};

/* ==========================================================================
   COUNTDOWN — [data-countdown="YYYY-MM-DDTHH:MM:SS"]
   ========================================================================== */
const Countdown = {
  /** Start every countdown on the page. */
  init() {
    Utils.qsa('[data-countdown]').forEach((el) => {
      const target = new Date(el.dataset.countdown).getTime();
      if (Number.isNaN(target)) return;
      const parts = {
        days: Utils.qs('[data-unit="days"]', el),
        hours: Utils.qs('[data-unit="hours"]', el),
        minutes: Utils.qs('[data-unit="minutes"]', el),
        seconds: Utils.qs('[data-unit="seconds"]', el)
      };
      const summary = Utils.qs('.countdown-summary', el.parentElement || el);
      const tick = () => {
        const diff = Math.max(0, target - Date.now());
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        if (parts.days) parts.days.textContent = String(d);
        if (parts.hours) parts.hours.textContent = String(h).padStart(2, '0');
        if (parts.minutes) parts.minutes.textContent = String(m).padStart(2, '0');
        if (parts.seconds) parts.seconds.textContent = String(s).padStart(2, '0');
        if (summary) summary.textContent = d + ' days, ' + h + ' hours and ' + m + ' minutes to go';
        if (diff === 0) window.clearInterval(timer);
      };
      const timer = window.setInterval(tick, 1000);
      tick();
    });
  }
};

/* ==========================================================================
   BACK TO TOP
   ========================================================================== */
const BackToTop = {
  /** Show after scrolling and scroll smoothly to the top. */
  init() {
    const btn = Utils.qs('.back-to-top');
    if (!btn) return;
    window.addEventListener('scroll', () => btn.classList.toggle('is-visible', window.scrollY > 600), { passive: true });
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: Utils.reducedMotion() ? 'auto' : 'smooth' });
      const skip = Utils.qs('.skip-link');
      if (skip) skip.focus({ preventScroll: true });
    });
  }
};

/* ==========================================================================
   SKELETONS — remove shimmer once images load (or fail)
   ========================================================================== */
const Skeletons = {
  /** Watch images inside .skeleton wrappers. */
  init() {
    Utils.qsa('.skeleton img').forEach((img) => {
      const clear = () => { const wrap = img.closest('.skeleton'); if (wrap) wrap.classList.remove('skeleton'); };
      if (img.complete && img.naturalWidth) clear();
      else { img.addEventListener('load', clear, { once: true }); img.addEventListener('error', () => window.setTimeout(clear, 300), { once: true }); }
    });
  }
};

/* ==========================================================================
   WHATSAPP — build wa.me links from Config
   ========================================================================== */
const WhatsApp = {
  /** Set href for [data-whatsapp] links, hide them when no number is set. */
  init() {
    Utils.qsa('[data-whatsapp]').forEach((a) => {
      if (!Config.whatsappNumber) { a.hidden = true; return; }
      a.href = 'https://wa.me/' + Config.whatsappNumber + '?text=' + encodeURIComponent(Config.whatsappMessage);
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }
};

/* ==========================================================================
   PAGE SEARCH — filters the existing quick-link list on the 404 page
   ========================================================================== */
const PageSearch = {
  /** Filter list items by keywords as the user types. */
  init() {
    const form = Utils.qs('.js-page-search');
    if (!form) return;
    const input = Utils.qs('input', form);
    const list = document.getElementById(form.dataset.list);
    const live = document.getElementById(form.dataset.live);
    if (!input || !list) return;
    const items = Utils.qsa('li', list);
    const run = () => {
      const q = input.value.trim().toLowerCase();
      let shown = 0;
      items.forEach((li) => {
        const hay = (li.textContent + ' ' + (li.dataset.keywords || '')).toLowerCase();
        const match = !q || hay.includes(q);
        li.hidden = !match;
        if (match) shown++;
      });
      if (live) live.textContent = q ? shown + ' matching page' + (shown === 1 ? '' : 's') + ' found.' : '';
    };
    input.addEventListener('input', run);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      run();
      const first = items.find((li) => !li.hidden);
      if (first && input.value.trim()) Utils.qs('a', first).focus();
    });
  }
};

/* ==========================================================================
   TABS & TOOLTIPS — Bootstrap helpers (hash opens a tab, e.g. #register)
   ========================================================================== */
const BootstrapHelpers = {
  /** Init tooltips and open a tab from the URL hash. */
  init() {
    if (!window.bootstrap) return;
    Utils.qsa('[data-bs-toggle="tooltip"]').forEach((el) => new window.bootstrap.Tooltip(el));
    const hash = window.location.hash;
    if (hash) {
      const trigger = Utils.qs('[data-bs-toggle="tab"][data-bs-target="' + hash + '-pane"]');
      if (trigger) window.bootstrap.Tab.getOrCreateInstance(trigger).show();
    }
  }
};

/* ==========================================================================
   YEAR — keep copyright year current
   ========================================================================== */
const Year = {
  /** Fill [data-year] elements. */
  init() { Utils.qsa('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); }); }
};

/* ==========================================================================
   BOOT
   ========================================================================== */
const App = {
  /** Initialise every module; each one is safe when its markup is absent. */
  init() {
    [Theme, Direction, Nav, Reveal, Counters, Slider, Forms, Password, MapEmbed,
      Countdown, BackToTop, Skeletons, WhatsApp, PageSearch, BootstrapHelpers, Year]
      .forEach((mod) => { try { mod.init(); } catch (err) { /* keep other modules running */ } });
  }
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => App.init());
else App.init();

window.WeddingTemplate = { Config, Utils, Theme, Direction };

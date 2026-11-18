/**
 * Wedding Template — dashboard.js
 * Client dashboard behaviour: sidebar, progress ring, charts (Chart.js),
 * checklist logic, vendor/decor decisions, messages and notifications.
 *
 * All data is DUMMY data written in the HTML (TODO: connect to your backend).
 * Charts read their numbers from the budget table markup, so editing the
 * table updates the charts — no JS data arrays to maintain.
 */
'use strict';

const DashUtils = {
  qs: (s, c = document) => c.querySelector(s),
  qsa: (s, c = document) => Array.from(c.querySelectorAll(s)),
  /** Read a CSS custom property from <html>. */
  cssVar: (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
  /** Format a number with thousands separators. */
  money: (n) => (window.DashConfig ? window.DashConfig.currency : '$') + Number(n).toLocaleString('en-US'),
  /** Announce a message to screen readers via #dash-live. */
  announce(msg) { const live = document.getElementById('dash-live'); if (live) { live.textContent = ''; window.setTimeout(() => { live.textContent = msg; }, 50); } },
  get(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } },
  set(key, v) { try { window.localStorage.setItem(key, v); } catch (e) { /* ignore */ } }
};

/** TODO: currency symbol used by the dashboard. */
window.DashConfig = { currency: '$' };

/* ==========================================================================
   SIDEBAR — collapsible on desktop, off-canvas on mobile
   ========================================================================== */
const Sidebar = {
  /** Bind toggle, close, backdrop and Esc. */
  init() {
    this.sidebar = document.getElementById('dash-sidebar');
    this.backdrop = document.getElementById('dash-backdrop');
    if (!this.sidebar) return;
    this.desktop = window.matchMedia('(min-width: 1024px)');
    if (DashUtils.get('wt-sidebar') === 'collapsed') document.documentElement.classList.add('sidebar-collapsed');

    DashUtils.qsa('.js-sidebar-toggle').forEach((btn) => btn.addEventListener('click', () => this.toggle(btn)));
    DashUtils.qsa('.dash-close').forEach((btn) => btn.addEventListener('click', () => this.closeMobile()));
    if (this.backdrop) this.backdrop.addEventListener('click', () => this.closeMobile());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.sidebar.classList.contains('is-open')) this.closeMobile(); });
    this.desktop.addEventListener('change', () => this.closeMobile());
    this.sync();
  },
  /** Toggle collapse (desktop) or open state (mobile). */
  toggle() {
    if (this.desktop.matches) {
      const collapsed = document.documentElement.classList.toggle('sidebar-collapsed');
      DashUtils.set('wt-sidebar', collapsed ? 'collapsed' : 'expanded');
    } else if (this.sidebar.classList.contains('is-open')) {
      this.closeMobile();
    } else {
      this.sidebar.classList.add('is-open');
      if (this.backdrop) this.backdrop.hidden = false;
      const first = DashUtils.qs('a', this.sidebar);
      if (first) first.focus();
    }
    this.sync();
  },
  /** Close the mobile off-canvas sidebar. */
  closeMobile() {
    const wasOpen = this.sidebar.classList.contains('is-open');
    this.sidebar.classList.remove('is-open');
    if (this.backdrop) this.backdrop.hidden = true;
    this.sync();
    if (wasOpen) { const t = DashUtils.qs('.js-sidebar-toggle'); if (t) t.focus(); }
  },
  /** Keep aria-expanded in sync with the visible state. */
  sync() {
    const expanded = this.desktop.matches
      ? !document.documentElement.classList.contains('sidebar-collapsed')
      : this.sidebar.classList.contains('is-open');
    DashUtils.qsa('.js-sidebar-toggle').forEach((b) => {
      b.setAttribute('aria-expanded', String(expanded));
      b.setAttribute('aria-label', expanded ? 'Collapse navigation' : 'Expand navigation');
    });
  }
};

/* ==========================================================================
   PROGRESS RING — SVG ring driven by data-progress (0-100)
   ========================================================================== */
const ProgressRing = {
  /** Set stroke offset for each ring. */
  init() {
    DashUtils.qsa('.progress-ring[data-progress]').forEach((ring) => this.set(ring, Number(ring.dataset.progress)));
  },
  /** Update a ring to a percentage. */
  set(ring, pct) {
    const circle = DashUtils.qs('.ring-fg', ring);
    const label = DashUtils.qs('.ring-label strong', ring);
    if (!circle) return;
    const r = Number(circle.getAttribute('r'));
    const c = 2 * Math.PI * r;
    circle.style.strokeDasharray = String(c);
    circle.style.strokeDashoffset = String(c * (1 - Math.max(0, Math.min(100, pct)) / 100));
    if (label) label.textContent = Math.round(pct) + '%';
    ring.setAttribute('aria-label', 'Planning checklist ' + Math.round(pct) + ' percent complete');
  }
};

/* ==========================================================================
   CHARTS — doughnut (spend by category) + bar (planned vs actual)
   Source rows: any element with data-category + data-planned/data-actual
   inside the container referenced by the canvas's data-source attribute.
   ========================================================================== */
const Charts = {
  instances: [],
  /** Build charts if Chart.js loaded; otherwise show the text fallback. */
  init() {
    this.canvases = DashUtils.qsa('canvas[data-chart]');
    if (!this.canvases.length) return;
    if (!window.Chart) {
      this.canvases.forEach((cv) => {
        const box = cv.closest('.chart-box');
        if (box) box.classList.remove('skeleton');
        cv.hidden = true;
        const fb = box && DashUtils.qs('.chart-fallback', box);
        if (fb) fb.hidden = false;
      });
      return;
    }
    this.render();
    document.addEventListener('themechange', () => this.render());
  },
  /** Read rows from the HTML data source. */
  rows(selector) {
    const src = DashUtils.qs(selector);
    if (!src) return [];
    return DashUtils.qsa('[data-category]', src).map((el) => ({
      label: el.dataset.category,
      planned: Number(el.dataset.planned || 0),
      actual: Number(el.dataset.actual || 0)
    }));
  },
  /** Validated categorical colours from CSS variables (fixed order). */
  palette() { return [1, 2, 3, 4, 5, 6, 7, 8].map((i) => DashUtils.cssVar('--chart-' + i)); },
  /** (Re)create all charts with the current theme colours. */
  render() {
    this.instances.forEach((c) => c.destroy());
    this.instances = [];
    const text = DashUtils.cssVar('--chart-text');
    const grid = DashUtils.cssVar('--chart-grid');
    const surface = DashUtils.cssVar('--color-surface-2');
    const font = { family: DashUtils.cssVar('--font-body') || 'Jost, sans-serif', size: 13 };
    const colors = this.palette();
    const tooltip = {
      backgroundColor: DashUtils.cssVar('--color-text'),
      titleColor: DashUtils.cssVar('--color-bg'),
      bodyColor: DashUtils.cssVar('--color-bg'),
      padding: 10,
      cornerRadius: 8,
      callbacks: { label: (ctx) => ' ' + (ctx.dataset.label ? ctx.dataset.label + ': ' : ctx.label + ': ') + DashUtils.money(ctx.parsed.y !== undefined ? ctx.parsed.y : ctx.parsed) }
    };

    this.canvases.forEach((cv) => {
      const rows = this.rows(cv.dataset.source);
      const type = cv.dataset.chart;
      let config;
      if (type === 'doughnut') {
        const field = cv.dataset.field || 'actual';
        config = {
          type: 'doughnut',
          data: {
            labels: rows.map((r) => r.label),
            datasets: [{ data: rows.map((r) => r[field]), backgroundColor: colors.slice(0, rows.length), borderColor: surface, borderWidth: 2, hoverOffset: 6 }]
          },
          options: {
            responsive: true, maintainAspectRatio: false, cutout: '64%',
            plugins: {
              legend: { position: 'bottom', labels: { color: text, font, usePointStyle: true, pointStyle: 'circle', padding: 14, boxWidth: 8 } },
              tooltip: Object.assign({}, tooltip, { callbacks: { label: (ctx) => ' ' + ctx.label + ': ' + DashUtils.money(ctx.parsed) } })
            }
          }
        };
      } else {
        config = {
          type: 'bar',
          data: {
            labels: rows.map((r) => r.label),
            datasets: [
              { label: 'Planned', data: rows.map((r) => r.planned), backgroundColor: colors[0], borderRadius: 4, borderSkipped: 'start', maxBarThickness: 22, categoryPercentage: 0.7, barPercentage: 0.92 },
              { label: 'Actual', data: rows.map((r) => r.actual), backgroundColor: colors[1], borderRadius: 4, borderSkipped: 'start', maxBarThickness: 22, categoryPercentage: 0.7, barPercentage: 0.92 }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
              x: { grid: { display: false }, ticks: { color: text, font }, border: { color: grid } },
              y: { beginAtZero: true, grid: { color: grid }, border: { display: false }, ticks: { color: text, font, callback: (v) => DashUtils.money(v) } }
            },
            plugins: {
              legend: { position: 'top', align: 'end', labels: { color: text, font, usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 10 } },
              tooltip
            }
          }
        };
      }
      const chart = new window.Chart(cv, config);
      this.instances.push(chart);
      const box = cv.closest('.chart-box');
      if (box) box.classList.remove('skeleton');
    });
  }
};

/* ==========================================================================
   CHECKLIST — tick/untick, per-group progress, filters, add task
   ========================================================================== */
const Checklist = {
  /** Bind checkboxes, filter buttons and the add-task form. */
  init() {
    this.root = DashUtils.qs('.js-checklist');
    if (!this.root) return;
    this.filter = 'all';
    this.root.addEventListener('change', (e) => {
      if (!e.target.matches('.task .form-check-input')) return;
      const task = e.target.closest('.task');
      task.classList.toggle('is-done', e.target.checked);
      this.update();
      DashUtils.announce((e.target.checked ? 'Marked done: ' : 'Marked pending: ') + DashUtils.qs('.task-title', task).textContent);
    });
    DashUtils.qsa('.js-task-filter button').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.filter = btn.dataset.filter;
        DashUtils.qsa('.js-task-filter button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        this.applyFilter();
        DashUtils.announce('Showing ' + btn.textContent.trim().toLowerCase() + ' tasks');
      });
    });
    const form = DashUtils.qs('.js-add-task');
    if (form) form.addEventListener('submit', (e) => this.add(e, form));
    this.update();
  },
  /** Show/hide tasks for the active filter. */
  applyFilter() {
    DashUtils.qsa('.task', this.root).forEach((t) => {
      const done = t.classList.contains('is-done');
      t.hidden = (this.filter === 'done' && !done) || (this.filter === 'pending' && done);
    });
  },
  /** Recalculate per-group and overall progress. */
  update() {
    let total = 0; let done = 0;
    DashUtils.qsa('.task-group', this.root).forEach((group) => {
      const tasks = DashUtils.qsa('.task', group);
      const d = tasks.filter((t) => t.classList.contains('is-done')).length;
      total += tasks.length; done += d;
      const pct = tasks.length ? Math.round((d / tasks.length) * 100) : 0;
      const bar = DashUtils.qs('.progress', group);
      if (bar) { bar.setAttribute('aria-valuenow', String(pct)); DashUtils.qs('.progress-bar', bar).style.width = pct + '%'; }
      const count = DashUtils.qs('.task-count', group);
      if (count) count.textContent = d + ' of ' + tasks.length + ' done';
    });
    const overall = total ? (done / total) * 100 : 0;
    const ring = DashUtils.qs('.progress-ring');
    if (ring) ProgressRing.set(ring, overall);
    const summary = DashUtils.qs('.js-checklist-summary');
    if (summary) summary.textContent = done + ' of ' + total + ' tasks complete';
    this.applyFilter();
  },
  /** Add a task by cloning the <template id="task-template"> markup. */
  add(e, form) {
    e.preventDefault();
    const title = DashUtils.qs('#new-task-title', form);
    const err = document.getElementById('new-task-title-error');
    if (!title.value.trim()) {
      title.setAttribute('aria-invalid', 'true');
      if (err) { err.textContent = 'Please enter a task name.'; err.classList.add('is-visible'); }
      title.focus();
      return;
    }
    title.setAttribute('aria-invalid', 'false');
    if (err) { err.textContent = ''; err.classList.remove('is-visible'); }
    const tpl = document.getElementById('task-template');
    const group = document.getElementById(DashUtils.qs('#new-task-group', form).value);
    if (!tpl || !group) return;
    const node = tpl.content.firstElementChild.cloneNode(true);
    const id = 'task-new-' + Date.now();
    const cb = DashUtils.qs('input', node);
    cb.id = id;
    const label = DashUtils.qs('label', node);
    label.setAttribute('for', id);
    label.textContent = title.value.trim();
    const due = DashUtils.qs('#new-task-due', form).value;
    DashUtils.qs('[data-slot="due"]', node).textContent = due ? new Date(due + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date';
    DashUtils.qs('[data-slot="who"]', node).textContent = DashUtils.qs('#new-task-who', form).value;
    DashUtils.qs('.task-list', group).appendChild(node);
    DashUtils.announce('Task added: ' + title.value.trim());
    form.reset();
    this.update();
    title.focus();
  }
};

/* ==========================================================================
   DECISIONS — vendor & decor approve / request change / comment
   ========================================================================== */
const Decisions = {
  /** Delegate clicks on [data-action] buttons inside .js-decision cards. */
  init() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const card = btn.closest('.js-decision');
      if (!card) return;
      const badge = DashUtils.qs('.js-status', card);
      const name = (DashUtils.qs('h2, h3', card) || {}).textContent || 'Item';
      const map = {
        approve: ['Approved', 'is-success', ' approved'],
        book: ['Booked', 'is-success', ' marked as booked'],
        change: ['Change requested', 'is-warning', ': change requested — your planner has been notified (demo)'],
        decline: ['Declined', 'is-danger', ' declined']
      };
      const m = map[btn.dataset.action];
      if (!m || !badge) return;
      badge.textContent = m[0];
      badge.className = 'badge-soft badge-status js-status ' + m[1];
      DashUtils.announce(name.trim() + m[2]);
    });
    DashUtils.qsa('.js-comment-form').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = DashUtils.qs('textarea, input', form);
        const text = input.value.trim();
        if (!text) { input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
        input.setAttribute('aria-invalid', 'false');
        const list = document.getElementById(form.dataset.list);
        const li = document.createElement('li');
        li.textContent = 'You: ' + text;
        list.appendChild(li);
        input.value = '';
        DashUtils.announce('Comment added');
      });
    });
    DashUtils.qsa('.js-vendor-filter button').forEach((btn) => {
      btn.addEventListener('click', () => {
        DashUtils.qsa('.js-vendor-filter button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        const f = btn.dataset.filter;
        DashUtils.qsa('.js-vendor').forEach((v) => {
          v.hidden = f !== 'all' && DashUtils.qs('.js-status', v).textContent.trim().toLowerCase() !== f;
        });
      });
    });
  }
};

/* ==========================================================================
   MESSAGES — append a sent bubble (demo only, nothing leaves the browser)
   ========================================================================== */
const Messages = {
  /** Bind the chat form and "mark all read". */
  init() {
    const form = DashUtils.qs('.js-chat-form');
    const thread = DashUtils.qs('.js-chat-thread');
    if (form && thread) {
      thread.scrollTop = thread.scrollHeight;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = DashUtils.qs('input', form);
        const text = input.value.trim();
        if (!text) { input.focus(); return; }
        const tpl = document.getElementById('bubble-template');
        const node = tpl.content.firstElementChild.cloneNode(true);
        DashUtils.qs('p', node).textContent = text;
        const time = DashUtils.qs('time', node);
        const now = new Date();
        time.dateTime = now.toISOString();
        time.textContent = 'Just now · demo, not sent';
        thread.appendChild(node);
        thread.scrollTop = thread.scrollHeight;
        input.value = '';
        DashUtils.announce('Message added to the thread (demo — not sent)');
      });
    }
    DashUtils.qsa('.js-mark-read').forEach((btn) => {
      btn.addEventListener('click', () => {
        DashUtils.qsa('.notif-item.is-unread').forEach((n) => n.classList.remove('is-unread'));
        DashUtils.qsa('.notif-dot').forEach((d) => { d.hidden = true; });
        DashUtils.announce('All notifications marked as read');
      });
    });
  }
};

/* ==========================================================================
   BOOT
   ========================================================================== */
(function bootDashboard() {
  const start = () => {
    [Sidebar, ProgressRing, Charts, Checklist, Decisions, Messages].forEach((m) => {
      try { m.init(); } catch (err) { /* keep other modules running */ }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

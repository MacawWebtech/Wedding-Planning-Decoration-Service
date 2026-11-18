/**
 * Wedding Template — plugins/gallery.js
 * Filterable gallery + accessible lightbox for EXISTING markup.
 *
 * Markup contract:
 *   Filter buttons:  <button class="filter-btn" data-filter="all|ceremony|..." aria-pressed="true|false">
 *   Items:           <figure class="gallery-item" data-category="ceremony floral"> ... </figure>
 *   Lightbox links:  <a class="gallery-link" href="large.jpg" data-lightbox="group" data-caption="..." data-fallback="local.jpg">
 *   Lightbox shell:  <div class="lightbox" id="lightbox" hidden role="dialog" aria-modal="true"> ... </div>
 * Keyboard: Esc closes, Left/Right arrows navigate (flipped in RTL), Tab is trapped.
 */
'use strict';

const GalleryFilter = {
  /** Bind filter buttons to show/hide existing items. */
  init() {
    const bar = document.querySelector('.js-gallery-filter');
    if (!bar) return;
    const grid = document.getElementById(bar.dataset.target);
    const live = document.getElementById(bar.dataset.live);
    if (!grid) return;
    const buttons = Array.from(bar.querySelectorAll('[data-filter]'));
    const items = Array.from(grid.querySelectorAll('.gallery-item'));

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        let count = 0;
        items.forEach((item) => {
          const cats = (item.dataset.category || '').split(' ');
          const show = filter === 'all' || cats.includes(filter);
          item.hidden = !show;
          if (show) count++;
        });
        if (live) live.textContent = 'Showing ' + count + ' photo' + (count === 1 ? '' : 's') + (filter === 'all' ? '' : ' in ' + btn.textContent.trim());
      });
    });
  }
};

const Lightbox = {
  /** Cache lightbox elements and bind all [data-lightbox] links. */
  init() {
    this.box = document.getElementById('lightbox');
    if (!this.box) return;
    this.img = this.box.querySelector('.lightbox-img');
    this.caption = this.box.querySelector('.lightbox-caption');
    this.counter = this.box.querySelector('.lightbox-counter');
    this.links = [];
    this.index = 0;
    this.lastFocus = null;

    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-lightbox]');
      if (!link) return;
      e.preventDefault();
      this.open(link);
    });

    this.box.querySelector('.lightbox-close').addEventListener('click', () => this.close());
    this.box.querySelector('.lightbox-prev').addEventListener('click', () => this.step(-1));
    this.box.querySelector('.lightbox-next').addEventListener('click', () => this.step(1));
    this.box.addEventListener('click', (e) => { if (e.target === this.box || e.target.classList.contains('lightbox-stage')) this.close(); });
    this.box.addEventListener('keydown', (e) => this.onKey(e));
    this.img.addEventListener('error', () => {
      const fb = this.links[this.index] && this.links[this.index].dataset.fallback;
      if (fb && this.img.getAttribute('src') !== fb) this.img.src = fb;
    });

    // Touch swipe
    let startX = 0;
    this.box.addEventListener('touchstart', (e) => { startX = e.changedTouches[0].clientX; }, { passive: true });
    this.box.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) this.step((dx < 0 ? 1 : -1) * (this.rtl() ? -1 : 1));
    }, { passive: true });
  },

  /** True in RTL layouts. */
  rtl() { return document.documentElement.getAttribute('dir') === 'rtl'; },

  /** Open the lightbox at the clicked link (only visible items of its group). */
  open(link) {
    const group = link.dataset.lightbox;
    this.links = Array.from(document.querySelectorAll('[data-lightbox="' + group + '"]'))
      .filter((a) => !a.closest('[hidden]'));
    this.index = Math.max(0, this.links.indexOf(link));
    this.lastFocus = document.activeElement;
    this.box.hidden = false;
    document.body.style.overflow = 'hidden';
    this.render();
    this.box.querySelector('.lightbox-close').focus();
  },

  /** Close and restore focus. */
  close() {
    this.box.hidden = true;
    document.body.style.overflow = '';
    if (this.lastFocus) this.lastFocus.focus();
  },

  /** Move by +1 / -1 with wrap-around. */
  step(dir) {
    if (!this.links.length) return;
    this.index = (this.index + dir + this.links.length) % this.links.length;
    this.render();
  },

  /** Show the current image, caption and counter. */
  render() {
    const link = this.links[this.index];
    if (!link) return;
    const thumb = link.querySelector('img');
    this.img.src = link.getAttribute('href');
    this.img.alt = thumb ? thumb.alt : '';
    this.caption.textContent = link.dataset.caption || (thumb ? thumb.alt : '');
    this.counter.textContent = (this.index + 1) + ' / ' + this.links.length;
  },

  /** Keyboard: Esc, arrows (RTL-aware) and focus trap. */
  onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); this.close(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); this.step(this.rtl() ? -1 : 1); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); this.step(this.rtl() ? 1 : -1); return; }
    if (e.key === 'Tab') {
      const focusables = Array.from(this.box.querySelectorAll('button'));
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
};

(function bootGallery() {
  const start = () => { GalleryFilter.init(); Lightbox.init(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

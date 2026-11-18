# Wedding Template — Wedding Planning & Decoration Service

**Version 1.0.0** · Bootstrap 5.3.3 · Bootstrap Icons 1.11.3 · Chart.js 4.4.1 (dashboard only) · Vanilla ES6+

An elegant, full-width HTML template for wedding planners, decorators and day-of coordinators. It has 12 public pages and a 9-page client dashboard for couples. Dark mode, RTL and WCAG 2.1 AA patterns are built in.

Placeholder brand: **Everbloom Weddings**. Search the project for `TODO` to find every customisation point.

---

## 1. Quick start

1. Unzip the folder.
2. Open `pages/index.html` in a browser. A local server is better, because some browsers limit `file://` pages:
   ```bash
   cd wedding-template
   npx serve .          # or: python3 -m http.server 8080
   ```
3. Visit `http://localhost:8080/pages/index.html`. The root `index.html` redirects there.

There is no build step. Everything is plain HTML, CSS and JS.

## 2. Folder structure

```
wedding-template/
├── index.html                 Redirects to pages/index.html
├── README.md · robots.txt · sitemap.xml
├── assets/
│   ├── css/  style.css (sections 01–27), dark-mode.css, rtl.css
│   ├── js/   main.js, dashboard.js, plugins/ (booking.js, payments.js, gallery.js)
│   ├── images/ logo-light.png, logo-dark.png, favicon.svg, favicon-32.png,
│   │           apple-touch-icon.png, og-image.jpg/.webp, coming-soon.jpg/.webp,
│   │           fallback/ (wedding-01…12 + portrait-01…04, JPG + WebP)
│   ├── files/  sample-document.pdf (download placeholder)
│   └── fonts/  (optional self-hosted fonts — see fonts/README.md)
├── pages/
│   ├── index.html, index-2.html, about.html, services.html, service-details.html,
│   │   packages.html, gallery.html, real-weddings.html, contact.html,
│   │   login.html, 404.html, coming-soon.html
│   └── dashboard/ dashboard.html, checklist.html, vendors.html, decor.html,
│                  budget.html, payments.html, messages.html, documents.html, settings.html
└── documentation/index.html
```

## 3. Customisation

### Colours, fonts and spacing
All theming lives in CSS variables at the top of `assets/css/style.css` (section 01). Dark-mode values live in `assets/css/dark-mode.css`.

| Variable | Default | Use |
|---|---|---|
| `--color-primary` | `#9b4d5e` | Deep rose — buttons, links, accents |
| `--color-secondary` | `#5e7a6a` | Sage |
| `--color-accent` | `#c9a46a` | Champagne gold (decorative). Use `--color-accent-strong` for gold **text**. |
| `--color-bg` / `--color-surface` | `#fffaf6` / `#fbf1ee` | Ivory page and blush surfaces |
| `--page-gutter` | `clamp(1rem, 4.5vw, 5rem)` | Side padding of every full-width container |
| `--space-1` … `--space-10` | `0.5rem` … `5rem` | 8px spacing scale |
| `--chart-1` … `--chart-8` | validated palette | Dashboard chart series colours |

**Fonts:** change the Google Fonts `<link>` in each page head and `--font-heading` / `--font-body`.

### Logo
Replace `assets/images/logo-light.png` (dark text, for light backgrounds) and `logo-dark.png` (light text, for dark backgrounds and the footer). Keep the files about 190×48, or update the `width`/`height` attributes.

### Content and grid cards
Every card (services, packages, gallery, team, testimonials, real weddings, vendors) is written **directly in the HTML**. To add one, copy an existing `<article class="card-box …">` block and edit it. JavaScript only filters, shows and hides existing markup. It never generates cards.

- **Gallery:** copy a `<figure class="gallery-item" data-category="…">`. Categories: `ceremony reception floral stage table outdoor destination` (use more than one, separated by spaces).
- **Budget charts:** the charts read `data-planned` / `data-actual` from the rows of `#budget-table`. Edit the table and the charts follow.

### Images
Photos are hotlinked from Unsplash (`?auto=format&fit=crop&w=…&q=70`). Every `<img>` has `width`, `height`, `alt`, `loading="lazy"` (except the hero) and an `onerror` fallback to a local image in `assets/images/fallback/`. Page banners layer a local fallback under the remote photo in CSS.

For production, download your own photos, compress them (WebP + JPG) into `assets/images/` and update the `src` paths.

## 4. Integrations (all marked with TODO)

| Integration | Where | How |
|---|---|---|
| Consultation form | `pages/contact.html` | **Formspree:** set `action="https://formspree.io/f/YOUR_ID"`. **Netlify:** add `data-netlify="true"` to the form (name + hidden `form-name` + honeypot are already there). |
| Newsletter | Home pages, coming soon | Set the form `action`, or `Config.newsletter.actionUrl` in `assets/js/main.js` (Mailchimp / ConvertKit). |
| Google Map | `pages/contact.html` | Set `Config.mapEmbedUrl` in `main.js`. While it is empty, a friendly placeholder shows. |
| Booking calendar | `assets/js/plugins/booking.js` | Set `BookingConfig.url` (Calendly or Google Calendar). Elements with `[data-booking]` stay hidden until it is set. |
| Payments | `assets/js/plugins/payments.js` | Paste Stripe Payment Links into `stripeLinks` and your PayPal.Me username into `paypalMe`. Unconfigured buttons show an honest "not connected yet" notice. |
| WhatsApp | `main.js` | Set `Config.whatsappNumber` (digits only). Leave it empty to hide WhatsApp links. |

Until an endpoint is set, forms validate and then show a **"not connected yet"** notice. They never pretend a message was sent.

## 5. Dark mode & RTL
- **Theme:** saved in `localStorage` (`wt-theme`). With no saved choice it follows `prefers-color-scheme`. A small inline script in `<head>` applies it before first paint.
- **RTL:** the toggle sets `dir="rtl"` (`wt-dir`) and swaps Bootstrap to `bootstrap.rtl.min.css`. The layout uses logical properties, and `rtl.css` flips arrows, sub-menus and the sidebar.
- **Dashboard sidebar** collapse state is stored as `wt-sidebar`.

## 6. Accessibility
Skip link, landmarks, one `<h1>` per page, visible focus rings, a keyboard-operable menu, accordion, tabs and lightbox (Esc, arrows, focus trap), `aria-live` form messages, `aria-invalid` inline errors, 44px touch targets and `prefers-reduced-motion` support. Content stays visible without JavaScript, because scroll reveal only activates once JS adds `.reveal-ready`.

## 7. SEO
Each page has a unique title (≤60 characters) and meta description (150–160 characters), a canonical URL, and Open Graph and Twitter tags. JSON-LD: LocalBusiness/EventPlanner (Home, Home 2, Contact), FAQPage (Service details, Packages) and BreadcrumbList (inner pages). Dashboard, login, 404 and coming-soon pages are `noindex`. **Replace `https://www.example.com`** in pages, `sitemap.xml` and `robots.txt`.

## 8. Production notes (minify)
```bash
npx lightningcss --minify assets/css/style.css -o assets/css/style.min.css
npx lightningcss --minify assets/css/dark-mode.css -o assets/css/dark-mode.min.css
npx lightningcss --minify assets/css/rtl.css -o assets/css/rtl.min.css
npx terser assets/js/main.js -c -m -o assets/js/main.min.js
npx terser assets/js/dashboard.js -c -m -o assets/js/dashboard.min.js
```
Then point the `<link>`/`<script>` tags at the `.min` files. Also consider:
- adding Subresource Integrity (`integrity` + `crossorigin`) to the CDN tags (copy hashes from jsdelivr / cdnjs);
- self-hosting fonts (see `assets/fonts/README.md`);
- serving your own compressed images instead of hotlinking.

## 9. Security
- External links use `rel="noopener"`.
- No secrets are stored in front-end code. Stripe Payment Links and PayPal.Me URLs are public by design.
- **Login, register, settings, chat and checklist are front-end demos only.** They do not authenticate, store or send data. Connect a real backend (your server, Firebase Auth, Supabase, Auth0…) before using them with real clients, and protect `/pages/dashboard/` behind authentication.

## 10. Credits
- [Bootstrap 5.3.3](https://getbootstrap.com) — MIT
- [Bootstrap Icons 1.11.3](https://icons.getbootstrap.com) — MIT
- [Chart.js 4.4.1](https://www.chartjs.org) — MIT (via cdnjs)
- [Google Fonts](https://fonts.google.com): Cormorant Garamond, Jost — SIL Open Font License
- Photos: [Unsplash](https://unsplash.com) — Unsplash License (hotlinked demo images; check each photo and replace with your own)
- Logo, favicon, fallback images and the sample PDF were created for this template.

## 11. Changelog
**v1.0.0** — Initial release: 12 public pages, 9 dashboard pages, dark mode, RTL, integrations, documentation.

## 12. Support
Read `documentation/index.html` first. For help, email `support@example.com` (TODO: your support address) with your template version, browser and a short description or screenshot.

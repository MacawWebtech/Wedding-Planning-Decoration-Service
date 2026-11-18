# Self-hosting fonts (optional)

By default the template loads Cormorant Garamond and Jost from Google Fonts. To self-host them:

1. Download WOFF2 files, for example from https://gwfh.mranftl.com/fonts (Cormorant Garamond 500/600/700 + 500 italic, Jost 400/500/600).
2. Put them in this folder.
3. Add `@font-face` rules at the top of `assets/css/style.css`, for example:

```css
@font-face {
  font-family: "Jost";
  src: url("../fonts/jost-v15-latin-regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

4. Remove the Google Fonts `<link>` and the two `fonts.g*` preconnect tags from every page.

# Design system

1. Add favicon
2. Add Header - two row header
   1. row 1 - ht- 80px, bg color: #007073; and contains following
      1. Add logo to left top in header
      2. Add Brand to right to logo
      3. Add Search bar in the center of navbar
      4. Add to right CTA - Get Started
   2. row to height - 40px bg: #007073 - lighter tint
      1. Has these in navbar
         1. Benefits - For Donors - For Sellers - For Buyers
         2. Browse - Books - Categories - Tags
         3. Seller Login
         4. Book Donation
         5. Stats Corner
            1. User count
            2. Books donated count
            3. Tags count
            4. Categories count
            5. Contact Us
            6. User Guide
         6. About
         7. Testimonials
         8. Scholarship
         9. Vision & Mission

### Moltbook theme

```css
:root {
  --bg-deep: #050810;
  --bg-elevated: #111827;
  --bg-surface: #0a0f1a;
  --coral-bright: #ff4d4d;
  --coral-dark: #991b1b;
  --coral-mid: #e63946;
  --cyan-bright: #00e5cc;
  --cyan-mid: #14b8a6;
  --github-hover-color: #f0f4ff;
  --hero-title-end: #00e5cc;
  --hero-title-start: #f0f4ff;
  --logo-gradient-end: #991b1b;
  --logo-gradient-start: #ff4d4d;
  --pas-chip-bg: #e0e0e0;
  --pas-chip-bg-hover: #d4d4d4;
  --pas-chip-border: #c2c2c2;
  --pas-chip-text: #1e1e1e;
  --text-muted: #5a6480;
  --text-primary: #f0f4ff;
  --text-secondary: #8892b0;
}
html[data-theme="light"] {
  --bg-deep: #fcfeff;
  --bg-elevated: #f5f9ff;
  --bg-surface: #ffffff;
  --coral-bright: #ef4b58;
  --coral-dark: #c43645;
  --coral-mid: #de3f4d;
  --cyan-bright: #008f87;
  --cyan-mid: #00766e;
  --github-hover-color: #0b1220;
  --hero-title-end: #f04d5a;
  --hero-title-start: #c93342;
  --logo-gradient-end: #ea4c59;
  --logo-gradient-start: #ff7079;
  --text-muted: #5f7290;
  --text-primary: #0b1220;
  --text-secondary: #2e405c;
}
```

# PNPtv Legal Documents

This folder contains the legal documents for PNPtv! Digital Community.

## Files

- **terms-en.html** - English Terms of Service, Refund Policy, and Privacy Policy (all-in-one page)
- **terms-es.html** - Spanish Términos, Reembolsos y Privacidad (all-in-one page)
- **privacy-en.html** - Redirect to English Privacy Policy section
- **privacy-es.html** - Redirect to Spanish Privacy Policy section

## Deployment

These files need to be hosted on a web server and made accessible at:

- `https://pnp.tv/terms-en` → terms-en.html
- `https://pnp.tv/terms-es` → terms-es.html
- `https://pnp.tv/privacy-en` → privacy-en.html (redirects to terms-en.html#privacy)
- `https://pnp.tv/privacy-es` → privacy-es.html (redirects to terms-es.html#privacidad)

### Deployment Options

#### Option 1: GitHub Pages
1. Create a repository on GitHub
2. Upload these files to the repository
3. Enable GitHub Pages in repository settings
4. Configure your domain (pnp.tv) to point to GitHub Pages

#### Option 2: Vercel/Netlify
1. Create a new project on Vercel or Netlify
2. Connect this folder or upload these files
3. Configure your domain (pnp.tv) to point to the deployment

#### Option 3: Traditional Web Hosting
1. Upload files to your web hosting via FTP/cPanel
2. Place them in the public_html or www directory
3. Ensure they're accessible via the URLs above

## Current Bot Configuration

The bot's locale files currently reference:
- English Terms: `https://pnp.tv/terms-en`
- English Privacy: `https://pnp.tv/privacy-en`
- Spanish Terms: `https://pnp.tv/terms-es`
- Spanish Privacy: `https://pnp.tv/privacy-es`

Located in:
- `src/locales/en.json` (lines 8-9)
- `src/locales/es.json` (lines 8-9)

## Design

The pages feature:
- Dark theme with purple/magenta accent colors (#6A40A7, #DF00FF)
- Responsive design (mobile-friendly)
- Google Fonts: Inter, Space Grotesk, Source Code Pro
- Table of contents with quick navigation
- Self-contained (all CSS inline, no external dependencies)
- Effective date: 2025-10-19

## Content Sections

Each terms page includes:
1. Introduction
2. Health, Wellness, Age & Responsibility Clauses
3. Service Scope / Object of Service
4. Membership & Access Conditions
5. Community Conduct Rules
6. Refund Policy
7. Privacy Policy (including AI use disclosure)
8. Disclaimer & Legal Jurisdiction

## Contact

Support email: support@pnptv.app

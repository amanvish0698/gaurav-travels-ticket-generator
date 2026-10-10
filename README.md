# Gaurav Tour and Travels - Flight Ticket Generator & Branding Suite

A 100% client-side, zero-backend web application for travel agencies to convert raw OTA flight tickets (Cleartrip, EaseMyTrip, MakeMyTrip, Goibibo) into branded, agency-grade A4 e-tickets with barcodes, custom facilitation markups, and comprehensive Terms & Conditions.

---

## ✨ Features

- **100% Client-Side Privacy:** All PDF parsing, barcode generation, and PDF document generation occur completely inside your browser. No ticket details or customer names ever touch a backend server.
- **Multi-OTA Auto-Detection:** Dedicated parser algorithms for:
  - **Cleartrip** (Trip ID, IndiGo/Air India, bidirectional route formatting, flight codes, PNRs)
  - **EaseMyTrip** (EMT Booking ID, multi-leg segments, seat & baggage rules)
  - **MakeMyTrip & Goibibo**
  - **Generic Fallback** for other domestic and international e-tickets
- **PDF417 Boarding Barcode:** Generates crisp boarding pass 2D barcodes for each confirmed passenger using `bwip-js`.
- **Dynamic Agency Branding & Settings:**
  - Custom logo upload (PNG / JPEG) with live preview
  - Agency contacts, WhatsApp helpline, 24x7 emergency phone, GSTIN, and physical address
  - Facilitation fee markup control (with toggle for split fare vs all-inclusive customer total)
  - Customizable multi-paragraph Terms & Conditions (Page 2) and Quick Travel Guidelines (Page 1)
  - Export & Import configuration as JSON
- **Mobile-Friendly UI & Canvas Preview:** Responsive layout with in-memory HTML5 Canvas rendering for live PDF previews across phones, tablets, and desktops.

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production
npm run build

# 4. Preview production build locally
npm run preview
```

---

## 🌐 Deploy to GitHub Pages (Automated via GitHub Actions)

1. Create a new repository on [GitHub](https://github.com/new).
2. Push your project to GitHub:
   ```bash
   git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
   git push -u origin main
   ```
3. In your GitHub repository:
   - Go to **Settings** &rarr; **Pages**.
   - Under **Build and deployment** &rarr; **Source**, select **GitHub Actions**.
4. That's it! The included `.github/workflows/deploy.yml` workflow will automatically build and publish your live web app.

# One Day — by HKCreations

> Find the role you deserve, today.

A premium job search platform that aggregates openings from LinkedIn, Naukri, Indeed, Glassdoor, and more — sorted by newest, downloadable as Excel/CSV.

## Deploy to Vercel (3 steps)

### Step 1: Push to GitHub
```bash
cd oneday-app
git init
git add .
git commit -m "One Day — launch"
git remote add origin https://github.com/YOUR_USERNAME/oneday.git
git push -u origin main
```

### Step 2: Connect to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Framework: **Vite** (auto-detected)
4. Click **Deploy**

### Step 3: Done
Your site is live at `oneday-xxxxx.vercel.app`

#### Custom domain (optional)
- In Vercel → Settings → Domains → Add `oneday.hkcreations.in` or any domain
- Update DNS as instructed

## Project Structure

```
oneday-app/
├── src/
│   ├── OneDay.jsx      ← Main app (search UI, cards, download)
│   └── main.jsx        ← Entry point
├── api/
│   └── jobs.js         ← Vercel serverless function (optional)
├── index.html          ← HTML with SEO + favicon
├── package.json
├── vite.config.js
├── vercel.json
└── .gitignore
```

## Features
- Search by role, location (with autocomplete), experience level
- Direct search links to LinkedIn, Naukri, Indeed, Glassdoor (sorted by date)
- Aggregated results from Remotive, Arbeitnow, RemoteOK
- Filter by source, sort by date/company/title
- Export to Excel (.xlsx with clickable links) or CSV
- Dark luxury UI with custom branding and logo
- Fully responsive, works on mobile

## Customization
- Edit `LOCATIONS` array in `OneDay.jsx` to add/remove cities
- Edit `MOTIVATIONS` array for hero taglines
- Popular search tags can be modified in the JSX
- Brand colors are in the `B` object at top of file

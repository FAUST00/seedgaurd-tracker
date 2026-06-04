# SeedGuard — PMO Freedom Tracker

> A modern, privacy-first semen retention / NoFap tracking app. 100% client-side — your data never leaves your device.

**Live:** https://faust00.github.io/seedgaurd-tracker/

---

## Features

- **Live Streak Timer** — Real-time days / hours / minutes / seconds
- **Editable Start Date** — Correct your streak clock any time
- **History Log** — Track past streaks and relapses
- **Benefits Timeline** — Honest week-by-week and month-by-month guide
- **Social Leaderboard** — Anonymous community accountability
- **Account & Settings** — Personalised local profile
- **Fully Offline** — All data in `localStorage`, zero backend, zero tracking

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Static Export) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| Icons | Lucide React |
| Hosting | GitHub Pages (auto-deploy via Actions) |

---

## Project Structure

```
seedgaurd-tracker/
├── app/
│   ├── dashboard/      # Live streak timer + stats
│   ├── history/        # Past streak log
│   ├── benefits/       # Week & month benefit timeline
│   ├── social/         # Community leaderboard
│   ├── account/        # User profile
│   ├── settings/       # App preferences
│   ├── layout.tsx      # Root layout + sidebar
│   └── globals.css     # Global styles
├── components/
│   └── sidebar.tsx     # Navigation sidebar
├── .github/workflows/
│   └── deploy.yml      # Auto-deploy to GitHub Pages
├── next.config.js      # Static export + basePath
├── tailwind.config.ts
└── tsconfig.json
```

---

## Getting Started

```bash
git clone https://github.com/FAUST00/seedgaurd-tracker.git
cd seedgaurd-tracker
npm install
npm run dev        # http://localhost:3000
npm run build      # Production build → ./out/
```

---

## Deployment

Auto-deploys to GitHub Pages on every push to `main` via `.github/workflows/deploy.yml`.

---

## localStorage Keys

| Key | Purpose |
|---|---|
| `seedguard_streak_start` | Timestamp when current streak began |
| `seedguard_stats` | Historical stats & relapse log (JSON) |
| `seedguard_account` | User profile data (JSON) |

---

## Cleanup

Run these commands locally to remove stale committed build artifacts:

```bash
git rm -r --cached _next/ _not-found/ 404/ dashboard/ history/ onboarding/ 2>/dev/null
git rm --cached index.html 404.html retention-journey.html index.txt \
  seedguard-auth.js seedguard-launch.css retention-journey-README.md \
  DEPLOYMENT.md build.bat build.sh \
  __next.__PAGE__.txt __next._full.txt __next._head.txt __next._index.txt __next._tree.txt \
  "retention-hero.jpg.jpg" synthwave-city.jpg synthwave-city1.jpg \
  next.svg vercel.svg file.svg globe.svg window.svg 2>/dev/null

# Add to .gitignore
printf "\nout/\n" >> .gitignore

git add .gitignore README.md
git commit -m "chore: clean up repo — remove stale build artifacts and old files"
git push
```

---

*Built with the dark neon cyber aesthetic — because discipline deserves style.*

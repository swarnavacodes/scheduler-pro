# Scheduler Pro

Single-file daily scheduler — open `daily-scheduler-pro.html` in any browser.

## Features
- Day / Week / Month / Agenda / Matrix views
- Tasks with category, priority, energy, work-type, color tag, recurring series
- Drag & drop, search & filter, undo
- Focus / Pomodoro timer with break cycles
- Sidebar: Today progress, stats, digital clock, weather (Open-Meteo), habits & streaks, daily intention, quote of the day
- Reminders (in-app + browser notifications), dark/light + Ocean/Forest/Sepia themes
- LocalStorage persistence

## Run
Just open `daily-scheduler-pro.html` directly. No build step. Or visit the GitHub Pages site: https://swarnavacodes.github.io/scheduler-pro/

## Tests (Playwright)
```bash
npm install
npx playwright install chromium
npm test              # run all e2e tests headless
npm run test:headed   # headed mode
npm run test:ui       # UI mode
```
Tests live in `tests/e2e.spec.js` and cover tasks, filters, views, theme, timer, habits, export and more. They run against `http://localhost:3000` via `http-server`.

## Upcoming
JSON file persistence via tiny Node server (`scheduler-data.json`) — in progress.

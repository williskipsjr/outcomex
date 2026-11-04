# Demo runbook: data and AI

What to run before the demo, how to choose the markets you'll show, and what to do if something fails.

## The day before

Run all of this from the repository root. It needs internet.

1. **Refresh the offline data** (real markets, saved for use without internet):
   ```bash
   node scripts/snapshot-fixtures.mjs
   ```
2. **Refresh the AI numbers**, for both the live app and the offline data:
   ```bash
   cd ml
   python -m src.predict --mocks --install
   ```
   Read the output: it lists good markets to demo.
3. **Check the files:**
   ```bash
   cd client
   npm run check:contracts
   npm test
   ```
4. **Build the offline version and try it with Wi-Fi off:**
   ```bash
   npm run build:mock
   npm run preview
   ```
5. **Commit the refreshed files** through a PR, so the deployed site has them.

## Choosing markets

**The AI only has numbers for markets 1–21 days from their scheduled end, and that count swings with the calendar.** On 5 Nov it was 36 of 414 open markets, because deadlines cluster at month ends. Check the list from step 2 on the day, and don't assume last week's markets still work.

For the reveal, choose a market where:
- the AI number is between 15% and 85%, so the bars are easy to compare;
- it isn't closing today, so it won't close during the demo;
- you have **not** called it yet. Calls are locked, so use a fresh browser profile or clear the site's data first.

## Demoing a failure

| Show | How | What the audience sees |
|---|---|---|
| Polymarket goes down | DevTools → Network → Offline, then wait up to 60 seconds or press Refresh | Cards stay, with the "Showing saved data" banner |
| A tampered call | In the console, on a running dev server: `const d = await import("/src/data/index.js"); await d.revealPractice("pr-1897442", 1.5)` | `VALIDATION_ERROR`, and no answers file in the Network tab |
| A broken AI file | In `npm run dev`, rename `client/public/data/predictions.json`, then open a market | "AI not available", and everything else works |
| One section failing | In `npm run dev:mock`: `localStorage.setItem("outcomex.debug.fail", "history")`, then switch chart range | Only the chart shows an error, with Retry |

Rehearse these once before the demo. The renamed-file case is covered by automated tests but hasn't been tried in the browser.

**Rename the file back afterwards.** Remove the failure switch with `localStorage.removeItem("outcomex.debug.fail")`.

The tampered-call command needs the dev server, because a production build has no `/src` folder.

## If something goes wrong on the day

| Problem | Do this |
|---|---|
| Polymarket is slow or down | Switch to the offline build: `npm run build:mock`, then `npm run preview` |
| No Wi-Fi | Same. Market photos won't load, but everything else works |
| The AI shows on almost no markets | Use the offline build's market from the day-before list, or Practice mode, where every question has an AI number |
| Everything fails | Use the backup screen recording the PM keeps |

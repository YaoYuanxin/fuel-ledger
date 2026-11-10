# Fuel Ledger

A calorie, weight and TDEE tracker with Google sign-in. One HTML file, no build step,
hosted on Firebase's free tier.

- **Log food** by meal from your own foods, a built-in list of common foods, or a USDA
  FoodData Central search (generic and branded items).
- **Maintenance (TDEE)** starts from the Mifflin-St Jeor formula and shifts to an estimate
  from your own intake and weight trend as you log. The method is described in the Trends tab.
- **Goals and targets**: goal weight, pace, protein target and weekly training sessions
  produce a daily calorie and macro target that updates as your data changes.
- **Advice** from your numbers: adherence, protein gap, rate against plan, weekend drift,
  logging gaps, training count.
- **Calibration chat** (optional): Claude sees your last 15 days and can adjust the plan or
  log food and weight when you ask. Needs your own Anthropic API key.

## Set it up

You need a Google account and [Node.js](https://nodejs.org) 18 or newer.

```bash
git clone https://github.com/YaoYuanxin/fuel-ledger.git
cd fuel-ledger
node deploy.mjs
```

Or double-click `deploy.command` (Mac) or `deploy.bat` (Windows). On a Mac, if double-clicking
is blocked, right-click the file and choose Open, or run `node deploy.mjs` in Terminal.

A browser window opens once for Google sign-in. The script then:

1. creates a Firebase project (`fuel-ledger-xxxxxx`),
2. creates the Firestore database,
3. deploys the page and the security rules,
4. switches on Google sign-in,
5. prints your address: `https://<project-id>.web.app`.

If a step can't be done from the command line, the script stops and prints the one console
page to open. The usual case is a Google account that has never used Firebase and has to
accept its terms once.

- Deploy into a project you already have: `node deploy.mjs your-project-id`
- Push an update later: run `node deploy.mjs` again. It reuses the saved project.

## Files

| File | Purpose |
| --- | --- |
| `public/index.html` | The whole app: markup, styles and script. |
| `firestore.rules` | Each signed-in user can read and write only `users/<their uid>/...`. |
| `deploy.mjs` | The deploy script. Writes `firebase.json` and `.firebaserc`, which are git-ignored. |
| `deploy.command`, `deploy.bat` | Double-click wrappers for Mac and Windows. |

## Data and privacy

- Each person's profile and log live in Firestore under `users/<uid>/docs`, readable only by
  that signed-in user. A copy is cached in the browser for fast loading.
- Anyone with the address can sign in with Google and keep their own private log.
- Plan → "Back up or restore" exports or replaces your whole log as text.

## Optional keys

Both are entered in the Plan tab under Connections and stored only in your browser.

- **Anthropic API key** turns on the calibration chat. Requests go from the browser straight
  to Anthropic and are billed to that key, so set a spend limit on it. The model is set by
  `CLAUDE_MODEL` near the bottom of `public/index.html`.
- **USDA FoodData Central key** lifts the rate limit on food lookup. Without one the app uses
  the shared `DEMO_KEY`. A free key: https://fdc.nal.usda.gov/api-key-signup

## Local preview

Opening `public/index.html` from disk shows example data only. Sign-in and storage need the
Firebase host, so use `npx firebase-tools emulators:start` or deploy.

## Limits

Targets are estimates, not medical advice. The app enforces a calorie floor
(1,500 kcal male, 1,200 female), caps pace at 1% of bodyweight a week, is for adults, and
rejects goal weights under BMI 18.5.

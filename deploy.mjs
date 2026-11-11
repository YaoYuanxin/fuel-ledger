// Fuel Ledger: one-command deploy to Firebase (Hosting + Firestore + Google sign-in).
// Usage:  node deploy.mjs                 create a new Firebase project and deploy
//         node deploy.mjs my-project-id   deploy to a project that already exists
//         add --skip-auth if Google sign-in is already enabled in the Firebase console
// Later runs reuse the project saved in .firebaserc, so updating the app is just: node deploy.mjs
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.chdir(path.dirname(fileURLToPath(import.meta.url)));
const FB = "npx -y firebase-tools@latest";
const run = (args, capture = false) => {
  const r = spawnSync(`${FB} ${args}`, { shell: true, encoding: "utf8", stdio: capture ? ["inherit", "pipe", "pipe"] : "inherit" });
  return { ok: r.status === 0, out: r.stdout || "", err: r.stderr || "" };
};
const step = (n, t) => console.log(`\n[${n}/5] ${t}`);
// Only trust the CLI's own "Logged in as <email>" line. npm prints package names such as
// superstatic@10.0.0 while installing, and those must not be mistaken for an account.
const findEmail = s => (s.match(/Logged in as\s+([\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,})/i) || [])[1];

step(1, "Checking your Google sign-in for Firebase");
let email = findEmail(run("login:list", true).out);
if (!email) {
  console.log("A browser window will open. Sign in with the Google account that should own the app.");
  run("login");
  email = findEmail(run("login:list", true).out);
}
if (!email) {
  console.error("Could not confirm a Firebase login. Run:  npx -y firebase-tools@latest login   then run this script again.");
  process.exit(1);
}
console.log(`Signed in as ${email}`);

step(2, "Choosing the Firebase project");
const args = process.argv.slice(2);
// Google sign-in already switched on in the console? Pass --skip-auth (or keep a file named
// .skip-auth next to this script) and the script leaves the sign-in settings alone.
const skipAuth = args.includes("--skip-auth") || fs.existsSync(".skip-auth");
let project = args.find(a => !a.startsWith("--"));
if (!project && fs.existsSync(".firebaserc")) {
  try { project = JSON.parse(fs.readFileSync(".firebaserc", "utf8")).projects.default; } catch {}
}
const saveProject = () => fs.writeFileSync(".firebaserc", JSON.stringify({ projects: { default: project } }, null, 2));
// IDs of projects that already have Firebase switched on, or null if the list can't be read.
const firebaseProjects = () => {
  const out = run("projects:list --json", true).out;
  try { return (JSON.parse(out.slice(out.indexOf("{"))).result || []).map(p => p.projectId); } catch { return null; }
};
const create = () => run(`projects:create ${project} --display-name "Fuel Ledger"`).ok;
const addFirebase = () => run(`projects:addfirebase ${project}`).ok;
const stuck = () => {
  saveProject(); // the next run picks this project up again instead of creating another one
  console.error(`
Firebase could not be switched on for ${project} from the command line. The usual cause is a
Google account that has never used Firebase: its terms have to be accepted once, in the browser.
Fix:
  1. Open https://console.firebase.google.com and accept the terms if asked.
  2. Click "Create a project" (or "Add project"), choose "Add Firebase to Google Cloud project",
     and pick ${project} from the list. Turn Analytics off.
  3. Run   node deploy.mjs   again. It will carry on with ${project}.
If the message above is about authentication instead, run
  npx -y firebase-tools@latest login --reauth`);
  process.exit(1);
};
if (project) {
  console.log(`Using project ${project}`);
  const list = firebaseProjects();
  if (list && !list.includes(project)) {
    console.log("Firebase is not switched on for it yet. Trying now.");
    if (!addFirebase() && !create()) stuck();
  }
} else {
  project = "fuel-ledger-" + Math.random().toString(36).slice(2, 8);
  console.log(`Creating project ${project}`);
  if (!create() && !addFirebase()) stuck();
}
saveProject();
const config = {
  hosting: {
    public: "public",
    ignore: ["firebase.json", "**/.*"],
    headers: [{ source: "**", headers: [{ key: "Cache-Control", value: "no-cache" }] }]
  },
  firestore: { rules: "firestore.rules" }
};
if (!skipAuth) config.auth = { providers: { googleSignIn: { oAuthBrandDisplayName: "Fuel Ledger", supportEmail: email } } };
fs.writeFileSync("firebase.json", JSON.stringify(config, null, 2));

step(3, "Creating the database (skipped if it already exists)");
const dbr = run(`firestore:databases:create "(default)" --location nam5 --project ${project}`, true);
console.log(dbr.ok ? "Database created." : "Database not created here (it may already exist). Continuing.");

step(4, "Deploying the app and its security rules");
if (!run(`deploy --only firestore,hosting --project ${project}`).ok) {
  console.error(`
Deploy failed. If the message above mentions Firestore or a missing database, open
https://console.firebase.google.com/project/${project}/firestore , click "Create database"
(production mode, any location), then run this script again.`);
  process.exit(1);
}

step(5, "Switching on Google sign-in");
let authOk = true;
if (skipAuth) console.log("Skipped: Google sign-in is already set up in the console.");
else authOk = run(`deploy --only auth --project ${project}`).ok;

console.log(`\nDone. Your app: https://${project}.web.app`);
if (!authOk) console.log(`
Google sign-in could not be switched on from the command line. Open
https://console.firebase.google.com/project/${project}/authentication/providers
If Google already shows as Enabled there, nothing more is needed. Otherwise click "Get started"
if shown, choose Google, turn on Enable, pick your support email, Save.`);

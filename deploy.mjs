// Fuel Ledger: one-command deploy to Firebase (Hosting + Firestore + Google sign-in).
// Usage:  node deploy.mjs                 create a new Firebase project and deploy
//         node deploy.mjs my-project-id   deploy to a project that already exists
// Later runs reuse the project saved in .firebaserc, so updating the app is just: node deploy.mjs
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.chdir(path.dirname(fileURLToPath(import.meta.url)));
const FB = "npx -y firebase-tools@latest";
const run = (args, capture = false) => {
  const r = spawnSync(`${FB} ${args}`, { shell: true, encoding: "utf8", stdio: capture ? ["inherit", "pipe", "pipe"] : "inherit" });
  return { ok: r.status === 0, out: (r.stdout || "") + (r.stderr || "") };
};
const step = (n, t) => console.log(`\n[${n}/5] ${t}`);
const findEmail = s => (s.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/) || [])[0];

step(1, "Checking your Google sign-in for Firebase");
let email = findEmail(run("login:list", true).out);
if (!email) {
  console.log("A browser window will open. Sign in with the Google account that should own the app.");
  run("login");
  email = findEmail(run("login:list", true).out);
}
if (!email) { console.error("Could not confirm a Firebase login. Run this script again."); process.exit(1); }
console.log(`Signed in as ${email}`);

step(2, "Choosing the Firebase project");
let project = process.argv[2];
if (!project && fs.existsSync(".firebaserc")) {
  try { project = JSON.parse(fs.readFileSync(".firebaserc", "utf8")).projects.default; } catch {}
}
if (project) console.log(`Using project ${project}`);
else {
  project = "fuel-ledger-" + Math.random().toString(36).slice(2, 8);
  console.log(`Creating project ${project}`);
  if (!run(`projects:create ${project} --display-name "Fuel Ledger"`).ok) {
    console.error(`
Could not create the project automatically. This usually means the Google account has never
used Firebase and must accept its terms once, or has hit its project limit.
Fix: open https://console.firebase.google.com, click "Create a project" (any name, Analytics off),
then run this script again with that project's ID:   node deploy.mjs your-project-id`);
    process.exit(1);
  }
}
fs.writeFileSync(".firebaserc", JSON.stringify({ projects: { default: project } }, null, 2));
fs.writeFileSync("firebase.json", JSON.stringify({
  hosting: {
    public: "public",
    ignore: ["firebase.json", "**/.*"],
    headers: [{ source: "**", headers: [{ key: "Cache-Control", value: "no-cache" }] }]
  },
  firestore: { rules: "firestore.rules" },
  auth: { providers: { googleSignIn: { oAuthBrandDisplayName: "Fuel Ledger", supportEmail: email } } }
}, null, 2));

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
const authOk = run(`deploy --only auth --project ${project}`).ok;

console.log(`\nDone. Your app: https://${project}.web.app`);
if (!authOk) console.log(`
One manual step left: Google sign-in could not be switched on from the command line.
Open https://console.firebase.google.com/project/${project}/authentication/providers ,
click "Get started" if shown, choose Google, turn on Enable, pick your support email, Save.`);

# Paragrutarally Management Application

A web application for managing users, kids, teams, events, vehicles, forms, and backups for the Paragrutarally charity. It replaces Excel-based workflows with a Firebase-backed, multilingual, role-based system.

> **New here? Start with [New Member Checklist](#-new-member-checklist) and [Quick Start](#-quick-start).**
> The application lives in [`Paragrutarally-WebApp/`](Paragrutarally-WebApp). Run app commands from that folder unless a command says otherwise.

## 🌟 Features

- **User management** - role-based access for admins, instructors, parents, hosts, and guests
- **Kids management** - register participants, link parents, assign teams, and track details
- **Team management** - create teams, assign instructors, manage rosters and vehicles
- **Events & vehicles** - manage events, participants, vehicle inventory, and vehicle assignment
- **Forms** - create forms, assign forms, submit responses, and review submissions
- **Data import/export** - ExcelJS-based exports/import helpers and Google Drive backup support
- **Internationalization** - English and Hebrew support, including RTL-aware UI
- **Theming** - light/dark mode
- **Responsive UI** - desktop and mobile layouts

## 🛠️ Technology Stack

- **Build tool / dev server**: [Vite](https://vitejs.dev/) 6
- **Frontend**: React 19, React Router 7, React Context
- **Styling**: Plain CSS in `src/styles/` and component/page CSS files; no Tailwind
- **Validation**: Zod
- **Backend**: Firebase Authentication, Firestore, Storage, Hosting, and Cloud Functions v2
- **Cloud Functions runtime**: Node.js 22
- **Testing**: Vitest, React Testing Library, Firebase emulators, Firebase rules unit testing

## 📋 Prerequisites

- **Node.js 22**. Cloud Functions pin `node: 22`, and CI uses Node 22.
- **npm**. This repo uses `package-lock.json`; prefer `npm ci` for clean installs.
- **Git**
- **Firebase CLI**. Install globally with `npm install -g firebase-tools`, or use the local dependency through `npx firebase`.
- **Firebase project access** for `paragrutarally-1188c` when working against the real project.
- **Google Cloud access** when working on Google sign-in or Google Drive backup features.

## ✅ New Member Checklist

Ask a project admin for:

- GitHub repository access.
- Firebase Console access to project `paragrutarally-1188c`.
- The Firebase Web app config values for `.env`.
- Google Cloud OAuth/API values if you will test Google sign-in or Drive backups.
- Whether you should have a local `credentials.json` service-account key. Most frontend work does **not** need it.
- The production deploy policy for your first PR. This repo has deploy workflows, so do not assume a PR is preview-only.

On your machine:

```bash
git clone git@github.com:yulaSt/Para-Gruta-Rally.git
cd Para-Gruta-Rally/Paragrutarally-WebApp

# Use Node 22 however you manage Node locally.
node --version

npm ci
cp .env.example .env
npm run dev
```

Before opening a PR:

```bash
npm run lint
npm run build
npm run test:unit
```

If you touched Firebase rules, auth/profile behavior, storage, forms, or admin data flows, also run the relevant emulator-backed tests:

```bash
npm run test:integration
npm run test:rules
```

## 🚀 Quick Start

```bash
# 1. Clone
git clone git@github.com:yulaSt/Para-Gruta-Rally.git
cd Para-Gruta-Rally/Paragrutarally-WebApp

# 2. Install dependencies from the lockfile
npm ci

# 3. Configure Firebase and Google env values
cp .env.example .env
# Edit .env. See "Environment Variables" below.

# 4. Run the dev server
npm run dev
```

The Vite dev server opens automatically at [http://localhost:3000](http://localhost:3000).

## 🔐 Environment Variables

Firebase config is read through Vite environment variables in `src/firebase/config.js`. Copy [`Paragrutarally-WebApp/.env.example`](Paragrutarally-WebApp/.env.example) to `Paragrutarally-WebApp/.env`.

| Variable | Required for | Where to get it |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | App startup, Auth | Firebase Console -> Project settings -> Web app config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth | Firebase Console -> Project settings -> Web app config |
| `VITE_FIREBASE_PROJECT_ID` | Firestore, Auth, Functions, Storage | Firebase Console -> Project settings -> Web app config |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage uploads/downloads | Firebase Console -> Project settings -> Web app config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase app config | Firebase Console -> Project settings -> Web app config |
| `VITE_FIREBASE_APP_ID` | Firebase app config | Firebase Console -> Project settings -> Web app config |
| `VITE_GOOGLE_CLIENT_ID` | Google sign-in / Google Drive | Google Cloud Console OAuth client |
| `VITE_GOOGLE_API_KEY` | Google APIs / Google Drive | Google Cloud Console API key |
| `VITE_USE_FIREBASE_EMULATORS` | Local emulator development | `true` only when emulators are running; otherwise `false` |

Notes:

- `.env` is gitignored. Never commit real environment files.
- Firebase Web config values are not the same as a service-account key. Do not put service-account JSON into `.env`.
- For Google OAuth, make sure the OAuth client allows `http://localhost:3000` for local development and the production Firebase Hosting origin for production.
- Restart `npm run dev` after changing `.env`.

## 🧪 Local Development With Firebase Emulators

Use emulators when you want local Auth, Firestore, Functions, Storage, and Hosting without writing to production.

Terminal 1:

```bash
cd Para-Gruta-Rally/Paragrutarally-WebApp
firebase emulators:start
```

Terminal 2:

```bash
cd Para-Gruta-Rally/Paragrutarally-WebApp
npm run seed:users
```

Then set this in `.env`:

```dotenv
VITE_USE_FIREBASE_EMULATORS=true
```

Start the app:

```bash
npm run dev
```

Emulator ports are defined in [`firebase.json`](Paragrutarally-WebApp/firebase.json):

| Service | Port |
| --- | --- |
| Emulator UI | `4000` |
| Hosting | `5000` |
| Functions | `5001` |
| Firestore | `8080` |
| Auth | `9099` |
| Storage | `9199` |

Seeded emulator users, all with password `123456`:

| Email | Role |
| --- | --- |
| `admin@test.com` | admin |
| `instructor@test.com` | instructor |
| `parent@test.com` | parent |
| `host@test.com` | host |

## 📁 Project Structure

```text
Para-Gruta-Rally/
├── README.md                         # Main onboarding and operations guide
├── .github/workflows/                # GitHub Actions deploy/preview workflows
└── Paragrutarally-WebApp/            # Application package; run app commands here
    ├── .env.example                  # Template for local env config
    ├── firebase.json                 # Firebase deploy and emulator config
    ├── vite.config.js                # Vite config; dev server on :3000
    ├── firebase/
    │   ├── firestore.rules           # Firestore security rules
    │   ├── firestore.indexes.json
    │   └── storage.rules             # Storage security rules
    ├── firebase-functions/           # Cloud Functions source; Node 22, v2 functions
    │   ├── index.js
    │   └── package.json
    ├── scripts/                      # Seeding, import, audit, and repair utilities
    ├── test/                         # Unit, UI, integration, and rules tests
    └── src/
        ├── assets/
        ├── components/
        ├── contexts/                 # Auth, Language, Theme, Notification
        ├── firebase/                 # Firebase config and low-level service wrappers
        ├── hooks/
        ├── pages/                    # Admin/instructor/parent/host/shared pages
        ├── schemas/                  # Zod schemas
        ├── services/                 # Business/data services
        ├── styles/
        └── utils/
```

## 👥 User Roles

Admin implicitly has access to everything. Roles live on the Firestore `users/{uid}` document and are mirrored into Firebase Auth custom claims by the `syncUserRoleClaim` Cloud Function.

| Role | Capabilities |
| --- | --- |
| `admin` | Full access; users, kids, teams, events, vehicles, forms, exports, backups, rules-protected admin data |
| `instructor` | Assigned kids/teams, instructor dashboards, events/vehicles/forms views where allowed |
| `parent` | Own kids, parent dashboard, events, form submission |
| `host` | Host-facing views and limited participant comments |
| `guest` | Minimal/read-only access where rules allow it |

Do not set custom claims by hand during normal operations. Update the `users/{uid}` role and let the function sync claims.

## 🔑 Authentication And User Creation

Public self-signup is locked down. Admins create users from inside the app. That flow calls the admin-only `createUserForAdmin` Cloud Function.

New email/password users currently receive the default password `123456` and should change it on first login. Google sign-in is supported for users that the app can reconcile to an allowed profile.

### Bootstrapping The First Admin

The admin UI needs an existing admin, so the first admin must be seeded manually.

Local emulators:

```bash
firebase emulators:start
npm run seed:users
```

Then log in as `admin@test.com` / `123456`.

Production:

1. Create the user in Firebase Authentication.
2. In Firestore, create or update `users/{uid}` with at least:

   ```js
   {
     uid: "<same-as-auth-uid>",
     email: "admin@example.com",
     emailLower: "admin@example.com",
     displayName: "Admin User",
     name: "Admin User",
     role: "admin"
   }
   ```

3. The `syncUserRoleClaim` function propagates the `admin` claim.
4. Have the user sign out and back in if their token still has old claims.

## 📊 Data Model

Firestore rules are the source of truth for allowed access. Main collections:

- `users` - profile documents, role, auth provider metadata
- `kids` - participant records and parent links
- `teams` - teams, instructors, kids, and vehicle references
- `events` - event records
- `eventParticipants` - event participation records
- `vehicles` - vehicles and assignment state
- `instructors` - instructor records
- `forms` - form templates
- `form_submissions` - submitted form answers
- `form_assignments` - form assignment records
- `reports` - generated report data
- `backups` - backup metadata

## 📜 Scripts

Run these from `Paragrutarally-WebApp/`.

| Command | What it does | Notes |
| --- | --- | --- |
| `npm run dev` | Start Vite on port `3000` | Opens browser automatically |
| `npm run build` | Build production assets into `dist/` | Required before hosting deploy |
| `npm run preview` | Preview built assets locally | Run after `npm run build` |
| `npm run lint` | Run ESLint | Use before PRs |
| `npm test` | Run all Vitest tests once | Does not replace rules/integration checks for Firebase changes |
| `npm run test:watch` | Run Vitest in watch mode | Local development |
| `npm run test:unit` | Run `*.unit.spec` tests | Fast PR check |
| `npm run test:integration` | Run integration specs with Auth + Firestore emulators | Script starts emulators through `firebase emulators:exec` |
| `npm run test:rules` | Run Firestore/Storage rules tests with emulators | Use for rules or permission changes |
| `npm run seed:users` | Seed emulator users | Requires running Auth + Firestore emulators |
| `npm run audit:auth-users` | Compare production Firebase Auth users with Firestore `users` docs | Requires `credentials.json`; read-only |
| `npm run repair:auth-user` | Repair or delete mismatched production Auth/Firestore users | Requires `credentials.json` and `--yes`; admin-only operation |

Admin utility examples:

```bash
# Read-only production consistency audit
npm run audit:auth-users

# Create a missing Firestore profile for an existing Auth user
node scripts/repair-auth-user.mjs --email user@example.com --role parent --name "Full Name" --yes

# Delete an Auth-only account after confirming it should not exist
node scripts/repair-auth-user.mjs --email user@example.com --delete-auth --yes
```

`credentials.json` is a service-account key, is gitignored, and must never be committed. Ask a project admin before using any script that reads or writes production data.

## 🧪 Testing

Recommended local checks:

```bash
npm run lint
npm run build
npm run test:unit
```

Firebase-specific checks:

```bash
npm run test:integration
npm run test:rules
```

See [`TESTING_BEST_PRACTICES.md`](Paragrutarally-WebApp/TESTING_BEST_PRACTICES.md) for testing conventions.

## ☁️ Cloud Functions

Functions source lives in [`firebase-functions/`](Paragrutarally-WebApp/firebase-functions). Key functions include:

- `createUserForAdmin`
- `deleteUser`
- `getUserInfo`
- `completeGoogleSignIn`
- `syncUserRoleClaim`
- `healthCheck`

Install function dependencies:

```bash
cd Paragrutarally-WebApp/firebase-functions
npm install
```

Deploy functions from the app directory:

```bash
cd Paragrutarally-WebApp
firebase deploy --only functions
```

Callable functions are Gen 2 Cloud Functions backed by Cloud Run. If the browser reports a CORS error but a direct request shows a plain Google `403` before function code runs, check the underlying Cloud Run invoker/IAM access before changing frontend CORS code.

## 🔒 Security Rules

Rules live under [`Paragrutarally-WebApp/firebase/`](Paragrutarally-WebApp/firebase).

```bash
cd Paragrutarally-WebApp
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

Run `npm run test:rules` after changing Firestore or Storage rules.

## 🚢 Deployment And CI

Firebase config lives inside `Paragrutarally-WebApp/`, but GitHub Actions workflows live at the repo root in [`.github/workflows/`](.github/workflows).

Current workflows:

- [`main.yml`](.github/workflows/main.yml) is named **Firebase Auto Deploy**. It runs on `push` to `main` and on `pull_request` targeting `main`.
- The `deploy` job installs dependencies, builds the app with GitHub secrets, and runs `firebase deploy`.
- The `deploy-functions` job runs after `deploy` and deploys functions with `firebase deploy --only functions`.
- [`firebase-hosting-pull-request.yml`](.github/workflows/firebase-hosting-pull-request.yml) creates Firebase Hosting PR previews for same-repository pull requests.

Because `main.yml` currently includes `pull_request`, an internal PR can run the full Firebase deploy workflow, not only a preview. Confirm the expected deploy behavior with a project admin before opening or merging your first PR.

Manual deploys from `Paragrutarally-WebApp/`:

```bash
# Hosting only; firebase.json runs npm build first through hosting.predeploy
firebase deploy --only hosting

# Functions only
firebase deploy --only functions

# Rules only
firebase deploy --only firestore:rules
firebase deploy --only storage:rules

# Everything configured in firebase.json
firebase deploy
```

## 🔄 Import, Export, And Backups

- Most export flows are available through the admin UI.
- Google Drive backup features require valid Google API/OAuth configuration.
- `scripts/import.mjs` reads production Firestore using `credentials.json` and copies selected collections into the local Firestore emulator on port `8080`.
- Treat import and repair scripts as admin tools. Verify the target project before running them.

## 🛠️ Troubleshooting

- **Blank screen or Firebase initialization error** - check `.env`, make sure required `VITE_*` values are set, and restart `npm run dev`.
- **Local app accidentally points at production** - set `VITE_USE_FIREBASE_EMULATORS=true`, start emulators, and restart the dev server.
- **Emulator connection errors** - confirm `firebase emulators:start` is running and ports match `firebase.json`.
- **Permission denied** - inspect the user's `users/{uid}` document and role, then check `firebase/firestore.rules`.
- **Login works but role/UI is wrong** - custom claims may be stale. Re-save the user doc or have the user sign out and back in.
- **Auth user exists but user is missing from admin tables** - compare Firebase Auth with Firestore `users/{uid}`. Use `npm run audit:auth-users` if you have admin credentials.
- **Callable function looks like a CORS failure** - direct-test the callable URL. A plain Google `403` without callable JSON usually points to Cloud Run invoker/IAM access.
- **Node install/build errors** - verify `node --version` is Node 22.
- **Google sign-in errors** - verify `VITE_GOOGLE_CLIENT_ID`, authorized JavaScript origins, and Firebase Authentication provider settings.
- **Drive backup errors** - verify Google API key/client ID, scopes, and account permissions.
- **Import script errors** - confirm `credentials.json` exists, the service account has access, and the Firestore emulator is running on `8080`.

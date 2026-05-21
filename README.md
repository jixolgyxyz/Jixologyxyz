# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

# Structure

## client/
Frontend application and UI logic.

## server/
API integrations.

## supabase/
Supabase configuration, database migrations, and project resources.



## #######################################################################################################################################
## What to run after db reset --local

-- cd supabase

-- npm run begin-project

(properly stop the DB Supabase before)



## #######################################################################################################################################
## Playwright — E2E Testing

### Prerequisites
- Node dependencies installed (`npm install` inside `client/`)
- The Vite dev server must be reachable at `http://localhost:5173` (Playwright starts it automatically)

### 1. Install dependencies & browser

```bash
cd client
npm install
npx playwright install chromium
```

### 2. Create the credentials file

```bash
# Copy the example and fill in a real test-user email + password
cp client/.env.e2e.example client/.env.e2e
```

Edit `client/.env.e2e`:
```
E2E_EMAIL=testuser@example.com
E2E_PASSWORD=your_test_password
E2E_PROJECT_ID=1
E2E_TESTER_NAME=Your Name
```

> The test user must already exist in Supabase and have an active `usuario` record.
> `E2E_TESTER_NAME` is stamped into the HTML report (and into the report folder name) so a shared report shows who ran it.

### 3. Run the tests

```bash
cd client
npm run test:e2e
```

Playwright will:
1. Start the Vite dev server automatically (or reuse one already running).
2. Log in once and save the session to `e2e/.auth/session.json`.
3. Execute all specs under `client/e2e/`.
4. Generate an HTML report at `client/playwright-report/index.html`.

---

### Generate a shareable report

Use this when you need to hand the results to someone else:

```bash
cd client
npm run test:e2e:report
```

It runs the full suite and saves a **self-contained HTML report** into a folder
named after the run date and the tester:

```
client/e2e-reports/2026-05-20_Your-Name/
```

- The tester name comes from `E2E_TESTER_NAME` in `.env.e2e`. It is used in the
  folder name and written into the report's metadata, so the recipient can see
  who produced it. If the variable is missing the folder is just the date.
- Running it again the same day **overwrites** that folder. To keep every run,
  append the time:
  ```bash
  npm run test:e2e:report -- --time   # → e2e-reports/2026-05-20_14-30-05_Your-Name/
  ```
- The report is saved whether the tests pass or fail.
- When it finishes, the script prints a ready-to-use zip command, e.g.:
  ```powershell
  Compress-Archive -Path "client\e2e-reports\2026-05-20_Your-Name\*" -DestinationPath "report.zip"
  ```
- Whoever receives the zip opens it with:
  ```bash
  npx playwright show-report <unzipped-folder>
  ```

> `e2e-reports/` is gitignored — the reports are build artifacts, not source.

---

### Commands

| Command | What it does |
|---|---|
| `npm run test:e2e` | Run all tests headlessly and generate the HTML report |
| `npm run test:e2e:ui` | Open Playwright's interactive UI — pick and watch individual tests |
| `npm run test:e2e:debug` | Run tests with the browser visible and the Playwright inspector attached |
| `npm run test:e2e:report` | Run all tests and save a dated, shareable HTML report under `e2e-reports/` |
| `npm run test:e2e:report -- --time` | Same, but the report folder also includes the time (keeps multiple same-day runs) |
| `npx playwright show-report` | Open the last HTML report in the browser |
| `npx playwright test --grep "login"` | Run only tests whose name matches a keyword |
| `npx playwright test tests/e2e/backlog` |Run only test on the backlog folder |

---

### Folder structure

```
client/
  tests/
    unit/               # Unit tests (Jest / Vitest — future)
    integration/        # Integration tests (future)
    e2e/
      .auth/            # Gitignored — saved session after global setup
      fixtures/
        auth.fixture.ts # Shared authenticated-page fixture
      login/
        login.spec.ts   # Login flow tests
      global.setup.ts   # Runs once before all specs to log in and save session
  scripts/
    run-e2e-report.mjs  # Runs the suite + saves a dated, shareable HTML report
  e2e-reports/          # Gitignored — dated HTML reports from test:e2e:report
  playwright.config.ts  # Playwright configuration
  .env.e2e              # Gitignored — test credentials + E2E_TESTER_NAME
  .env.e2e.example      # Template — copy this and fill in your credentials
```

## #######################################################################################################################################
## Docker — Build & Run

### Prerequisites
- Docker Desktop installed and running
- `server/.env` file created with the following variables:
  ```
  SUPABASE_URL=your_supabase_url
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  JWT_SECRET=your_jwt_secret
  PORT=3000
  ```
  Find these values in the Supabase dashboard under **Project Settings → API**.

> **Important:** The client build bakes environment variables into the JS bundle at build time.  
> You must pass the real production values via `--build-arg` — the local `.env` file is excluded from Docker builds.

### 1. Build the images
Run both commands from the **repo root**:

```bash
# Client (Nginx, serves the React app)
# Replace each value with your real Supabase / API / Gemini credentials
docker build \
  --build-arg VITE_SUPABASE_URL=https://your-project-id.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your-anon-key \
  --build-arg VITE_BUSINESS_API_URL=http://localhost:3000 \
  --build-arg VITE_GEMINI_API_KEY=your-gemini-api-key \
  -t jixology-client \
  -f client/Dockerfile client/

# Server (Express + Socket.io)
docker build -t jixology-server -f server/Dockerfile .
```

### 2. Run the containers

```bash
# Client — available at http://localhost
docker run -d -p 5173:80 --name jixology-client jixology-client

# Server — available at http://localhost:3000
docker run -d -p 3000:3000 --env-file server/.env --name jixology-server jixology-server
```

### 3. Verify

```bash
# Check both containers are running
docker ps

# Check server health
curl http://localhost:3000/health
```

Open [http://localhost](http://localhost) in your browser to access the app.

### Useful commands

```bash
# View logs
docker logs jixology-client
docker logs jixology-server

# Stop and remove containers
docker stop jixology-client jixology-server
docker rm   jixology-client jixology-server
```
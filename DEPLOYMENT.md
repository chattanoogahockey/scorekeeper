# Azure App Service Build Automation for Scorekeeper2

This project is set up for best-practice Azure deployment:
- **Do NOT commit `frontend/dist` to git.**
- Azure will build the frontend automatically on deploy.

## How it works
- The root `package.json` has a `build` script: `npm run build` builds the frontend.
- Azure App Service (or any Node.js host) will run `npm install` and then `npm run build` by default.
- The backend (`backend/server.js`) serves the built frontend from `frontend/dist`.

## Deployment Steps
1. **Push to main branch**: Azure will automatically install dependencies and run the build.
2. **No need to commit `frontend/dist`**: It is built on the server during deployment.
3. **If you add new frontend dependencies**: Make sure to update `frontend/package.json` and push.

## Local Development
- Use `npm run dev` from the root to run both frontend and backend in development mode.
- Use `npm run build` to build the frontend locally if you want to test the production build.

## Troubleshooting
- If you see a 404 on Azure, make sure the build step is running and that `frontend/dist` is not gitignored on the server.
- If you change the build process, update the `build` script in the root `package.json`.

---
This setup follows best practices for Node.js + React/Vite apps on Azure App Service.

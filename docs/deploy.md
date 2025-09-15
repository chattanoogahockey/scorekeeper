# GitHub Pages Deployment Guide

## Overview

This guide covers the deployment of the Chattanooga Hockey Scorekeeper application to GitHub Pages as a static site.

## Deployment Type

**Project Site**: Deployed to `https://chattanoogahockey.github.io/scorekeeper/`

- Repository: `chattanoogahockey/scorekeeper`
- Base path: `/scorekeeper/`
- Not a root domain deployment

## Prerequisites

1. **Repository Settings**:
   - Go to repository Settings → Pages
   - Set Source to "GitHub Actions"
   - Branch should be `main`

2. **Required Files**:
   - `frontend/public/404.html` - SPA routing fallback
   - `frontend/vite.config.js` - Base path configured to `/scorekeeper/`
   - `.github/workflows/deploy.yml` - GitHub Actions workflow

## Build Configuration

### Vite Configuration

The `frontend/vite.config.js` is configured with:

```javascript
export default defineConfig({
  base: '/scorekeeper/',  // Project site base path
  build: {
    outDir: '../dist',
    // ... other build options
  }
});
```

### SPA Routing Support

1. **404.html Fallback**: Handles direct links to routes like `/scorekeeper/dashboard`
2. **HashRouter**: React Router configured for client-side routing
3. **Base Path**: All assets and routes use the `/scorekeeper/` prefix

## Deployment Process

### Automatic Deployment

1. **Push to main branch** triggers the GitHub Actions workflow
2. **Build process**:
   - Installs dependencies in `frontend/` directory
   - Runs `npm run build` to generate static files
   - Outputs to `dist/` directory
3. **GitHub Pages deployment** serves files from the `dist/` directory

### Manual Deployment

```bash
# Build the application
cd frontend
npm install
npm run build

# The dist/ directory contains the deployable files
```

## File Structure After Build

```
dist/
├── assets/           # Compiled CSS and JS
├── sounds/           # Audio files (copied from public/sounds/)
├── data/            # JSON data files (copied from public/data/)
├── 404.html         # SPA routing fallback
├── index.html       # Main application entry
└── version.json     # Version information
```

## Base Path Handling

### Asset References

All assets use relative paths or are processed by Vite to include the base path:

- ✅ `/src/main.jsx` → `/scorekeeper/src/main.jsx`
- ✅ `/sounds/organs/file.mp3` → `/scorekeeper/sounds/organs/file.mp3`
- ✅ `/data/games.json` → `/scorekeeper/data/games.json`

### Link Handling

The application uses `HashRouter` which handles routing client-side:

- Direct links: `https://chattanoogahockey.github.io/scorekeeper/#/dashboard`
- 404 fallback redirects to: `https://chattanoogahockey.github.io/scorekeeper/?/dashboard`

## Testing Deep Links

### Test URLs

After deployment, test these URLs to ensure they work:

1. **Home page**: `https://chattanoogahockey.github.io/scorekeeper/`
2. **Dashboard**: `https://chattanoogahockey.github.io/scorekeeper/#/dashboard`
3. **Statistics**: `https://chattanoogahockey.github.io/scorekeeper/#/statistics`
4. **API Test**: `https://chattanoogahockey.github.io/scorekeeper/#/api-test`

### Expected Behavior

- ✅ Direct links should load the app and navigate to the correct route
- ✅ No 404 errors for valid routes
- ✅ Browser refresh on any route should work
- ✅ Back/forward navigation should work

## Troubleshooting

### Common Issues

1. **404 on direct links**:
   - Ensure `404.html` exists in `public/` directory
   - Check that GitHub Pages is set to deploy from `gh-pages` branch or GitHub Actions

2. **Assets not loading**:
   - Verify `base: '/scorekeeper/'` in `vite.config.js`
   - Check that assets are in the correct `dist/` subdirectory

3. **Build failures**:
   - Ensure `frontend/package.json` dependencies are correct
   - Check Node.js version compatibility (18+)

### Debug Steps

1. **Check deployment status**:
   - Go to repository Settings → Pages
   - Verify deployment status and URL

2. **Test locally**:
   ```bash
   cd frontend
   npm run build
   npx serve dist -l 3000
   # Test at http://localhost:3000/scorekeeper/
   ```

3. **Check build output**:
   - Verify `dist/index.html` contains correct asset paths
   - Ensure `dist/404.html` exists and has correct script

## Performance Optimization

### Current Optimizations

- **Static assets**: All files served from GitHub's CDN
- **No server requests**: Completely offline-capable
- **Optimized bundles**: Vite handles code splitting and minification
- **Audio files**: Served directly from GitHub Pages

### Cache Headers

GitHub Pages serves static files with appropriate cache headers for optimal performance.

## Security Considerations

- **No server-side processing**: All logic runs client-side
- **Static file serving**: No dynamic content or user data storage on server
- **HTTPS only**: GitHub Pages enforces SSL/TLS
- **Content Security Policy**: Can be configured if needed

## Maintenance

### Regular Tasks

1. **Monitor deployments**: Check GitHub Actions for build failures
2. **Update dependencies**: Keep `frontend/package.json` current
3. **Test functionality**: Verify all routes work after updates

### Version Management

- Version information stored in `public/version.json`
- Build process includes git commit hash for traceability
- Automatic versioning via `generate-version.js` script

## Support

For deployment issues:
1. Check GitHub Actions logs for build errors
2. Verify repository Pages settings
3. Test locally before pushing changes
4. Review this documentation for configuration requirements
# CI/CD Pipeline Documentation

## Overview

This document describes the GitHub Actions CI/CD pipeline for the Chattanooga Hockey Scorekeeper application. The pipeline ensures code quality, validates changes, and automates deployment to GitHub Pages.

## Pipeline Architecture

### Workflows

#### 1. Deploy to GitHub Pages (`deploy.yml`)
**Triggers**: Push to `main` branch, manual dispatch
**Purpose**: Build and deploy the application to GitHub Pages

#### 2. PR Validation (`pr-validation.yml`)
**Triggers**: Pull requests to `main` branch (opened, synchronized, reopened, ready for review)
**Purpose**: Validate changes before merge

## Job Details

### Deploy Workflow Jobs

#### Validate Job
Runs validation checks on every push to main:

- **Node.js Setup**: Uses Node.js 18 with npm caching
- **Dependency Installation**: `npm ci` for consistent installs
- **Build Validation**: Ensures the application builds successfully
- **Link Checking**: Validates all links in documentation files
- **JSON Schema Validation**: Validates JSON file syntax and structure
- **HTML Validation**: Checks HTML files for syntax errors

#### Build Job
Creates production build:

- **Dependencies**: Installs frontend dependencies
- **Build Process**: `npm run build` in frontend directory
- **Artifact Upload**: Uploads `dist/` folder for deployment

#### Deploy Job
Deploys to GitHub Pages:

- **Pages Configuration**: Sets up GitHub Pages environment
- **Artifact Deployment**: Deploys build artifacts to Pages

### PR Validation Workflow Jobs

#### Validate PR Job
Comprehensive validation for pull requests:

- **Draft PR Handling**: Skips validation for draft PRs
- **Build Validation**: Ensures PR builds successfully
- **Link Validation**: Checks modified documentation files
- **JSON Validation**: Validates all JSON files in the repository
- **Data Structure Validation**: Validates games.json, players.json, teams.json
- **Security Scanning**: Checks for sensitive data patterns
- **File Size Validation**: Warns about oversized files
- **PR Comments**: Automatically comments with validation results

## Validation Checks

### Link Validation
- Uses `gaurav-nelson/github-action-markdown-link-check`
- Checks only modified files for efficiency
- Configured via `.github/workflows/link-check-config.json`
- Ignores localhost URLs
- Handles GitHub-specific link patterns

### JSON Validation
- Validates JSON syntax using Python's `json.tool`
- Checks data structure integrity
- Validates specific data files (games, players, teams)
- Ensures arrays are properly formatted

### Security Validation
- Scans for API keys, secrets, passwords, tokens
- Uses regex patterns to detect sensitive data
- Warns if potential security issues are found

### File Size Validation
- Checks for files larger than 50MB
- Excludes node_modules, .git, and dist directories
- Helps prevent accidental large file commits

## Reading Failures

### Common Failure Scenarios

#### Build Failures
```
❌ Build failed in 1.17s
error during build:
Could not resolve entry module "static-data-service"
```

**Solution**:
- Check that all imports are correct
- Verify file paths in import statements
- Ensure dependencies are properly installed

#### Link Check Failures
```
❌ [❌] https://example.com/broken-link
```

**Solution**:
- Fix or remove broken links
- Update URLs to correct destinations
- Add links to ignore list if they're intentionally broken

#### JSON Validation Failures
```
❌ Invalid JSON: frontend/public/data/games.json
```

**Solution**:
- Use a JSON validator to check syntax
- Ensure proper comma placement
- Verify quotes are properly escaped

#### Security Scan Failures
```
⚠️ Potential sensitive data found in files
```

**Solution**:
- Remove API keys, secrets, and tokens
- Use environment variables for sensitive data
- Ensure no hardcoded credentials

### Debugging Steps

1. **Check Action Logs**: Review the detailed logs in the Actions tab
2. **Run Locally**: Test builds and validations on your local machine
3. **Check Configuration**: Verify workflow YAML syntax
4. **Review Dependencies**: Ensure all required actions and tools are available

## Configuration Files

### Link Check Configuration
Located at: `.github/workflows/link-check-config.json`

```json
{
  "ignorePatterns": [
    {"pattern": "^http://localhost"},
    {"pattern": "^https://localhost"}
  ],
  "replacementPatterns": [
    {"pattern": "^/", "replacement": "{{BASEURL}}/"}
  ],
  "timeout": "30s",
  "retryOn429": true,
  "retryCount": 3
}
```

### Workflow Triggers
- **Deploy**: Automatic on push to `main`, manual via workflow dispatch
- **PR Validation**: Automatic on PR events, only for non-draft PRs

## Environment Variables

The pipeline uses the following environment variables:
- `NODE_VERSION`: Node.js version (currently 18)
- `NPM_CACHE_PATH`: Path for npm cache optimization

## Permissions

Required GitHub permissions:
- `contents: read` - Read repository contents
- `pages: write` - Deploy to GitHub Pages
- `id-token: write` - GitHub Pages deployment
- `pull-requests: write` - Comment on PRs
- `checks: write` - Update check status

## Monitoring and Maintenance

### Regular Maintenance Tasks

1. **Update Actions**: Keep GitHub Actions up to date
2. **Review Dependencies**: Update Node.js and npm versions
3. **Monitor Performance**: Check build times and optimize if needed
4. **Update Configurations**: Review and update validation rules

### Performance Optimization

- **Caching**: Uses npm caching to speed up builds
- **Parallel Jobs**: Validation and build jobs run in parallel when possible
- **Selective Checks**: Only validates modified files where applicable

## Troubleshooting

### Common Issues

#### Permission Errors
```
Error: Resource not accessible by integration
```
**Solution**: Check repository permissions and GitHub App settings

#### Cache Issues
```
Cache not found
```
**Solution**: Clear caches and re-run the workflow

#### Timeout Errors
```
The job running on runner xxx has exceeded the maximum execution time
```
**Solution**: Optimize build process or increase timeout limits

### Getting Help

1. Check the Actions tab for detailed error logs
2. Review workflow YAML syntax
3. Test changes locally before pushing
4. Consult GitHub Actions documentation

## Future Enhancements

Potential improvements for the CI/CD pipeline:

- Add unit and integration tests
- Implement performance regression testing
- Add accessibility testing
- Implement automated dependency updates
- Add deployment previews for PRs
- Implement canary deployments
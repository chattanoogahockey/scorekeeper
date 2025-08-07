import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

try {
  // Read package.json from root directory for unified versioning
  const packageJsonPath = path.join('..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  let gitInfo = {};
  try {
    // Get git information
    const gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    gitInfo = {
      commit: gitCommit,
      branch: gitBranch
    };
  } catch (gitError) {
    console.log('Git info not available:', gitError.message);
    // Use GitHub environment variables if git commands fail
    gitInfo = {
      commit: process.env.GITHUB_SHA || 'unknown',
      branch: process.env.GITHUB_REF_NAME || 'unknown'
    };
  }

  // Use GitHub Actions workflow time if available, otherwise current time
  let deploymentTime;
  
  // In GitHub Actions, use environment variables for deployment time
  if (process.env.DEPLOYMENT_TIMESTAMP) {
    // Use GitHub workflow deployment timestamp (already in EST from workflow)
    deploymentTime = new Date(process.env.DEPLOYMENT_TIMESTAMP);
    console.log('Using deployment timestamp from environment:', process.env.DEPLOYMENT_TIMESTAMP);
    console.log('Parsed deployment time:', deploymentTime.toString());
  } else {
    // Fallback to current time for local builds
    deploymentTime = new Date();
    console.log('Using local build time');
  }
  
  // Format the time in Eastern timezone properly
  const buildTime = deploymentTime.toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });
  
  console.log('Final formatted build time:', buildTime);

  const versionInfo = {
    version: packageJson.version,
    name: packageJson.name,
    ...gitInfo,
    buildTime: buildTime
  };

  // Ensure public directory exists
  if (!fs.existsSync('public')) {
    fs.mkdirSync('public', { recursive: true });
  }

  // Write version info to public directory
  fs.writeFileSync('public/version.json', JSON.stringify(versionInfo, null, 2));
  
  console.log('✅ Version info generated:', versionInfo);
} catch (error) {
  console.error('❌ Error generating version info:', error);
  process.exit(1);
}

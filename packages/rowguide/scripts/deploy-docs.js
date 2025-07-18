#!/usr/bin/env node
/**
 * Documentation Deployment Script
 *
 * Handles deployment of documentation to GitHub Pages and local serving
 * with automatic synchronization and version management.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const DEPLOY_CONFIG = {
  githubPages: {
    branch: 'gh-pages',
    directory: '../../docs',
    remote: 'origin'
  },
  localServer: {
    port: 8080,
    host: 'localhost',
    baseDir: '../../docs'
  },
  paths: {
    apiDocs: '../../docs/api',
    buildReports: '../../docs/api-reports',
    deploymentLog: '../../docs/deployment.log'
  }
};

/**
 * Execute command with error handling and logging
 */
function executeCommand(command, description, options = {}) {
  console.log(`\n🔄 ${description}...`);

  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: options.cwd || process.cwd()
    });

    console.log(`✅ ${description} completed successfully`);
    return { success: true, output: result };
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return { success: false, error: error.message, output: error.stdout };
  }
}

/**
 * Log deployment activity
 */
function logDeployment(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}\n`;

  fs.appendFileSync(DEPLOY_CONFIG.paths.deploymentLog, logEntry);

  if (type === 'error') {
    console.error(`❌ ${message}`);
  } else {
    console.log(`📝 ${message}`);
  }
}

/**
 * Check if documentation exists and is valid
 */
function validateDocumentation() {
  console.log('\n🔍 Validating documentation for deployment...');

  const apiDocsPath = DEPLOY_CONFIG.paths.apiDocs;
  const indexPath = path.join(apiDocsPath, 'index.html');

  if (!fs.existsSync(apiDocsPath)) {
    logDeployment('API documentation directory not found', 'error');
    return false;
  }

  if (!fs.existsSync(indexPath)) {
    logDeployment('API documentation index.html not found', 'error');
    return false;
  }

  // Check for essential files
  const requiredFiles = ['modules.html', 'classes', 'interfaces'];
  const missingFiles = requiredFiles.filter(file =>
    !fs.existsSync(path.join(apiDocsPath, file))
  );

  if (missingFiles.length > 0) {
    logDeployment(`Missing required documentation files: ${missingFiles.join(', ')}`, 'error');
    return false;
  }

  logDeployment('Documentation validation passed');
  return true;
}

/**
 * Create deployment manifest
 */
function createDeploymentManifest() {
  const manifest = {
    version: require('../package.json').version,
    deploymentTime: new Date().toISOString(),
    gitCommit: process.env.GITHUB_SHA || 'local',
    buildEnvironment: process.env.NODE_ENV || 'development',
    documentation: {
      apiDocs: 'api/',
      reports: 'api-reports/',
      portal: 'api/portal.html'
    },
    urls: {
      production: 'https://techyshishy.github.io/rowguide/',
      development: `http://${DEPLOY_CONFIG.localServer.host}:${DEPLOY_CONFIG.localServer.port}/`
    }
  };

  const manifestPath = path.join(DEPLOY_CONFIG.paths.apiDocs, 'deployment-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  logDeployment('Deployment manifest created');
  return manifest;
}

/**
 * Deploy to GitHub Pages
 */
function deployToGitHubPages() {
  console.log('\n🚀 Deploying to GitHub Pages...');

  if (!validateDocumentation()) {
    logDeployment('Documentation validation failed, aborting deployment', 'error');
    return false;
  }

  const manifest = createDeploymentManifest();

  // Check if we're in a git repository
  const gitCheck = executeCommand('git rev-parse --git-dir', 'Checking git repository', { silent: true });
  if (!gitCheck.success) {
    logDeployment('Not in a git repository, skipping GitHub Pages deployment', 'error');
    return false;
  }

  // Get current branch
  const currentBranch = executeCommand('git branch --show-current', 'Getting current branch', { silent: true });
  if (!currentBranch.success) {
    logDeployment('Failed to get current branch', 'error');
    return false;
  }

  const docsDir = DEPLOY_CONFIG.githubPages.directory;

  // Stage documentation files
  executeCommand(`git add ${docsDir}`, 'Staging documentation files');

  // Check if there are changes to commit
  const statusResult = executeCommand('git status --porcelain', 'Checking git status', { silent: true });
  if (statusResult.success && statusResult.output.trim() === '') {
    logDeployment('No changes to deploy');
    return true;
  }

  // Commit changes
  const commitMessage = `docs: update API documentation v${manifest.version}`;
  executeCommand(`git commit -m "${commitMessage}"`, 'Committing documentation changes');

  // Push to remote
  const pushResult = executeCommand(
    `git push ${DEPLOY_CONFIG.githubPages.remote} ${currentBranch.output.trim()}`,
    'Pushing to GitHub'
  );

  if (pushResult.success) {
    logDeployment(`Successfully deployed to GitHub Pages: ${manifest.urls.production}`);
    return true;
  } else {
    logDeployment('Failed to push to GitHub Pages', 'error');
    return false;
  }
}

/**
 * Start local development server
 */
function startLocalServer() {
  console.log('\n🌐 Starting local documentation server...');

  if (!validateDocumentation()) {
    logDeployment('Documentation validation failed, cannot start server', 'error');
    return false;
  }

  const manifest = createDeploymentManifest();

  // Check if http-server is available
  const serverCheck = executeCommand('which http-server', 'Checking for http-server', { silent: true });

  if (!serverCheck.success) {
    console.log('📦 Installing http-server...');
    executeCommand('npm install -g http-server', 'Installing http-server globally');
  }

  const serverUrl = `http://${DEPLOY_CONFIG.localServer.host}:${DEPLOY_CONFIG.localServer.port}`;

  console.log(`\n📖 Documentation server starting at: ${serverUrl}`);
  console.log(`🚪 Portal: ${serverUrl}/api/portal.html`);
  console.log(`📚 API Docs: ${serverUrl}/api/`);
  console.log(`📊 Reports: ${serverUrl}/api-reports/`);
  console.log('\n🛑 Press Ctrl+C to stop the server\n');

  logDeployment(`Local server started at ${serverUrl}`);

  // Start server (this will block)
  const serverCommand = `http-server ${DEPLOY_CONFIG.localServer.baseDir} -p ${DEPLOY_CONFIG.localServer.port} -c-1 --cors`;
  executeCommand(serverCommand, 'Running documentation server');
}

/**
 * Watch for changes and auto-rebuild
 */
function watchAndRebuild() {
  console.log('\n👀 Starting documentation watch mode...');

  const chokidar = require('chokidar');
  const debounce = require('lodash.debounce');

  const watcher = chokidar.watch([
    'src/**/*.ts',
    'src/**/*.js',
    'typedoc.json',
    'package.json'
  ], {
    ignored: [
      'node_modules/**',
      'dist/**',
      '**/*.spec.ts',
      '**/*.test.ts'
    ],
    persistent: true
  });

  const rebuild = debounce(async () => {
    console.log('\n🔄 File changes detected, rebuilding documentation...');

    const buildResult = executeCommand('npm run docs:generate', 'Rebuilding documentation');

    if (buildResult.success) {
      logDeployment('Documentation rebuilt successfully');
    } else {
      logDeployment('Documentation rebuild failed', 'error');
    }
  }, 2000);

  watcher.on('change', (path) => {
    console.log(`📝 File changed: ${path}`);
    rebuild();
  });

  watcher.on('add', (path) => {
    console.log(`➕ File added: ${path}`);
    rebuild();
  });

  watcher.on('unlink', (path) => {
    console.log(`🗑️ File removed: ${path}`);
    rebuild();
  });

  console.log('👀 Watching for changes... Press Ctrl+C to stop');

  // Keep the process alive
  process.stdin.resume();
}

/**
 * Main deployment command handler
 */
function handleDeployment(command) {
  const commands = {
    'github': deployToGitHubPages,
    'local': startLocalServer,
    'watch': watchAndRebuild,
    'validate': validateDocumentation
  };

  if (commands[command]) {
    commands[command]();
  } else {
    console.log(`\n📖 Rowguide Documentation Deployment\n`);
    console.log('Available commands:');
    console.log('  github   - Deploy to GitHub Pages');
    console.log('  local    - Start local development server');
    console.log('  watch    - Watch for changes and auto-rebuild');
    console.log('  validate - Validate documentation structure');
    console.log(`\nUsage: node deploy-docs.js [command]`);
  }
}

// Run if called directly
if (require.main === module) {
  const command = process.argv[2];
  handleDeployment(command);
}

module.exports = {
  deployToGitHubPages,
  startLocalServer,
  validateDocumentation,
  createDeploymentManifest,
  watchAndRebuild
};

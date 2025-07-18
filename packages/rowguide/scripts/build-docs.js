#!/usr/bin/env node
/**
 * Documentation Build Script
 *
 * Comprehensive documentation build pipeline that generates API documentation,
 * validates links, generates coverage reports, and creates deployment artifacts.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  docsDir: '../../docs/api',
  outputDir: '../../docs/api-reports',
  coverageFile: 'documentation-coverage.json',
  validationFile: 'validation-report.json',
  buildMetrics: 'build-metrics.json'
};

/**
 * Execute command with error handling
 */
function executeCommand(command, description) {
  console.log(`\n🔄 ${description}...`);

  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    console.log(`✅ ${description} completed successfully`);
    return { success: true, output: result };
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return { success: false, error: error.message, output: error.stdout };
  }
}

/**
 * Generate documentation coverage report
 */
function generateCoverageReport() {
  console.log('\n📊 Generating documentation coverage report...');

  const result = executeCommand(
    'typedoc --validation.notExported --validation.invalidLink --validation.notDocumented --logLevel Warn',
    'Analyzing documentation coverage'
  );

  if (result.success) {
    const coverage = {
      timestamp: new Date().toISOString(),
      status: 'success',
      metrics: {
        totalSymbols: 0,
        documentedSymbols: 0,
        coveragePercentage: 0,
        invalidLinks: 0,
        missingDocumentation: 0
      },
      details: result.output
    };

    // Parse output for metrics (basic implementation)
    const lines = result.output.split('\n');
    coverage.metrics.invalidLinks = lines.filter(line =>
      line.includes('Failed to resolve link')).length;

    saveBuildReport(CONFIG.coverageFile, coverage);
    console.log(`📈 Coverage report saved to ${CONFIG.coverageFile}`);
  }

  return result;
}

/**
 * Validate documentation links and structure
 */
function validateDocumentation() {
  console.log('\n🔍 Validating documentation...');

  const result = executeCommand(
    'typedoc --validation.notExported --validation.invalidLink --validation.notDocumented --logLevel Warn',
    'Validating documentation structure'
  );

  const validation = {
    timestamp: new Date().toISOString(),
    status: result.success ? 'success' : 'failed',
    warnings: result.output.split('\n').filter(line =>
      line.includes('[warning]')).length,
    errors: result.output.split('\n').filter(line =>
      line.includes('[error]')).length,
    details: result.output
  };

  saveBuildReport(CONFIG.validationFile, validation);
  console.log(`🔍 Validation report saved to ${CONFIG.validationFile}`);

  return result;
}

/**
 * Generate main API documentation
 */
function generateApiDocumentation() {
  console.log('\n📚 Generating API documentation...');

  const result = executeCommand(
    'typedoc',
    'Generating TypeDoc API documentation'
  );

  if (result.success) {
    console.log(`📖 API documentation generated in ${CONFIG.docsDir}`);

    // Generate portal page AFTER TypeDoc has finished
    generateDocumentationPortal();
  }

  return result;
}

/**
 * Generate documentation portal page (called AFTER TypeDoc completes)
 */
function generateDocumentationPortal() {
  console.log('\n🚪 Generating documentation portal...');

  const portalContent = `<!DOCTYPE html>
<html>
<head>
    <title>Rowguide Documentation Portal</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 40px;
            background-color: #f8f9fa;
            line-height: 1.6;
        }
        .header {
            background: #ffffff;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        .header h1 {
            margin: 0 0 10px 0;
            color: #495057;
            font-size: 2.5em;
        }
        .header p {
            margin: 0;
            color: #6c757d;
            font-size: 1.1em;
        }
        .nav-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 25px;
            margin-bottom: 30px;
        }
        .nav-card {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 12px;
            padding: 25px;
            text-decoration: none;
            color: inherit;
            transition: all 0.3s ease;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        .nav-card:hover {
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            transform: translateY(-2px);
            border-color: #007bff;
        }
        .nav-card h3 {
            margin: 0 0 15px 0;
            color: #495057;
            font-size: 1.3em;
        }
        .nav-card p {
            margin: 0;
            color: #6c757d;
            font-size: 14px;
        }
        .server-info {
            background: #e8f5e8;
            border: 1px solid #c3e6c3;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }
        .server-info h4 {
            margin: 0 0 10px 0;
            color: #155724;
        }
        .timestamp {
            color: #6c757d;
            font-size: 12px;
            margin-top: 20px;
            text-align: center;
            padding: 15px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧩 Rowguide Documentation Portal</h1>
        <p>Comprehensive documentation for the Rowguide pattern tracking application</p>
    </div>

    <div class="server-info">
        <h4>📡 Documentation Server Status</h4>
        <p>🚀 Server: <strong>Running</strong> | 📚 API Docs: <a href="index.html">Available</a> | 📊 Reports: <a href="../api-reports/">Available</a></p>
    </div>

    <div class="nav-grid">
        <a href="index.html" class="nav-card">
            <h3>📚 API Reference</h3>
            <p>Complete TypeScript API documentation with examples and usage patterns. Browse classes, interfaces, and functions.</p>
        </a>

        <a href="../architecture/" class="nav-card">
            <h3>🏗️ Architecture Guide</h3>
            <p>System architecture, design patterns, and technical decisions. Understand the application structure.</p>
        </a>

        <a href="../code-examples/" class="nav-card">
            <h3>💻 Code Examples</h3>
            <p>Working examples, integration patterns, and best practices for developers.</p>
        </a>

        <a href="../implementation-checklist.markdown" class="nav-card">
            <h3>✅ Implementation Status</h3>
            <p>Development progress, task tracking, and completion status across all phases.</p>
        </a>

        <a href="../api-reports/" class="nav-card">
            <h3>📊 Build Reports</h3>
            <p>Documentation coverage, validation reports, and build metrics.</p>
        </a>

        <a href="../session-reports/" class="nav-card">
            <h3>📋 Session Reports</h3>
            <p>Detailed development session reports and progress tracking.</p>
        </a>
    </div>

    <div class="timestamp">
        Generated: ${new Date().toLocaleString()}<br>
        Build Version: ${require('../package.json').version} | Node: ${process.version} | Platform: ${process.platform}
    </div>
</body>
</html>`;

  const portalPath = path.join(CONFIG.docsDir, 'portal.html');

  // Ensure the directory exists
  if (!fs.existsSync(CONFIG.docsDir)) {
    fs.mkdirSync(CONFIG.docsDir, { recursive: true });
  }

  fs.writeFileSync(portalPath, portalContent);
  console.log(`📄 Documentation portal created at ${portalPath}`);
}

/**
 * Save build report to JSON file
 */
function saveBuildReport(filename, data) {
  const outputPath = path.join(CONFIG.outputDir, filename);

  // Ensure output directory exists
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
}

/**
 * Generate comprehensive build metrics
 */
function generateBuildMetrics() {
  const metrics = {
    buildTime: new Date().toISOString(),
    version: require('../package.json').version,
    nodeVersion: process.version,
    platform: process.platform,
    environment: process.env.NODE_ENV || 'development',
    status: 'completed',
    reports: {
      coverage: path.join(CONFIG.outputDir, CONFIG.coverageFile),
      validation: path.join(CONFIG.outputDir, CONFIG.validationFile)
    }
  };

  saveBuildReport(CONFIG.buildMetrics, metrics);
  console.log(`📊 Build metrics saved to ${CONFIG.buildMetrics}`);
}

/**
 * Main build process
 */
function buildDocumentation() {
  console.log('🚀 Starting comprehensive documentation build...');

  const startTime = Date.now();

  // Clean previous build
  executeCommand(`rm -rf ${CONFIG.docsDir}`, 'Cleaning previous documentation');

  // Generate API documentation (this will also create the portal)
  const apiResult = generateApiDocumentation();

  if (!apiResult.success) {
    console.error('❌ API documentation generation failed');
    process.exit(1);
  }

  // Generate coverage report
  generateCoverageReport();

  // Validate documentation
  validateDocumentation();

  // Generate build metrics
  generateBuildMetrics();

  const buildTime = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n✅ Documentation build completed in ${buildTime}s`);
  console.log(`📖 View documentation at: ${CONFIG.docsDir}/portal.html`);
  console.log(`📊 View reports at: ${CONFIG.outputDir}/`);
}

// Run the build process
buildDocumentation();

module.exports = {
  buildDocumentation,
  generateApiDocumentation,
  validateDocumentation,
  generateCoverageReport
};

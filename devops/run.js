#!/usr/bin/env node

/**
 * Cross-platform run script for LogorFileServer API
 * Replaces platform-specific scripts (run-win.ps1, run-linux.sh, run-macos.sh)
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Determine the executable name based on platform
function getExecutableName() {
  const platform = process.platform;

  if (platform === "win32") {
    return "LogorFileServer.Api.exe";
  } else {
    return "./LogorFileServer.Api";
  }
}

// Check if executable exists
function checkExecutable() {
  const executable = getExecutableName();

  if (!fs.existsSync(executable)) {
    console.error(`❌ Executable not found: ${executable}`);
    console.error(
      "Please make sure you are running this script from the build output directory."
    );
    process.exit(1);
  }

  return executable;
}

// Run the application
function runApplication() {
  const executable = checkExecutable();
  const platform = process.platform;

  console.log("🚀 Starting LogorFileServer API...");
  console.log(`📦 Platform: ${platform}`);
  console.log(`⚡ Executable: ${executable}`);
  console.log("---");

  // Set up environment variables if needed
  const env = {
    ...process.env,
    DOTNET_ENVIRONMENT: process.env.DOTNET_ENVIRONMENT || "Production",
  };

  // Spawn the process
  const childProcess = spawn(executable, [], {
    stdio: "inherit",
    env: env,
    shell: platform === "win32",
  });

  // Handle process events
  childProcess.on("error", (error) => {
    console.error(`❌ Failed to start application: ${error.message}`);
    process.exit(1);
  });

  childProcess.on("exit", (code, signal) => {
    if (code === 0) {
      console.log("✅ Application exited successfully");
    } else if (signal) {
      console.log(`⚠️  Application terminated with signal: ${signal}`);
    } else {
      console.log(`❌ Application exited with code: ${code}`);
    }
    process.exit(code || 0);
  });

  // Handle SIGINT (Ctrl+C) to gracefully shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Received SIGINT, shutting down...");
    childProcess.kill("SIGINT");
  });

  process.on("SIGTERM", () => {
    console.log("🛑 Received SIGTERM, shutting down...");
    childProcess.kill("SIGTERM");
  });
}

// Main execution
if (require.main === module) {
  runApplication();
}

module.exports = { getExecutableName, checkExecutable, runApplication };

#!/usr/bin/env node

/**
 * Cross-platform build script for packaging the API project for multiple platforms
 * Replaces the original PowerShell script for better cross-platform compatibility
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Parse command line arguments
const args = process.argv.slice(2);
const configuration = args.includes("--configuration")
  ? args[args.indexOf("--configuration") + 1]
  : "Release";

// Generate timestamp for output folder
const timestamp = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .split(".")[0]
  .replace("T", "-");
const baseOutputPath = `publish/build-${timestamp}`;

console.log(
  "\x1b[32m%s\x1b[0m",
  "Building LogorFileServer API project for all platforms..."
);
console.log("\x1b[36m%s\x1b[0m", `Build timestamp: ${timestamp}`);
console.log("\x1b[36m%s\x1b[0m", `Output base directory: ${baseOutputPath}`);

// Create base output directory
if (!fs.existsSync(baseOutputPath)) {
  fs.mkdirSync(baseOutputPath, { recursive: true });
}

// Target runtimes
const runtimes = [
  { name: "win-x64", output: path.join(baseOutputPath, "win-x64") },
  { name: "linux-x64", output: path.join(baseOutputPath, "linux-x64") },
  { name: "osx-x64", output: path.join(baseOutputPath, "osx-x64") },
];

// Build function
function buildForRuntime(runtime) {
  console.log("\x1b[36m%s\x1b[0m", `\nBuilding for runtime: ${runtime.name}`);
  console.log("\x1b[90m%s\x1b[0m", `Output directory: ${runtime.output}`);

  // Clean output directory
  if (fs.existsSync(runtime.output)) {
    fs.rmSync(runtime.output, { recursive: true, force: true });
    console.log(
      "\x1b[33m%s\x1b[0m",
      `Cleaned output directory: ${runtime.output}`
    );
  }

  try {
    // Build and publish only the API project
    const command = `dotnet publish "src/LogorFileServer.Api/LogorFileServer.Api.csproj" -c ${configuration} -r ${runtime.name} --self-contained true -o "${runtime.output}"`;

    execSync(command, { stdio: "inherit" });

    console.log("\x1b[32m%s\x1b[0m", `✅ ${runtime.name} built successfully!`);

    // List the main output files
    console.log("\x1b[33m%s\x1b[0m", "Main output files:");
    const files = fs.readdirSync(runtime.output);
    files
      .filter((file) => file.startsWith("LogorFileServer.Api"))
      .forEach((file) => {
        console.log("\x1b[37m%s\x1b[0m", `  - ${file}`);
      });

    return true;
  } catch (error) {
    console.log("\x1b[31m%s\x1b[0m", `❌ Build failed for ${runtime.name}!`);
    console.error(error);
    return false;
  }
}

// Build for all runtimes
let allSucceeded = true;

for (const runtime of runtimes) {
  if (!buildForRuntime(runtime)) {
    allSucceeded = false;
    break;
  }
}

if (allSucceeded) {
  console.log("\x1b[32m%s\x1b[0m", "\n🎉 All platforms built successfully!");
  console.log("\x1b[36m%s\x1b[0m", `Build timestamp: ${timestamp}`);
  console.log("\x1b[36m%s\x1b[0m", `Output base directory: ${baseOutputPath}`);
  console.log("\x1b[33m%s\x1b[0m", "Platform output directories:");
  runtimes.forEach((runtime) => {
    console.log("\x1b[37m%s\x1b[0m", `  - ${runtime.output}`);
  });
} else {
  console.log("\x1b[31m%s\x1b[0m", "\n💥 Some builds failed!");
}

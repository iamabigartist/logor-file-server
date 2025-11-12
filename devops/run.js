#!/usr/bin/env node

const { spawn } = require("child_process");
const fs = require("fs");

const executable =
  process.platform === "win32"
    ? "LogorFileServer.Api.exe"
    : "./LogorFileServer.Api";

if (!fs.existsSync(executable)) {
  console.error(`Executable not found: ${executable}`);
  process.exit(1);
}

console.log(`Starting ${executable}...`);

const child = spawn(executable, [], {
  stdio: "inherit",
  env: {
    ...process.env,
    DOTNET_ENVIRONMENT: process.env.DOTNET_ENVIRONMENT || "Production",
  },
  shell: process.platform === "win32",
});

child.on("error", (error) => {
  console.error(`Failed to start: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));

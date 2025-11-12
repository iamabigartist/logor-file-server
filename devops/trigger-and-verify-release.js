#!/usr/bin/env node

const { execSync, exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const util = require("util");

const execAsync = util.promisify(exec);

// Configuration
const workflowName = "release.yml";
const bump = "patch";
const configuration = "Release";
const pollInterval = 10000; // 10 seconds
async function main() {
  // Generate unique dispatch ID
  const dispatchId = `trigger-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  console.log(`Generated dispatch ID: ${dispatchId}`);

  console.log("Triggering release workflow...");
  try {
    execSync(
      `gh workflow run ${workflowName} -f bump=${bump} -f configuration=${configuration} -f dispatch_id=${dispatchId}`
    );
    console.log("Workflow triggered.");
  } catch (error) {
    console.error("Failed to trigger workflow:", error.message);
    process.exit(1);
  }

  // Find the correct run ID by matching the dispatch ID in step names
  let runId;

  while (!runId) {
    try {
      console.log("Finding run...");

      // Get recent runs
      const { stdout: runsStdout } = await execAsync(
        `gh run list --workflow=${workflowName} --limit 10 --json databaseId,status,createdAt`
      );
      const recentRuns = JSON.parse(runsStdout);

      // Check each run to find the one with matching dispatch ID
      for (const run of recentRuns) {
        try {
          // Get the jobs for this run
          const { stdout: jobsStdout } = await execAsync(
            `gh run view ${run.databaseId} --json jobs`
          );
          const jobs = JSON.parse(jobsStdout);

          // Check all steps in the first job for matching dispatch ID
          if (jobs.jobs && jobs.jobs.length > 0) {
            const firstJob = jobs.jobs[0];
            if (firstJob.steps && firstJob.steps.length > 0) {
              for (const step of firstJob.steps) {
                if (step.name && step.name.includes(dispatchId)) {
                  runId = run.databaseId;
                  console.log(`Found matching run ID: ${runId}`);
                  break;
                }
              }
              if (runId) break;
            }
          }
        } catch (error) {
          console.warn(`Error checking run ${run.databaseId}:`, error.message);
          continue;
        }
      }

      if (runId) {
        console.log(`Monitoring run ID: ${runId}`);
        break;
      } else {
        console.log("Run not found yet, waiting 5 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error("Error finding run:", error.message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  // Poll for completion
  while (true) {
    try {
      const { stdout } = await execAsync(
        `gh run view ${runId} --json status,conclusion`
      );
      const { status, conclusion } = JSON.parse(stdout);
      console.log(`Status: ${status}, Conclusion: ${conclusion || "pending"}`);

      if (status === "completed") {
        if (conclusion === "success") {
          console.log("Workflow completed successfully.");
          break;
        } else {
          console.error(`Workflow failed with conclusion: ${conclusion}`);
          process.exit(1);
        }
      }
    } catch (error) {
      console.error("Error polling run:", error.message);
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  // Get the tag from the run logs or latest release
  let tag;
  try {
    const { stdout } = await execAsync(`gh run view ${runId} --log`);
    const match = stdout.match(/Version:\s*(v[\d\w.-]+)/);
    if (match) {
      tag = match[1];
      console.log(`Release tag: ${tag}`);
    } else {
      throw new Error("Version not found in logs");
    }
  } catch (error) {
    console.error("Failed to get tag:", error.message);
    process.exit(1);
  }

  // Download the zip
  const downloadDir = "publish/downloads";
  fs.mkdirSync(downloadDir, { recursive: true });
  const zipFile = `LogorFileServer-${tag}-all-platforms.zip`;
  const zipPath = path.join(downloadDir, zipFile);

  try {
    execSync(
      `gh release download ${tag} --pattern "${zipFile}" --dir ${downloadDir}`
    );
    console.log(`Downloaded ${zipFile} to ${downloadDir}`);
  } catch (error) {
    console.error("Failed to download release:", error.message);
    process.exit(1);
  }

  // Verify files
  console.log("Verifying files...");
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  const requiredFiles = [
    "win-x64/LogorFileServer.Api.exe",
    "linux-x64/LogorFileServer.Api",
    "osx-x64/LogorFileServer.Api",
  ];

  requiredFiles.forEach((file) => {
    if (entries.some((entry) => entry.entryName === file)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.error(`❌ ${file} missing`);
    }
  });

  console.log("Verification complete.");
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});

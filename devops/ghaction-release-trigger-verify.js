#!/usr/bin/env node

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const util = require("util");
const pRetry = require("p-retry").default;
const execAsync = util.promisify(exec);
const zlib = require("zlib");
const tar = require("tar");

const bump = "patch";
const workflowName = "release.yml";
const configuration = "Release";

async function retry({ name = "", retries, minTimeout, maxTimeout }, fn) {
  return await pRetry(fn, {
    retries: retries,
    minTimeout: minTimeout,
    maxTimeout: maxTimeout,
    onFailedAttempt: (e) => {
      if (e.retriesLeft === 0) {
        console.log(`${name} failed with ${e.retriesConsumed} retries.`);
        console.log(`The last error: ${e.error}`);
      }
    },
  });
}

async function getTarEntries(tgzPath) {
  return new Promise((resolve, reject) => {
    const entries = [];
    fs.createReadStream(tgzPath)
      .pipe(zlib.createGunzip())
      .on("error", reject)
      .pipe(
        tar.list({
          onentry: (entry) => {
            entries.push(entry.path);
          },
        })
      )
      .on("error", reject)
      .on("end", () => resolve(entries));
  });
}

async function main() {
  // gen dispatchId
  const dispatchId = `trigger-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  console.log(`Generated dispatch ID: ${dispatchId}`);

  // trigger workflow
  await execAsync(
    `gh workflow run ${workflowName} -f bump=${bump} -f configuration=${configuration} -f dispatch_id=${dispatchId}`
  );
  console.log("Workflow triggered.");

  // find run
  const runId = await retry(
    { name: "Find run", retries: 10, minTimeout: 500 },
    async () => {
      const { stdout } = await execAsync(
        `gh run list --workflow=${workflowName} --limit 10 --json databaseId,displayTitle`
      );
      const runs = JSON.parse(stdout);
      const run = runs.find((r) => r.displayTitle?.includes(dispatchId));
      if (!run) throw new Error("run not found");
      console.log(`Found run ID: ${run.databaseId}`);
      return run.databaseId;
    }
  );

  // log run
  const { stdout } = await execAsync(`gh run view ${runId}`);
  console.log(`"gh run view ${runId}":\n${stdout}`);

  // wait run completion
  await retry(
    {
      name: "Wait run completion",
      retries: Infinity,
      minTimeout: 1000,
      maxTimeout: 5000,
    },
    async () => {
      const { stdout } = await execAsync(
        `gh run view ${runId} --json status,conclusion`
      );
      const { status, conclusion } = JSON.parse(stdout);
      if (status !== "completed") throw new Error("still running");
      if (conclusion !== "success") throw new Error(`failed: ${conclusion}`);
      console.log("Workflow completed successfully.");
    }
  );

  // extract tag in log
  const tag = await retry(
    { name: "Extract tag", retries: Infinity },
    async () => {
      const { stdout } = await execAsync(`gh run view ${runId} --log`);
      const m = stdout.match(/Version:\s*(v[\d\w.-]+)/);
      if (!m) throw new Error("tag not in logs");
      console.log(`Release tag: ${m[1]}`);
      return m[1];
    }
  );

  // download release
  const downloadDir = "publish/downloads";
  fs.mkdirSync(downloadDir, { recursive: true });
  const tgzFileName = `LogorFileServer-${tag}-all-platforms.tgz`;
  const tgzPath = path.join(downloadDir, tgzFileName);
  await retry(
    { name: "Download release", retries: 5, minTimeout: 3000 },
    async () => {
      await execAsync(
        `gh release download ${tag} --pattern "${tgzFileName}" --dir ${downloadDir}`,
        { stdio: "ignore" }
      );
      if (!fs.existsSync(tgzPath)) throw new Error("download failed");
      console.log(`Downloaded: ${tgzFileName}`);
    }
  );

  // extract tgz
  const extractDir = path.join(downloadDir, tgzFileName.replace(".tgz", ""));
  fs.mkdirSync(extractDir, { recursive: true });
  console.log(`Extracting to ${extractDir}...`);
  await tar.x({
    file: tgzPath,
    cwd: extractDir,
  });
  console.log(`Extracted to ${extractDir}`);
  fs.unlinkSync(tgzPath);
  console.log(`Deleted ${tgzFileName}`);

  // verify files
  const requiredFiles = [
    "win-x64/LogorFileServer.Api.exe",
    "linux-x64/LogorFileServer.Api",
    "osx-x64/LogorFileServer.Api",
  ];
  requiredFiles.forEach((f) => {
    const filePath = path.join(extractDir, f);
    if (!fs.existsSync(filePath)) {
      console.log(`Missing ${filePath}`);
    } else {
      console.log(`Found ${filePath}`);
    }
  });

  console.log("File verification complete.");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});

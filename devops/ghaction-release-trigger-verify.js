#!/usr/bin/env node

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const util = require("util");
const pRetry = require("p-retry").default;
const execAsync = util.promisify(exec);

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

async function main() {
  // ---------- 1. 生成 dispatchId ----------
  const dispatchId = `trigger-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  console.log(`Generated dispatch ID: ${dispatchId}`);

  // ---------- 2. 触发 workflow ----------
  await execAsync(
    `gh workflow run ${workflowName} -f configuration=${configuration} -f dispatch_id=${dispatchId}`
  );
  console.log("Workflow triggered.");

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

  const { stdout } = await execAsync(`gh run view ${runId}`);
  console.log(stdout);

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

  // ---------- 5. 无限等待 tag 出现在日志 ----------
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

  // ---------- 6. 下载 release（这里也用有限次重试，防止网络抖动） ----------
  const downloadDir = "publish/downloads";
  fs.mkdirSync(downloadDir, { recursive: true });
  const zipFile = `LogorFileServer-${tag}-all-platforms.zip`;
  const zipPath = path.join(downloadDir, zipFile);
  await retry(
    { name: "Download release", retries: 5, minTimeout: 3000 },
    async () => {
      await execAsync(
        `gh release download ${tag} --pattern "${zipFile}" --dir ${downloadDir}`,
        { stdio: "ignore" }
      );
      if (!fs.existsSync(zipPath)) throw new Error("download failed");
      console.log(`Downloaded: ${zipFile}`);
    }
  );

  // ---------- 7. 验证 ZIP ----------
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  const requiredFiles = [
    "win-x64/LogorFileServer.Api.exe",
    "linux-x64/LogorFileServer.Api",
    "osx-x64/LogorFileServer.Api",
  ];

  requiredFiles.forEach((f) => {
    if (!entries.some((e) => e.entryName === f)) {
      console.log(`Missing ${f}`);
    }
  });

  console.log("File verification complete.");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});

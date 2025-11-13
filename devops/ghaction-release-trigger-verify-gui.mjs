#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { promisify } from "util";
import { exec } from "child_process";
import zlib from "zlib";
import * as tar from "tar";
import pRetry from "p-retry";
import React from "react";
import { render, Box, Text } from "ink";

const execAsync = promisify(exec);

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

// 抽象步骤1: 生成dispatchId
async function generateDispatchId(updateLog) {
  updateLog("Generating dispatch ID...");
  const dispatchId = `trigger-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  updateLog(`Generated dispatch ID: ${dispatchId}`);
  return dispatchId;
}

// 抽象步骤2: 触发workflow
async function triggerWorkflow(dispatchId, updateLog) {
  updateLog("Triggering workflow...");
  await execAsync(
    `gh workflow run ${workflowName} -f bump=${bump} -f configuration=${configuration} -f dispatch_id=${dispatchId}`
  );
  updateLog("Workflow triggered.");
}

// 抽象步骤3: 查找runId
async function findRunId(dispatchId, updateLog) {
  updateLog("Finding run ID...");
  const runId = await retry(
    { name: "Find run", retries: 10, minTimeout: 500 },
    async () => {
      const { stdout } = await execAsync(
        `gh run list --workflow=${workflowName} --limit 10 --json databaseId,displayTitle`
      );
      const runs = JSON.parse(stdout);
      const run = runs.find((r) => r.displayTitle?.includes(dispatchId));
      if (!run) throw new Error("run not found");
      updateLog(`Found run ID: ${run.databaseId}`);
      return run.databaseId;
    }
  );
  return runId;
}

// 抽象步骤4: 查看run日志
async function viewRunLog(runId, updateLog) {
  updateLog("Viewing run log...");
  const { stdout } = await execAsync(`gh run view ${runId}`);
  updateLog(`gh run view ${runId}:\n${stdout}`, "set"); // 使用 set 模式覆盖，避免追加前缀
}

// 抽象步骤5: 等待run完成
async function waitRunCompletion(runId, updateLog) {
  updateLog("Waiting for run completion...");
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
      updateLog("Workflow completed successfully.");
    }
  );
}

// 抽象步骤6: 提取tag从日志
async function extractTag(runId, updateLog) {
  updateLog("Extracting tag from logs...");
  const tag = await retry(
    { name: "Extract tag", retries: Infinity },
    async () => {
      const { stdout } = await execAsync(`gh run view ${runId} --log`);
      const m = stdout.match(/Version:\s*(v[\d\w.-]+)/);
      if (!m) throw new Error("tag not in logs");
      updateLog(`Release tag: ${m[1]}`);
      return m[1];
    }
  );
  return tag;
}

// 抽象步骤7: 下载release
async function downloadRelease(tag, updateLog) {
  updateLog("Downloading release...");
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
      updateLog(`Downloaded: ${tgzFileName}`);
    }
  );
  return { tgzPath, tgzFileName };
}

// 抽象步骤8: 提取tgz
async function extractTgz(tgzPath, tgzFileName, updateLog) {
  updateLog("Extracting tgz...");
  const extractDir = path.join(
    path.dirname(tgzPath),
    tgzFileName.replace(".tgz", "")
  );
  fs.mkdirSync(extractDir, { recursive: true });
  updateLog(`Extracting to ${extractDir}...`);
  await tar.x({
    file: tgzPath,
    cwd: extractDir,
  });
  updateLog(`Extracted to ${extractDir}`);
  fs.unlinkSync(tgzPath);
  updateLog(`Deleted ${tgzFileName}`);
  return extractDir;
}

// 抽象步骤9: 验证文件
async function verifyFiles(extractDir, updateLog) {
  updateLog("Verifying files...");
  const requiredFiles = [
    "win-x64/LogorFileServer.Api.exe",
    "linux-x64/LogorFileServer.Api",
    "osx-x64/LogorFileServer.Api",
  ];
  requiredFiles.forEach((f) => {
    const filePath = path.join(extractDir, f);
    if (!fs.existsSync(filePath)) {
      updateLog(`Missing ${filePath}`);
    } else {
      updateLog(`Found ${filePath}`);
    }
  });
  updateLog("File verification complete.");
}

// Ink App组件：使用 createElement 避免 JSX
const App = () => {
  const [logs, setLogs] = React.useState([]);
  const stepCountRef = React.useRef(0);

  // 为特定索引创建 updateLog 函数（支持 append/set 模式）
  const createUpdateLog =
    (index) =>
    (message, mode = "append") => {
      setLogs((prevLogs) => {
        const newLogs = [...prevLogs];
        if (newLogs.length <= index) {
          // 安全检查：如果索引超出当前长度，填充空步骤（虽在正常使用中不会发生）
          while (newLogs.length <= index) {
            newLogs.push({ title: `Step ${newLogs.length + 1}`, content: "" });
          }
        }
        if (mode === "append") {
          newLogs[index].content += `\n${message}`;
        } else {
          newLogs[index].content = message;
        }
        return newLogs;
      });
    };

  // 添加新步骤日志窗口：分配唯一索引，返回专属 updateLog
  const addStep = (title) => {
    const stepIndex = stepCountRef.current++;
    setLogs((prevLogs) => [...prevLogs, { title, content: "" }]);
    return createUpdateLog(stepIndex);
  };

  React.useEffect(() => {
    async function runSteps() {
      try {
        // 步骤1
        const updateLog1 = addStep("Generate Dispatch ID");
        const dispatchId = await generateDispatchId(updateLog1);

        // 步骤2
        const updateLog2 = addStep("Trigger Workflow");
        await triggerWorkflow(dispatchId, updateLog2);

        // 步骤3
        const updateLog3 = addStep("Find Run ID");
        const runId = await findRunId(dispatchId, updateLog3);

        // 步骤4
        const updateLog4 = addStep("View Run Log");
        await viewRunLog(runId, updateLog4);

        // 步骤5
        const updateLog5 = addStep("Wait Run Completion");
        await waitRunCompletion(runId, updateLog5);

        // 步骤6
        const updateLog6 = addStep("Extract Tag");
        const tag = await extractTag(runId, updateLog6);

        // 步骤7
        const updateLog7 = addStep("Download Release");
        const { tgzPath, tgzFileName } = await downloadRelease(tag, updateLog7);

        // 步骤8
        const updateLog8 = addStep("Extract TGZ");
        const extractDir = await extractTgz(tgzPath, tgzFileName, updateLog8);

        // 步骤9
        const updateLog9 = addStep("Verify Files");
        await verifyFiles(extractDir, updateLog9);

        // 所有步骤完成：动态添加空日志步骤
        const updateLogComplete = addStep("All Steps Completed");
        updateLogComplete("", "set"); // 使用 set 模式设置空内容，避免多余换行
      } catch (err) {
        // 错误处理：动态添加错误步骤
        const errorUpdateLog = addStep("Error");
        errorUpdateLog(`Script failed: ${err.message}`, "set");
        process.exit(1);
      }
    }

    runSteps();
  }, []);

  const h = React.createElement;

  return h(
    Box,
    { flexDirection: "column", padding: 1 },
    logs.map((log, index) =>
      h(
        Box,
        {
          key: index,
          borderStyle: "single",
          borderColor: "blue",
          flexDirection: "column",
          marginBottom: 1,
          padding: 1,
          width: 80,
        },
        h(Text, { bold: true, color: "cyan" }, log.title),
        h(Text, null, log.content)
      )
    )
  );
};

render(React.createElement(App));

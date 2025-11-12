# 从本地触发 GitHub Actions 工作流的方法

## 方法一：使用 GitHub CLI (推荐)

### 1. 安装 GitHub CLI

```bash
# Windows
winget install GitHub.cli

# macOS
brew install gh

# Linux
sudo apt install gh
```

### 2. 认证 GitHub CLI

```bash
gh auth login
```

### 3. 触发工作流

```bash
# 基本触发
gh workflow run "Publish Build Artifacts" -f build_directory="build-20251112-172020"

# 带发布名称
gh workflow run "Publish Build Artifacts" -f build_directory="build-20251112-172020" -f release_name="v1.0.0"

# 查看工作流运行状态
gh run list --workflow="Publish Build Artifacts" --limit 5

# 查看最新运行的日志
gh run view --web
```

## 方法二：使用 curl 调用 GitHub API

### 1. 创建个人访问令牌

- 访问 GitHub Settings → Developer settings → Personal access tokens
- 生成具有 `repo` 权限的 token

### 2. 触发工作流

```bash
curl -X POST \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/OWNER/REPO/actions/workflows/publish-artifacts.yml/dispatches \
  -d '{
    "ref": "main",
    "inputs": {
      "build_directory": "build-20251112-172020",
      "release_name": "v1.0.0"
    }
  }'
```

## 方法三：使用 GitHub Desktop 或 Git 命令

### 1. 提交并推送更改

```bash
git add .
git commit -m "Add GitHub Actions workflow"
git push origin main
```

### 2. 然后在 GitHub 网页界面手动触发

- 访问仓库的 Actions 选项卡
- 选择 "Publish Build Artifacts" 工作流
- 点击 "Run workflow"

## 立即执行的步骤

使用 GitHub CLI 是最快的方法：

```bash
# 1. 安装 GitHub CLI (如果尚未安装)
winget install GitHub.cli

# 2. 登录 GitHub
gh auth login

# 3. 触发工作流 (使用您现有的构建目录)
gh workflow run "Publish Build Artifacts" -f build_directory="build-20251112-172020"

# 4. 监控运行状态
gh run list --workflow="Publish Build Artifacts" --limit 1
```

## 验证工作流

工作流触发后，您可以在 GitHub 上查看：

- 运行状态和日志
- 生成的制品文件
- 任何错误信息

工作流文件 [`publish-artifacts.yml`](../.github/workflows/publish-artifacts.yml) 已经配置完成，现在可以通过上述任一方法触发。

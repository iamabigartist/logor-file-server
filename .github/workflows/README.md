# GitHub Actions 发布工作流文档

## 概述

此工作流允许您手动触发，将指定的构建目录打包成单个压缩包供用户下载。

## 工作流文件

- **文件位置**: `.github/workflows/publish-artifacts.yml`
- **触发方式**: 手动触发 (workflow_dispatch)
- **运行环境**: Ubuntu Linux

## 使用方法

### 1. 在 GitHub 上触发工作流

1. 进入仓库的 **Actions** 选项卡
2. 在左侧选择 **Publish Build Artifacts** 工作流
3. 点击 **Run workflow** 按钮
4. 填写以下参数：
   - **build_directory**: 要发布的构建目录名称（例如：`build-20251112-172020`）
   - **release_name** (可选): 发布名称或标签

### 2. 参数说明

#### build_directory (必需)

- 描述: 位于 `publish/` 目录下的构建目录名称
- 示例: `build-20251112-172020`
- 如何获取: 运行构建脚本后，在 `publish/` 目录中查看生成的目录

#### release_name (可选)

- 描述: 用于标识此次发布的名称或标签
- 示例: `v1.0.0`, `production-release`

### 3. 工作流执行过程

工作流将执行以下步骤：

1. **验证构建目录**: 检查指定的构建目录是否存在
2. **列出构建内容**: 显示构建目录中的文件和平台子目录
3. **创建压缩包**: 将整个构建目录打包成单个 ZIP 文件
4. **上传制品**: 将 ZIP 文件上传到工作流制品中

### 4. 下载制品

工作流完成后：

1. 进入工作流运行详情页面
2. 在 **Artifacts** 部分找到生成的 ZIP 文件
3. 点击下载按钮获取完整的构建包

## 示例

### 发布最新构建

假设您刚刚运行了构建脚本，生成了 `build-20251112-172020` 目录：

1. **build_directory**: `build-20251112-172020`
2. **release_name**: `latest`

工作流将创建 `build-20251112-172020.zip` 文件，包含所有平台构建：

- `win-x64/` - Windows 64位版本
- `linux-x64/` - Linux 64位版本  
- `osx-x64/` - macOS 64位版本

## 前置条件

- 确保在运行工作流前已经执行过构建脚本
- 构建目录必须存在于 `publish/` 目录中
- 需要仓库的写入权限来触发工作流

## 故障排除

### 常见问题

1. **构建目录不存在**
   - 错误信息: `❌ Build directory not found`
   - 解决方案: 检查构建目录名称是否正确，确保构建过程已成功完成

2. **权限问题**
   - 错误信息: 工作流无法运行
   - 解决方案: 确保账户有足够的仓库权限

3. **制品上传失败**
   - 错误信息: 上传步骤失败
   - 解决方案: 检查网络连接，重试工作流

### 获取可用构建目录

在本地运行以下命令查看可用的构建目录：

```bash
ls -la publish/
```

## 相关文件

- [`devops/build-api-all-platforms.js`](../devops/build-api-all-platforms.js): 跨平台构建脚本
- [`build-api-all-platforms.bat`](../build-api-all-platforms.bat): Windows 构建脚本
- [`build-api-all-platforms.sh`](../build-api-all-platforms.sh): Linux/macOS 构建脚本

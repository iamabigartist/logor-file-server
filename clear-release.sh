#!/bin/bash

# 指定仓库，如果不在当前目录中运行，请替换为你的 owner/repo
REPO="iamabigartist/logor-file-server"  # 示例：REPO="username/my-repo"

# 删除所有 releases，并清理关联的 tags
gh release list --repo $REPO --json tagName --jq '.[].tagName' | while read -r tag; do
  gh release delete --repo $REPO --yes --cleanup-tag "$tag"
  sleep 1  # 轻微延迟以避免API速率限制
done

# 删除所有剩余的 tags
gh api --paginate repos/$REPO/tags --jq '.[].name' | while read -r tag; do
  gh api repos/$REPO/git/refs/tags/"$tag" -X DELETE
  sleep 1  # 轻微延迟以避免API速率限制
done

echo "所有 releases 和 tags 已删除。"

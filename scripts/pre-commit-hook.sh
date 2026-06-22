#!/bin/sh
# nav-site pre-commit hook — 防止密钥泄露
#
# 检测正在暂存的文件中是否包含明显密钥模式。
# 安装：cp scripts/pre-commit-hook.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 只检查暂存的新增/修改文件
staged_files=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null)
[ -z "$staged_files" ] && exit 0

# 用文件传递违规状态（避免 subshell 问题）
violations_file=$(mktemp /tmp/git-secrets-violations.XXXXXX 2>/dev/null || echo /tmp/git-secrets-violations)
: > "$violations_file"

for file in $staged_files; do
  # 跳过二进制/锁文件
  case "$file" in
    *.png|*.jpg|*.jpeg|*.gif|*.ico|*.svg|*.woff2|*.woff|*.eot|*.ttf|*.mp4|*.webm|*.zip|*.gz|*.lock) continue ;;
    pnpm-lock.yaml|package-lock.json|yarn.lock) continue ;;
  esac

  # 逐行读取新增行
  git diff --cached "$file" | grep '^+' | grep -v '^+++' | cut -c2- > /tmp/.hook-diff-$$
  [ ! -s /tmp/.hook-diff-$$ ] && continue

  line_num=0
  while IFS= read -r line; do
    line_num=$((line_num + 1))

    # 白名单
    case "$line" in
      *process.env.ADMIN_PASSWORD*) continue ;;
      *process.env.AUTH_SECRET*) continue ;;
      *sk_live_placeholder*) continue ;;
      *test_key*) continue ;;
      *example.com*) continue ;;
      *ghp_placeholder*) continue ;;
      *postgres://localhost*) continue ;;
    esac

    matched=0

    # 私钥块
    if echo "$line" | grep -qE '-----BEGIN (RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY-----' 2>/dev/null; then matched=1; fi

    # GitHub tokens
    if [ "$matched" -eq 0 ] && echo "$line" | grep -qE '(ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9]{36}' 2>/dev/null; then matched=1; fi

    # Stripe live keys
    if [ "$matched" -eq 0 ] && echo "$line" | grep -qE '(sk_live_|pk_live_)[A-Za-z0-9]{24,}' 2>/dev/null; then matched=1; fi

    # Slack tokens
    if [ "$matched" -eq 0 ] && echo "$line" | grep -qE '(xox[bpras])-[A-Za-z0-9-]{24,}' 2>/dev/null; then matched=1; fi

    # AWS access key
    if [ "$matched" -eq 0 ] && echo "$line" | grep -qE 'AKIA[0-9A-Z]{16}' 2>/dev/null; then matched=1; fi

    # 连接字符串含密码
    if [ "$matched" -eq 0 ] && echo "$line" | grep -qE '(postgres://|mysql://|mongodb://)[A-Za-z0-9]+:[^@]{6,}@' 2>/dev/null; then matched=1; fi

    if [ "$matched" -eq 1 ]; then
      echo "${RED}[SECURITY] 疑似密钥泄露: ${file}${NC}" >> "$violations_file"
      echo "${YELLOW}行 ${line_num}: ${line}${NC}" >> "$violations_file"
    fi
  done < /tmp/.hook-diff-$$
done
rm -f /tmp/.hook-diff-$$

if [ -s "$violations_file" ]; then
  echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "${RED}  提交已阻止：检测到以下密钥泄露${NC}"
  echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  cat "$violations_file"
  echo ""
  echo "${YELLOW}如需跳过检查：git commit --no-verify${NC}"
  rm -f "$violations_file"
  exit 1
fi

rm -f "$violations_file"
exit 0
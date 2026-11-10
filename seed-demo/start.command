#!/bin/zsh
cd -- "${0:A:h}" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "未找到 Node.js，请安装 Node.js 22 或更新版本。"
  read -r "?按回车退出"
  exit 1
fi
echo "本地地址：http://127.0.0.1:8787（端口可在 .env 中修改）"
echo "保持此窗口开启；按 Control + C 停止。"
node --env-file-if-exists=.env server.js
result=$?
if [ "$result" -ne 0 ]; then
  read -r "?启动失败，按回车退出"
fi
exit "$result"

#!/bin/bash
# 一条命令生成临时分享网址：启动代理 + Cloudflare 临时隧道
# 用法：bash share.sh        停止：按 Control + C
cd "$(dirname "$0")"
PORT=8787

if [ ! -f .env ]; then
  echo "缺少 .env 文件。先运行：echo \"ARK_API_KEY=你的key\" > .env"
  exit 1
fi
if ! grep -q '^ACCESS_CODE=.\+' .env; then
  echo "分享前必须设置访问码，否则拿到链接的人都能用你的额度。"
  echo "运行这一行（把 1234 换成你想要的访问码）："
  echo "  echo \"ACCESS_CODE=1234\" >> .env"
  exit 1
fi

# 第一次运行时下载 cloudflared（Cloudflare 官方的隧道工具，免注册）
if [ ! -x ./cloudflared ]; then
  if [ "$(uname -m)" = "arm64" ]; then f=cloudflared-darwin-arm64.tgz; else f=cloudflared-darwin-amd64.tgz; fi
  echo "第一次使用，正在下载 cloudflared……"
  if ! curl -fL --progress-bar -o cf.tgz "https://github.com/cloudflare/cloudflared/releases/latest/download/$f"; then
    echo "下载失败，检查网络后重试。"; rm -f cf.tgz; exit 1
  fi
  tar -xzf cf.tgz && rm -f cf.tgz && chmod +x cloudflared
fi

# 启动代理（后台），退出时一起关掉
node --env-file=.env server.js &
SERVER=$!
trap 'kill $SERVER 2>/dev/null; echo; echo "已停止分享。"' EXIT
sleep 1
if ! kill -0 $SERVER 2>/dev/null; then echo "代理没有启动成功，看上面的报错。"; exit 1; fi

echo "正在创建临时网址，大约需要 10 秒……"
# caffeinate 防止电脑休眠导致网页打不开
caffeinate -i ./cloudflared tunnel --no-autoupdate --url "http://localhost:$PORT" 2>&1 | while IFS= read -r line; do
  url=$(echo "$line" | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | head -1)
  if [ -n "$url" ]; then
    echo
    echo "=================================================="
    echo "  分享网址：$url"
    echo "  访问码：  $(grep '^ACCESS_CODE=' .env | head -1 | cut -d= -f2-)"
    echo "  保持这个窗口开着，别人才能访问。按 Control + C 停止。"
    echo "=================================================="
    echo
  elif echo "$line" | grep -q ' ERR '; then
    echo "隧道报错：$line"
  fi
done

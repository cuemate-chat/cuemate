#!/bin/bash

# 显示启动横幅
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║    ██████╗██╗   ██╗███████╗███╗   ███╗ █████╗ ████████╗███████╗"
echo "║   ██╔════╝██║   ██║██╔════╝████╗ ████║██╔══██╗╚══██╔══╝██╔════╝"
echo "║   ██║     ██║   ██║█████╗  ██╔████╔██║███████║   ██║   █████╗  "
echo "║   ██║     ╚██╗ ██╔╝██╔══╝  ██║╚██╔╝██║██╔══██║   ██║   ██╔══╝  "
echo "║   ╚██████╗ ╚████╔╝ ███████╗██║ ╚═╝ ██║██║  ██║   ██║   ███████╗"
echo "║    ╚═════╝  ╚═══╝  ╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝"
echo "║                                                              ║"
echo "║  Service: Web Frontend        Version: ${VERSION:-0.1.0}      ║"
echo "║  Port: 80                     ║"
echo "║  Environment: production       ║"
echo "║  Started: $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ") ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 显示成功启动信息
echo "[SUCCESS] ========================================="
echo "[SUCCESS] 启动完成！"
echo "[SUCCESS] 服务名称: Web Frontend"
echo "[SUCCESS] 端口号: 80"
echo "[SUCCESS] HTTP地址: http://localhost:80"
echo "[SUCCESS] 静态文件目录: /usr/share/nginx/html"
echo "[SUCCESS] Nginx版本: $(nginx -v 2>&1 | cut -d' ' -f3)"
echo "[SUCCESS] ========================================="
echo ""

# 启动 Nginx
echo "启动 Nginx 服务器..."
exec nginx -g "daemon off;"
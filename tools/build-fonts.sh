#!/bin/sh
# 把 index.html / main.js 用到的字抓成子集字型放進 fonts/。改了網頁文字後重跑一次。
set -e
cd "$(dirname "$0")/.."
TXT=$(python3 - <<'P'
import re,urllib.parse
html=open('index.html',encoding='utf8').read()
js=open('js/main.js',encoding='utf8').read()
# data-* 屬性的值會被 JS 搬進畫面（例如章節指示、流程節點），要另外收
attrs=' '.join(re.findall(r'\sdata-[\w-]+="([^"]*)"',html))
s=re.sub(r'<(script|style)[\s\S]*?</\1>','',html)
s=re.sub(r'<[^>]+>',' ',s)
# main.js 不剝標籤（JS 裡的 < 和 > 會把中間整段吃掉），整份收
s+=attrs+js
chars=sorted(set(c for c in s if not c.isspace())|set('0123456789.,%+ '))
print(urllib.parse.quote(''.join(chars)))
P
)
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
get() { curl -sA "$UA" "https://fonts.googleapis.com/css2?family=$1&text=$TXT&display=swap" | grep -o 'https://[^)]*' | head -1 | xargs curl -sA "$UA" -o "fonts/$2"; }
get 'Noto+Serif+TC:wght@500;700;900' noto-serif-tc.woff2
curl -sA "$UA" "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" | grep -o 'https://[^)]*' | tail -1 | xargs curl -sA "$UA" -o fonts/jetbrains-mono.woff2

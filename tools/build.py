# src/ と art/ から index.html を組み立てる
# 使い方: python3 tools/build.py
import base64, json, pathlib

root = pathlib.Path(__file__).resolve().parent.parent

ui = (root / 'src/ui.html').read_text(encoding='utf-8')
engine = (root / 'src/engine.js').read_text(encoding='utf-8')
story = (root / 'src/story.js').read_text(encoding='utf-8')
main = (root / 'src/main.js').read_text(encoding='utf-8')
sheet = base64.b64encode((root / 'art/sheet.png').read_bytes()).decode()
idx = json.loads((root / 'art/sheet.json').read_text())['idx']

main = (main.replace('/*__SHEET__*/', sheet)
            .replace('/*__SHEETIDX__*/', json.dumps(idx))
            .replace('/*__BUSTS__*/', '{}'))   # 顔はすべて art/face/ の画像を使う
out = ui.replace('/*__ENGINE__*/', engine).replace('/*__STORY__*/', story).replace('/*__MAIN__*/', main)
(root / 'index.html').write_text(out, encoding='utf-8')
print('index.html', len(out) // 1024, 'KB')

from pathlib import Path
text = Path('src/bot/index.js').read_text(encoding='utf-8')
chars = sorted({c for c in text if ord(c) > 126})
for ch in chars:
    print(ord(ch), ch.encode('unicode_escape'))

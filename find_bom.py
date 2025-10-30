from pathlib import Path
text = Path('src/bot/index.js').read_text(encoding='utf-8')
idx = text.find('\ufeff')
print(idx)

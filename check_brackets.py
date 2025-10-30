from pathlib import Path
code = Path('src/bot/index.js').read_text(encoding='utf-8')
stack = []
state = None
escaped = False
line = 1
col = 1
for idx, ch in enumerate(code):
    if ch == '\n':
        line += 1
        col = 1
    else:
        col += 1
    if state:
        if escaped:
            escaped = False
            continue
        if ch == '\\' and state in ('"', "'", '`'):
            escaped = True
            continue
        if ch == state:
            state = None
        elif state == '`' and ch == '$' and idx+1 < len(code) and code[idx+1] == '{':
            stack.append(('${', line, col))
        elif stack and stack[-1][0] == '${' and ch == '}':
            stack.pop()
        continue
    if ch in ('"', "'", '`'):
        state = ch
        continue
    if ch in '({[':
        stack.append((ch, line, col))
    elif ch in ')}]':
        if not stack:
            print('Unmatched closing', ch, 'at line', line, 'col', col)
            break
        open_ch, open_line, open_col = stack.pop()
        pairs = {'(': ')', '{': '}', '[': ']'}
        if pairs[open_ch] != ch:
            print('Mismatched', open_ch, 'line', open_line, 'col', open_col, 'with', ch, 'line', line, 'col', col)
            break
else:
    if state:
        print('Unclosed string starting with', state)
    elif stack:
        print('Unclosed delimiters:', stack)
    else:
        print('Delimiters balanced')

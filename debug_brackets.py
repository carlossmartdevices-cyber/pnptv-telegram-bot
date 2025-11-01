from pathlib import Path
code = Path('src/bot/index.js').read_text(encoding='utf-8')
stack = []
state = None
escaped = False
line = 1
col = 1

print("Checking brackets and delimiters...")

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
        if line in [144, 145, 146, 281, 282, 283]:  # Debug specific lines
            print(f"PUSH {ch} at line {line}, col {col}, stack: {len(stack)}")
    elif ch in ')}]':
        if not stack:
            print(f'Unmatched closing {ch} at line {line}, col {col}')
            break
        open_ch, open_line, open_col = stack.pop()
        pairs = {'(': ')', '{': '}', '[': ']'}
        if pairs[open_ch] != ch:
            print(f'Mismatched {open_ch} line {open_line}, col {open_col} with {ch} line {line}, col {col}')
            print(f"Stack before pop: {len(stack)+1}")
            print(f"Current stack: {stack[-5:] if len(stack) >= 5 else stack}")
            break
        if line in [144, 145, 146, 281, 282, 283]:  # Debug specific lines
            print(f"POP {ch} at line {line}, col {col}, matches {open_ch} from line {open_line}")
else:
    if state:
        print(f'Unclosed string starting with {state}')
    elif stack:
        print(f'Unclosed delimiters: {stack}')
    else:
        print('✅ Delimiters balanced')
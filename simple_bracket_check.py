import re
from pathlib import Path

def find_bracket_mismatch(filepath):
    content = Path(filepath).read_text(encoding='utf-8')
    
    # Remove strings and comments to avoid false positives
    # This is a simplified approach - more sophisticated parsing would be better
    
    # Remove single-line comments
    content = re.sub(r'//.*$', '', content, flags=re.MULTILINE)
    
    # Remove multi-line comments  
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    
    # Remove string literals (simplified - doesn't handle escaped quotes perfectly)
    content = re.sub(r'"[^"]*"', '""', content)
    content = re.sub(r"'[^']*'", "''", content)
    content = re.sub(r'`[^`]*`', '``', content)
    
    lines = content.split('\n')
    stack = []
    
    for line_num, line in enumerate(lines, 1):
        for col_num, char in enumerate(line, 1):
            if char in '({[':
                stack.append((char, line_num, col_num))
            elif char in ')}]':
                if not stack:
                    return f"Unmatched closing '{char}' at line {line_num}, col {col_num}"
                
                open_char, open_line, open_col = stack.pop()
                expected = {'(': ')', '{': '}', '[': ']'}
                
                if expected[open_char] != char:
                    return f"Mismatched '{open_char}' (line {open_line}) with '{char}' (line {line_num})"
    
    if stack:
        return f"Unclosed brackets: {stack}"
    
    return "✅ All brackets balanced"

result = find_bracket_mismatch('src/bot/index.js')
print(result)
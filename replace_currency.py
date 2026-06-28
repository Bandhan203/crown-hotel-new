import os
import re

frontend_dir = r'd:\Hotel_Management\frontend\src'
backend_dir = r'd:\Hotel_Management\backend'

def replace_in_file(path, is_frontend=True):
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    changed = False
    for i, line in enumerate(lines):
        orig_line = line
        
        # Pattern 1: $120.50 -> BDT 120.50 (both frontend and backend)
        line = re.sub(r'\$(\d+(?:,\d+)*(?:\.\d+)?)', r'BDT \1', line)
        
        if is_frontend:
            # Pattern 2: JSX ${var} where $ is literal text before an expression.
            # Avoid matching ${var} inside template literals (backticks).
            # This is tricky, but we can look for '`' in the line.
            # If line has no backticks, we can safely replace `${` with `BDT {`
            if '`' not in line:
                line = re.sub(r'\$\s*\{', r'BDT {', line)
                # also standalone $ used before text/numbers without {
                # e.g. price: '$15+'
            else:
                # If there are backticks, it might be a template literal.
                # Only replace `$${` with `BDT ${` which means literal $ followed by interpolated variable.
                line = re.sub(r'\$\$\{', r'BDT ${', line)
                # If it's like \${ -> BDT ${ ? Or if it is `$120` inside template literal -> BDT 120 (already handled by pattern 1)

            # Special case for "$ " or ">$<"
            line = re.sub(r'>\$<', r'>BDT<', line)
            line = re.sub(r'>\s*\$', r'> BDT ', line)

        else:
            # Backend specific
            # we want to find f"${var}" but NOT modify settings.py SECRET_KEY
            if "SECRET_KEY" not in line and "regex" not in line.lower() and "pattern" not in line.lower():
                # match f"${var" -> f"BDT {var"
                line = re.sub(r'\$(\{?[\w\.]+\}?)', r'BDT \1', line)
                
        if line != orig_line:
            lines[i] = line
            changed = True
            
    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print(f"Updated {path}")

for root, _, files in os.walk(frontend_dir):
    for f in files:
        if f.endswith(('.tsx', '.ts')):
            replace_in_file(os.path.join(root, f), is_frontend=True)

for root, _, files in os.walk(backend_dir):
    for f in files:
        if f.endswith('.py'):
            replace_in_file(os.path.join(root, f), is_frontend=False)

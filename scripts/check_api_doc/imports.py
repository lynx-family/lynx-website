import re
from .utils import KNOWN_COMPONENTS, parse_frontmatter

def get_used_components(content):
    """
    Finds all usages of known components in the content.
    """
    used = set()
    for comp in KNOWN_COMPONENTS:
        # Regex: <Component(\s|/|>)
        if re.search(r'<' + re.escape(comp) + r'(\s|/|>)', content):
            used.add(comp)
    return used

def get_all_imports(content):
    """
    Finds all imported components from any source.
    Returns a set of component names.
    """
    imports = set()
    # Matches: import { A, B } from '...';
    matches = re.finditer(r"import\s*\{([^}]+)\}\s*from", content, re.MULTILINE | re.DOTALL)
    for match in matches:
        components_str = match.group(1)
        for c in components_str.split(','):
            c = c.strip()
            # Handle "A as B"
            if ' as ' in c:
                c = c.split(' as ')[1].strip()
            if c:
                imports.add(c)
    return imports

def fix_imports(content, ensure_components=None):
    """
    Consolidates all @lynx imports into one and ensures specified components are imported.
    Returns (new_content, changed).
    """
    if ensure_components is None:
        ensure_components = set()

    # Find all import lines for @lynx
    # Matches: import { A, B } from '@lynx';
    import_regex = re.compile(r"import\s*\{([^}]+)\}\s*from\s*['\"]@lynx['\"];?")
    
    lines = content.split('\n')
    
    # Identify frontmatter end
    start_idx = 0
    if content.startswith('---'):
        parts = content.split('---', 2)
        if len(parts) >= 3:
            # Count newlines in frontmatter part
            # parts[0] is empty, parts[1] is fm, parts[2] is body
            # The split consumes the '---', so we need to account for them.
            # actually easier to find the second ---
            try:
                second_dash_idx = content.find('---', 3)
                if second_dash_idx != -1:
                    start_idx = content[:second_dash_idx+3].count('\n') + 1
            except:
                pass

    lynx_imports = set(ensure_components)
    new_body_lines = []
    
    found_any_lynx_import = False

    for i, line in enumerate(lines):
        if i < start_idx:
            new_body_lines.append(line)
            continue
            
        match = import_regex.match(line.strip())
        if match:
            found_any_lynx_import = True
            # Extract components
            components = [c.strip() for c in match.group(1).split(',')]
            for c in components:
                if c:
                    lynx_imports.add(c)
        else:
            new_body_lines.append(line)

    if not lynx_imports:
        return content, False

    # If we didn't find any imports but we have components to ensure, we are adding a new import.
    # If we found imports, we are merging them.
    # If the set of imports is exactly what was already there (and only 1 line), we might not need to change.
    # But checking that is hard, so we just reconstruct.
    
    # Sort imports
    sorted_imports = sorted(list(lynx_imports))
    import_statement = f"import {{ {', '.join(sorted_imports)} }} from '@lynx';"
    
    # Reconstruct
    final_lines = []
    inserted_import = False
    
    in_frontmatter = False
    frontmatter_dashes = 0
    
    # If start_idx > 0, we know where frontmatter ends.
    # But let's reuse the line-by-line logic for safety or just use start_idx.
    
    # Simpler approach:
    # 1. Take lines before start_idx (frontmatter)
    # 2. Add import
    # 3. Add rest of lines (which have imports removed)
    
    if start_idx > 0:
        final_lines = lines[:start_idx]
        final_lines.append('')
        final_lines.append(import_statement)
        final_lines.extend(new_body_lines[start_idx:])
    else:
        # No frontmatter, add at top
        final_lines.append(import_statement)
        final_lines.append('')
        final_lines.extend(new_body_lines)
        
    new_content = '\n'.join(final_lines)
    
    # Cleanup multiple empty lines
    new_content = re.sub(r'\n{3,}', '\n\n', new_content)
    
    return new_content, new_content != content

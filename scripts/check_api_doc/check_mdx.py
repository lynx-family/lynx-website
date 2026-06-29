import os
import re
from .utils import parse_frontmatter
from .imports import get_used_components, get_all_imports, fix_imports

def process_file(file_path, fix=False):
    with open(file_path, 'r', encoding='utf-8') as f:
        original_content = f.read()

    frontmatter, body, fm_text = parse_frontmatter(original_content)

    content_changed = False
    current_content = original_content
    current_body = body

    errors = []

    # --- 1. Cleanup Frontmatter ---
    keys_to_remove = ['id', 'slug']
    new_fm_lines = []
    fm_changed = False

    if fm_text:
        for line in fm_text.split('\n'):
            if not line.strip():
                continue
            key = line.split(':')[0].strip() if ':' in line else ''
            if key in keys_to_remove:
                fm_changed = True
                continue
            new_fm_lines.append(line)

    # --- 2. Check/Add API Query ---
    api_query = frontmatter.get('api')
    if not api_query:
        query_match = re.search(r'<(?:APITable|APISummary)[^>]*query=["\']([^"\']+)["\']', current_body)
        if query_match:
            api_query = query_match.group(1)
            new_fm_lines.append(f'api: {api_query}')
            fm_changed = True
            frontmatter['api'] = api_query

    # --- 3. Simplify APISummary/APITable Tags ---
    body_changed = False
    if api_query:
        def replace_summary(match):
            full_tag = match.group(0)
            query_prop_match = re.search(r'query=["\']([^"\']+)["\']', full_tag)
            if query_prop_match:
                query_val = query_prop_match.group(1)
                if query_val == api_query:
                    nonlocal body_changed
                    body_changed = True
                    return '<APISummary />'
            return full_tag

        new_body = re.sub(r'<APISummary[^>]*>', replace_summary, current_body)
        if body_changed:
            current_body = new_body

        def replace_table(match):
            full_tag = match.group(0)
            query_prop_match = re.search(r'query=["\']([^"\']+)["\']', full_tag)
            if query_prop_match:
                query_val = query_prop_match.group(1)
                if query_val == api_query:
                    nonlocal body_changed
                    body_changed = True
                    return '<APITable />'
            return full_tag

        new_body = re.sub(r'<APITable[^>]*>', replace_table, current_body)
        if new_body != current_body:
            current_body = new_body
            body_changed = True

    # --- 4. Insert APISummary if missing ---
    if '<APISummary' not in current_body and api_query:
        lines = current_body.split('\n')
        h1_index = -1
        for i, line in enumerate(lines):
            if line.strip().startswith('# '):
                h1_index = i
                break

        if h1_index != -1:
            lines.insert(h1_index + 1, '')
            lines.insert(h1_index + 2, '<APISummary />')
            current_body = '\n'.join(lines)
            body_changed = True
        else:
             current_body = '\n<APISummary />\n' + current_body.lstrip()
             body_changed = True

    # Reassemble if frontmatter or body changed
    if fm_changed or body_changed:
        new_fm_text = '\n'.join(new_fm_lines)
        if new_fm_text.strip():
             # If fm_text existed, we wrap it. If it didn't, we might need to create it.
             # Logic here assumes fm_text existed if we are modifying it.
             # If api_query was added to empty frontmatter, new_fm_lines has it.
             final_content = f"---\n{new_fm_text}\n---\n{current_body}"
        else:
             final_content = current_body
        
        if final_content != current_content:
            current_content = final_content
            content_changed = True

    # --- 5. Verify and Fix Imports ---
    # This checks used components and fixes imports (including duplicates)
    used_components = get_used_components(current_content)
    all_imports = get_all_imports(current_content)
    
    missing_imports = used_components - all_imports
    
    # We always run fix_imports if we are fixing, to consolidate duplicates even if no missing imports
    # But if not fixing, we just report missing.
    
    if missing_imports:
        errors.append(f"Missing imports: {', '.join(missing_imports)}")
    
    # Check for duplicates or malformed imports by running the fix logic speculatively?
    # Or just rely on fix_imports doing the right thing.
    
    if fix:
        # fix_imports handles adding missing AND merging duplicates
        # We pass used_components to ensure they are added if missing
        new_content_with_imports, imports_changed = fix_imports(current_content, ensure_components=missing_imports)
        if imports_changed:
            current_content = new_content_with_imports
            content_changed = True

    # --- Result ---
    if errors:
        print(f"Issues in {file_path}:")
        for err in errors:
            print(f"  - {err}")

    if content_changed:
        if fix:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(current_content)
            print(f"Fixed {file_path}")
        else:
            print(f"  (Run with fix=True to apply changes)")

    return len(errors)

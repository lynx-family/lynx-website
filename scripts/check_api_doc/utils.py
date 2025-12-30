import yaml

KNOWN_COMPONENTS = {
    'APITable', 'APISummary', 'CodeFold', 'Go',
    'VersionBadge', 'PlatformBadge', 'StatusBadge', 'RuntimeBadge', 'Badge',
    'AndroidOnly', 'IOSOnly', 'Deprecated', 'Experimental', 'Required',
    'BlogAvatar', 'APITableExplorer'
}

def parse_frontmatter(content):
    """
    Parses frontmatter from MDX content.
    Returns (frontmatter_dict, body_content, frontmatter_text).
    """
    if not content.startswith('---'):
        return {}, content, ""

    parts = content.split('---', 2)
    if len(parts) < 3:
        return {}, content, ""

    fm_text = parts[1]
    body = parts[2]

    frontmatter = {}
    try:
        # Use yaml loader for better parsing if available, but fallback to simple parsing if needed
        # The original script used simple splitting, but fix_duplicate_imports used yaml
        # Let's stick to the simple one from check-and-fix-docs-simple.py for now to avoid dependency issues if yaml isn't there
        # But wait, fix-duplicate-imports imported yaml. 
        # I'll use simple parsing to be robust against missing deps, or try yaml.
        # Actually, let's just use the logic from check-and-fix-docs-simple.py as it seemed to work well.
        for line in fm_text.split('\n'):
            if ':' in line:
                key, val = line.split(':', 1)
                frontmatter[key.strip()] = val.strip()
    except Exception:
        pass

    return frontmatter, body, fm_text

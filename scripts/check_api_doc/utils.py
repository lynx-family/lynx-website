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
        for line in fm_text.split('\n'):
            if ':' in line:
                key, val = line.split(':', 1)
                frontmatter[key.strip()] = val.strip()
    except Exception:
        pass

    return frontmatter, body, fm_text

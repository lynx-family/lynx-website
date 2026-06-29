import os
import sys
import argparse
from .check_mdx import process_file

def main():
    parser = argparse.ArgumentParser(description="Check and fix API documentation.")
    parser.add_argument('--fix', action='store_true', help="Automatically fix issues.")
    args = parser.parse_args()

    base_dirs = [
        'docs/en/api',
        'docs/zh/api'
    ]

    total_errors = 0
    checked_files = 0

    print(f"Checking docs... (Fix mode: {args.fix})")

    for base_dir in base_dirs:
        if not os.path.exists(base_dir):
            print(f"Warning: Directory {base_dir} does not exist. Skipping.")
            continue
            
        for root, dirs, files in os.walk(base_dir):
            for file in files:
                if file.endswith('.mdx'):
                    file_path = os.path.join(root, file)
                    try:
                        error_count = process_file(file_path, fix=args.fix)
                        if error_count > 0:
                            total_errors += 1
                        checked_files += 1
                    except Exception as e:
                        print(f"Error processing {file_path}: {e}")

    print(f"\nChecked {checked_files} files.")
    if total_errors > 0:
        print(f"Found issues in {total_errors} files.")
        if not args.fix:
            print("Run with --fix to automatically fix most issues.")
            sys.exit(1)
    else:
        print("No issues found.")

if __name__ == "__main__":
    main()

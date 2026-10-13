#!/usr/bin/env python3
"""Stage optimized documentation media locally without modifying source assets."""

import argparse
from contextlib import contextmanager
import csv
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile


# Keep this path lexical: resolving an output symlink must not authorize its target.
LOCAL_OUTPUT = Path(__file__).resolve().parent / "output"
REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ROOT = REPO_ROOT / "docs" / "public" / "assets"


def run(args, binary=False):
    result = subprocess.run(args, stdin=subprocess.DEVNULL, capture_output=True)
    if result.returncode:
        raise ValueError(
            f"{args[0]} failed: {result.stderr.decode(errors='replace')[-2000:].strip()}"
        )
    return result.stdout if binary else result.stdout.decode()


def size(value):
    match = re.fullmatch(r"(\d+)(B|KiB|MiB|GiB)?", value)
    if not match:
        raise argparse.ArgumentTypeError("use integer bytes or KiB/MiB/GiB, e.g. 1MiB")
    return int(match[1]) * {"B": 1, "KiB": 1024, "MiB": 1024**2, "GiB": 1024**3}.get(match[2], 1)


def within(file, directory):
    return file == directory or directory in file.parents


def has_symlink_component(path):
    """Inspect the original path, before resolve() or abspath() can erase links."""
    # Check ancestors first so checking a child never follows a known link.
    for component in reversed((path, *path.parents)):
        if component.is_symlink():
            return True
    return False


def run_git(directory, *args, check=True):
    """Use the requested repository, never the caller's Git environment."""
    env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    result = subprocess.run(
        ["git", "-C", str(directory), *args],
        stdin=subprocess.DEVNULL, capture_output=True, env=env,
    )
    if check and result.returncode:
        raise ValueError(f"git failed: {result.stderr.decode(errors='replace')[-2000:].strip()}")
    return result


def find_git_root(directory):
    result = run_git(directory, "rev-parse", "--show-toplevel", check=False)
    return Path(result.stdout.decode().strip()).resolve() if result.returncode == 0 else None


def check_output(output, root, default_run=False):
    if not within(output, LOCAL_OUTPUT):
        raise ValueError("--output must be under scripts/media/output/")
    if output == LOCAL_OUTPUT and not default_run:
        raise ValueError("--output must select a subdirectory, not the output workspace itself")
    if within(output, root):
        raise ValueError("--output must be outside --root")
    if within(root, output) or within(REPO_ROOT, output):
        raise ValueError("--output must not contain --root or the script's repository")
    ancestor = output
    while not ancestor.exists():
        ancestor = ancestor.parent
    if not ancestor.is_dir():
        raise ValueError("--output has a non-directory ancestor")
    ancestors = (ancestor, *ancestor.parents)
    if any(
        (p / ".git").exists() or (p / ".git").is_symlink()
        for p in ancestors if within(p, LOCAL_OUTPUT)
    ):
        raise ValueError("--output must not be inside a nested Git repository")
    if output.exists() and not default_run:
        for directory, dirs, names in os.walk(output, followlinks=False):
            if ".git" in dirs or ".git" in names:
                raise ValueError(f"--output contains a Git repository: {directory}")


def clean_output(output):
    """Replace only the validated staging directory after preflight succeeds."""
    if output.exists():
        print(f"Cleaning output: {output}", flush=True)
        shutil.rmtree(output)
    output.mkdir(parents=True)


@contextmanager
def output_workspace(output_input, root, default_run):
    """Keep cooperating CLI runs from cleaning each other's active output."""
    if has_symlink_component(output_input):
        raise ValueError("--output must not contain a symlink")
    LOCAL_OUTPUT.mkdir(parents=True, exist_ok=True)
    # Lock the workspace directory itself: no stale lock file after a crash.
    descriptor = os.open(LOCAL_OUTPUT, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        try:
            fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError("another media helper is using the output workspace; retry after it exits")
        # Preflight may take time. Check again under the lock, before cleanup.
        if has_symlink_component(output_input):
            raise ValueError("--output must not contain a symlink")
        output = output_input.resolve()
        check_output(output, root, default_run)
        if default_run:
            output = Path(tempfile.mkdtemp(prefix="run-", dir=LOCAL_OUTPUT))
        else:
            clean_output(output)
        yield output
    finally:
        os.close(descriptor)


def collect(root, inputs):
    files = {}
    extensions = {".gif", ".png", ".jpg", ".jpeg"}
    for value in inputs or [str(root)]:
        # Anchor relative inputs to the script's repository, not the caller's cwd.
        selected = REPO_ROOT / value
        # Even lexical normalization can erase a link followed by "..".
        if has_symlink_component(selected):
            raise ValueError(f"symlink input is not supported: {selected}")
        selected = selected.resolve()
        if not within(selected, root):
            raise ValueError(f"input is outside --root: {selected}")
        if not selected.exists():
            raise ValueError(f"input does not exist: {selected}")
        candidates = [selected]
        if selected.is_dir():
            candidates = []
            for directory, dirs, names in os.walk(selected, followlinks=False):
                dirs[:] = sorted(d for d in dirs if not (Path(directory) / d).is_symlink())
                candidates.extend(Path(directory) / name for name in sorted(names))
        for file in candidates:
            if file.suffix.lower() not in extensions:
                continue
            if file.is_symlink():
                raise ValueError(f"symlink media is not supported: {file}")
            if file.is_file():
                # Preserve descendants of this input directory, not its own name.
                # The first input selecting a file determines its output location.
                relative = Path(file.name) if selected.is_file() else file.relative_to(selected)
                files.setdefault(file, relative)
    if not files:
        raise ValueError("no GIF/PNG/JPG/JPEG inputs found")
    outputs = {name: name for name in ["manifest.md", "manifest.tsv"]}
    directories = {}
    selected_files = []
    for file, relative in sorted(files.items()):
        target = relative.with_suffix(".webm" if file.suffix.lower() == ".gif" else ".webp")
        key = str(target).casefold()
        if key in outputs:
            raise ValueError(f"output collision: {outputs[key]} and {file} -> {target}")
        if key in directories:
            raise ValueError(f"output file/directory collision: {directories[key]} and {file} -> {target}")
        for parent in target.parents:
            if parent == Path("."):
                break
            parent_key = str(parent).casefold()
            if parent_key in outputs:
                raise ValueError(f"output file/directory collision: {outputs[parent_key]} and {file} -> {parent}")
            directories.setdefault(parent_key, file)
        outputs[key] = file
        selected_files.append((file, target))
    return selected_files


def references(root, files):
    result = {file: [] for file in files}
    repo = find_git_root(root)
    if not repo:
        return result
    by_name = {}
    for file in files:
        by_name.setdefault(file.name, []).append(file)
    paths = run_git(repo, "ls-files", "-z", "--", "docs", "sharedDocs", "src", "theme").stdout.decode().split("\0")
    for name in paths:
        document = repo / name
        if document.suffix not in {".md", ".mdx", ".js", ".jsx", ".ts", ".tsx", ".css", ".scss", ".json"}:
            continue
        if has_symlink_component(document) or not document.is_file():
            continue
        for number, line in enumerate(document.read_text(errors="replace").splitlines(), 1):
            for basename, matches in by_name.items():
                if basename in line:
                    for file in matches:
                        result[file].append(f"{name}:{number}")
    return result


def probe(file):
    options = ["-ignore_loop", "1"] if file.suffix.lower() == ".gif" else []
    data = json.loads(run([
        "ffprobe", "-v", "error", *options, "-select_streams", "v:0",
        "-show_frames", "-show_streams", "-show_format",
        "-show_entries", "frame=pts_time,duration_time:stream=width,height:format=duration",
        "-of", "json", str(file),
    ]))
    stream = data["streams"][0]
    frames = data["frames"]
    if not frames:
        raise ValueError("no decoded video frames")
    return (stream["width"], stream["height"]), frames, float(data["format"]["duration"])


def convert_gif(source, target, crf):
    dimensions, frames, duration = probe(source)
    alpha = run([
        "ffmpeg", "-v", "error", "-xerror", "-nostdin", "-ignore_loop", "1", "-i", str(source),
        "-vf", "format=rgba,alphaextract,signalstats,metadata=print:key=lavfi.signalstats.YMIN:file=-",
        "-f", "null", "-",
    ])
    minima = re.findall(r"lavfi.signalstats.YMIN=([0-9.]+)", alpha)
    if len(minima) != len(frames) or any(float(value) < 255 for value in minima):
        raise ValueError("transparent GIF: choose a background or an alpha-capable delivery format manually")
    run([
        "ffmpeg", "-v", "error", "-xerror", "-nostdin", "-y", "-ignore_loop", "1", "-i", str(source),
        "-map", "0:v:0", "-an", "-c:v", "libvpx-vp9", "-crf", str(crf), "-b:v", "0",
        "-pix_fmt", "yuv420p", "-fps_mode", "passthrough", "-enc_time_base", "1:1000",
        "-map_metadata", "-1", str(target),
    ])
    actual_dimensions, actual_frames, actual_duration = probe(target)
    if actual_dimensions != dimensions or len(actual_frames) != len(frames):
        raise ValueError("WebM changed dimensions or frame count")
    if abs(actual_duration - duration) > 0.011:
        raise ValueError("WebM changed animation duration (including the final frame hold)")
    for before, after in zip(frames, actual_frames):
        if abs(float(before["pts_time"]) - float(after["pts_time"])) > 0.002:
            raise ValueError("WebM changed frame timestamps")
    run(["ffmpeg", "-v", "error", "-xerror", "-nostdin", "-i", str(target), "-f", "null", "-"])
    return dimensions, f"{duration:.3f}"


def image_info(file):
    lines = run(["magick", "identify", "-format", "%m %w %h %[orientation]\n", str(file)]).splitlines()
    if len(lines) != 1:
        raise ValueError("animated/multi-image PNG or JPEG is not supported")
    kind, width, height, orientation = lines[0].split()
    return kind, (int(width), int(height)), orientation


def alpha_digest(file):
    return hashlib.sha256(run([
        "magick", str(file), "-alpha", "extract", "-depth", "8", "gray:-",
    ], binary=True)).digest()


def display_size(value):
    """Format a byte count for the human-readable Markdown manifest."""
    value = int(value)
    for unit in ["B", "KiB", "MiB", "GiB"]:
        if value < 1024 or unit == "GiB":
            return f"{value} {unit}" if unit == "B" else f"{value:.1f} {unit}"
        value /= 1024


def markdown_cell(value):
    return str(value).replace("\\", "\\\\").replace("|", "\\|").replace("\n", "<br>")


def write_markdown_manifest(output, rows, dry_run, scan_references):
    """Write an IDE-friendly view alongside the machine-readable TSV manifest."""
    counts = {}
    for row in rows:
        counts[row["status"]] = counts.get(row["status"], 0) + 1
    summary = ", ".join(f"{status}: {count}" for status, count in sorted(counts.items()))
    converted = [row for row in rows if row["status"] == "converted"]
    candidates = [row for row in rows if row["status"] == "candidate"]
    lines = [
        "# Media processing manifest",
        "",
        f"{len(rows)} files. {summary}.",
        "",
    ]
    if not scan_references:
        lines.extend(["Reference scan: disabled. Use `--scan-references` to include reference candidates.", ""])
    if dry_run:
        lines.append(
            f"Candidates: {len(candidates)} files, "
            f"{display_size(sum(int(row['source_bytes']) for row in candidates))} total."
        )
    else:
        lines.append(
            f"Total saved: {display_size(sum(int(row['saved_bytes']) for row in converted))} "
            f"across {len(converted)} converted files."
        )
    lines.extend([
        "",
        "| Source | Output | Status | Source size | Result | References | Note |",
        "| --- | --- | --- | ---: | --- | --- | --- |",
    ])
    for row in rows:
        references = json.loads(row["reference_candidates"])
        locations = "<br>".join(f"`{markdown_cell(reference)}`" for reference in references) or "—"
        if row["output_bytes"]:
            result = f"{display_size(row['output_bytes'])}; saved {display_size(row['saved_bytes'])}"
        else:
            result = "—"
        lines.append(
            "| {source} | {output} | {status} | {source_size} | {result} | {references} | {note} |".format(
                source=f"`{markdown_cell(row['source'])}`",
                output=f"`{markdown_cell(row['output'])}`",
                status=markdown_cell(row["status"]),
                source_size=display_size(row["source_bytes"]),
                result=markdown_cell(result),
                references=locations,
                note=markdown_cell(row["note"]) or "—",
            )
        )
    (output / "manifest.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def convert_image(source, target, quality):
    kind, dimensions, orientation = image_info(source)
    if kind not in {"PNG", "JPEG"}:
        raise ValueError(f"expected PNG/JPEG content, found {kind}")
    if orientation not in {"Undefined", "TopLeft"}:
        raise ValueError("EXIF-oriented image: normalize orientation manually before conversion")
    # PNG decoders may expose only APNG's first frame. Detect its animation chunk.
    if kind == "PNG":
        with source.open("rb") as stream:
            stream.read(8)
            while header := stream.read(8):
                if len(header) != 8:
                    raise ValueError("invalid PNG chunk")
                if header[4:] == b"acTL":
                    raise ValueError("animated PNG is not supported")
                stream.seek(int.from_bytes(header[:4], "big") + 4, 1)
                if header[4:] == b"IEND":
                    break
    run([
        "magick", str(source), "-colorspace", "sRGB", "-strip",
        "-define", "webp:alpha-quality=100", "-define", "webp:method=6",
        "-quality", str(quality), str(target),
    ])
    if image_info(target)[1] != dimensions:
        raise ValueError("WebP changed image dimensions")
    if alpha_digest(source) != alpha_digest(target):
        raise ValueError("WebP changed the alpha channel")
    return dimensions, ""


def main():
    parser = argparse.ArgumentParser(
        description="Stage optimized doc media locally; never upload or edit sources.",
        epilog="Relative inputs and --root start at this script's repository root. "
               "Relative --output starts at scripts/media/output/, independent of cwd. "
               "Absolute output paths must stay within that workspace.",
    )
    parser.add_argument("--root", default=str(DEFAULT_ROOT), help="input path boundary; default: this repository's docs/public/assets, independent of cwd")
    parser.add_argument("--output", help="subdirectory under scripts/media/output/, cleared on rerun (including --dry-run); default: a fresh run-* directory in that workspace")
    parser.add_argument("--min-size", type=size, default=100 * 1024, help="inclusive threshold; default: 100KiB")
    parser.add_argument("--webp-quality", type=int, default=82)
    parser.add_argument("--webm-crf", type=int, default=30)
    parser.add_argument("--dry-run", action="store_true", help="write an inventory with candidate count and source size; do not run encoders")
    parser.add_argument("--scan-references", action="store_true", help="include candidate documentation references from Git-tracked files; requires Git, default: off")
    parser.add_argument("inputs", nargs="*", help="absolute or repository-relative files/directories; default: root")
    args = parser.parse_args()
    if not 1 <= args.webp_quality <= 100 or not 0 <= args.webm_crf <= 63:
        parser.error("WebP quality must be 1..100; WebM CRF must be 0..63")
    if args.scan_references and not shutil.which("git"):
        raise ValueError("missing git (required by --scan-references); omit the option to process media without Git")
    root_input = REPO_ROOT / args.root
    default_run = args.output is None
    output_input = LOCAL_OUTPUT if default_run else LOCAL_OUTPUT / args.output
    if has_symlink_component(root_input):
        raise ValueError("--root must not contain a symlink")
    if has_symlink_component(output_input):
        raise ValueError("--output must not contain a symlink")
    root, output = root_input.resolve(), output_input.resolve()
    if not root.is_dir():
        raise ValueError("--root must be an existing directory")
    check_output(output, root, default_run)
    selections = collect(root, args.inputs)
    files = [file for file, _ in selections]
    if not args.dry_run:
        tools = set()
        for file in files:
            if file.stat().st_size >= args.min_size:
                tools.update({"ffmpeg", "ffprobe"} if file.suffix.lower() == ".gif" else {"magick"})
        for tool in sorted(tools):
            if not shutil.which(tool):
                raise ValueError(f"missing {tool}; see scripts/media/README.md")
    refs = references(root, files) if args.scan_references else {file: [] for file in files}
    # Allocate only after preflight, and hold the lock until all writes finish.
    with output_workspace(output_input, root, default_run) as output:
        return process_files(output, root, selections, args, refs)


def process_files(output, root, selections, args, refs):
    """Write conversions and manifests while the caller holds the workspace lock."""
    print(f"Output: {output}", flush=True)
    failed = 0
    fields = ["source", "output", "status", "source_bytes", "output_bytes", "saved_bytes",
              "width", "height", "duration_seconds", "reference_candidates", "note"]
    rows = []
    with (output / "manifest.tsv").open("x", newline="", encoding="utf-8") as manifest:
        writer = csv.DictWriter(manifest, fieldnames=fields, delimiter="\t")
        writer.writeheader()
        for source, target in selections:
            relative = source.relative_to(root)
            row = dict.fromkeys(fields, "")
            row.update(source=str(relative), output=str(target), source_bytes=source.stat().st_size,
                       reference_candidates=json.dumps(refs[source], ensure_ascii=False))
            if row["source_bytes"] < args.min_size:
                row["status"] = "below-threshold"
            elif args.dry_run:
                row["status"] = "candidate"
            else:
                try:
                    with tempfile.TemporaryDirectory(prefix=".media-", dir=output) as temporary:
                        candidate = Path(temporary) / ("candidate" + target.suffix)
                        print(f"Processing {str(relative)!r}", flush=True)
                        if target.suffix == ".webm":
                            dimensions, duration = convert_gif(source, candidate, args.webm_crf)
                        else:
                            dimensions, duration = convert_image(source, candidate, args.webp_quality)
                        row.update(width=dimensions[0], height=dimensions[1], duration_seconds=duration,
                                   output_bytes=candidate.stat().st_size)
                        row["saved_bytes"] = row["source_bytes"] - row["output_bytes"]
                        if row["saved_bytes"] <= 0:
                            row["status"] = "no-benefit"
                        else:
                            destination = output / target
                            destination.parent.mkdir(parents=True, exist_ok=True)
                            # Exclusive creation: even an unexpected existing output is never replaced.
                            with candidate.open("rb") as src, destination.open("xb") as dst:
                                try:
                                    shutil.copyfileobj(src, dst)
                                except BaseException:
                                    destination.unlink()
                                    raise
                            row["status"] = "converted"
                except (ValueError, OSError, KeyError, IndexError) as error:
                    row.update(status="failed", note=str(error))
                    failed += 1
            writer.writerow(row)
            manifest.flush()
            rows.append(row)
            print(f"{row['status']}: {str(relative)!r}", flush=True)
    write_markdown_manifest(output, rows, args.dry_run, args.scan_references)
    print(f"Manifests: {output / 'manifest.md'} and {output / 'manifest.tsv'}")
    print(f"[process-doc-media] {'failed' if failed else 'success'} ({len(selections)} files, {failed} failures)")
    return 1 if failed else 0


try:
    sys.exit(main())
except (ValueError, OSError) as error:
    print(f"process-doc-media: {error}", file=sys.stderr)
    sys.exit(2)
except KeyboardInterrupt:
    print("process-doc-media: interrupted; completed rows remain in manifest.tsv", file=sys.stderr)
    sys.exit(130)

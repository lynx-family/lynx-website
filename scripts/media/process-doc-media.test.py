#!/usr/bin/env python3
"""Run local integration tests for the offline documentation media helper."""

import csv
import hashlib
import json
import os
from pathlib import Path
import random
import shutil
import subprocess
import sys
import tempfile
import time
import unittest

SCRIPT = Path(__file__).with_name("process-doc-media.sh").resolve()
for tool in ["git", "magick", "ffmpeg", "ffprobe"]:
    if not shutil.which(tool):
        sys.exit(f"Missing integration-test dependency: {tool}")


def run(*args, data=None):
    result = subprocess.run(args, input=data, capture_output=True)
    if result.returncode:
        raise AssertionError(result.stderr.decode(errors="replace"))
    return result.stdout


class ProcessorTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="media-helper-test-")
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name).resolve()
        self.root = self.directory / "repo" / "assets"
        self.root.mkdir(parents=True)
        self.local_helper()

    def process(self, *args, code=0, env=None):
        result = subprocess.run(
            [shutil.which("sh"), str(self.script), "--root", str(self.root), "--output", str(self.output), *map(str, args)],
            cwd=self.directory, text=True, capture_output=True, env=env,
        )
        self.assertEqual(result.returncode, code, result.stdout + result.stderr)
        return result

    def rows(self):
        with (self.output / "manifest.tsv").open(newline="") as stream:
            return list(csv.DictReader(stream, delimiter="\t"))

    def markdown(self):
        return (self.output / "manifest.md").read_text()

    def noise(self, file, alpha=False):
        file.parent.mkdir(parents=True, exist_ok=True)
        channels = 4 if alpha else 3
        rng = random.Random(42)
        pixels = bytes(rng.randrange(256) for _ in range(129 * 97 * channels))
        run("magick", "-size", "129x97", "-depth", "8", "rgba:-" if alpha else "rgb:-",
            "-quality", "100", str(file), data=pixels)

    def gif(self, file, transparent=False):
        if transparent:
            run("magick", "-size", "129x97", "-delay", "7", "xc:none", "-fill", "red",
                "-draw", "rectangle 0,0 40,40", "-delay", "13", "xc:none",
                "-draw", "rectangle 40,40 80,80", "-loop", "0", str(file))
        else:
            frame = self.directory / "frame.png"
            self.noise(frame)
            run("magick", "-delay", "7", str(frame), "-delay", "13", str(frame),
                "-delay", "31", str(frame), "-loop", "0", str(file))

    def test_real_formats_dimensions_alpha_timing_and_source_integrity(self):
        self.noise(self.root / "nested" / "with spaces.PNG", alpha=True)
        self.noise(self.root / "photo.jpeg")
        self.gif(self.root / "demo.gif")
        sources = {file: hashlib.sha256(file.read_bytes()).hexdigest()
                   for file in self.root.rglob("*") if file.is_file()}
        self.process("--min-size", "0", self.root, self.root / "photo.jpeg")
        rows = self.rows()
        self.assertEqual(len(rows), 3, "overlapping inputs must be deduplicated")
        for row in rows:
            self.assertEqual(row["status"], "converted", row)
            self.assertEqual((row["width"], row["height"]), ("129", "97"))
            self.assertGreater(int(row["saved_bytes"]), 0)
            self.assertTrue((self.output / row["output"]).is_file())
        self.assertEqual(next(row for row in rows if row["source"] == "demo.gif")["duration_seconds"], "0.510")
        source_alpha = run("magick", str(self.root / "nested/with spaces.PNG"), "-alpha", "extract", "-depth", "8", "gray:-")
        target_alpha = run("magick", str(self.output / "nested/with spaces.webp"), "-alpha", "extract", "-depth", "8", "gray:-")
        self.assertEqual(source_alpha, target_alpha)
        frames = json.loads(run(
            "ffprobe", "-v", "error", "-show_frames", "-show_entries", "frame=pts_time,duration_time",
            "-of", "json", str(self.output / "demo.webm"),
        ))["frames"]
        self.assertEqual([round(float(f["pts_time"]), 2) for f in frames], [0, 0.07, 0.20])
        self.assertAlmostEqual(float(frames[-1]["duration_time"]), 0.31, places=2)
        for file, digest in sources.items():
            self.assertEqual(hashlib.sha256(file.read_bytes()).hexdigest(), digest)
        self.assertFalse(list(self.output.glob(".media-*")))
        self.assertRegex(self.markdown(), r"Total saved: [1-9][0-9.]* KiB across 3 converted files\.")

    def test_dry_run_inclusive_threshold_and_reference_hints(self):
        run("git", "init", "-q", str(self.root.parent))
        docs = self.root.parent / "docs"
        docs.mkdir()
        (docs / "page.mdx").write_text("![demo](/assets/big image.png)\n")
        run("git", "-C", str(self.root.parent), "add", "docs")
        self.noise(self.root / "big image.png")
        run("magick", "-size", "1x1", "xc:red", str(self.root / "small.jpg"))
        self.process("--dry-run", "--scan-references", "--min-size", "1KiB")
        rows = {r["source"]: r for r in self.rows()}
        self.assertEqual(rows["big image.png"]["status"], "candidate")
        self.assertEqual(rows["small.jpg"]["status"], "below-threshold")
        self.assertEqual(rows["big image.png"]["saved_bytes"], "")
        self.assertEqual(json.loads(rows["big image.png"]["reference_candidates"]), ["docs/page.mdx:1"])
        self.assertEqual(
            sorted(self.output.iterdir()),
            [self.output / "manifest.md", self.output / "manifest.tsv"],
        )
        self.assertIn("# Media processing manifest", self.markdown())
        self.assertIn("2 files. below-threshold: 1, candidate: 1.", self.markdown())
        self.assertRegex(self.markdown(), r"Candidates: 1 files, [1-9][0-9.]* KiB total\.")
        self.assertIn("`docs/page.mdx:1`", self.markdown())

    def test_reference_scan_is_opt_in_and_ignores_inherited_git_environment(self):
        repo = self.root.parent
        docs = repo / "docs"
        docs.mkdir()
        (docs / "page.md").write_text("photo.png\n")
        (docs / "other.md").write_text("photo.png untracked local page\n")
        run("git", "-C", str(repo), "add", "docs/page.md")
        (self.root / "photo.png").write_bytes(b"inventory only")
        other = self.directory / "other-repo"
        run("git", "init", "-q", str(other))
        (other / "docs").mkdir()
        (other / "docs" / "other.md").write_text("different repository\n")
        run("git", "-C", str(other), "add", "docs")
        clean_env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
        cases = [
            {},
            {"GIT_DIR": str(other / ".git")},
            {"GIT_WORK_TREE": str(other)},
            {"GIT_DIR": str(other / ".git"), "GIT_WORK_TREE": str(other)},
            {"GIT_INDEX_FILE": str(other / ".git" / "index")},
            {"GIT_DIR": str(self.directory / "missing.git")},
            {"GIT_INDEX_FILE": str(self.directory / "missing-index")},
            {"GIT_COMMON_DIR": str(other / ".git")},
        ]
        for override in cases:
            with self.subTest(override=override):
                env = dict(clean_env, **override)
                self.process("--dry-run", env=env)
                self.assertEqual(json.loads(self.rows()[0]["reference_candidates"]), [])
                self.assertIn("Reference scan: disabled", self.markdown())
                self.process("--dry-run", "--scan-references", env=env)
                self.assertEqual(json.loads(self.rows()[0]["reference_candidates"]), ["docs/page.md:1"])
                self.assertNotIn("Reference scan: disabled", self.markdown())

    def test_without_git_media_processing_works_and_requested_scan_preserves_output(self):
        self.noise(self.root / "photo.png")
        tools = self.directory / "tools"
        tools.mkdir()
        for name, target in [
            ("python3", sys.executable),
            ("dirname", shutil.which("dirname")),
            ("magick", shutil.which("magick")),
        ]:
            (tools / name).symlink_to(target)
        env = dict(os.environ, PATH=str(tools))
        self.assertIsNone(shutil.which("git", path=env["PATH"]))
        self.process("--dry-run", "--min-size", "0", env=env)
        self.assertEqual(self.rows()[0]["status"], "candidate")
        self.process("--min-size", "0", env=env)
        self.assertEqual(self.rows()[0]["status"], "converted")
        before = {file.name: file.read_bytes() for file in self.output.iterdir()}
        result = self.process("--scan-references", "--dry-run", env=env, code=2)
        self.assertIn("missing git (required by --scan-references)", result.stderr)
        self.assertEqual({file.name: file.read_bytes() for file in self.output.iterdir()}, before)
        self.process("--dry-run", "--output", self.root, env=env, code=2)
        self.assertTrue((self.root / "photo.png").is_file())

    def test_reference_scan_outside_git_returns_empty_candidates(self):
        self.root = self.directory / "external-assets"
        self.root.mkdir()
        (self.root / "photo.png").write_bytes(b"inventory only")
        self.process("--dry-run", "--scan-references")
        self.assertEqual(json.loads(self.rows()[0]["reference_candidates"]), [])

    def test_requested_reference_scan_failure_preserves_previous_output(self):
        (self.root / "photo.png").write_bytes(b"inventory only")
        self.output.mkdir()
        keep = self.output / "keep.txt"
        keep.write_text("previous output")
        tools = self.directory / "tools"
        tools.mkdir()
        git = tools / "git"
        git.write_text(
            f"#!{sys.executable}\n"
            "import subprocess\nimport sys\n"
            "if 'ls-files' in sys.argv:\n"
            "    sys.stderr.write('fixture index failure\\n')\n"
            "    raise SystemExit(1)\n"
            f"raise SystemExit(subprocess.call([{shutil.which('git')!r}, *sys.argv[1:]]))\n"
        )
        git.chmod(0o755)
        env = dict(os.environ, PATH=str(tools) + os.pathsep + os.environ["PATH"])
        result = self.process("--dry-run", "--scan-references", env=env, code=2)
        self.assertIn("fixture index failure", result.stderr)
        self.assertEqual(keep.read_text(), "previous output")

    def local_helper(self):
        run("git", "init", "-q", str(self.root.parent))
        media = self.root.parent / "scripts" / "media"
        media.mkdir(parents=True, exist_ok=True)
        for name in ["process-doc-media.sh", "process-doc-media.py", ".gitignore"]:
            shutil.copyfile(SCRIPT.parent / name, media / name)
        self.script = media / SCRIPT.name
        self.output = media / "output" / "batch"
        self.output.parent.mkdir(exist_ok=True)
        return media

    def test_inclusive_threshold_and_paths_from_different_directories(self):
        media = self.script.parent
        repo = self.root.parent
        default_root = repo / "docs" / "public" / "assets"
        default_root.mkdir(parents=True)
        for root in [default_root, self.root]:
            self.noise(root / "at-limit.png")
            run("magick", "-size", "1x1", "xc:red", str(root / "below-limit.jpg"))
        cases = [
            ("media-relative", media, ["docs/public/assets"], []),
            ("repo-relative", repo, ["docs/public/assets"], []),
            ("outside-relative", self.directory, ["docs/public/assets"], []),
            ("repo-absolute", repo, [str(default_root)], []),
            ("media-mixed", media, ["docs/public/assets", str(default_root / "at-limit.png")], []),
            ("outside-default", self.directory, [], []),
            ("custom-relative", media, ["assets"], ["--root", "assets"]),
        ]
        for name, cwd, inputs, options in cases:
            with self.subTest(name=name):
                self.output = media / "output" / name
                output_arg = name
                result = subprocess.run(
                    [
                        "sh", str(self.script), "--output", output_arg, "--dry-run", *options,
                        "--min-size", str((default_root / "at-limit.png").stat().st_size), *inputs,
                    ],
                    cwd=cwd, text=True, capture_output=True,
                )
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                manifest = self.rows()
                self.assertEqual(len(manifest), 2)
                rows = {row["source"]: row for row in manifest}
                self.assertEqual(rows["at-limit.png"]["status"], "candidate")
                self.assertEqual(rows["below-limit.jpg"]["status"], "below-threshold")
                self.assertEqual(
                    sorted(self.output.iterdir()),
                    [self.output / "manifest.md", self.output / "manifest.tsv"],
                )

    def test_output_paths_are_relative_to_each_input_directory(self):
        first = self.root / "first"
        second = self.root / "second"
        for directory in [first, second]:
            (directory / "nested").mkdir(parents=True)
        self.noise(first / "nested" / "demo.png")
        self.noise(second / "nested" / "demo.png")
        self.process("--dry-run", "assets/first")
        self.assertEqual(self.rows()[0]["source"], "first/nested/demo.png")
        self.assertEqual(self.rows()[0]["output"], "nested/demo.webp")
        self.process("--dry-run", "assets/first/nested/demo.png")
        self.assertEqual(self.rows()[0]["output"], "demo.webp")
        result = self.process("--dry-run", "assets/first", "assets/second", code=2)
        self.assertIn("output collision", result.stderr)

    def test_local_output_converts_and_is_git_ignored(self):
        self.noise(self.root / "photo.png")
        self.process("--min-size", "0", "assets/photo.png")
        self.assertEqual(self.rows()[0]["status"], "converted")
        self.assertTrue((self.output / "photo.webp").is_file())
        for name in ["photo.webp", "manifest.md", "manifest.tsv"]:
            run("git", "-C", str(self.root.parent), "check-ignore", "--quiet",
                str(self.output / name))
        run("git", "-C", str(self.root.parent), "add", "-A")
        self.assertEqual(run("git", "-C", str(self.root.parent), "ls-files", "--",
                             "scripts/media/output"), b"")
        self.process("--dry-run", "--min-size", "0")
        self.assertEqual(self.rows()[0]["status"], "candidate")
        self.assertFalse((self.output / "photo.webp").exists())
        self.process("--min-size", "0", "assets/photo.png")
        self.assertEqual(self.rows()[0]["status"], "converted")
        self.assertTrue((self.output / "photo.webp").is_file())

    def test_local_output_does_not_authorize_symlink_or_nested_repo(self):
        media = self.script.parent
        (self.root / "photo.png").write_bytes(b"inventory only")
        (media / "output").rmdir()
        (media / "output").symlink_to(self.root.parent, target_is_directory=True)
        self.process("--dry-run", code=2)
        self.assertFalse((self.root.parent / "batch").exists())
        (media / "output").unlink()
        run("git", "init", "-q", str(media / "output"))
        self.process("--dry-run", code=2)
        self.assertFalse(self.output.exists())

    def test_rejects_output_inside_other_worktree_directories_and_symlink(self):
        run("git", "init", "-q", str(self.root.parent))
        (self.root / "a.png").write_bytes(b"unused")
        for output in [self.root / "out", self.root.parent / "ignored" / "out"]:
            with self.subTest(output=output):
                self.output = output
                self.process("--dry-run", code=2)
                self.assertFalse(output.exists())
        other = self.directory / "other-repo"
        run("git", "init", "-q", str(other))
        link = self.directory / "link"
        link.symlink_to(other, target_is_directory=True)
        self.output = link / "out"
        result = self.process("--dry-run", code=2)
        self.assertIn("must not contain a symlink", result.stderr)
        self.assertFalse(self.output.exists())

    def test_rerun_cleans_only_selected_output_without_following_symlinks(self):
        self.noise(self.root / "a.png")
        stale = self.output / "nested" / "stale.webp"
        stale.parent.mkdir(parents=True)
        stale.write_bytes(b"old output")
        (self.output / "manifest.tsv").write_text("old manifest")
        (self.output / "source-link").symlink_to(self.root, target_is_directory=True)
        sibling = self.output.with_name("other-output")
        sibling.mkdir()
        keep = sibling / "keep.webp"
        keep.write_bytes(b"keep")
        self.process("--dry-run", "--min-size", "0")
        self.assertEqual(
            sorted(self.output.iterdir()),
            [self.output / "manifest.md", self.output / "manifest.tsv"],
        )
        self.assertEqual(self.rows()[0]["status"], "candidate")
        self.assertEqual(keep.read_bytes(), b"keep")

    def test_preflight_failure_preserves_previous_output(self):
        self.output.mkdir()
        keep = self.output / "manifest.tsv"
        keep.write_text("keep")
        for name in ["a.png", "a.jpg"]:
            (self.root / name).write_bytes(b"unused")
        self.assertIn("collision", self.process("--dry-run", code=2).stderr)
        self.assertEqual(keep.read_text(), "keep")
        self.process("--dry-run", self.root / "missing.png", code=2)
        self.assertEqual(keep.read_text(), "keep")

    def test_cleanup_rejects_source_ancestors_and_nested_repositories(self):
        (self.root / "a.png").write_bytes(b"source")
        staging = self.output
        self.output = self.directory
        self.assertIn("must be under scripts/media/output/", self.process("--dry-run", code=2).stderr)
        self.assertEqual((self.root / "a.png").read_bytes(), b"source")
        self.output = staging
        nested_repo = self.output / "nested-repo"
        run("git", "init", "-q", str(nested_repo))
        self.assertIn("contains a Git repository", self.process("--dry-run", code=2).stderr)
        self.assertTrue((nested_repo / ".git").is_dir())

    def test_default_output_creates_fresh_ignored_runs_and_preserves_previous_tasks(self):
        (self.root / "a.png").write_bytes(b"inventory only")
        workspace = self.output.parent
        self.output.mkdir()
        keep = self.output / "keep.txt"
        keep.write_text("previous task")
        for cwd in [self.directory, self.root.parent, self.script.parent]:
            before = set(workspace.iterdir())
            result = subprocess.run(
                ["sh", str(self.script), "--root", str(self.root), "--dry-run"],
                cwd=cwd, text=True, capture_output=True,
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            created = set(workspace.iterdir()) - before
            self.assertEqual(len(created), 1)
            output = created.pop()
            self.assertTrue(output.name.startswith("run-"))
            self.assertIn(f"Output: {output}", result.stdout)
            self.assertEqual(keep.read_text(), "previous task")
            self.assertTrue(before.issubset(set(workspace.iterdir())))
            for manifest in ["manifest.md", "manifest.tsv"]:
                self.assertTrue((output / manifest).is_file())
                run("git", "-C", str(self.root.parent), "check-ignore", "--quiet",
                    str(output / manifest))

    def test_default_output_preflight_failure_does_not_create_workspace(self):
        self.output.parent.rmdir()
        for name in ["a.png", "a.jpg"]:
            (self.root / name).write_bytes(b"unused")
        result = subprocess.run(
            ["sh", str(self.script), "--root", str(self.root), "--dry-run"],
            cwd=self.directory, text=True, capture_output=True,
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("collision", result.stderr)
        self.assertFalse(self.output.parent.exists())

    def test_output_cannot_escape_or_clear_workspace(self):
        (self.root / "a.png").write_bytes(b"source")
        workspace = self.output.parent
        keep = workspace / "keep.txt"
        keep.write_text("keep")
        outside = self.directory / "external-output"
        outside.mkdir()
        (outside / "keep.txt").write_text("external")
        for value in ["", ".", "..", "../outside", "batch/..", workspace, outside]:
            with self.subTest(value=value):
                self.process("--dry-run", "--output", value, code=2)
                self.assertEqual(keep.read_text(), "keep")
                self.assertEqual((outside / "keep.txt").read_text(), "external")
                self.assertFalse(self.output.exists())

    def test_relative_output_links_are_rejected_before_parent_normalization(self):
        (self.root / "a.png").write_bytes(b"source")
        workspace = self.output.parent
        external = self.directory / "external"
        external.mkdir()
        (external / "keep.txt").write_text("keep")
        (workspace / "link").symlink_to(external, target_is_directory=True)
        (workspace / "dangling").symlink_to(self.directory / "missing")
        (workspace / "loop").symlink_to(workspace / "loop")
        for value in [
            "link",
            "link/batch",
            "link/../batch",
            "dangling/batch",
            "loop/batch",
        ]:
            with self.subTest(value=value):
                result = self.process("--dry-run", "--output", value, code=2)
                self.assertIn("symlink", result.stderr)
                self.assertEqual((external / "keep.txt").read_text(), "keep")
                self.assertFalse(self.output.exists())

    def test_output_still_rejects_overlap_with_custom_root(self):
        self.root = self.output.parent / "sources"
        self.root.mkdir()
        (self.root / "a.png").write_bytes(b"source")
        self.process("--dry-run", "--output", "sources/staging", code=2)
        self.process("--dry-run", "--root", self.output.parent, code=2)
        self.process("--dry-run", "--root", self.root,
                     "--output", "sources", code=2)
        self.assertEqual((self.root / "a.png").read_bytes(), b"source")

    def test_rejects_symlink_components_before_normalizing_paths(self):
        (self.root / "a.png").write_bytes(b"source")
        target = self.directory / "external"
        (target / "nested").mkdir(parents=True)
        (target / "a.png").write_bytes(b"external source")
        link = self.root / "link"
        link.symlink_to(target, target_is_directory=True)
        dangling = self.root / "dangling"
        dangling.symlink_to(self.directory / "missing")
        loop = self.root / "loop"
        loop.symlink_to(loop)
        self.output.mkdir()
        keep = self.output / "keep.txt"
        keep.write_text("previous output")
        for path in [link, link / "nested", link / "..", dangling,
                     dangling / "child", loop, loop / "child"]:
            for option in ["--root", "--output", "input"]:
                with self.subTest(path=path, option=option):
                    keep.write_text("previous output")
                    args = [path] if option == "input" else [option, path]
                    result = self.process("--dry-run", *args, code=2)
                    self.assertIn("symlink", result.stderr)
                    self.assertEqual(keep.read_text(), "previous output")
                    self.assertTrue(link.is_symlink())
                    self.assertEqual((target / "a.png").read_bytes(), b"external source")
                    self.assertEqual((self.root / "a.png").read_bytes(), b"source")

    def test_rejects_symlinked_default_root_and_ancestors(self):
        repo = self.root.parent
        (self.root / "a.png").write_bytes(b"source")
        (repo / "docs").mkdir()
        (repo / "docs" / "public").mkdir()
        default = repo / "docs" / "public" / "assets"
        default.symlink_to(self.root, target_is_directory=True)
        self.output.mkdir(parents=True)
        keep = self.output / "keep.txt"
        keep.write_text("previous output")
        for ancestor in [False, True]:
            with self.subTest(ancestor=ancestor):
                keep.write_text("previous output")
                if ancestor:
                    default.unlink()
                    default.parent.rmdir()
                    (self.root / "assets").mkdir()
                    (self.root / "assets" / "a.png").write_bytes(b"source")
                    default.parent.symlink_to(self.root, target_is_directory=True)
                result = subprocess.run(
                    ["sh", str(self.script), "--output", str(self.output), "--dry-run"],
                    cwd=self.directory, text=True, capture_output=True,
                )
                self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
                self.assertIn("--root must not contain a symlink", result.stderr)
                self.assertEqual(keep.read_text(), "previous output")

    def test_reference_scan_skips_symlinked_document_ancestors(self):
        run("git", "init", "-q", str(self.root.parent))
        docs = self.root.parent / "docs"
        docs.mkdir()
        (docs / "page.mdx").write_text("a.png\n")
        run("git", "-C", str(self.root.parent), "add", "docs")
        (docs / "page.mdx").unlink()
        docs.rmdir()
        external = self.directory / "external-docs"
        external.mkdir()
        (external / "page.mdx").write_text("a.png external-only-reference\n")
        docs.symlink_to(external, target_is_directory=True)
        (self.root / "a.png").write_bytes(b"source")
        self.process("--dry-run", "--scan-references")
        self.assertEqual(json.loads(self.rows()[0]["reference_candidates"]), [])

    def test_recursion_skips_directory_links_and_normal_parent_paths_work(self):
        (self.root / "nested").mkdir()
        (self.root / "a.png").write_bytes(b"source")
        external = self.directory / "external"
        external.mkdir()
        (external / "outside.png").write_bytes(b"external")
        (self.root / "link").symlink_to(external, target_is_directory=True)
        (self.root / "loop").symlink_to(self.root, target_is_directory=True)
        self.process("--dry-run", self.root / "nested" / "..")
        self.assertEqual([row["source"] for row in self.rows()], ["a.png"])

    def test_output_file_directory_and_manifest_collisions_preserve_previous_output(self):
        self.output.mkdir()
        keep = self.output / "keep.txt"
        keep.write_text("previous output")
        cases = [
            ["photo.png", "photo.webp/nested.png"],
            ["PHOTO.WEBP/nested.png", "photo.png"],
            ["manifest.md/nested.png"],
            ["MANIFEST.TSV/nested.png"],
        ]
        for names in cases:
            with self.subTest(names=names):
                for name in names:
                    file = self.root / name
                    file.parent.mkdir(parents=True, exist_ok=True)
                    file.write_bytes(b"inventory only")
                result = self.process("--dry-run", code=2)
                self.assertIn("collision", result.stderr)
                self.assertEqual(keep.read_text(), "previous output")
                shutil.rmtree(self.root)
                self.root.mkdir()

    def test_concurrent_runs_cannot_clear_active_output(self):
        self.noise(self.root / "photo.png")
        self.output = self.output.parent / "group" / "batch"
        ready = self.directory / "encoder-ready"
        release = self.directory / "encoder-release"
        tools = self.directory / "tools"
        tools.mkdir()
        encoder = tools / "magick"
        encoder.write_text(
            f"#!{sys.executable}\n"
            "from pathlib import Path\nimport time\n"
            f"Path({str(ready)!r}).touch()\n"
            "deadline = time.monotonic() + 15\n"
            f"while not Path({str(release)!r}).exists() and time.monotonic() < deadline:\n"
            "    time.sleep(0.02)\n"
            "raise SystemExit(1)\n"
        )
        encoder.chmod(0o755)
        env = dict(os.environ, PATH=str(tools) + os.pathsep + os.environ["PATH"])
        active = subprocess.Popen(
            ["sh", str(self.script), "--root", str(self.root),
             "--output", str(self.output), "--min-size", "0"],
            cwd=self.directory, env=env, text=True,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
        try:
            deadline = time.monotonic() + 10
            while not ready.exists() and active.poll() is None and time.monotonic() < deadline:
                time.sleep(0.02)
            self.assertTrue(ready.exists(), "encoder did not start")
            manifest = self.output / "manifest.tsv"
            original = manifest.read_bytes()
            for options in [
                ["--output", "group/batch"],
                ["--output", "group"],
                ["--output", "group/batch/nested"],
                [],
            ]:
                result = subprocess.run(
                    ["sh", str(self.script), "--root", str(self.root), "--dry-run", *options],
                    cwd=self.directory, text=True, capture_output=True, timeout=5,
                )
                self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
                self.assertIn("another media helper", result.stderr)
                self.assertEqual(manifest.read_bytes(), original)
        finally:
            release.touch()
            active.communicate(timeout=20)
        # A failed conversion must release the lock so the next run can proceed.
        self.process("--dry-run")

    def test_output_ancestor_is_rechecked_after_reference_lookup(self):
        (self.root / "photo.png").write_bytes(b"inventory only")
        workspace = self.output.parent
        parent = workspace / "group"
        self.output = parent / "batch"
        self.output.mkdir(parents=True)
        external = self.directory / "external"
        (external / "batch").mkdir(parents=True)
        keep = external / "batch" / "keep.txt"
        keep.write_text("external data")
        tools = self.directory / "tools"
        tools.mkdir()
        git = tools / "git"
        git.write_text(
            f"#!{sys.executable}\n"
            "from pathlib import Path\nimport subprocess\nimport sys\n"
            "if 'ls-files' in sys.argv:\n"
            f"    Path({str(parent)!r}).rename({str(workspace / 'previous-group')!r})\n"
            f"    Path({str(parent)!r}).symlink_to({str(external)!r}, target_is_directory=True)\n"
            f"raise SystemExit(subprocess.call([{shutil.which('git')!r}, *sys.argv[1:]]))\n"
        )
        git.chmod(0o755)
        result = subprocess.run(
            ["sh", str(self.script), "--root", str(self.root),
             "--output", str(self.output), "--dry-run", "--scan-references"],
            cwd=self.directory, text=True, capture_output=True,
            env=dict(os.environ, PATH=str(tools) + os.pathsep + os.environ["PATH"]),
        )
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertIn("symlink", result.stderr)
        self.assertEqual(keep.read_text(), "external data")

    def test_rejects_symlinks_and_inputs_outside_root(self):
        external = self.directory / "outside.png"
        external.write_bytes(b"unused")
        self.assertIn("outside --root", self.process("--dry-run", external, code=2).stderr)
        (self.root / "linked.png").symlink_to(external)
        self.assertIn("symlink", self.process("--dry-run", code=2).stderr)
        self.assertFalse(self.output.exists())

    def test_failed_decode_cleans_partial_output_and_continues(self):
        (self.root / "broken.gif").write_bytes(b"not an image")
        self.noise(self.root / "good.jpg")
        self.process("--min-size", "0", code=1)
        rows = {r["source"]: r for r in self.rows()}
        self.assertEqual(rows["broken.gif"]["status"], "failed")
        self.assertTrue(rows["broken.gif"]["note"])
        self.assertEqual(rows["good.jpg"]["status"], "converted")
        self.assertFalse((self.output / "broken.webm").exists())
        self.assertFalse(list(self.output.glob(".media-*")))

    def test_no_benefit_output_is_not_kept(self):
        run("magick", "-size", "1x1", "xc:red", str(self.root / "tiny.gif"))
        self.process("--min-size", "0")
        self.assertEqual(self.rows()[0]["status"], "no-benefit")
        self.assertFalse((self.output / "tiny.webm").exists())

    def test_transparent_gif_is_not_silently_flattened(self):
        self.gif(self.root / "transparent.gif", transparent=True)
        self.process("--min-size", "0", code=1)
        self.assertIn("transparent GIF", self.rows()[0]["note"])
        self.assertFalse((self.output / "transparent.webm").exists())

    def test_invalid_options_fail_before_writing(self):
        for args in [("--min-size", "1MB"), ("--min-size", "-1"), ("--webp-quality", "101"), ("--webm-crf", "64")]:
            with self.subTest(args=args):
                self.process(*args, code=2)
                self.assertFalse(self.output.exists())


unittest.main(verbosity=2)

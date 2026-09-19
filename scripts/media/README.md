# Media tools

Convert large documentation images for CDN upload, and prevent new oversized
media from entering the repository. Related work: [#1524](https://github.com/lynx-family/lynx-website/issues/1524).

## 1. Install tools

On macOS:

```sh
brew install python ffmpeg imagemagick
```

Requires macOS or Linux, Python 3.8+, FFmpeg 6+ with `libvpx-vp9` and `ffprobe`,
and ImageMagick 7 with WebP support. Python uses only the standard library;
no `pip install` is needed. Git is required only for `--scan-references`
and the integration tests.

## 2. Convert one file

Enter the tool directory from the repository root. The following examples run here:

```sh
cd scripts/media
./process-doc-media.sh docs/public/assets/list-oss-zIndex.gif
```

The helper prints a fresh `output/run-*/` directory: `manifest.md` is the readable summary and
`manifest.tsv` is the spreadsheet-friendly data. `list-oss-zIndex.webm` is kept
only if conversion succeeds and produces a smaller file.

- GIF → WebM; PNG/JPG/JPEG → WebP.
- Dimensions and basenames stay the same; only extensions change.
- Files smaller than **100 KiB** are skipped. Add `--min-size 0` to process smaller files.
- Source files stay untouched. Uploading and updating documentation are manual steps.

**Output stays in `scripts/media/output/`, ignored by `scripts/media/.gitignore`.**
Omit `--output` to create a fresh `output/run-*/` directory and keep earlier runs.
Use `--output list` for `scripts/media/output/list/`, regardless of where you run
the command. Reusing that value clears only the selected task directory.
The workspace itself cannot be selected for cleanup, and paths outside it are rejected.
Only one helper run can write to the workspace at a time, including dry runs.
If another run is active, the helper exits with a retry message. The lock is
released automatically when the process exits.

Write input paths from the **repository root**, such as `docs/public/assets/...`.
The helper locates the repository from its own script location, so no `../../`
or local repository prefix is needed. Relative `--root` paths use the same rule.
Absolute input and root paths also work. For files outside the default `docs/public/assets` root,
set `--root` too:

```sh
./process-doc-media.sh --root /absolute/path/to/assets --output external /absolute/path/to/assets/photo.png
```

## 3. Convert a directory

```sh
./process-doc-media.sh --output lynxtron docs/public/assets/lynxtron
```

The helper searches recursively and preserves descendants of the input directory.
For example, `lynxtron/browser_demo_control.gif` becomes
`output/lynxtron/browser_demo_control.webm`.

To preserve the full directory structure beneath `assets`, use it as the input:

```sh
./process-doc-media.sh --output assets docs/public/assets
```

This produces `output/assets/lynxtron/browser_demo_control.webm`.

To list candidates without converting anything:

```sh
./process-doc-media.sh --output lynxtron --dry-run docs/public/assets/lynxtron
```

A dry run also clears the selected output directory, then writes only
`manifest.md` and `manifest.tsv`. It reports candidate count and total source
size without running encoders. Remove `--dry-run` to process candidates and
calculate saved bytes in the same directory.

Reference scanning is off by default, so processing media does not require Git.
To include candidate documentation references in the manifests:

```sh
./process-doc-media.sh --output lynxtron --dry-run --scan-references docs/public/assets/lynxtron
```

The scan searches Git-tracked files under `docs/`, `sharedDocs/`, `src/`, and
`theme/` in the repository containing `--root`. Inherited `GIT_*` variables are
ignored. A root outside a Git repository yields no candidates. Missing Git or
a file-listing error stops an explicitly requested scan before output cleanup.

## 4. Check results and upload

Open `manifest.md` in the IDE for the readable table. `manifest.tsv` contains
the same data for spreadsheets and scripts. Both list input/output paths, bytes
saved, candidate documentation references when requested, and any errors.
With scanning disabled, `reference_candidates` stays `[]` in the TSV and
`manifest.md` notes that the scan was disabled.

| Status            | Meaning                                                 |
| ----------------- | ------------------------------------------------------- |
| `converted`       | Smaller output is ready to review                       |
| `below-threshold` | Input is smaller than `--min-size`                      |
| `candidate`       | Dry run; meets `--min-size` and would be processed      |
| `no-benefit`      | Encoded file was not smaller; output discarded          |
| `failed`          | Read the `note` column; other files continue processing |

`note` records the per-file reason for a `failed` row, such as unsupported
transparency, an invalid image, animated PNG, EXIF rotation, or encoder
validation failure. It is empty for successful, skipped, and no-benefit rows.

Only `converted` rows have output media. Reference candidates are filename
matches, so check the actual consumers before replacing or removing assets.

1. Compare the originals and outputs, especially text, colors, and animation.
2. Upload approved files to the documentation CDN.
3. Update both language versions of the docs. WebM needs a video-capable component;
   preserve accessible descriptions and choose appropriate playback/reduced-motion behavior.
4. Check the pages and run `pnpm run build` before removing unused originals.

Transparent GIFs, animated PNGs, and images requiring EXIF rotation need manual
preparation. WebM contains one GIF cycle; looping must be set in the consuming component.

## Recommended media formats

| Content                              | Recommended format                       | Notes                                                                     |
| ------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------- |
| Photos                               | WebP; JPEG when the consumer requires it | PNG → JPEG is useful for opaque photos; JPEG cannot preserve transparency |
| UI screenshots and text-heavy images | Lossless WebP or PNG                     | Keep small text and sharp edges clear; review lossy output carefully      |
| Images with transparency             | WebP or PNG                              | Both support alpha; JPEG needs an explicit background                     |
| Icons, logos, and vector diagrams    | SVG                                      | Use a compact vector original when available                              |
| Screen recordings and animated demos | WebM; MP4 when required by the consumer  | Use video playback; avoid large GIFs                                      |

The helper produces **lossy WebP** (with lossless alpha) and **WebM**.
For a photo that specifically needs JPEG, convert it manually with ImageMagick
(run from `scripts/media`, choose a fresh output directory):

```sh
mkdir -p output
mkdir output/jpeg
magick /absolute/path/to/photo.png -background white -alpha remove -alpha off -colorspace sRGB -strip -quality 85 output/jpeg/photo.jpg
```

This replaces any transparency with white. For pixel-exact screenshots, use
`magick input.png -define webp:lossless=true output/screenshot.webp` instead, with your own
input and output paths. Compare quality and file size before using either result.
The helper's **100 KiB** threshold selects optimization candidates; it does not
guarantee an output below the CI **200 KiB** per-file limit.

## Options

```sh
./process-doc-media.sh --help
```

| Argument            | Default                           | Purpose                                                                                                       |
| ------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `--output DIR`      | Fresh `output/run-*/` directory   | Relative to `scripts/media/output/`; explicit task directories are cleared on rerun                           |
| `INPUT ...`         | Entire root                       | One or more files/directories, absolute or relative to the repository root                                    |
| `--root DIR`        | Repository's `docs/public/assets` | Input boundary, absolute or repository-relative                                                               |
| `--min-size SIZE`   | `100KiB`                          | Process files at or above this size; bare numbers are bytes, or use `B`, `KiB`, `MiB`, `GiB`; `0` selects all |
| `--dry-run`         | Off                               | List candidates and total source size without encoding; retain manifests only                                 |
| `--scan-references` | Off                               | Include filename-based reference candidates from Git-tracked documentation; requires Git                      |
| `--webp-quality N`  | `82`                              | Range 1–100; higher improves quality, usually increases size                                                  |
| `--webm-crf N`      | `30`                              | Range 0–63; lower improves quality, usually increases size                                                    |

Sizes accept integer bytes or `B`, `KiB`, `MiB`, `GiB`. Inputs must be inside
`--root`; output must neither be inside nor contain it. Output paths are relative
to each input: directory inputs retain descendants, and file inputs use the filename.
Path, input, and dependency checks run before cleanup. `--root` (including its
default), explicit inputs, and `--output` must not contain symlinks in any path
component, even before `..`. Use the real paths instead. Recursive scanning skips
symlink directories and rejects symlink media files; reference lookup skips
documents reached through symlinks. Cleanup removes links inside the selected
output directory without following their targets.
Absolute output paths are accepted only within `scripts/media/output/`.
Output directories inside or containing nested Git repositories are rejected.
Conflicting output names, such as `demo.png` and `demo.jpg`, must be resolved
before running. Preflight also rejects file/directory conflicts such as
`demo.png` alongside `demo.webp/nested.png`, and directories that would occupy
`manifest.md` or `manifest.tsv`.

Exit codes: `0` completed, `1` some files failed, `2` setup/argument error,
`130` interrupted.

## CI media budget

`check-budget.mjs` runs automatically in PR and merge-queue CI; no routine local
command is required. It checks media across the repository:

- Warn above **100 KiB** per new blob.
- Fail above **200 KiB** per new blob or **1 MiB** total.
- Exact boundary values pass. Unchanged legacy content and reused base blobs are
  excluded; identical new content counts once. Replacements count their full size,
  and deletion gives no budget credit.

CI compares the synthetic merge commit with its first parent (`HEAD^1 HEAD`),
using checkout depth 2. Merge queues share the total budget across the group.
Push events skip enforcement successfully; `Done` requires the media job.
To reproduce from the repository root: `node scripts/media/check-budget.mjs <base-ref> <head-ref>`.
Exit codes: `0` passes, `1` exceeds budget, `2` Git/configuration error.

### Request an exception

Optimize or use the CDN first. If exact content must remain in the repository,
add an entry to `budget-allowlist.json` for owner review:

```json
[
  {
    "path": "docs/public/assets/required-fixture.pdf",
    "blobOid": "<full Git blob OID>",
    "reason": "Why this file must remain repository-local",
    "issue": "https://github.com/lynx-family/lynx-website/issues/1524"
  }
]
```

After committing the asset, obtain its content ID with:

```sh
git rev-parse 'HEAD:docs/public/assets/required-fixture.pdf'
```

Replace the placeholder with that output. Each exception binds one exact path
and content to a rationale and HTTPS issue/decision URL. CI reads the committed
allowlist, reports exceptions, and rejects malformed, duplicate, or stale entries.
Replacing content requires a new review; deleting the file requires removing its entry.
An unapproved duplicate path still counts. There is no directory or PR-label bypass.

## Maintaining these tools

The `.sh` files launch the corresponding `.py` implementations. The helper
never uploads, edits docs, deletes sources, or changes the allowlist.
It and its integration tests run manually, outside CI, `prepare`, and `build`.

```sh
# Run from scripts/media.
# Budget tests (also run in CI).
node --test check-budget.test.mjs

# Real conversion tests (local, with the tools installed above).
./process-doc-media.test.sh
```

# Lynx Living Specification

This package contains the Lynx Living Specification, which is the authoritative technical specification for the Lynx project. The specification is written in Bikeshed format and automatically generated into HTML documentation.

## Getting Started

1. Install pipx

Install `pipx` if you haven't already:

```bash
brew install pipx
```

2. Generate HTML Documentation

Run the following command to generate the HTML documentation from the Bikeshed source files:

```bash
pnpm gen:living-spec
```

This command runs the Bikeshed version pinned by
`scripts/lynx-living-spec.js` and generates the HTML documentation in the
`docs/public/living-spec` directory. Commit the generated
`docs/public/living-spec/index.html` together with changes to the `.bs` source
files, and update the `Date` metadata in `src/index.bs` when publishing source
changes.

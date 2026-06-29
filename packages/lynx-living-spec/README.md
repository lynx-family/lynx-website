# Lynx Living Specification

This package contains the Lynx Living Specification, which is the authoritative technical specification for the Lynx project. The specification is written in Bikeshed format and automatically generated into HTML documentation.

## Getting Started

1. Install Bikeshed

First, install `pipx` if you haven't already:

```bash
brew install pipx
pipx install bikeshed
```

2. Generate HTML Documentation

Run the following command to generate the HTML documentation from the Bikeshed source files:

```bash
pnpm gen:living-spec
```

This command will generate the HTML documentation in the `docs/public/living-spec` directory.

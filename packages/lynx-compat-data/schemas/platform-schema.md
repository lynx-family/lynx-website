# The platform JSON schema

This document helps you to understand the structure of the platform data in LCD, including the platform type, a display-friendly name, release data and more. Each platform is defined by a unique identifier (e.g. `ios`)

## JSON Structure

```json
{
  "platforms": {
    "ios": {
      "name": "iOS",
      "type": "native",
      "releases": {
        "2.4": {
          "release_date": "2021-07-06",
          "release_notes": "https://example.com/release_note",
          "status": "retired"
        },
        "2.13": {
          "release_date": "2022-08-15",
          "release_notes": "https://example.com/release_note",
          "status": "release"
        }
      }
    }
  }
}
```

## Properties

See `platform.schema.json` for more details.

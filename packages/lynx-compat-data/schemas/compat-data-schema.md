# The compat data JSON schema

This document helps you to understand how compatibility data is organized and structured.

## Understanding the JSON schema

```json
{
  "css": {
    "properties": {
      "align-self": {
        "__compat": {},
        "start": {
          "__compat": {}
        },
        "end": {
          "__compat": {}
        }
      }
    }
  }
}
```

Each feature is uniquely accessible, independently of the file it is defined in.

The hierarchy of identifiers is not defined by the schema and is a convention of the project using the schema.

## The `__compat` object

In Lynx Compatibility Data (LCD), every feature is defined using a `__compat` object, which contains information such as an optional description of the feature, a link to the associated Lynx documentation, status information, and the platform support.

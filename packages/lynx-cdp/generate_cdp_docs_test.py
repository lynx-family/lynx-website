#!/usr/bin/env python3
# Copyright 2026 The Lynx Authors. All rights reserved.
# Licensed under the Apache License Version 2.0 that can be found in the
# LICENSE file in the root directory of this source tree.

import unittest
from pathlib import Path

import yaml

from generate_cdp_docs import DocsError, validate_custom_doc, render_events


class EventDocsTest(unittest.TestCase):
    def test_structured_and_existing_events(self):
        doc = yaml.safe_load(
            """\
summary: Enables change events.
events:
  - Legacy.changed
  - name: GlobalProps.changed
    description: Emitted when values change.
  - name: Example.ready
"""
        )
        validate_custom_doc(Path("enable.yaml"), doc)
        self.assertEqual(
            render_events(doc["events"]),
            [
                "###### Events",
                "",
                "- Legacy.changed",
                "- `GlobalProps.changed`: Emitted when values change.",
                "- `Example.ready`",
                "",
            ],
        )

    def test_absent_or_empty_events(self):
        for events in (None, []):
            with self.subTest(events=events):
                validate_custom_doc(
                    Path("enable.yaml"), {"summary": "Enables events.", "events": events}
                )
                self.assertEqual(render_events(events), [])

    def test_invalid_events(self):
        cases = [
            ({"name": "Example.changed"}, "events must be a list"),
            ([42], "events[0] must be a mapping or a string"),
            ([{}], "events[0].name must be a non-empty string"),
            ([{"name": " "}], "events[0].name must be a non-empty string"),
            ([{"name": 42}], "events[0].name must be a non-empty string"),
            (
                [{"name": "Example.changed", "description": None}],
                "events[0].description must be a string",
            ),
            (
                [{"name": "Example.changed", "description": {"text": "Changed"}}],
                "events[0].description must be a string",
            ),
        ]
        for events, message in cases:
            with self.subTest(events=events):
                with self.assertRaises(DocsError) as error:
                    validate_custom_doc(
                        Path("enable.yaml"),
                        {"summary": "Enables events.", "events": events},
                    )
                self.assertIn(message, str(error.exception))


if __name__ == "__main__":
    unittest.main()

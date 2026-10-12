#!/usr/bin/env python3
"""Static interface, offline-resource, and overlay structure checks."""

from __future__ import annotations

import json
import struct
from html.parser import HTMLParser
from pathlib import Path


PROJECT = Path(__file__).resolve().parents[1]
DIST = PROJECT / "dist"


class Inspector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: set[str] = set()
        self.resources: list[tuple[str, str]] = []
        self.inputs: list[dict[str, str | None]] = []
        self.labels_for: set[str] = set()
        self.svg_viewboxes: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.add(str(values["id"]))
        if tag in {"script", "img", "link", "a"}:
            target = values.get("src") or values.get("href")
            if target:
                self.resources.append((tag, str(target)))
        if tag == "input":
            self.inputs.append(values)
        if tag == "label" and values.get("for"):
            self.labels_for.add(str(values["for"]))
        if tag == "svg" and values.get("viewbox"):
            self.svg_viewboxes.append(str(values["viewbox"]))


def inspect_html(path: Path) -> Inspector:
    parser = Inspector()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


def png_dimensions(path: Path) -> tuple[int, int]:
    with path.open("rb") as stream:
        signature = stream.read(8)
        if signature != b"\x89PNG\r\n\x1a\n":
            raise ValueError("not a PNG")
        length = struct.unpack(">I", stream.read(4))[0]
        chunk_type = stream.read(4)
        if chunk_type != b"IHDR" or length < 8:
            raise ValueError("missing PNG IHDR")
        width, height = struct.unpack(">II", stream.read(8))
        return width, height


checks: list[dict[str, str]] = []


def record(check_id: str, passed: bool, detail: str) -> None:
    checks.append({"Check_ID": check_id, "Disposition": "PASS" if passed else "FAIL", "Detail": detail})


index = inspect_html(DIST / "index.html")
qa = inspect_html(DIST / "qa.html")

required_ids = {
    "calculator-form",
    "traffic-input",
    "cbr-input",
    "clear-button",
    "result-value",
    "status-pill",
    "chart-stage",
    "chart-overlay",
    "construction-lines",
    "toggle-overlay",
}
missing_ids = sorted(required_ids - index.ids)
record("APP_UI_001", not missing_ids, f"required calculator/overlay IDs present; missing={missing_ids}")

input_ids = {str(item.get("id")) for item in index.inputs}
record(
    "APP_UI_002",
    {"traffic-input", "cbr-input"}.issubset(input_ids) and {"traffic-input", "cbr-input"}.issubset(index.labels_for),
    "both project inputs have explicit labels",
)

project_inputs = [item for item in index.inputs if item.get("id") in {"traffic-input", "cbr-input"}]
defaults = [item.get("value") for item in project_inputs if item.get("value") not in {None, ""}]
record("APP_UI_003", not defaults and len(project_inputs) == 2, f"two blank project inputs; nonblank defaults={defaults}")

external = []
missing_resources = []
for html_path, inspector in ((DIST / "index.html", index), (DIST / "qa.html", qa)):
    for tag, target in inspector.resources:
        if target.startswith(("data:", "#")):
            continue
        if target.startswith(("http://", "https://", "//")):
            external.append(f"{html_path.name}:{tag}:{target}")
            continue
        if target.endswith(".html") and tag == "a":
            candidate = DIST / target
        elif tag == "a" and target.startswith("assets/"):
            candidate = DIST / target
        elif tag in {"script", "img", "link"}:
            candidate = DIST / target
        else:
            continue
        if not candidate.exists():
            missing_resources.append(str(candidate.relative_to(PROJECT)))
record("APP_OFFLINE_001", not external and not missing_resources, f"external={external}; missing={missing_resources}")

record("APP_OVERLAY_002", "0 0 861 512" in index.svg_viewboxes, f"overlay viewBoxes={index.svg_viewboxes}")

display_path = DIST / "assets" / "rn29-figure6-display.png"
dimensions = png_dimensions(display_path)
record("APP_ASSET_002", dimensions == (861, 512), f"registered display dimensions={dimensions[0]}x{dimensions[1]}")

css = (DIST / "styles.css").read_text(encoding="utf-8")
record(
    "APP_RESPONSIVE_001",
    "@media (max-width: 1050px)" in css and "@media (max-width: 720px)" in css and "overflow: auto" in css,
    "desktop, tablet, mobile, and chart-overflow rules present",
)

app_js = (DIST / "app.js").read_text(encoding="utf-8")
record(
    "APP_WEBMCP_001",
    "document.modelContext" in app_js and "calculate_subbase_thickness" in app_js and "registerTool" in app_js,
    "feature-detected WebMCP calculator tool is registered when supported",
)

record(
    "APP_QA_UI_001",
    {"qa-score-value", "qa-results-body", "rerun-tests"}.issubset(qa.ids),
    "browser QA page includes score, case table, and rerun control",
)

counts = {
    "Executed": len(checks),
    "Passed": sum(item["Disposition"] == "PASS" for item in checks),
    "Failed": sum(item["Disposition"] == "FAIL" for item in checks),
}
report = {
    "Verification_Type": "STATIC_BROWSER_INTERFACE_AND_OVERLAY_STRUCTURE",
    "Counts": counts,
    "Checks": checks,
}
(PROJECT / "tests" / "static-validation-report.json").write_text(
    json.dumps(report, indent=2) + "\n", encoding="utf-8"
)
print(json.dumps(report, indent=2))
raise SystemExit(1 if counts["Failed"] else 0)

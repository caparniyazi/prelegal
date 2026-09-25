"""Check that templates/catalog.json and the template files agree.

Every template listed in the catalog must exist, every {{placeholder}} in a
template must be declared as a field, and every declared field must be used.
Optional fields must have a default so a document can always be rendered.

Usage: python scripts/validate_templates.py
"""

import json
import re
import sys
from pathlib import Path

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
PLACEHOLDER = re.compile(r"\{\{\s*([a-z][a-z0-9_]*)\s*\}\}")


def validate() -> list[str]:
    catalog = json.loads((TEMPLATES_DIR / "catalog.json").read_text(encoding="utf-8"))
    field_types = set(catalog["field_types"])
    errors = []
    seen_ids = set()

    for entry in catalog["templates"]:
        tid = entry["id"]
        if tid in seen_ids:
            errors.append(f"{tid}: duplicate template id")
        seen_ids.add(tid)

        path = TEMPLATES_DIR / entry["file"]
        if not path.is_file():
            errors.append(f"{tid}: missing template file {entry['file']}")
            continue

        text = path.read_text(encoding="utf-8")
        used = set(PLACEHOLDER.findall(text))
        if "{{" in PLACEHOLDER.sub("", text):
            errors.append(f"{tid}: malformed placeholder in {entry['file']}")

        declared = set()
        for field in entry["fields"]:
            name = field["name"]
            if name in declared:
                errors.append(f"{tid}: duplicate field {name}")
            declared.add(name)
            if field["type"] not in field_types:
                errors.append(f"{tid}: field {name} has unknown type {field['type']}")
            if not field["required"] and "default" not in field:
                errors.append(f"{tid}: optional field {name} has no default")

        for name in sorted(used - declared):
            errors.append(f"{tid}: placeholder {{{{{name}}}}} is not declared in catalog")
        for name in sorted(declared - used):
            errors.append(f"{tid}: field {name} is declared but never used")

    listed = {entry["file"] for entry in catalog["templates"]}
    for path in sorted(TEMPLATES_DIR.glob("*.md")):
        if path.name not in listed:
            errors.append(f"{path.name}: template file is not listed in catalog")

    return errors


if __name__ == "__main__":
    problems = validate()
    for problem in problems:
        print(problem)
    if problems:
        sys.exit(1)
    print("All templates valid.")

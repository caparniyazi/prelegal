# prelegal

A platform for drafting common legal agreements.

## Status

**In Progress** — expected completion in 1 week (by 2026-09-29). Setup and usage instructions will be added as the codebase takes shape.

## Legal Document Templates

The `templates/` directory holds the dataset of legal document templates that the platform fills in and adapts for users.

- Each template is a Markdown file whose variable parts are written as `{{field_name}}` placeholders.
- `templates/catalog.json` lists every template with its id, title, category, and description, plus a definition of each field: label, type (`string`, `text`, `date`, `integer`, `number`, `money`, `address`), whether it is required, and an example or default value.
- Every optional field has a default, so a document can always be fully rendered.

Current templates: Mutual NDA, One-Way NDA, Independent Contractor Agreement, Consulting Services Agreement, Employment Offer Letter, and Promissory Note.

To check that the catalog and template files agree (every placeholder declared, every declared field used, no missing or unlisted files), run:

```
python scripts/validate_templates.py
```

## Mutual NDA Creator (Prototype)

The `frontend/` directory contains a Next.js app. Users fill in a form, see the Mutual NDA from the template dataset update as they type, and download the completed agreement as a PDF. See [`frontend/README.md`](frontend/README.md) for setup.

> These templates are general starting points and are not legal advice. Have a qualified attorney review them for your jurisdiction and circumstances.

## License  

This project is licensed under the [MIT License](LICENSE).

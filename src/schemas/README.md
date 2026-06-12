# SBOM validation schemas

These schemas are bundled into the API validator so SBOM validation is offline-only in production.

- `cyclonedx-1.4.schema.json` through `cyclonedx-1.7.schema.json`, plus the CycloneDX auxiliary SPDX license, JSF, and cryptography definition schemas, were vendored from `@cyclonedx/cyclonedx-library@10.0.0` before removing that runtime dependency.
- `spdx-2.2.schema.json` was downloaded from the SPDX spec `v2.2.1` tag and is used for `SPDX-2.2` documents.
- `spdx-2.3.schema.json` was downloaded from the SPDX spec `v2.3` tag.
- `spdx-3.0.1.schema.json` was downloaded from `https://spdx.org/schema/3.0.1/spdx-json-schema.json`.

Local normalization:

- The generated SPDX 3.0.1 schema contained duplicate JSON object keys for `Element_props.properties.extension` and `$defs.prop_Element_extension`. The duplicate entries were identical, so one copy of each was removed to keep Bun's production bundle warning-free without changing validation behavior.

When updating these files, run the API validator tests and the API production bundle check.

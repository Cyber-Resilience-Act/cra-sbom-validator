# CRA SBOM Validator

Offline CycloneDX and SPDX JSON SBOM validator extracted from CRA Direct.

This validator checks whether an SBOM conforms to supported CycloneDX or SPDX JSON schemas. It does not determine whether the SBOM is complete, whether the product is CRA compliant, or whether vulnerabilities are reportable under Article 14.

> Independent project notice: this repository is maintained by CRA Direct. It is not affiliated with, endorsed by, or operated by the European Union, ENISA, any CSIRT, or any market surveillance authority.

## Supported Formats

- CycloneDX 1.4
- CycloneDX 1.5
- CycloneDX 1.6
- CycloneDX 1.7
- SPDX 2.2 JSON
- SPDX 2.3 JSON
- SPDX 3.0.1 JSON-LD

## CLI

```bash
bun install
bun ./src/cli.ts ./sbom.json
bun ./src/cli.ts ./sbom.json --json
bun ./src/cli.ts ./sbom.json --pretty --max-errors 20
```

Exit codes:

- `0`: valid
- `1`: invalid
- `2`: runtime error or file not found

## Library

```ts
import { SbomValidator } from "@cyber-resilience-act/sbom-validator";

const result = await new SbomValidator().validateFile("./sbom.json");
console.log(result.valid, result.format, result.version, result.errors);
```

## Offline Schema Policy

The validator uses bundled schemas only. Remote schema loading is disabled so CI pipelines and local checks behave consistently without network access.

## What This Validator Does

- detects supported CycloneDX and SPDX JSON formats
- validates against bundled schemas
- reports structured validation errors
- works offline in local development and CI
- exits with clear CLI status codes

## What It Does Not Do

- prove that an SBOM is complete
- prove that a product is CRA-ready
- determine whether a vulnerability is reportable
- retain evidence or create audit trails
- replace product-specific affectedness review

## Relationship To CRA Direct

CRA Direct uses SBOM validation as one step in a larger CRA operations workflow. The hosted product adds persistent evidence storage, product/version records, vulnerability intelligence, VEX review, Article 14 workflow management, notifications, and verifiable audit trails.

## Commercial Support

Need SBOM evidence retention, continuous vulnerability monitoring, and CRA Article 14 workflows? CRA Direct is available as a hosted SaaS and consulting service.

Contact: contact@cra-direct.fr

import { describe, expect, it } from "bun:test";
import { SbomValidator } from "../src/validator";

const validator = new SbomValidator();

const validCycloneDx = {
  bomFormat: "CycloneDX",
  specVersion: "1.6",
  metadata: {
    timestamp: "2024-01-01T00:00:00Z",
    component: {
      type: "application",
      name: "demo-product",
      version: "1.0.0",
    },
  },
  components: [
    {
      type: "library",
      name: "ajv",
      version: "8.17.1",
      purl: "pkg:npm/ajv@8.17.1",
    },
  ],
};

const validSpdx23 = {
  spdxVersion: "SPDX-2.3",
  dataLicense: "CC0-1.0",
  SPDXID: "SPDXRef-DOCUMENT",
  name: "demo-product",
  documentNamespace: "https://example.com/spdx/demo-product-1.0.0",
  creationInfo: {
    created: "2024-01-01T00:00:00Z",
    creators: ["Tool: cra-sbom-validator-tests"],
  },
  packages: [
    {
      SPDXID: "SPDXRef-Package-ajv",
      name: "ajv",
      versionInfo: "8.17.1",
      downloadLocation: "NOASSERTION",
      externalRefs: [
        {
          referenceCategory: "PACKAGE-MANAGER",
          referenceType: "purl",
          referenceLocator: "pkg:npm/ajv@8.17.1",
        },
      ],
    },
  ],
};

describe("SbomValidator", () => {
  it("validates CycloneDX JSON", async () => {
    const result = await validator.validateFile("test/fixtures/cyclonedx-valid.json");
    expect(result).toMatchObject({ valid: true, format: "CycloneDX", version: "1.6", errors: [] });
  });

  it("validates SPDX 2.3 JSON", async () => {
    const result = await validator.validateFile("test/fixtures/spdx-valid.json");
    expect(result).toMatchObject({ valid: true, format: "SPDX", version: "SPDX-2.3", errors: [] });
  });

  it("rejects invalid JSON", async () => {
    const result = await validator.validateJsonString("{not valid");
    expect(result).toMatchObject({ valid: false, format: "Unknown", version: "N/A" });
  });

  it("rejects unsupported versions", async () => {
    const result = await validator.validateObject({ bomFormat: "CycloneDX", specVersion: "1.3" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.message).toContain("Unsupported version");
  });

  it("returns structured schema errors", async () => {
    const result = await validator.validateObject({ ...validCycloneDx, unexpected: true });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      path: "/unexpected",
      message: 'Unexpected property "unexpected".',
    }));
  });
});

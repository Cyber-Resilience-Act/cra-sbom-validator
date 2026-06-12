export const SPDX_3_0_1_CONTEXT = "https://spdx.org/rdf/3.0.1/spdx-context.jsonld";
export const SPDX_3_0_1_SCHEMA_VERSION = "SPDX-3.0.1";

export type SbomFormat = "SPDX" | "CycloneDX";
export type JsonRecord = Record<string, unknown>;

export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasSpdx301Context(value: unknown): boolean {
  if (value === SPDX_3_0_1_CONTEXT) return true;
  return Array.isArray(value) && value.includes(SPDX_3_0_1_CONTEXT);
}

export function detectFormat(data: JsonRecord): {
  format: SbomFormat | "Unknown";
  version: string;
} {
  if (data.bomFormat === "CycloneDX") {
    return {
      format: "CycloneDX",
      version: typeof data.specVersion === "string" ? data.specVersion : "",
    };
  }

  if (hasSpdx301Context(data["@context"])) {
    return { format: "SPDX", version: SPDX_3_0_1_SCHEMA_VERSION };
  }

  if (typeof data.spdxVersion === "string") {
    return { format: "SPDX", version: data.spdxVersion.toUpperCase() };
  }

  return { format: "Unknown", version: "" };
}


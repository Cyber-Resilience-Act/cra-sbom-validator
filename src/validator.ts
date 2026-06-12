import AjvDraft7, { type AnySchema, type ErrorObject, type Options, type ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { detectFormat, isJsonRecord, SPDX_3_0_1_SCHEMA_VERSION, type SbomFormat } from "./format-detection";
import type { ValidationError, ValidationResult, ValidatorOptions } from "./errors";

type SchemaCacheKey = `${SbomFormat}:${string}`;

const AJV_OPTIONS: Options = {
  allErrors: true,
  strict: false,
  strictSchema: false,
  verbose: true,
  addUsedSchema: false,
  loadSchema: (uri) => {
    throw new Error(`Remote schema loading is disabled: ${uri}`);
  },
};

const SCHEMA_FILES: Record<SchemaCacheKey, string> = {
  "CycloneDX:1.4": "cyclonedx-1.4.schema.json",
  "CycloneDX:1.5": "cyclonedx-1.5.schema.json",
  "CycloneDX:1.6": "cyclonedx-1.6.schema.json",
  "CycloneDX:1.7": "cyclonedx-1.7.schema.json",
  "SPDX:SPDX-2.2": "spdx-2.2.schema.json",
  "SPDX:SPDX-2.3": "spdx-2.3.schema.json",
  "SPDX:SPDX-3.0.1": "spdx-3.0.1.schema.json",
};

function cloneSchema(schema: AnySchema): AnySchema {
  return structuredClone(schema) as AnySchema;
}

async function readSchema(fileName: string): Promise<AnySchema> {
  const url = new URL(`./schemas/${fileName}`, import.meta.url);
  return await Bun.file(url).json() as AnySchema;
}

export class SbomValidator {
  private readonly ajv7: AjvDraft7;
  private readonly ajv2020: Ajv2020;
  private readonly compiledCache = new Map<SchemaCacheKey, ValidateFunction>();
  private readonly schemaCache = new Map<SchemaCacheKey, AnySchema>();
  private readonly supportedVersions: Record<SbomFormat, readonly string[]> = {
    CycloneDX: ["1.4", "1.5", "1.6", "1.7"],
    SPDX: ["SPDX-2.2", "SPDX-2.3", SPDX_3_0_1_SCHEMA_VERSION],
  };

  constructor(options: ValidatorOptions = {}) {
    if (options.offlineMode === false) {
      throw new Error("SbomValidator is intentionally offline-only; schemas are bundled.");
    }

    this.ajv7 = new AjvDraft7(AJV_OPTIONS);
    this.ajv2020 = new Ajv2020(AJV_OPTIONS);

    this.configureAjv(this.ajv7);
    this.configureAjv(this.ajv2020);
  }

  public async validate(input: string | Record<string, unknown>): Promise<ValidationResult> {
    if (typeof input === "string") return this.validateFile(input);
    return this.validateObject(input);
  }

  public async validateJsonString(jsonString: string): Promise<ValidationResult> {
    let data: unknown;

    try {
      data = JSON.parse(jsonString);
    } catch {
      return {
        valid: false,
        format: "Unknown",
        version: "N/A",
        errors: [{ path: "JSON", message: "Invalid JSON format" }],
      };
    }

    return this.validateObject(data);
  }

  public async validateFile(filePath: string): Promise<ValidationResult> {
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      throw new Error(`Target file does not exist at path: "${filePath}"`);
    }

    return this.validateJsonString(await file.text());
  }

  public async validateObject(data: unknown): Promise<ValidationResult> {
    if (!isJsonRecord(data)) {
      return {
        valid: false,
        format: "Unknown",
        version: "N/A",
        errors: [{ path: "/", message: "SBOM document must be a JSON object." }],
      };
    }

    const meta = detectFormat(data);
    if (meta.format === "Unknown") {
      return {
        valid: false,
        format: "Unknown",
        version: "N/A",
        errors: [{
          path: "/",
          message: "Document missing identifying markers for CycloneDX or SPDX profiles.",
        }],
      };
    }

    if (!this.supportedVersions[meta.format].includes(meta.version)) {
      return {
        valid: false,
        format: meta.format,
        version: meta.version || "N/A",
        errors: [{
          path: "/",
          message: `Unsupported version "${meta.version || "N/A"}" for ${meta.format}. Supported versions: ${this.supportedVersions[meta.format].join(", ")}.`,
        }],
      };
    }

    const validateFn = await this.getCompiledSchema(meta.format, meta.version);
    const valid = validateFn(data) as boolean;

    return {
      valid,
      format: meta.format,
      version: meta.version,
      errors: this.mapErrors(validateFn.errors),
    };
  }

  private configureAjv(ajv: AjvDraft7 | Ajv2020): void {
    addFormats(ajv);
    ajv.addFormat("idn-email", true);
    ajv.addFormat("iri", true);
    ajv.addFormat("iri-reference", true);
  }

  private async getCompiledSchema(format: SbomFormat, version: string): Promise<ValidateFunction> {
    const cacheKey: SchemaCacheKey = `${format}:${version}`;
    const cached = this.compiledCache.get(cacheKey);
    if (cached) return cached;

    const schema = await this.getSchema(cacheKey);
    const ajv = format === "SPDX" && version === SPDX_3_0_1_SCHEMA_VERSION
      ? this.ajv2020
      : this.ajv7;
    const validateFn = ajv.compile(cloneSchema(schema));
    this.compiledCache.set(cacheKey, validateFn);
    return validateFn;
  }

  private async getSchema(cacheKey: SchemaCacheKey): Promise<AnySchema> {
    const cached = this.schemaCache.get(cacheKey);
    if (cached) return cached;

    const fileName = SCHEMA_FILES[cacheKey];
    if (!fileName) throw new Error(`No bundled schema registered for ${cacheKey}.`);
    const schema = await readSchema(fileName);
    this.schemaCache.set(cacheKey, schema);

    if (cacheKey.startsWith("CycloneDX:")) {
      await this.registerCycloneDxSupportSchemas();
    }

    return schema;
  }

  private async registerCycloneDxSupportSchemas(): Promise<void> {
    const schemas = [
      ["cyclonedx-spdx-license.schema.json", "http://cyclonedx.org/schema/spdx.SNAPSHOT.schema.json"],
      ["cyclonedx-jsf-0.82.schema.json", "http://cyclonedx.org/schema/jsf-0.82.SNAPSHOT.schema.json"],
      ["cyclonedx-cryptography-defs.schema.json", "http://cyclonedx.org/schema/cryptography-defs.SNAPSHOT.schema.json"],
    ] as const;

    for (const [fileName, schemaId] of schemas) {
      try {
        this.ajv7.addSchema(cloneSchema(await readSchema(fileName)), schemaId);
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("already exists")) throw error;
      }
    }
  }

  private mapErrors(errors: ErrorObject[] | null | undefined): ValidationError[] {
    return errors?.map((error) => ({
      path: this.errorPath(error),
      message: this.errorMessage(error),
      data: "data" in error ? error.data : undefined,
    })) ?? [];
  }

  private errorPath(error: ErrorObject): string {
    const basePath = error.instancePath || "/";
    if (error.keyword === "required" && typeof error.params.missingProperty === "string") {
      return basePath === "/" ? `/${error.params.missingProperty}` : `${basePath}/${error.params.missingProperty}`;
    }
    if (error.keyword === "additionalProperties" && typeof error.params.additionalProperty === "string") {
      return basePath === "/" ? `/${error.params.additionalProperty}` : `${basePath}/${error.params.additionalProperty}`;
    }
    return basePath;
  }

  private errorMessage(error: ErrorObject): string {
    const fallback = error.message ?? "Schema constraint violation";
    if (error.keyword === "required" && typeof error.params.missingProperty === "string") {
      return `Missing required property "${error.params.missingProperty}".`;
    }
    if (error.keyword === "additionalProperties" && typeof error.params.additionalProperty === "string") {
      return `Unexpected property "${error.params.additionalProperty}".`;
    }
    return fallback;
  }
}


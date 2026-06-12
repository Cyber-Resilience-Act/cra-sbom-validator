export interface ValidationError {
  path: string;
  message: string;
  data?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  format: "SPDX" | "CycloneDX" | "Unknown";
  version: string;
  errors: ValidationError[];
}

export interface ValidatorOptions {
  /**
   * Kept for API compatibility. Validation is intentionally offline-only.
   */
  offlineMode?: boolean;
}


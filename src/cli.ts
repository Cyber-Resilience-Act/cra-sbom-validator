#!/usr/bin/env bun
import { SbomValidator } from "./validator";

interface CliOptions {
  filePath: string | null;
  json: boolean;
  pretty: boolean;
  maxErrors: number;
}

function parseArgs(args: string[]): CliOptions {
  let filePath: string | null = null;
  let json = false;
  let pretty = true;
  let maxErrors = 50;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") {
      json = true;
      pretty = false;
    } else if (arg === "--pretty") {
      pretty = true;
    } else if (arg === "--max-errors") {
      const value = Number(args[index + 1]);
      if (Number.isInteger(value) && value > 0) maxErrors = value;
      index += 1;
    } else if (!arg.startsWith("-") && !filePath) {
      filePath = arg;
    }
  }

  return { filePath, json, pretty, maxErrors };
}

function printUsage(): void {
  console.error(`Usage:
  cra-sbom-validator <sbom.json>
  cra-sbom-validator <sbom.json> --json
  cra-sbom-validator <sbom.json> --pretty --max-errors 20`);
}

const options = parseArgs(Bun.argv.slice(2));
if (!options.filePath) {
  printUsage();
  process.exit(2);
}

try {
  const result = await new SbomValidator().validateFile(options.filePath);
  const output = {
    ...result,
    errors: result.errors.slice(0, options.maxErrors),
  };

  if (options.json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(result.valid ? "Valid SBOM" : "Invalid SBOM");
    console.log(`Format: ${result.format}`);
    console.log(`Version: ${result.version}`);
    if (!result.valid) {
      console.log("");
      for (const error of output.errors) {
        console.log(`${error.path}: ${error.message}`);
      }
      if (result.errors.length > output.errors.length) {
        console.log(`... ${result.errors.length - output.errors.length} more errors`);
      }
    }
  }

  process.exit(result.valid ? 0 : 1);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}


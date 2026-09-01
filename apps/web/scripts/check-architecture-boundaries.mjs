import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const sourceRoot = path.join(webRoot, "src");
const sourceExtensions = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];

const blockedImportsByLayer = {
  features: new Set(["app", "pages"]),
  pages: new Set(["app"]),
  shared: new Set(["app", "features", "pages"]),
};

const allowedFeatureDependencies = {
  applications: new Set(["auth", "chat", "sessions", "workflow"]),
  chat: new Set(["auth"]),
  home: new Set(["applications", "chat", "interview-posts", "sessions"]),
  "interview-posts": new Set(["applications", "auth"]),
  map: new Set(["interview-posts"]),
  "my-interviews": new Set(["applications", "auth", "interview-posts", "sessions", "workflow"]),
  notifications: new Set(["auth"]),
  profiles: new Set(["applications", "auth", "chat", "interview-posts", "notifications", "sessions"]),
  sessions: new Set(["auth", "workflow"]),
  support: new Set(["auth"]),
};

const allowlist = [];

async function main() {
  const sourceFiles = await collectSourceFiles(sourceRoot);
  const violations = [];
  let importCount = 0;

  for (const sourceFilePath of sourceFiles) {
    const importerPath = toRepoRelative(sourceFilePath);
    const importerLayer = getLayer(importerPath);

    if (!blockedImportsByLayer[importerLayer]) {
      continue;
    }

    const importRecords = await readImports(sourceFilePath);
    importCount += importRecords.length;

    for (const record of importRecords) {
      if (!isLocalSourceImport(record.specifier)) {
        continue;
      }

      const resolvedTargetPath = await resolveSourceImport(sourceFilePath, record.specifier);
      if (!resolvedTargetPath) {
        continue;
      }

      const targetPath = toRepoRelative(resolvedTargetPath);
      const targetLayer = getLayer(targetPath);

      if (importerLayer === "features" && targetLayer === "features") {
        const importerFeature = getFeature(importerPath);
        const targetFeature = getFeature(targetPath);
        if (
          importerFeature &&
          targetFeature &&
          importerFeature !== targetFeature &&
          !allowedFeatureDependencies[importerFeature]?.has(targetFeature)
        ) {
          violations.push({
            importerPath,
            line: record.line,
            specifier: record.specifier,
            targetPath,
            message: `feature ${importerFeature} must not import feature ${targetFeature} without an explicit workflow edge`,
          });
        }
        continue;
      }

      if (!targetLayer || !blockedImportsByLayer[importerLayer].has(targetLayer)) {
        continue;
      }

      const allowlistEntry = getAllowlistEntry(importerPath, targetPath);
      if (allowlistEntry) {
        allowlistEntry.used.add(targetPath);
        continue;
      }

      violations.push({
        importerPath,
        line: record.line,
        specifier: record.specifier,
        targetPath,
        message: `${importerLayer} modules must not import ${targetLayer} modules`,
      });
    }
  }

  const staleAllowlistEntries = allowlist.filter((entry) => entry.used.size !== entry.targets.size);

  if (violations.length > 0 || staleAllowlistEntries.length > 0) {
    if (violations.length > 0) {
      console.error("Architecture boundary violations:");
      for (const violation of violations.sort(compareViolations)) {
        console.error(
          `- ${violation.importerPath}:${violation.line} imports "${violation.specifier}" -> ${violation.targetPath} (${violation.message})`,
        );
      }
    }

    if (staleAllowlistEntries.length > 0) {
      console.error("Stale architecture allowlist entries:");
      for (const entry of staleAllowlistEntries) {
        const unusedTargets = [...entry.targets].filter((target) => !entry.used.has(target));
        console.error(`- ${entry.importer} is allowlisted for ${unusedTargets.join(", ")} but that import was not observed.`);
      }
    }

    process.exitCode = 1;
    return;
  }

  console.log(`Architecture boundaries passed for ${sourceFiles.length} files and ${importCount} import sites.`);
  if (allowlist.length > 0) {
    console.log("Active allowlist:");
    for (const entry of allowlist) {
      console.log(`- ${entry.importer}: ${entry.note}`);
    }
  }
}

async function collectSourceFiles(directoryPath) {
  const dirEntries = await fs.readdir(directoryPath, { withFileTypes: true });
  const filePaths = await Promise.all(
    dirEntries.map(async (dirEntry) => {
      const entryPath = path.join(directoryPath, dirEntry.name);
      if (dirEntry.isDirectory()) {
        return collectSourceFiles(entryPath);
      }

      if (!dirEntry.isFile()) {
        return [];
      }

      if (entryPath.endsWith(".d.ts")) {
        return [];
      }

      return sourceExtensions.some((extension) => entryPath.endsWith(extension)) ? [entryPath] : [];
    }),
  );

  return filePaths.flat().sort();
}

async function readImports(sourceFilePath) {
  const sourceText = await fs.readFile(sourceFilePath, "utf8");
  const sourceFile = ts.createSourceFile(sourceFilePath, sourceText, ts.ScriptTarget.Latest, true);
  const importRecords = [];

  function addRecord(moduleSpecifier) {
    const line = sourceFile.getLineAndCharacterOfPosition(moduleSpecifier.getStart(sourceFile)).line + 1;
    importRecords.push({
      line,
      specifier: moduleSpecifier.text,
    });
  }

  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      if (ts.isStringLiteralLike(node.moduleSpecifier)) {
        addRecord(node.moduleSpecifier);
      }
    }

    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length === 1) {
      const [firstArgument] = node.arguments;
      if (ts.isStringLiteralLike(firstArgument)) {
        addRecord(firstArgument);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return importRecords;
}

function isLocalSourceImport(specifier) {
  return specifier.startsWith(".") && !specifier.includes("?");
}

async function resolveSourceImport(importerPath, specifier) {
  const basePath = path.resolve(path.dirname(importerPath), specifier);
  const candidatePaths = [
    basePath,
    ...sourceExtensions.map((extension) => `${basePath}${extension}`),
    ...sourceExtensions.map((extension) => path.join(basePath, `index${extension}`)),
  ];

  for (const candidatePath of candidatePaths) {
    try {
      const stat = await fs.stat(candidatePath);
      if (!stat.isFile()) {
        continue;
      }

      if (!isUnderPath(candidatePath, sourceRoot)) {
        return null;
      }

      return candidatePath;
    } catch {
      // Continue resolving through the remaining candidates.
    }
  }

  return null;
}

function isUnderPath(candidatePath, rootPath) {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath !== "" && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

function toRepoRelative(absolutePath) {
  return path.relative(webRoot, absolutePath).split(path.sep).join("/");
}

function getLayer(repoRelativePath) {
  const [topLevelDirectory, layerDirectory] = repoRelativePath.split("/");
  if (topLevelDirectory !== "src") {
    return null;
  }

  return layerDirectory === "app" || layerDirectory === "features" || layerDirectory === "pages" || layerDirectory === "shared"
    ? layerDirectory
    : null;
}

function getFeature(repoRelativePath) {
  const [topLevelDirectory, layerDirectory, featureDirectory] = repoRelativePath.split("/");
  return topLevelDirectory === "src" && layerDirectory === "features"
    ? featureDirectory ?? null
    : null;
}

function getAllowlistEntry(importerPath, targetPath) {
  return allowlist.find((entry) => entry.importer === importerPath && entry.targets.has(targetPath)) ?? null;
}

function compareViolations(left, right) {
  return (
    left.importerPath.localeCompare(right.importerPath) ||
    left.line - right.line ||
    left.targetPath.localeCompare(right.targetPath)
  );
}

await main();

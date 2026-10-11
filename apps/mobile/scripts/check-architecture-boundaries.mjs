import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const blocked = {
  shared: new Set(["features", "screens", "providers", "app"]),
  features: new Set(["screens", "providers", "app"]),
  screens: new Set(["app"]),
};
let files = 0;
const violations = [];
function visitDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { visitDirectory(file); continue; }
    if (!/\.[cm]?[jt]sx?$/.test(file) || file.endsWith(".d.ts")) continue;
    files++;
    const relative = path.relative(root, file).split(path.sep).join("/");
    const layer = relative.startsWith("src/") ? relative.split("/")[1] : "app";
    const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    function visit(node) {
      const specifier = (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) ? node.moduleSpecifier
        : ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(source) === "require") ? node.arguments[0] : null;
      if (specifier && ts.isStringLiteral(specifier)) {
        const value = specifier.text;
        const target = value.startsWith("@/") ? path.join(root, "src", value.slice(2))
          : value.startsWith(".") ? path.resolve(path.dirname(file), value) : null;
        if (target) {
          const parts = path.relative(root, target).split(path.sep);
          const targetLayer = parts[0] === "src" ? parts[1] : parts[0];
          if (blocked[layer]?.has(targetLayer)) {
            const line = source.getLineAndCharacterOfPosition(specifier.getStart()).line + 1;
            violations.push(`${relative}:${line}: ${layer} must not import ${targetLayer} (${value})`);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
visitDirectory(path.join(root, "src"));
visitDirectory(path.join(root, "app"));
if (violations.length) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Mobile architecture boundaries passed for ${files} files.`);
}

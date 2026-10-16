import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensions = [".ts", ".tsx", ".js", ".mjs"];
const assetExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
  ".css",
]);

async function existingModuleUrl(basePath) {
  const candidates = [
    basePath,
    ...extensions.map((extension) => `${basePath}${extension}`),
    ...extensions.map((extension) => path.join(basePath, `index${extension}`)),
  ];

  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) return pathToFileURL(candidate).href;
    } catch {
      // Continue until a matching source module is found.
    }
  }

  return null;
}

export async function resolve(specifier, context, nextResolve) {
  let sourcePath = null;

  if (specifier.startsWith("@/")) {
    sourcePath = path.join(root, "src", specifier.slice(2));
  } else if (specifier.startsWith(".") && context.parentURL) {
    sourcePath = fileURLToPath(new URL(specifier, context.parentURL));
  }

  if (sourcePath && !path.extname(sourcePath)) {
    const url = await existingModuleUrl(sourcePath);
    if (url) return { url, shortCircuit: true };
  }

  if (sourcePath && assetExtensions.has(path.extname(sourcePath).toLowerCase())) {
    return { url: pathToFileURL(sourcePath).href, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  const extension = url.startsWith("file:") ? path.extname(fileURLToPath(url)).toLowerCase() : "";
  if (assetExtensions.has(extension)) {
    // Vite turns an asset import into its URL and a stylesheet import into a side effect.
    const source = extension === ".css" ? "" : `export default ${JSON.stringify(url)};`;
    return { format: "module", source, shortCircuit: true };
  }
  if (url.endsWith(".tsx")) {
    const source = await readFile(fileURLToPath(url), "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    });
    return { format: "module", source: output.outputText, shortCircuit: true };
  }

  const loaded = await nextLoad(url, context);
  if (!url.startsWith(pathToFileURL(path.join(root, "src")).href) || loaded.source == null)
    return loaded;
  const text = String(loaded.source);
  // Vite defines import.meta.env for app code; give modules under src/ the same empty build env.
  if (!text.includes("import.meta.env")) return loaded;
  const env = '{ MODE: "test", DEV: false, PROD: false, SSR: false, BASE_URL: "/" }';
  return { ...loaded, source: text.replaceAll("import.meta.env", env) };
}

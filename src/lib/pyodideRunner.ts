// In-browser Python execution via Pyodide (loaded lazily from CDN).
const PYODIDE_VERSION = "0.26.4";
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.mjs`;

export const STDIN_SENTINEL = "__CODELIB_NEEDS_INPUT__";

type Pyodide = any;

let pyodidePromise: Promise<Pyodide> | null = null;

export function loadPython(onStatus?: (msg: string) => void): Promise<Pyodide> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      onStatus?.("Loading Python…");
      const mod = await import(/* @vite-ignore */ PYODIDE_URL);
      const py = await mod.loadPyodide({
        indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`,
      });
      onStatus?.("Preparing packages…");
      await py.loadPackage("micropip");
      return py;
    })().catch((e) => {
      pyodidePromise = null;
      throw e;
    });
  }
  return pyodidePromise;
}

export type PythonResult = {
  stdout: string;
  error?: string | null;
  needsInput?: boolean;
};

function cleanTraceback(text: string) {
  return text
    .split("\n")
    .filter((l) => !l.includes("/lib/python3") && !l.includes("pyodide") && !l.includes("<exec>"))
    .join("\n")
    .trim();
}

/**
 * Runs `source` with `stdinLines` available to input(). If the program asks for
 * more input than provided, `needsInput` is true and the caller should collect
 * another line and re-run with the extended buffer.
 */
export async function runPython(
  source: string,
  stdinLines: string[],
  onStatus?: (msg: string) => void,
): Promise<PythonResult> {
  const py = await loadPython(onStatus);

  let out = "";
  py.setStdout({ batched: (s: string) => { out += s + "\n"; } });
  py.setStderr({ batched: (s: string) => { out += s + "\n"; } });

  const queue = [...stdinLines];
  py.setStdin({
    stdin: () => {
      if (queue.length === 0) throw new Error(STDIN_SENTINEL);
      return queue.shift()! + "\n";
    },
  });

  try {
    onStatus?.("Installing imported libraries…");
    await py.loadPackagesFromImports(source).catch(() => undefined);
    await installMissing(py, source);
    onStatus?.("Running…");
    await py.runPythonAsync(source);
    return { stdout: out };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes(STDIN_SENTINEL) || msg.includes("EOF when reading a line")) {
      return { stdout: out, needsInput: true };
    }
    return { stdout: out, error: cleanTraceback(msg) || msg };
  }
}

const BUILTIN_OK = new Set([
  "sys", "os", "math", "random", "json", "re", "time", "datetime", "itertools",
  "functools", "collections", "string", "typing", "heapq", "bisect", "copy",
  "decimal", "fractions", "statistics", "abc", "dataclasses", "enum", "io",
  "textwrap", "unittest", "pprint", "hashlib", "base64", "csv", "operator",
]);

async function installMissing(py: Pyodide, source: string) {
  const mods = new Set<string>();
  const re = /^\s*(?:import\s+([a-zA-Z0-9_.]+)|from\s+([a-zA-Z0-9_.]+)\s+import)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const name = (m[1] || m[2] || "").split(".")[0];
    if (name && !BUILTIN_OK.has(name)) mods.add(name);
  }
  const missing: string[] = [];
  for (const name of mods) {
    const found = await py.runPythonAsync(
      `import importlib.util; importlib.util.find_spec("${name}") is not None`,
    ).catch(() => false);
    if (!found) missing.push(name);
  }
  if (missing.length === 0) return;
  const micropip = py.pyimport("micropip");
  for (const name of missing) {
    await micropip.install(name).catch(() => undefined);
  }
}

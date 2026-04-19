import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Play, RotateCcw, Terminal } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_CODE = `#include <stdio.h>

int main() {
  printf("Hello, world!\\n");
  return 0;
}`;

const PLAYGROUND_CODE_KEY = "codelib-playground-code";
const PLAYGROUND_TITLE_KEY = "codelib-playground-title";

type PlaygroundState = {
  code?: string;
  title?: string;
};

type PistonStage = {
  stdout?: string;
  stderr?: string;
  output?: string;
  code?: number | null;
  signal?: string | null;
};

type PistonResult = {
  language?: string;
  version?: string;
  message?: string | null;
  error?: string | null;
  text?: string | null;
  upstream?: {
    provider?: string;
    status?: number;
    contentType?: string;
  };
  compile?: PistonStage;
  run?: PistonStage;
};

function getInitialCode(state: PlaygroundState | null) {
  if (state?.code) return state.code;
  if (typeof window === "undefined") return DEFAULT_CODE;
  return sessionStorage.getItem(PLAYGROUND_CODE_KEY) || DEFAULT_CODE;
}

function getInitialTitle(state: PlaygroundState | null) {
  if (state?.title) return state.title;
  if (typeof window === "undefined") return "Scratch C Program";
  return sessionStorage.getItem(PLAYGROUND_TITLE_KEY) || "Scratch C Program";
}

function formatResult(result: PistonResult) {
  if (result.error) return result.error;
  if (result.text) return result.text;

  const parts = [
    result.compile?.output,
    result.run?.stdout,
    result.run?.stderr,
    result.message,
  ].filter(Boolean);

  if (parts.length > 0) return parts.join("\n");
  return "Program finished with no output.";
}

function formatRequestError(response: Response, result: PistonResult) {
  const upstreamStatus = result.upstream?.status ? `, upstream ${result.upstream.status}` : "";
  const detail = result.error || result.message || result.text || result.compile?.output || result.run?.output;

  if (detail) {
    return `Piston request failed (HTTP ${response.status}${upstreamStatus}): ${detail}`;
  }

  return `Piston request failed (HTTP ${response.status}${upstreamStatus}).`;
}

function hasMainFunction(src: string) {
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  return /\b(?:int|void)\s+main\s*\(/.test(stripped);
}

function extractZeroArgVoidFns(src: string): string[] {
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const re = /\bvoid\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*(?:void)?\s*\)\s*\{/g;
  const names: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    if (m[1] !== "main" && !names.includes(m[1])) names.push(m[1]);
  }
  return names;
}

function buildAutoMain(fns: string[]): string {
  if (fns.length === 0) return "";
  const dispatch = fns
    .map((fn) => `        if (strcmp(__cmd, "${fn}") == 0) { ${fn}(); continue; }`)
    .join("\n");
  return `

/* ---- Auto-generated main() by C Playground ---- */
#include <string.h>
int main(void) {
    char __cmd[64];
    while (scanf("%63s", __cmd) == 1) {
        if (strcmp(__cmd, "exit") == 0 || strcmp(__cmd, "quit") == 0) break;
${dispatch}
        printf("Unknown function: %s\\n", __cmd);
    }
    return 0;
}
`;
}

function preprocessCode(src: string): { code: string; injected: string[] } {
  if (hasMainFunction(src)) return { code: src, injected: [] };
  const fns = extractZeroArgVoidFns(src);
  if (fns.length === 0) return { code: src, injected: [] };
  return { code: src + buildAutoMain(fns), injected: fns };
}

export default function CPlayground() {
  const location = useLocation();
  const locationState = location.state as PlaygroundState | null;
  const [code, setCode] = useState(() => getInitialCode(locationState));
  const [sourceTitle, setSourceTitle] = useState(() => getInitialTitle(locationState));
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("Output will appear here after you run the program.");
  const [status, setStatus] = useState<string | null>(null);
  const [raw, setRaw] = useState<PistonResult | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [loading, setLoading] = useState(false);

  const lineNumbers = useMemo(() => {
    return Array.from({ length: Math.max(code.split("\n").length, 12) }, (_, i) => i + 1);
  }, [code]);

  async function run() {
    setLoading(true);
    setRaw(null);
    setStatus("Sending to Piston");
    setOutput("Running...");

    try {
      const { code: finalCode, injected } = preprocessCode(code);
      const payload = {
        source_code: finalCode,
        stdin,
        language: "c",
        version: "*",
      };

      const response = await fetch("/api/piston-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const contentType = response.headers.get("content-type") || "";
      const result: PistonResult = contentType.includes("application/json")
        ? await response.json()
        : { text: await response.text() };

      if (!response.ok) {
        throw new Error(formatRequestError(response, result));
      }

      setRaw(result);
      setStatus(result.run?.code === 0 ? "Accepted" : "Finished");
      const banner = injected.length
        ? `[Auto-main injected. Available functions: ${injected.join(", ")}. Type one name per stdin line; "exit" stops.]\n\n`
        : "";
      setOutput(banner + formatResult(result));
    } catch (error: unknown) {
      setStatus("Run failed");
      setOutput(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setCode(DEFAULT_CODE);
    setSourceTitle("Scratch C Program");
    setStdin("");
    setOutput("Output will appear here after you run the program.");
    setStatus(null);
    setRaw(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(PLAYGROUND_CODE_KEY);
      sessionStorage.removeItem(PLAYGROUND_TITLE_KEY);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <Button variant="ghost" size="sm" asChild className="mb-3 px-0 text-muted-foreground hover:text-primary">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Topics
              </Link>
            </Button>
            <div className="flex items-start gap-3 sm:items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                <Terminal className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold leading-tight text-foreground">C Playground</h1>
                </div>
                <p className="mt-1 break-words text-sm text-muted-foreground">{sourceTitle}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button variant="outline" onClick={reset} className="w-full sm:w-auto">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button onClick={run} disabled={loading || !code.trim()} className="w-full sm:w-auto">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              {loading ? "Running" : "Run"}
            </Button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <section className="overflow-hidden rounded-md border border-border bg-card">
            <div className="flex h-10 items-center justify-between border-b border-border bg-code-header px-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500" />
                <span className="h-3 w-3 rounded-full bg-yellow-500" />
                <span className="h-3 w-3 rounded-full bg-green-500" />
              </div>
              <span className="font-mono text-xs text-muted-foreground">main.c</span>
            </div>

            <div className="grid min-h-[420px] grid-cols-[2.75rem_minmax(0,1fr)] bg-[#1e1e1e] sm:min-h-[520px] sm:grid-cols-[3.25rem_minmax(0,1fr)]">
              <div className="select-none border-r border-white/10 bg-[#252526] py-4 pr-2 text-right font-mono text-xs leading-6 text-slate-500 sm:pr-3 sm:text-sm">
                {lineNumbers.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
              <textarea
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  setSourceTitle((current) => current || "Scratch C Program");
                }}
                spellCheck={false}
                className="min-h-[420px] resize-none border-0 bg-[#1e1e1e] p-3 font-mono text-sm leading-6 text-slate-100 outline-none selection:bg-primary/40 sm:min-h-[520px] sm:p-4"
                aria-label="C source code editor"
              />
            </div>
          </section>

          <section className="space-y-5">
            <div className="rounded-md border border-border bg-card p-4">
              <Label htmlFor="stdin" className="text-sm font-medium">stdin</Label>
              <Textarea
                id="stdin"
                value={stdin}
                onChange={(event) => setStdin(event.target.value)}
                placeholder="Input values for scanf go here"
                className="mt-2 min-h-28 font-mono sm:min-h-32"
              />
            </div>

            <div className="rounded-md border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  {status === "Run failed" ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                  <Label className="text-sm font-medium">Output</Label>
                </div>
                {status && <span className="text-xs text-muted-foreground">{status}</span>}
              </div>
              <pre className="min-h-40 whitespace-pre-wrap break-words p-4 font-mono text-sm text-foreground sm:min-h-48">
                {output}
              </pre>
            </div>

            <div className="rounded-md border border-border bg-card p-4">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={showRaw}
                  onChange={(event) => setShowRaw(event.target.checked)}
                  className="h-4 w-4"
                />
                Show raw Piston response
              </label>
              {showRaw && (
                <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  {raw ? JSON.stringify(raw, null, 2) : "No raw response yet."}
                </pre>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

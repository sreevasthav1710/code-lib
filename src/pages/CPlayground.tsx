import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertCircle, ArrowLeft, Loader2, Play, RotateCcw, Square, Terminal } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";

const DEFAULT_CODE = `#include <stdio.h>

int main() {
  printf("Hello, world!\\n");
  return 0;
}`;

const PLAYGROUND_CODE_KEY = "codelib-playground-code";
const PLAYGROUND_TITLE_KEY = "codelib-playground-title";

type PlaygroundState = { code?: string; title?: string };

type RunResult = {
  compile?: { output?: string };
  run?: { stdout?: string; stderr?: string; code?: number | null };
  error?: string | null;
  upstream?: { status?: number };
};

type Line = { kind: "out" | "err" | "in" | "info"; text: string };

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

async function compileAndRun(source: string, stdin: string): Promise<RunResult> {
  const response = await fetch("/api/piston-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_code: source, stdin, language: "c", version: "*" }),
  });
  const ct = response.headers.get("content-type") || "";
  const result: RunResult = ct.includes("application/json")
    ? await response.json()
    : { error: await response.text() };
  if (!response.ok && !result.error) {
    result.error = `Request failed (HTTP ${response.status})`;
  }
  return result;
}

function extractError(result: RunResult): string | null {
  if (result.error) return result.error;
  const compile = (result.compile?.output || "").trim();
  if (compile) return compile;
  const stderr = (result.run?.stderr || "").trim();
  if (stderr && result.run?.code !== 0) return stderr;
  return null;
}

export default function CPlayground() {
  const location = useLocation();
  const locationState = location.state as PlaygroundState | null;
  const [code, setCode] = useState(() => getInitialCode(locationState));
  const [sourceTitle, setSourceTitle] = useState(() => getInitialTitle(locationState));
  const [lines, setLines] = useState<Line[]>([]);
  const [stdinBuffer, setStdinBuffer] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [running, setRunning] = useState(false);
  const [awaitingInput, setAwaitingInput] = useState(false);
  const [finished, setFinished] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastStdout, setLastStdout] = useState("");
  const sourceRef = useRef("");
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const lineNumbers = useMemo(
    () => Array.from({ length: Math.max(code.split("\n").length, 12) }, (_, i) => i + 1),
    [code],
  );

  useEffect(() => {
    sessionStorage.setItem(PLAYGROUND_CODE_KEY, code);
    sessionStorage.setItem(PLAYGROUND_TITLE_KEY, sourceTitle);
  }, [code, sourceTitle]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines, awaitingInput]);

  useEffect(() => {
    if (awaitingInput) inputRef.current?.focus();
  }, [awaitingInput]);

  function appendOutputDiff(prevStdout: string, newStdout: string) {
    const diff = newStdout.startsWith(prevStdout) ? newStdout.slice(prevStdout.length) : newStdout;
    if (!diff) return;
    setLines((prev) => [...prev, { kind: "out", text: diff }]);
  }

  async function start() {
    const { code: finalCode } = preprocessCode(code);
    sourceRef.current = finalCode;
    setLines([]);
    setStdinBuffer("");
    setLastStdout("");
    setErrorMsg(null);
    setFinished(false);
    setRunning(true);
    setAwaitingInput(false);

    try {
      const result = await compileAndRun(finalCode, "");
      const err = extractError(result);
      if (err) {
        setErrorMsg(err);
        setFinished(true);
        return;
      }
      const stdout = result.run?.stdout || "";
      appendOutputDiff("", stdout);
      setLastStdout(stdout);

      // If exit code is 0 and no scanf-style trailing wait, we still don't know if it wanted input.
      // Heuristic: if the program produced output without reading input AND exited cleanly,
      // assume it's waiting for input (since we sent empty stdin). User can stop with Stop button.
      setAwaitingInput(true);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setFinished(true);
    } finally {
      setRunning(false);
    }
  }

  async function submitInput(value: string) {
    if (!value && value !== "") return;
    const newBuffer = stdinBuffer + value + "\n";
    setStdinBuffer(newBuffer);
    setLines((prev) => [...prev, { kind: "in", text: value }]);
    setInputValue("");
    setAwaitingInput(false);
    setRunning(true);

    try {
      const result = await compileAndRun(sourceRef.current, newBuffer);
      const err = extractError(result);
      if (err) {
        setErrorMsg(err);
        setFinished(true);
        return;
      }
      const stdout = result.run?.stdout || "";
      appendOutputDiff(lastStdout, stdout);
      setLastStdout(stdout);
      // If output didn't grow, the program likely terminated reading the input
      const grew = stdout.length > lastStdout.length;
      const exited = result.run?.code === 0 && !grew;
      if (exited) {
        setFinished(true);
      } else {
        setAwaitingInput(true);
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setFinished(true);
    } finally {
      setRunning(false);
    }
  }

  function stop() {
    setAwaitingInput(false);
    setRunning(false);
    setFinished(true);
    setLines((prev) => [...prev, { kind: "info", text: "[stopped]" }]);
  }

  function reset() {
    setCode(DEFAULT_CODE);
    setSourceTitle("Scratch C Program");
    setLines([]);
    setStdinBuffer("");
    setLastStdout("");
    setErrorMsg(null);
    setFinished(false);
    setAwaitingInput(false);
    sessionStorage.removeItem(PLAYGROUND_CODE_KEY);
    sessionStorage.removeItem(PLAYGROUND_TITLE_KEY);
  }

  const idle = !running && !awaitingInput && !finished && !errorMsg;

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
                <h1 className="text-2xl font-bold leading-tight text-foreground">C Playground</h1>
                <p className="mt-1 break-words text-sm text-muted-foreground">{sourceTitle}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button variant="outline" onClick={reset} disabled={running}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            {awaitingInput || running ? (
              <Button variant="destructive" onClick={stop} disabled={running}>
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button onClick={start} disabled={!code.trim()}>
                <Play className="mr-2 h-4 w-4" />
                Run
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <section className="overflow-hidden rounded-md border border-border bg-card">
            <div className="flex h-10 items-center justify-between border-b border-border bg-code-header px-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-destructive/80" />
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
                onChange={(e) => {
                  setCode(e.target.value);
                  setSourceTitle((cur) => cur || "Scratch C Program");
                }}
                spellCheck={false}
                className="min-h-[420px] resize-none border-0 bg-[#1e1e1e] p-3 font-mono text-sm leading-6 text-slate-100 outline-none selection:bg-primary/40 sm:min-h-[520px] sm:p-4"
                aria-label="C source code editor"
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-md border border-border bg-[#0d0d0d]">
            <div className="flex h-10 items-center justify-between border-b border-white/10 px-4">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-green-400" />
                <span className="font-mono text-xs text-slate-300">terminal</span>
              </div>
              <span className="font-mono text-xs text-slate-500">
                {running ? "running…" : awaitingInput ? "waiting for input" : finished ? "exited" : errorMsg ? "error" : "idle"}
              </span>
            </div>

            <div
              ref={terminalRef}
              onClick={() => inputRef.current?.focus()}
              className="min-h-[420px] max-h-[600px] overflow-auto p-4 font-mono text-sm leading-6 sm:min-h-[520px]"
            >
              {idle && (
                <div className="text-slate-500">Click Run to start. Type input below when prompted.</div>
              )}

              {errorMsg ? (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <pre className="whitespace-pre-wrap break-words text-xs">{errorMsg}</pre>
                </div>
              ) : (
                <>
                  {lines.map((line, i) => {
                    if (line.kind === "in") {
                      return (
                        <div key={i} className="text-cyan-400">
                          <span className="text-slate-500">›</span> {line.text}
                        </div>
                      );
                    }
                    if (line.kind === "info") {
                      return <div key={i} className="text-slate-500">{line.text}</div>;
                    }
                    return (
                      <pre key={i} className="whitespace-pre-wrap break-words text-slate-100">
                        {line.text}
                      </pre>
                    );
                  })}

                  {awaitingInput && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        submitInput(inputValue);
                      }}
                      className="mt-1 flex items-center gap-2"
                    >
                      <span className="text-slate-500">›</span>
                      <input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        autoFocus
                        spellCheck={false}
                        className="flex-1 border-0 bg-transparent p-0 font-mono text-sm text-cyan-400 outline-none"
                        placeholder="Type input and press Enter…"
                      />
                    </form>
                  )}

                  {running && !awaitingInput && (
                    <div className="mt-2 flex items-center gap-2 text-slate-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span className="text-xs">running…</span>
                    </div>
                  )}

                  {finished && !errorMsg && (
                    <div className="mt-2 text-xs text-slate-500">[program exited]</div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, Loader2, Play, RotateCcw, Shield, Terminal } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";

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

export default function CPlayground() {
  const location = useLocation();
  const { isAdmin, loading: authLoading } = useAuth();
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
      const payload = {
        source_code: code,
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
      setOutput(formatResult(result));
    } catch (error: any) {
      setStatus("Run failed");
      setOutput(error?.message || String(error));
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center justify-center px-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading playground...</span>
          </div>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center justify-center px-4 py-12">
          <section className="w-full rounded-md border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-md border border-primary/30 bg-primary/10">
              <Clock className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Playground Under Progress</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              The C playground is being connected to a self-hosted compiler service. It will be available here once testing is complete.
            </p>
            <div className="mt-6 flex justify-center">
              <Button asChild>
                <Link to="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Topics
                </Link>
              </Button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-3 px-0 text-muted-foreground hover:text-primary">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Topics
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card">
                <Terminal className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">C Playground</h1>
                  <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    <Shield className="mr-1 h-3.5 w-3.5" />
                    Admin Preview
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{sourceTitle}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button onClick={run} disabled={loading || !code.trim()}>
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

            <div className="grid min-h-[520px] grid-cols-[3.25rem_minmax(0,1fr)] bg-[#1e1e1e]">
              <div className="select-none border-r border-white/10 bg-[#252526] py-4 pr-3 text-right font-mono text-sm leading-6 text-slate-500">
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
                className="min-h-[520px] resize-none border-0 bg-[#1e1e1e] p-4 font-mono text-sm leading-6 text-slate-100 outline-none selection:bg-primary/40"
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
                className="mt-2 min-h-32 font-mono"
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
              <pre className="min-h-48 whitespace-pre-wrap break-words p-4 font-mono text-sm text-foreground">
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

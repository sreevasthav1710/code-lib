const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GODBOLT_URL = "https://godbolt.org/api/compiler/cg133/compile";

type TextLine = { text?: string };

const joinLines = (lines?: TextLine[]) =>
  Array.isArray(lines) ? lines.map((l) => l?.text ?? "").join("\n") : "";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const code: string = body.source_code || body.code || "";
    if (!code.trim()) {
      return json({ error: "source_code is required" }, 400);
    }

    const upstream = await fetch(GODBOLT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        source: code,
        lang: "c",
        options: {
          userArguments: "-O2 -fdiagnostics-color=never",
          executeParameters: { args: [], stdin: body.stdin || "" },
          compilerOptions: { executorRequest: true },
          filters: { execute: true },
        },
      }),
    });

    const rawText = await upstream.text();
    let data: Record<string, any>;
    try {
      data = JSON.parse(rawText);
    } catch {
      return json({
        error: `Compiler service error (HTTP ${upstream.status}): ${rawText.slice(0, 300)}`,
      });
    }

    const build = data.buildResult ?? {};
    const buildFailed = typeof build.code === "number" && build.code !== 0;
    const compileOutput = buildFailed
      ? [joinLines(build.stderr), joinLines(build.stdout)].filter(Boolean).join("\n")
      : "";

    return json({
      upstream: { provider: "godbolt", status: upstream.status },
      compile: { output: compileOutput },
      run: {
        stdout: joinLines(data.stdout),
        stderr: joinLines(data.stderr),
        output: joinLines(data.stdout),
        code: typeof data.code === "number" ? data.code : null,
        signal: data.timedOut ? "TIMEOUT" : null,
      },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

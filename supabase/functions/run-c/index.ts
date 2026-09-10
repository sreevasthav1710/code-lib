const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WANDBOX_URL = "https://wandbox.org/api/compile.json";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const code: string = body.source_code || body.code || "";
    if (!code.trim()) {
      return new Response(JSON.stringify({ error: "source_code is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch(WANDBOX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compiler: body.compiler || "gcc-head-c",
        code,
        stdin: body.stdin || "",
        "compiler-option-raw": "",
        "runtime-option-raw": "",
        save: false,
      }),
    });

    const rawText = await upstream.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(rawText);
    } catch {
      data = {};
      if (!upstream.ok) {
        return new Response(
          JSON.stringify({ error: `Compiler service error (HTTP ${upstream.status}): ${rawText.slice(0, 300)}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(
      JSON.stringify({
        upstream: { provider: "wandbox", status: upstream.status },
        compile: { output: data.compiler_message || data.compiler_error || "" },
        run: {
          stdout: data.program_output || "",
          stderr: data.program_error || "",
          output: data.program_message || "",
          code: data.status !== undefined ? Number(data.status) : null,
          signal: data.signal || null,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

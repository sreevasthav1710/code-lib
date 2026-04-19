import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const WANDBOX_URL = "https://wandbox.org/api/compile.json";

function wandboxDevProxy(env: Record<string, string>): Plugin {
  const defaultCompiler = env.WANDBOX_COMPILER || "gcc-head-c";
  return {
    name: "wandbox-dev-proxy",
    configureServer(server) {
      server.middlewares.use("/api/piston-proxy", async (req, res) => {
        const sendJson = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        };

        try {
          if (req.method !== "POST") {
            sendJson(405, { error: "Method not allowed" });
            return;
          }

          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const rawBody = Buffer.concat(chunks).toString("utf8");
          const body = rawBody ? JSON.parse(rawBody) : {};
          const code: string = body.source_code || body.code || "";
          if (!code.trim()) {
            sendJson(400, { error: "source_code is required" });
            return;
          }

          const payload = {
            compiler: body.compiler || defaultCompiler,
            code,
            stdin: body.stdin || "",
            "compiler-option-raw": "",
            "runtime-option-raw": "",
            save: false,
          };

          const upstream = await fetch(WANDBOX_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const data: any = await upstream.json().catch(async () => ({ text: await upstream.text() }));

          sendJson(upstream.status, {
            upstream: { provider: "wandbox", status: upstream.status },
            compile: { output: data.compiler_message || data.compiler_error || "" },
            run: {
              stdout: data.program_output || "",
              stderr: data.program_error || "",
              output: data.program_message || "",
              code: data.status !== undefined ? Number(data.status) : null,
              signal: data.signal || null,
            },
            raw: data,
          });
        } catch (error) {
          sendJson(500, { error: error instanceof Error ? error.message : String(error) });
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), wandboxDevProxy(env)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});

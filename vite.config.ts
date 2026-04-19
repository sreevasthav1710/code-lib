import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

function toPistonPayload(body: any) {
  return {
    language: body.language || "c",
    version: body.version || "*",
    files: [
      {
        name: body.filename || "main.c",
        content: body.source_code || body.code || "",
      },
    ],
    stdin: body.stdin || "",
    compile_timeout: body.compile_timeout || 10000,
    run_timeout: body.run_timeout || 3000,
  };
}

function pistonDevProxy(env: Record<string, string>): Plugin {
  return {
    name: "piston-dev-proxy",
    configureServer(server) {
      server.middlewares.use("/api/piston-proxy", async (req, res) => {
        const pistonExecuteUrl = env.PISTON_API_URL || "https://emkc.org/api/v2/piston/execute";
        const pistonApiKey = env.PISTON_API_KEY;
        const sendJson = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        };

        try {
          if (req.method === "POST") {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }

            const rawBody = Buffer.concat(chunks).toString("utf8");
            const payload = toPistonPayload(rawBody ? JSON.parse(rawBody) : {});

            if (!payload.files[0].content.trim()) {
              sendJson(400, { error: "source_code is required" });
              return;
            }

            const upstream = await fetch(pistonExecuteUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(pistonApiKey ? { Authorization: `Bearer ${pistonApiKey}` } : {}),
              },
              body: JSON.stringify(payload),
            });

            const contentType = upstream.headers.get("content-type") || "";
            const data: Record<string, unknown> = contentType.includes("application/json")
              ? ((await upstream.json()) as Record<string, unknown>)
              : { text: await upstream.text() };

            sendJson(upstream.status, {
              upstream: { provider: "piston", status: upstream.status, contentType },
              ...data,
            });
            return;
          }

          sendJson(405, { error: "Method not allowed" });
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
    plugins: [react(), pistonDevProxy(env)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
  code: string;
  language: string;
  title?: string;
}

export function CodeBlock({ code, language, title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex items-center justify-between gap-3 bg-code-header px-3 py-2 sm:px-4">
        <span className="min-w-0 truncate font-mono text-sm text-muted-foreground">{title || language}</span>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-muted-foreground hover:text-foreground">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="hidden text-xs sm:inline">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
      <div className="max-w-full overflow-x-auto">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          showLineNumbers
          wrapLongLines={false}
          customStyle={{ margin: 0, borderRadius: 0, fontSize: "0.8125rem", minWidth: "max-content" }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

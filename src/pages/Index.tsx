import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase, SUPABASE_CONFIGURED } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, ChevronRight } from "lucide-react";

interface Topic {
  id: string;
  title: string;
  description: string | null;
}

export default function Index() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      setLoading(true);
      setError(null);

      if (!SUPABASE_CONFIGURED) {
        if (!cancelled) {
          console.error("[Index] Supabase not configured");
          setTopics([]);
          setError("Supabase not configured");
          setLoading(false);
        }
        return;
      }

      try {
        const timeout = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error("Timed out loading topics. Check your Supabase connection and refresh."));
          }, 15000);
        });
        const { data, error } = await Promise.race([
          supabase.from("topics").select("*").order("sort_order"),
          timeout,
        ]);
        if (cancelled) return;

        if (error) {
          console.error("Failed to load topics:", error);
          setError(error.message || "Failed to fetch topics");
          setTopics([]);
        } else {
          setTopics(data || []);
        }
      } catch (e: unknown) {
        if (cancelled) return;
        console.error("[Index] fetch error", e);
        setError(e instanceof Error ? e.message : String(e));
        setTopics([]);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    console.log('[Index] topics state updated:', topics?.length);
  }, [topics]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
          <h1 className="mb-3 text-4xl font-bold leading-tight text-foreground sm:text-5xl">
            Code <span className="text-primary">Lib</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Browse organized programming topics, subtopics, and ready-to-run code examples.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : error ? (
          <div className="mx-auto max-w-xl rounded-md border border-destructive/30 bg-destructive/5 px-5 py-8 text-center text-destructive">
            <p className="text-base leading-7 sm:text-lg">Error loading topics: {error}</p>
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No topics available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {topics.map((topic) => (
              <Link key={topic.id} to={`/topic/${topic.id}`} className="block h-full">
                <Card className="group h-full cursor-pointer rounded-md transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                  <CardHeader className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <CardTitle className="text-lg leading-6 transition-colors group-hover:text-primary">
                        {topic?.title}
                      </CardTitle>
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <ChevronRight className="h-5 w-5" />
                      </span>
                    </div>
                    {topic?.description && (
                      <CardDescription className="mt-3 leading-6">{topic?.description}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

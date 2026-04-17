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
      } catch (e: any) {
        if (cancelled) return;
        console.error("[Index] fetch error", e);
        setError(e?.message || String(e));
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-3">
            Code <span className="text-primary">Lib</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Browse organized programming topics, subtopics, and ready-to-run code examples.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 text-destructive">
            <p className="text-lg">Error loading topics: {error}</p>
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No topics available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((topic) => (
              <Link key={topic.id} to={`/topic/${topic.id}`}>
                <Card className="group hover:shadow-lg hover:border-primary/40 transition-all duration-200 cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {topic?.title}
                      </CardTitle>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    {topic?.description && (
                      <CardDescription>{topic?.description}</CardDescription>
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

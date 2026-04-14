import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { CodeBlock } from "@/components/CodeBlock";
import { ChevronLeft, ChevronDown, ChevronRight, FileCode } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Subtopic {
  id: string;
  title: string;
  description: string | null;
}

interface Program {
  id: string;
  title: string;
  description: string | null;
  language: string;
  code: string;
  subtopic_id: string;
}

export default function TopicPage() {
  const { topicId } = useParams();
  const [topicTitle, setTopicTitle] = useState("");
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [openSubtopics, setOpenSubtopics] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!topicId) return;
    Promise.all([
      supabase.from("topics").select("title").eq("id", topicId).single(),
      supabase.from("subtopics").select("*").eq("topic_id", topicId).order("sort_order"),
      supabase.from("programs").select("*").order("sort_order"),
    ]).then(([topicRes, subRes, progRes]) => {
      setTopicTitle(topicRes.data?.title || "");
      const subs = subRes.data || [];
      setSubtopics(subs);
      // Filter programs to only those belonging to this topic's subtopics
      const subIds = new Set(subs.map((s) => s.id));
      setPrograms((progRes.data || []).filter((p) => subIds.has(p.subtopic_id)));
      setLoading(false);
    });
  }, [topicId]);

  const toggleSubtopic = (id: string) => {
    setOpenSubtopics((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Topics
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">{topicTitle}</h1>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : subtopics.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No subtopics yet.</p>
        ) : (
          <div className="space-y-4">
            {subtopics.map((sub) => {
              const subPrograms = programs.filter((p) => p.subtopic_id === sub.id);
              return (
                <Collapsible
                  key={sub.id}
                  open={openSubtopics.has(sub.id)}
                  onOpenChange={() => toggleSubtopic(sub.id)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileCode className="h-5 w-5 text-primary" />
                        <div className="text-left">
                          <h2 className="font-semibold text-foreground">{sub.title}</h2>
                          {sub.description && (
                            <p className="text-sm text-muted-foreground">{sub.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                          {subPrograms.length} program{subPrograms.length !== 1 ? "s" : ""}
                        </span>
                        {openSubtopics.has(sub.id) ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-3 space-y-6 pl-4 border-l-2 border-primary/20 ml-6">
                      {subPrograms.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-4">No programs yet.</p>
                      ) : (
                        subPrograms.map((prog) => (
                          <div key={prog.id} className="space-y-2">
                            <h3 className="font-medium text-foreground">{prog.title}</h3>
                            {prog.description && (
                              <p className="text-sm text-muted-foreground">{prog.description}</p>
                            )}
                            <CodeBlock code={prog.code} language={prog.language} title={prog.title} />
                          </div>
                        ))
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

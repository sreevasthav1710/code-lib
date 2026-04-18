import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase, SUPABASE_CONFIGURED } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { CodeBlock } from "@/components/CodeBlock";
import { ChevronLeft, ChevronDown, ChevronRight, FileCode, Layers, Code, Play } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Subtopic {
  id: string;
  title: string;
  description: string | null;
}

interface SubSubtopic {
  id: string;
  subtopic_id: string;
  title: string;
  description: string | null;
}

interface Program {
  id: string;
  title: string;
  description: string | null;
  language: string;
  code: string;
  sub_subtopic_id: string | null;
  subtopic_id: string;
}

export default function TopicPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [topicTitle, setTopicTitle] = useState("");
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [subSubtopics, setSubSubtopics] = useState<SubSubtopic[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [openSubtopics, setOpenSubtopics] = useState<Set<string>>(new Set());
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!topicId) return;
    let mounted = true;
    const fetchTopic = async () => {
      setLoading(true);
      setError(null);
      if (!SUPABASE_CONFIGURED) {
        console.error('[TopicPage] Supabase not configured');
        setTopicTitle(''); setSubtopics([]); setSubSubtopics([]); setPrograms([]);
        setError('Supabase not configured');
        setLoading(false);
        return;
      }
      try {
        const [topicRes, subRes] = await Promise.all([
          supabase.from("topics").select("*").eq("id", topicId).single(),
          supabase.from("subtopics").select("*").eq("topic_id", topicId).order("sort_order"),
        ]);
        console.log('[TopicPage] topicRes, subRes', { topicRes, subRes });
        setTopicTitle(topicRes.data?.title || "");
        const subs = subRes.data || [];
        if (mounted) setSubtopics(subs);
        console.log('[TopicPage] setSubtopics count:', subs.length);
        const subIds = subs.map((s) => s.id);
        if (subIds.length > 0) {
          const [ssRes, progRes] = await Promise.all([
            supabase.from("sub_subtopics").select("*").in("subtopic_id", subIds).order("sort_order"),
            supabase.from("programs").select("*").in("subtopic_id", subIds).order("sort_order"),
          ]);
          console.log('[TopicPage] sub-sub and programs', { ssRes, progRes });
          if (mounted) setSubSubtopics(ssRes.data || []);
          if (mounted) setPrograms(progRes.data || []);
          console.log('[TopicPage] setSubSubtopics count:', (ssRes.data || []).length, 'programs count:', (progRes.data || []).length);
        } else {
          if (mounted) { setSubSubtopics([]); setPrograms([]); }
        }
      } catch (e: unknown) {
        console.error('[TopicPage] fetch error', e);
        setError(e instanceof Error ? e.message : String(e));
        if (mounted) { setSubtopics([]); setSubSubtopics([]); setPrograms([]); setTopicTitle(''); }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTopic();
    return () => { mounted = false; };
  }, [topicId]);

  useEffect(() => {
    console.log('[TopicPage] states', { topicTitle, subtopicsCount: subtopics.length, subSubtopicsCount: subSubtopics.length, programsCount: programs.length });
  }, [topicTitle, subtopics, subSubtopics, programs]);

  const toggleSubtopic = (id: string) => {
    setOpenSubtopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const runInPlayground = (program: Program) => {
    sessionStorage.setItem("codelib-playground-code", program.code);
    sessionStorage.setItem("codelib-playground-title", program.title);
    navigate("/playground", {
      state: {
        code: program.code,
        title: program.title,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Topics
        </Link>

        <h1 className="mb-6 break-words text-2xl font-bold leading-tight text-foreground sm:mb-8 sm:text-3xl">{topicTitle}</h1>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-md bg-muted sm:h-16" />)}
          </div>
        ) : error ? (
          <div className="text-center py-20 text-destructive">
            <p className="text-lg">Error loading topic: {error}</p>
          </div>
        ) : subtopics.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No subtopics yet.</p>
        ) : (
          <div className="space-y-4">
            {subtopics.map((sub) => {
              const childSubSubtopics = subSubtopics.filter((ss) => ss.subtopic_id === sub.id);
              return (
                <Collapsible key={sub.id} open={openSubtopics.has(sub.id)} onOpenChange={() => toggleSubtopic(sub.id)}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3 sm:items-center">
                        <FileCode className="mt-0.5 h-5 w-5 shrink-0 text-primary sm:mt-0" />
                        <div className="min-w-0">
                          <h2 className="break-words font-semibold text-foreground">{sub.title}</h2>
                          {sub.description && <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{sub.description}</p>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                          {childSubSubtopics.length} sub-topic{childSubSubtopics.length !== 1 ? "s" : ""}
                        </span>
                        {openSubtopics.has(sub.id) ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-3 mt-3 space-y-2 border-l-2 border-primary/20 pl-3 sm:ml-6 sm:pl-4">
                      {childSubSubtopics.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-4">No sub-subtopics yet.</p>
                      ) : (
                        childSubSubtopics.map((ss) => {
                          const ssPrograms = programs.filter((p) => p.sub_subtopic_id === ss.id);
                          return (
                            <div key={ss.id} className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                                <Layers className="h-4 w-4 shrink-0 text-accent" />
                                <h3 className="text-sm font-medium text-foreground">{ss.title}</h3>
                                {ss.description && <span className="text-xs leading-5 text-muted-foreground">- {ss.description}</span>}
                              </div>
                              <div className="grid grid-cols-1 gap-2 pl-0 sm:grid-cols-2 sm:pl-6">
                                {ssPrograms.map((prog) => (
                                  <button
                                    key={prog.id}
                                    onClick={() => setSelectedProgram(prog)}
                                    className="group flex min-w-0 items-start gap-2 rounded-md border border-border bg-muted/50 p-3 text-left transition-all hover:border-primary/50 hover:bg-muted sm:items-center"
                                  >
                                    <Code className="mt-0.5 h-4 w-4 shrink-0 text-primary transition-transform group-hover:scale-110 sm:mt-0" />
                                    <div className="min-w-0">
                                      <p className="break-words text-sm font-medium text-foreground transition-colors group-hover:text-primary">{prog.title}</p>
                                      {prog.description && <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{prog.description}</p>}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </main>

      {/* Code Modal */}
      <Dialog open={!!selectedProgram} onOpenChange={() => setSelectedProgram(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto rounded-md sm:w-full">
          {selectedProgram && (
            <>
              <DialogHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <DialogTitle>{selectedProgram.title}</DialogTitle>
                    {selectedProgram.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{selectedProgram.description}</p>
                    )}
                  </div>
                  <Button onClick={() => runInPlayground(selectedProgram)} className="w-full sm:w-auto">
                    <Play className="mr-2 h-4 w-4" />
                    Run in Playground
                  </Button>
                </div>
              </DialogHeader>
              <div className="mt-4">
                <CodeBlock code={selectedProgram.code} language={selectedProgram.language} title={selectedProgram.title} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

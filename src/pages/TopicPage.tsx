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
          // @ts-ignore
          supabase.from("topics").select("*").eq("id", topicId).single(),
          // @ts-ignore
          supabase.from("subtopics").select("*").eq("topic_id", topicId).order("sort_order"),
        ]);
        // @ts-ignore
        console.log('[TopicPage] topicRes, subRes', { topicRes, subRes });
        // @ts-ignore
        setTopicTitle(topicRes.data?.title || "");
        // @ts-ignore
        const subs = subRes.data || [];
        if (mounted) setSubtopics(subs);
        console.log('[TopicPage] setSubtopics count:', subs.length);
        const subIds = subs.map((s: any) => s.id);
        if (subIds.length > 0) {
          // @ts-ignore
          const [ssRes, progRes] = await Promise.all([
            supabase.from("sub_subtopics").select("*").in("subtopic_id", subIds).order("sort_order"),
            supabase.from("programs").select("*").in("subtopic_id", subIds).order("sort_order"),
          ]);
          // @ts-ignore
          console.log('[TopicPage] sub-sub and programs', { ssRes, progRes });
          // @ts-ignore
          if (mounted) setSubSubtopics(ssRes.data || []);
          // @ts-ignore
          if (mounted) setPrograms(progRes.data || []);
          console.log('[TopicPage] setSubSubtopics count:', (ssRes.data || []).length, 'programs count:', (progRes.data || []).length);
        } else {
          if (mounted) { setSubSubtopics([]); setPrograms([]); }
        }
      } catch (e: any) {
        console.error('[TopicPage] fetch error', e);
        setError(e?.message || String(e));
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
      next.has(id) ? next.delete(id) : next.add(id);
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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Topics
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">{topicTitle}</h1>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
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
                    <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileCode className="h-5 w-5 text-primary" />
                        <div className="text-left">
                          <h2 className="font-semibold text-foreground">{sub.title}</h2>
                          {sub.description && <p className="text-sm text-muted-foreground">{sub.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                          {childSubSubtopics.length} sub-topic{childSubSubtopics.length !== 1 ? "s" : ""}
                        </span>
                        {openSubtopics.has(sub.id) ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-3 space-y-2 pl-4 border-l-2 border-primary/20 ml-6">
                      {childSubSubtopics.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-4">No sub-subtopics yet.</p>
                      ) : (
                        childSubSubtopics.map((ss) => {
                          const ssPrograms = programs.filter((p) => p.sub_subtopic_id === ss.id);
                          return (
                            <div key={ss.id} className="space-y-1">
                              <div className="flex items-center gap-2 py-2 px-3">
                                <Layers className="h-4 w-4 text-accent" />
                                <h3 className="font-medium text-foreground text-sm">{ss.title}</h3>
                                {ss.description && <span className="text-xs text-muted-foreground">— {ss.description}</span>}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                                {ssPrograms.map((prog) => (
                                  <button
                                    key={prog.id}
                                    onClick={() => setSelectedProgram(prog)}
                                    className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/50 hover:bg-muted transition-all text-left group"
                                  >
                                    <Code className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                                    <div>
                                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{prog.title}</p>
                                      {prog.description && <p className="text-xs text-muted-foreground line-clamp-1">{prog.description}</p>}
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
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedProgram && (
            <>
              <DialogHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <DialogTitle>{selectedProgram.title}</DialogTitle>
                    {selectedProgram.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{selectedProgram.description}</p>
                    )}
                  </div>
                  <Button onClick={() => runInPlayground(selectedProgram)}>
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

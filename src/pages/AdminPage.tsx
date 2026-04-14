import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Topic { id: string; title: string; description: string | null; sort_order: number | null; }
interface Subtopic { id: string; topic_id: string; title: string; description: string | null; sort_order: number | null; }
interface Program { id: string; subtopic_id: string; title: string; description: string | null; language: string; code: string; sort_order: number | null; }

export default function AdminPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  // Form state
  const [topicForm, setTopicForm] = useState({ title: "", description: "", sort_order: 0 });
  const [subtopicForm, setSubtopicForm] = useState({ topic_id: "", title: "", description: "", sort_order: 0 });
  const [programForm, setProgramForm] = useState({ subtopic_id: "", title: "", description: "", language: "c", code: "", sort_order: 0 });

  // Edit state
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingSubtopic, setEditingSubtopic] = useState<Subtopic | null>(null);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate("/");
  }, [isAdmin, authLoading, navigate]);

  const fetchAll = async () => {
    const [t, s, p] = await Promise.all([
      supabase.from("topics").select("*").order("sort_order"),
      supabase.from("subtopics").select("*").order("sort_order"),
      supabase.from("programs").select("*").order("sort_order"),
    ]);
    setTopics(t.data || []);
    setSubtopics(s.data || []);
    setPrograms(p.data || []);
  };

  useEffect(() => { if (isAdmin) fetchAll(); }, [isAdmin]);

  // CRUD handlers
  const addTopic = async () => {
    const { error } = await supabase.from("topics").insert(topicForm);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Topic added!" });
    setTopicForm({ title: "", description: "", sort_order: 0 });
    fetchAll();
  };

  const updateTopic = async () => {
    if (!editingTopic) return;
    const { error } = await supabase.from("topics").update({
      title: editingTopic.title,
      description: editingTopic.description,
      sort_order: editingTopic.sort_order,
    }).eq("id", editingTopic.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Topic updated!" });
    setEditingTopic(null);
    fetchAll();
  };

  const deleteTopic = async (id: string) => {
    await supabase.from("topics").delete().eq("id", id);
    toast({ title: "Topic deleted" });
    fetchAll();
  };

  const addSubtopic = async () => {
    if (!subtopicForm.topic_id) { toast({ title: "Select a topic first", variant: "destructive" }); return; }
    const { error } = await supabase.from("subtopics").insert(subtopicForm);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Subtopic added!" });
    setSubtopicForm({ topic_id: "", title: "", description: "", sort_order: 0 });
    fetchAll();
  };

  const updateSubtopic = async () => {
    if (!editingSubtopic) return;
    const { error } = await supabase.from("subtopics").update({
      title: editingSubtopic.title,
      description: editingSubtopic.description,
      topic_id: editingSubtopic.topic_id,
      sort_order: editingSubtopic.sort_order,
    }).eq("id", editingSubtopic.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Subtopic updated!" });
    setEditingSubtopic(null);
    fetchAll();
  };

  const deleteSubtopic = async (id: string) => {
    await supabase.from("subtopics").delete().eq("id", id);
    toast({ title: "Subtopic deleted" });
    fetchAll();
  };

  const addProgram = async () => {
    if (!programForm.subtopic_id) { toast({ title: "Select a subtopic first", variant: "destructive" }); return; }
    const { error } = await supabase.from("programs").insert(programForm);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Program added!" });
    setProgramForm({ subtopic_id: "", title: "", description: "", language: "c", code: "", sort_order: 0 });
    fetchAll();
  };

  const updateProgram = async () => {
    if (!editingProgram) return;
    const { error } = await supabase.from("programs").update({
      title: editingProgram.title,
      description: editingProgram.description,
      subtopic_id: editingProgram.subtopic_id,
      language: editingProgram.language,
      code: editingProgram.code,
      sort_order: editingProgram.sort_order,
    }).eq("id", editingProgram.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Program updated!" });
    setEditingProgram(null);
    fetchAll();
  };

  const deleteProgram = async (id: string) => {
    await supabase.from("programs").delete().eq("id", id);
    toast({ title: "Program deleted" });
    fetchAll();
  };

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-foreground">Loading...</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">Admin Panel</h1>

        <Tabs defaultValue="topics">
          <TabsList className="mb-6">
            <TabsTrigger value="topics">Topics</TabsTrigger>
            <TabsTrigger value="subtopics">Subtopics</TabsTrigger>
            <TabsTrigger value="programs">Programs</TabsTrigger>
          </TabsList>

          {/* TOPICS */}
          <TabsContent value="topics">
            <Card className="mb-6">
              <CardHeader><CardTitle className="text-lg">Add Topic</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={topicForm.title} onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={topicForm.description} onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })} />
                </div>
                <div>
                  <Label>Sort Order</Label>
                  <Input type="number" value={topicForm.sort_order} onChange={(e) => setTopicForm({ ...topicForm, sort_order: Number(e.target.value) })} />
                </div>
                <Button onClick={addTopic} disabled={!topicForm.title}><Plus className="h-4 w-4 mr-1" />Add Topic</Button>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {topics.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
                  <div>
                    <h3 className="font-medium text-foreground">{t.title}</h3>
                    {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setEditingTopic({ ...t })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Edit Topic</DialogTitle></DialogHeader>
                        {editingTopic && (
                          <div className="space-y-3">
                            <div><Label>Title</Label><Input value={editingTopic.title} onChange={(e) => setEditingTopic({ ...editingTopic, title: e.target.value })} /></div>
                            <div><Label>Description</Label><Input value={editingTopic.description || ""} onChange={(e) => setEditingTopic({ ...editingTopic, description: e.target.value })} /></div>
                            <div><Label>Sort Order</Label><Input type="number" value={editingTopic.sort_order || 0} onChange={(e) => setEditingTopic({ ...editingTopic, sort_order: Number(e.target.value) })} /></div>
                            <Button onClick={updateTopic}>Save Changes</Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="icon" onClick={() => deleteTopic(t.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* SUBTOPICS */}
          <TabsContent value="subtopics">
            <Card className="mb-6">
              <CardHeader><CardTitle className="text-lg">Add Subtopic</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Parent Topic</Label>
                  <Select value={subtopicForm.topic_id} onValueChange={(v) => setSubtopicForm({ ...subtopicForm, topic_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select topic" /></SelectTrigger>
                    <SelectContent>
                      {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Title</Label><Input value={subtopicForm.title} onChange={(e) => setSubtopicForm({ ...subtopicForm, title: e.target.value })} /></div>
                <div><Label>Description</Label><Input value={subtopicForm.description} onChange={(e) => setSubtopicForm({ ...subtopicForm, description: e.target.value })} /></div>
                <div><Label>Sort Order</Label><Input type="number" value={subtopicForm.sort_order} onChange={(e) => setSubtopicForm({ ...subtopicForm, sort_order: Number(e.target.value) })} /></div>
                <Button onClick={addSubtopic} disabled={!subtopicForm.title || !subtopicForm.topic_id}><Plus className="h-4 w-4 mr-1" />Add Subtopic</Button>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {subtopics.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
                  <div>
                    <h3 className="font-medium text-foreground">{s.title}</h3>
                    <p className="text-xs text-muted-foreground">Topic: {topics.find((t) => t.id === s.topic_id)?.title}</p>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setEditingSubtopic({ ...s })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Edit Subtopic</DialogTitle></DialogHeader>
                        {editingSubtopic && (
                          <div className="space-y-3">
                            <div>
                              <Label>Parent Topic</Label>
                              <Select value={editingSubtopic.topic_id} onValueChange={(v) => setEditingSubtopic({ ...editingSubtopic, topic_id: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div><Label>Title</Label><Input value={editingSubtopic.title} onChange={(e) => setEditingSubtopic({ ...editingSubtopic, title: e.target.value })} /></div>
                            <div><Label>Description</Label><Input value={editingSubtopic.description || ""} onChange={(e) => setEditingSubtopic({ ...editingSubtopic, description: e.target.value })} /></div>
                            <Button onClick={updateSubtopic}>Save Changes</Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="icon" onClick={() => deleteSubtopic(s.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* PROGRAMS */}
          <TabsContent value="programs">
            <Card className="mb-6">
              <CardHeader><CardTitle className="text-lg">Add Program</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Subtopic</Label>
                  <Select value={programForm.subtopic_id} onValueChange={(v) => setProgramForm({ ...programForm, subtopic_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select subtopic" /></SelectTrigger>
                    <SelectContent>
                      {subtopics.map((s) => <SelectItem key={s.id} value={s.id}>{topics.find(t => t.id === s.topic_id)?.title} → {s.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Title</Label><Input value={programForm.title} onChange={(e) => setProgramForm({ ...programForm, title: e.target.value })} /></div>
                <div><Label>Description</Label><Input value={programForm.description} onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })} /></div>
                <div>
                  <Label>Language</Label>
                  <Input value={programForm.language} onChange={(e) => setProgramForm({ ...programForm, language: e.target.value })} placeholder="c, python, java..." />
                </div>
                <div>
                  <Label>Code</Label>
                  <Textarea value={programForm.code} onChange={(e) => setProgramForm({ ...programForm, code: e.target.value })} rows={12} className="font-mono text-sm" />
                </div>
                <div><Label>Sort Order</Label><Input type="number" value={programForm.sort_order} onChange={(e) => setProgramForm({ ...programForm, sort_order: Number(e.target.value) })} /></div>
                <Button onClick={addProgram} disabled={!programForm.title || !programForm.subtopic_id || !programForm.code}><Plus className="h-4 w-4 mr-1" />Add Program</Button>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {programs.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
                  <div>
                    <h3 className="font-medium text-foreground">{p.title}</h3>
                    <p className="text-xs text-muted-foreground">{p.language} • {subtopics.find(s => s.id === p.subtopic_id)?.title}</p>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setEditingProgram({ ...p })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Edit Program</DialogTitle></DialogHeader>
                        {editingProgram && (
                          <div className="space-y-3">
                            <div>
                              <Label>Subtopic</Label>
                              <Select value={editingProgram.subtopic_id} onValueChange={(v) => setEditingProgram({ ...editingProgram, subtopic_id: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{subtopics.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div><Label>Title</Label><Input value={editingProgram.title} onChange={(e) => setEditingProgram({ ...editingProgram, title: e.target.value })} /></div>
                            <div><Label>Description</Label><Input value={editingProgram.description || ""} onChange={(e) => setEditingProgram({ ...editingProgram, description: e.target.value })} /></div>
                            <div><Label>Language</Label><Input value={editingProgram.language} onChange={(e) => setEditingProgram({ ...editingProgram, language: e.target.value })} /></div>
                            <div><Label>Code</Label><Textarea value={editingProgram.code} onChange={(e) => setEditingProgram({ ...editingProgram, code: e.target.value })} rows={12} className="font-mono text-sm" /></div>
                            <Button onClick={updateProgram}>Save Changes</Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="icon" onClick={() => deleteProgram(p.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

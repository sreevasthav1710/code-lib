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
interface SubSubtopic { id: string; subtopic_id: string; title: string; description: string | null; sort_order: number | null; }
interface Program { id: string; subtopic_id: string; sub_subtopic_id: string | null; title: string; description: string | null; language: string; code: string; sort_order: number | null; }

export default function AdminPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [subSubtopics, setSubSubtopics] = useState<SubSubtopic[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  const [topicForm, setTopicForm] = useState({ title: "", description: "", sort_order: 0 });
  const [subtopicForm, setSubtopicForm] = useState({ topic_id: "", title: "", description: "", sort_order: 0 });
  const [subSubtopicForm, setSubSubtopicForm] = useState({ subtopic_id: "", title: "", description: "", sort_order: 0 });
  const [programForm, setProgramForm] = useState({ subtopic_id: "", sub_subtopic_id: "", title: "", description: "", language: "c", code: "", sort_order: 0 });

  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingSubtopic, setEditingSubtopic] = useState<Subtopic | null>(null);
  const [editingSubSubtopic, setEditingSubSubtopic] = useState<SubSubtopic | null>(null);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  useEffect(() => { if (!authLoading && !isAdmin) navigate("/"); }, [isAdmin, authLoading, navigate]);

  const fetchAll = async () => {
    const [t, s, ss, p] = await Promise.all([
      supabase.from("topics").select("*").order("sort_order"),
      supabase.from("subtopics").select("*").order("sort_order"),
      supabase.from("sub_subtopics").select("*").order("sort_order"),
      supabase.from("programs").select("*").order("sort_order"),
    ]);
    setTopics(t.data || []);
    setSubtopics(s.data || []);
    setSubSubtopics(ss.data || []);
    setPrograms(p.data || []);
  };

  useEffect(() => { if (isAdmin) fetchAll(); }, [isAdmin]);

  // Topic CRUD
  const addTopic = async () => {
    const { error } = await supabase.from("topics").insert(topicForm);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Topic added!" }); setTopicForm({ title: "", description: "", sort_order: 0 }); fetchAll();
  };
  const updateTopic = async () => {
    if (!editingTopic) return;
    const { error } = await supabase.from("topics").update({ title: editingTopic.title, description: editingTopic.description, sort_order: editingTopic.sort_order }).eq("id", editingTopic.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Topic updated!" }); setEditingTopic(null); fetchAll();
  };
  const deleteTopic = async (id: string) => { await supabase.from("topics").delete().eq("id", id); toast({ title: "Topic deleted" }); fetchAll(); };

  // Subtopic CRUD
  const addSubtopic = async () => {
    if (!subtopicForm.topic_id) { toast({ title: "Select a topic first", variant: "destructive" }); return; }
    const { error } = await supabase.from("subtopics").insert(subtopicForm);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Subtopic added!" }); setSubtopicForm({ topic_id: "", title: "", description: "", sort_order: 0 }); fetchAll();
  };
  const updateSubtopic = async () => {
    if (!editingSubtopic) return;
    const { error } = await supabase.from("subtopics").update({ title: editingSubtopic.title, description: editingSubtopic.description, topic_id: editingSubtopic.topic_id, sort_order: editingSubtopic.sort_order }).eq("id", editingSubtopic.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Subtopic updated!" }); setEditingSubtopic(null); fetchAll();
  };
  const deleteSubtopic = async (id: string) => { await supabase.from("subtopics").delete().eq("id", id); toast({ title: "Subtopic deleted" }); fetchAll(); };

  // Sub-Subtopic CRUD
  const addSubSubtopic = async () => {
    if (!subSubtopicForm.subtopic_id) { toast({ title: "Select a subtopic first", variant: "destructive" }); return; }
    const { error } = await supabase.from("sub_subtopics").insert(subSubtopicForm);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Sub-subtopic added!" }); setSubSubtopicForm({ subtopic_id: "", title: "", description: "", sort_order: 0 }); fetchAll();
  };
  const updateSubSubtopic = async () => {
    if (!editingSubSubtopic) return;
    const { error } = await supabase.from("sub_subtopics").update({ title: editingSubSubtopic.title, description: editingSubSubtopic.description, subtopic_id: editingSubSubtopic.subtopic_id, sort_order: editingSubSubtopic.sort_order }).eq("id", editingSubSubtopic.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Sub-subtopic updated!" }); setEditingSubSubtopic(null); fetchAll();
  };
  const deleteSubSubtopic = async (id: string) => { await supabase.from("sub_subtopics").delete().eq("id", id); toast({ title: "Sub-subtopic deleted" }); fetchAll(); };

  // Program CRUD
  const addProgram = async () => {
    if (!programForm.sub_subtopic_id) { toast({ title: "Select a sub-subtopic first", variant: "destructive" }); return; }
    // Find the parent subtopic_id from the sub_subtopic
    const parentSS = subSubtopics.find(ss => ss.id === programForm.sub_subtopic_id);
    const { error } = await supabase.from("programs").insert({
      ...programForm,
      subtopic_id: parentSS?.subtopic_id || programForm.subtopic_id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Program added!" }); setProgramForm({ subtopic_id: "", sub_subtopic_id: "", title: "", description: "", language: "c", code: "", sort_order: 0 }); fetchAll();
  };
  const updateProgram = async () => {
    if (!editingProgram) return;
    const { error } = await supabase.from("programs").update({
      title: editingProgram.title, description: editingProgram.description,
      sub_subtopic_id: editingProgram.sub_subtopic_id, subtopic_id: editingProgram.subtopic_id,
      language: editingProgram.language, code: editingProgram.code, sort_order: editingProgram.sort_order,
    }).eq("id", editingProgram.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Program updated!" }); setEditingProgram(null); fetchAll();
  };
  const deleteProgram = async (id: string) => { await supabase.from("programs").delete().eq("id", id); toast({ title: "Program deleted" }); fetchAll(); };

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-foreground">Loading...</div>;
  if (!isAdmin) return null;

  const ItemRow = ({ title, subtitle, onEdit, onDelete }: { title: string; subtitle?: string; onEdit: () => void; onDelete: () => void }) => (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="break-words font-medium text-foreground">{title}</h3>
        {subtitle && <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 justify-end gap-2">
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label={`Edit ${title}`} title="Edit"><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive" aria-label={`Delete ${title}`} title="Delete"><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-5 text-2xl font-bold leading-tight text-foreground sm:mb-6 sm:text-3xl">Admin Panel</h1>

        <Tabs defaultValue="topics">
          <TabsList className="mb-6 grid h-auto w-full grid-cols-2 gap-1 sm:inline-grid sm:w-auto sm:grid-cols-4">
            <TabsTrigger value="topics">Topics</TabsTrigger>
            <TabsTrigger value="subtopics">Subtopics</TabsTrigger>
            <TabsTrigger value="subsubtopics">Sub-Subs</TabsTrigger>
            <TabsTrigger value="programs">Programs</TabsTrigger>
          </TabsList>

          {/* TOPICS */}
          <TabsContent value="topics">
            <Card className="mb-6">
              <CardHeader><CardTitle className="text-lg">Add Topic</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Title</Label><Input value={topicForm.title} onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })} /></div>
                <div><Label>Description</Label><Input value={topicForm.description} onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })} /></div>
                <div><Label>Sort Order</Label><Input type="number" value={topicForm.sort_order} onChange={(e) => setTopicForm({ ...topicForm, sort_order: Number(e.target.value) })} /></div>
                <Button onClick={addTopic} disabled={!topicForm.title} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" />Add Topic</Button>
              </CardContent>
            </Card>
            <div className="space-y-3">
              {topics.map((t) => (
                <div key={t.id}>
                  <ItemRow title={t.title} subtitle={t.description || undefined} onEdit={() => setEditingTopic({ ...t })} onDelete={() => deleteTopic(t.id)} />
                </div>
              ))}
            </div>
            <Dialog open={!!editingTopic} onOpenChange={(o) => !o && setEditingTopic(null)}>
              <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] overflow-y-auto rounded-md sm:w-full">
                <DialogHeader><DialogTitle>Edit Topic</DialogTitle></DialogHeader>
                {editingTopic && (
                  <div className="space-y-3">
                    <div><Label>Title</Label><Input value={editingTopic.title} onChange={(e) => setEditingTopic({ ...editingTopic, title: e.target.value })} /></div>
                    <div><Label>Description</Label><Input value={editingTopic.description || ""} onChange={(e) => setEditingTopic({ ...editingTopic, description: e.target.value })} /></div>
                    <div><Label>Sort Order</Label><Input type="number" value={editingTopic.sort_order || 0} onChange={(e) => setEditingTopic({ ...editingTopic, sort_order: Number(e.target.value) })} /></div>
                    <Button onClick={updateTopic} className="w-full sm:w-auto">Save Changes</Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
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
                    <SelectContent>{topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Title</Label><Input value={subtopicForm.title} onChange={(e) => setSubtopicForm({ ...subtopicForm, title: e.target.value })} /></div>
                <div><Label>Description</Label><Input value={subtopicForm.description} onChange={(e) => setSubtopicForm({ ...subtopicForm, description: e.target.value })} /></div>
                <div><Label>Sort Order</Label><Input type="number" value={subtopicForm.sort_order} onChange={(e) => setSubtopicForm({ ...subtopicForm, sort_order: Number(e.target.value) })} /></div>
                <Button onClick={addSubtopic} disabled={!subtopicForm.title || !subtopicForm.topic_id} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" />Add Subtopic</Button>
              </CardContent>
            </Card>
            <div className="space-y-3">
              {subtopics.map((s) => (
                <ItemRow key={s.id} title={s.title} subtitle={`Topic: ${topics.find((t) => t.id === s.topic_id)?.title}`} onEdit={() => setEditingSubtopic({ ...s })} onDelete={() => deleteSubtopic(s.id)} />
              ))}
            </div>
            <Dialog open={!!editingSubtopic} onOpenChange={(o) => !o && setEditingSubtopic(null)}>
              <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] overflow-y-auto rounded-md sm:w-full">
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
                    <Button onClick={updateSubtopic} className="w-full sm:w-auto">Save Changes</Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* SUB-SUBTOPICS */}
          <TabsContent value="subsubtopics">
            <Card className="mb-6">
              <CardHeader><CardTitle className="text-lg">Add Sub-Subtopic</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Parent Subtopic</Label>
                  <Select value={subSubtopicForm.subtopic_id} onValueChange={(v) => setSubSubtopicForm({ ...subSubtopicForm, subtopic_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select subtopic" /></SelectTrigger>
                    <SelectContent>{subtopics.map((s) => <SelectItem key={s.id} value={s.id}>{topics.find(t => t.id === s.topic_id)?.title} &gt; {s.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Title</Label><Input value={subSubtopicForm.title} onChange={(e) => setSubSubtopicForm({ ...subSubtopicForm, title: e.target.value })} /></div>
                <div><Label>Description</Label><Input value={subSubtopicForm.description} onChange={(e) => setSubSubtopicForm({ ...subSubtopicForm, description: e.target.value })} /></div>
                <div><Label>Sort Order</Label><Input type="number" value={subSubtopicForm.sort_order} onChange={(e) => setSubSubtopicForm({ ...subSubtopicForm, sort_order: Number(e.target.value) })} /></div>
                <Button onClick={addSubSubtopic} disabled={!subSubtopicForm.title || !subSubtopicForm.subtopic_id} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" />Add Sub-Subtopic</Button>
              </CardContent>
            </Card>
            <div className="space-y-3">
              {subSubtopics.map((ss) => (
                <ItemRow key={ss.id} title={ss.title} subtitle={`Subtopic: ${subtopics.find((s) => s.id === ss.subtopic_id)?.title}`} onEdit={() => setEditingSubSubtopic({ ...ss })} onDelete={() => deleteSubSubtopic(ss.id)} />
              ))}
            </div>
            <Dialog open={!!editingSubSubtopic} onOpenChange={(o) => !o && setEditingSubSubtopic(null)}>
              <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] overflow-y-auto rounded-md sm:w-full">
                <DialogHeader><DialogTitle>Edit Sub-Subtopic</DialogTitle></DialogHeader>
                {editingSubSubtopic && (
                  <div className="space-y-3">
                    <div>
                      <Label>Parent Subtopic</Label>
                      <Select value={editingSubSubtopic.subtopic_id} onValueChange={(v) => setEditingSubSubtopic({ ...editingSubSubtopic, subtopic_id: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{subtopics.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Title</Label><Input value={editingSubSubtopic.title} onChange={(e) => setEditingSubSubtopic({ ...editingSubSubtopic, title: e.target.value })} /></div>
                    <div><Label>Description</Label><Input value={editingSubSubtopic.description || ""} onChange={(e) => setEditingSubSubtopic({ ...editingSubSubtopic, description: e.target.value })} /></div>
                    <Button onClick={updateSubSubtopic} className="w-full sm:w-auto">Save Changes</Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* PROGRAMS */}
          <TabsContent value="programs">
            <Card className="mb-6">
              <CardHeader><CardTitle className="text-lg">Add Program</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Sub-Subtopic</Label>
                  <Select value={programForm.sub_subtopic_id} onValueChange={(v) => setProgramForm({ ...programForm, sub_subtopic_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select sub-subtopic" /></SelectTrigger>
                    <SelectContent>
                      {subSubtopics.map((ss) => {
                        const parentSub = subtopics.find(s => s.id === ss.subtopic_id);
                        const parentTopic = parentSub ? topics.find(t => t.id === parentSub.topic_id) : null;
                        return <SelectItem key={ss.id} value={ss.id}>{parentTopic?.title} &gt; {parentSub?.title} &gt; {ss.title}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Title</Label><Input value={programForm.title} onChange={(e) => setProgramForm({ ...programForm, title: e.target.value })} /></div>
                <div><Label>Description</Label><Input value={programForm.description} onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })} /></div>
                <div><Label>Language</Label><Input value={programForm.language} onChange={(e) => setProgramForm({ ...programForm, language: e.target.value })} placeholder="c, python, java..." /></div>
                <div><Label>Code</Label><Textarea value={programForm.code} onChange={(e) => setProgramForm({ ...programForm, code: e.target.value })} rows={12} className="font-mono text-sm" /></div>
                <div><Label>Sort Order</Label><Input type="number" value={programForm.sort_order} onChange={(e) => setProgramForm({ ...programForm, sort_order: Number(e.target.value) })} /></div>
                <Button onClick={addProgram} disabled={!programForm.title || !programForm.sub_subtopic_id || !programForm.code} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" />Add Program</Button>
              </CardContent>
            </Card>
            <div className="space-y-3">
              {programs.map((p) => (
                <ItemRow key={p.id} title={p.title} subtitle={`${p.language} - ${subSubtopics.find(ss => ss.id === p.sub_subtopic_id)?.title || subtopics.find(s => s.id === p.subtopic_id)?.title}`} onEdit={() => setEditingProgram({ ...p })} onDelete={() => deleteProgram(p.id)} />
              ))}
            </div>
            <Dialog open={!!editingProgram} onOpenChange={(o) => !o && setEditingProgram(null)}>
              <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto rounded-md sm:w-full">
                <DialogHeader><DialogTitle>Edit Program</DialogTitle></DialogHeader>
                {editingProgram && (
                  <div className="space-y-3">
                    <div>
                      <Label>Sub-Subtopic</Label>
                      <Select value={editingProgram.sub_subtopic_id || ""} onValueChange={(v) => setEditingProgram({ ...editingProgram, sub_subtopic_id: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{subSubtopics.map((ss) => <SelectItem key={ss.id} value={ss.id}>{ss.title}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Title</Label><Input value={editingProgram.title} onChange={(e) => setEditingProgram({ ...editingProgram, title: e.target.value })} /></div>
                    <div><Label>Description</Label><Input value={editingProgram.description || ""} onChange={(e) => setEditingProgram({ ...editingProgram, description: e.target.value })} /></div>
                    <div><Label>Language</Label><Input value={editingProgram.language} onChange={(e) => setEditingProgram({ ...editingProgram, language: e.target.value })} /></div>
                    <div><Label>Code</Label><Textarea value={editingProgram.code} onChange={(e) => setEditingProgram({ ...editingProgram, code: e.target.value })} rows={12} className="font-mono text-sm" /></div>
                    <Button onClick={updateProgram} className="w-full sm:w-auto">Save Changes</Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

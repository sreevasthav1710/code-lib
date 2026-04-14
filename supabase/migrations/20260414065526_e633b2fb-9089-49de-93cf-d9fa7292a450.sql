
-- Create sub_subtopics table
CREATE TABLE public.sub_subtopics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subtopic_id UUID REFERENCES public.subtopics(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sub_subtopics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sub-subtopics readable by everyone" ON public.sub_subtopics FOR SELECT USING (true);
CREATE POLICY "Admins can manage sub-subtopics" ON public.sub_subtopics FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_sub_subtopics_updated_at BEFORE UPDATE ON public.sub_subtopics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add sub_subtopic_id to programs (nullable for migration, then we'll move data)
ALTER TABLE public.programs ADD COLUMN sub_subtopic_id UUID REFERENCES public.sub_subtopics(id) ON DELETE CASCADE;

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, EyeOff, Megaphone, Pencil, Plus, Search, Tags, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { EmptyState } from "@/components/common/EmptyState";
import { ListSkeleton } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { Pager } from "@/components/common/Pager";
import { Panel } from "@/components/common/Section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { announcementCategoriesQuery, managedAnnouncementsQuery } from "@/lib/api/announcements";
import { fmtDate } from "@/lib/format";
import { requirePermission } from "@/lib/guards";

export const Route = createFileRoute("/_authenticated/_shell/admin/announcements/")({
  beforeLoad: ({ context }) => requirePermission(context.queryClient, "manage_announcements"),
  head: () => ({ meta: [{ title: "Announcements — MyPag-asa Admin" }, { name: "description", content: "Create and publish barangay announcements." }] }),
  component: ManageAnnouncements,
});

function ManageAnnouncements() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [status, setStatus] = useState("all");
  const [cat, setCat] = useState("all");
  const [page, setPage] = useState(1);
  useEffect(() => { const t = setTimeout(() => { setDq(q); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  const { data: cats } = useQuery(announcementCategoriesQuery);
  const { data, isLoading } = useQuery(managedAnnouncementsQuery({ q: dq, status, categoryId: cat === "all" ? undefined : cat, page }));
  const refresh = () => { qc.invalidateQueries({ queryKey: ["announcements"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); };

  async function setPublished(id: string, publish: boolean) {
    const { error } = await supabase.from("announcements").update({ status: publish ? "published" : "draft" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(publish ? "Published — residents have been notified." : "Unpublished");
    refresh();
  }
  async function remove(id: string, image: string | null) {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (image) await supabase.storage.from("media").remove([image]);
    toast.success("Announcement deleted");
    refresh();
  }

  return (
    <div>
      <PageHeader title="Announcement Management" description="Drafts stay private until published." crumbs={[{ label: "Admin", to: "/admin" }, { label: "Announcements" }]}
        actions={<Button asChild><Link to="/admin/announcements/new"><Plus /> New announcement</Link></Button>} />
      <Tabs defaultValue="list">
        <TabsList className="mb-4"><TabsTrigger value="list">Announcements</TabsTrigger><TabsTrigger value="categories"><Tags className="mr-1 h-4 w-4" />Categories</TabsTrigger></TabsList>
        <TabsContent value="list">
          <div className="mb-4 flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-card sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title…" className="pl-9" aria-label="Search announcements" />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="sm:w-40" aria-label="Status"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="draft">Drafts</SelectItem></SelectContent>
            </Select>
            <Select value={cat} onValueChange={(v) => { setCat(v); setPage(1); }}>
              <SelectTrigger className="sm:w-52" aria-label="Category"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All categories</SelectItem>{cats?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {isLoading ? <ListSkeleton /> : data && data.rows.length > 0 ? (
            <>
              <ul className="space-y-3">
                {data.rows.map((a) => (
                  <li key={a.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-card sm:flex-row sm:items-center">
                    {a.image_signed ? <img src={a.image_signed} alt="" className="h-20 w-full rounded-lg object-cover sm:w-32" /> : <div className="hidden h-20 w-32 items-center justify-center rounded-lg bg-soft sm:flex"><Megaphone className="h-6 w-6 text-royal/40" /></div>}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {a.status === "published" ? <Badge variant="success">Published</Badge> : <Badge variant="muted">Draft</Badge>}
                        {a.category && <Badge variant="royal">{a.category.name}</Badge>}
                        <span className="text-xs text-muted-foreground">{a.status === "published" ? `Published ${fmtDate(a.published_at)}` : `Updated ${fmtDate(a.updated_at)}`}</span>
                      </div>
                      <p className="mt-1.5 truncate font-semibold text-primary">{a.title}</p>
                      <p className="truncate text-sm text-muted-foreground">{a.author_office}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {a.status === "published" ? (
                        <Button variant="outline" size="sm" onClick={() => setPublished(a.id, false)}><EyeOff /> Unpublish</Button>
                      ) : (
                        <ConfirmButton size="sm" title="Publish this announcement?" description="It will appear on the public site and every resident will be notified." confirmLabel="Publish" onConfirm={() => setPublished(a.id, true)}><Eye /> Publish</ConfirmButton>
                      )}
                      <Button variant="outline" size="sm" asChild><Link to="/admin/announcements/$id" params={{ id: a.id }}><Pencil /> Edit</Link></Button>
                      <ConfirmButton variant="ghost" size="sm" destructive title="Delete this announcement?" description="It will be removed from the site permanently." confirmLabel="Delete" onConfirm={() => remove(a.id, a.image_url)} aria-label="Delete"><Trash2 /></ConfirmButton>
                    </div>
                  </li>
                ))}
              </ul>
              <Pager page={page} total={data.total} onChange={setPage} />
            </>
          ) : <EmptyState icon={Megaphone} title="No announcements" description="Create your first announcement to keep residents informed." action={<Button asChild><Link to="/admin/announcements/new">New announcement</Link></Button>} />}
        </TabsContent>
        <TabsContent value="categories"><CategoryManager /></TabsContent>
      </Tabs>
    </div>
  );
}

function CategoryManager() {
  const qc = useQueryClient();
  const { data: cats } = useQuery(announcementCategoriesQuery);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["announcement-categories"] });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 3 || n.length > 60) { toast.error("Category names must be 3–60 characters."); return; }
    const { error } = await supabase.from("announcement_categories").insert({ name: n });
    if (error) { toast.error(error.code === "23505" ? "That category already exists." : error.message); return; }
    setName(""); toast.success("Category added"); refresh();
  }
  async function rename() {
    if (!editing) return;
    const n = editing.name.trim();
    if (n.length < 3 || n.length > 60) { toast.error("Category names must be 3–60 characters."); return; }
    const { error } = await supabase.from("announcement_categories").update({ name: n }).eq("id", editing.id);
    if (error) { toast.error(error.message); return; }
    setEditing(null); toast.success("Category renamed"); refresh();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("announcement_categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Category deleted"); refresh(); qc.invalidateQueries({ queryKey: ["announcements"] });
  }

  return (
    <Panel title="Announcement categories">
      <form onSubmit={add} className="mb-4 flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" aria-label="New category name" />
        <Button type="submit"><Plus /> Add</Button>
      </form>
      <ul className="divide-y">
        {cats?.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 py-2.5">
            {editing?.id === c.id ? (
              <div className="flex flex-1 gap-2">
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} aria-label="Category name" />
                <Button size="sm" onClick={rename}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            ) : (
              <>
                <span className="text-sm font-medium">{c.name}</span>
                <span className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing({ id: c.id, name: c.name })}><Pencil /> Rename</Button>
                  <ConfirmButton size="sm" variant="ghost" destructive title={`Delete "${c.name}"?`} description="Announcements in this category will become uncategorized." confirmLabel="Delete" onConfirm={() => remove(c.id)}><Trash2 /></ConfirmButton>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

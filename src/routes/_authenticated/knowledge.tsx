import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Brain, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { knowledgeQuery, memoriesQuery } from "@/lib/queries";
import {
  addMemory,
  deleteKnowledgeDocument,
  deleteMemory,
  saveKnowledgeDocument,
} from "@/lib/agent-os.functions";

export const Route = createFileRoute("/_authenticated/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge & Memory — AI Employee Marketplace" },
      {
        name: "description",
        content: "Give your AI employees the business knowledge and memory they work from.",
      },
      { property: "og:title", content: "AI Employee Knowledge & Memory" },
      {
        property: "og:description",
        content: "Give your AI employees the business knowledge and memory they work from.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: KnowledgePage,
});

const DOC_TYPES = [
  { value: "website", label: "Website info" },
  { value: "document", label: "Company document" },
  { value: "brand", label: "Brand guidelines" },
  { value: "product", label: "Product information" },
  { value: "faq", label: "FAQ" },
  { value: "note", label: "Internal note" },
] as const;

type DocType = (typeof DOC_TYPES)[number]["value"];

function KnowledgePage() {
  const queryClient = useQueryClient();
  const { data: documents, isLoading } = useQuery(knowledgeQuery);
  const { data: memories } = useQuery(memoriesQuery);

  const saveDoc = useServerFn(saveKnowledgeDocument);
  const removeDoc = useServerFn(deleteKnowledgeDocument);
  const createMemory = useServerFn(addMemory);
  const removeMemory = useServerFn(deleteMemory);

  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<DocType>("note");
  const [sourceUrl, setSourceUrl] = useState("");
  const [content, setContent] = useState("");
  const [memoryText, setMemoryText] = useState("");

  const saveMutation = useMutation({
    mutationFn: () =>
      saveDoc({
        data: { title, doc_type: docType, source_url: sourceUrl, content },
      }),
    onSuccess: () => {
      setTitle("");
      setSourceUrl("");
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      toast.success("Added to the knowledge base");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeDoc({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["knowledge"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const memoryMutation = useMutation({
    mutationFn: () => createMemory({ data: { content: memoryText, category: "business" } }),
    onSuccess: () => {
      setMemoryText("");
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      toast.success("Memory saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const forgetMutation = useMutation({
    mutationFn: (id: string) => removeMemory({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["memories"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell
      title="Knowledge & Memory"
      description="Everything your AI employees know about your business"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-bold">Add business knowledge</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Anything you add here is read by every AI employee before they start work.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="kb-title" className="text-sm font-medium">
                  Title
                </label>
                <Input
                  id="kb-title"
                  value={title}
                  maxLength={160}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Brand tone of voice"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="kb-type" className="text-sm font-medium">
                  Type
                </label>
                <Select value={docType} onValueChange={(value) => setDocType(value as DocType)}>
                  <SelectTrigger id="kb-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <label htmlFor="kb-url" className="text-sm font-medium">
                Source URL <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="kb-url"
                value={sourceUrl}
                maxLength={500}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="https://yourcompany.com/about"
              />
            </div>

            <div className="mt-4 grid gap-2">
              <label htmlFor="kb-content" className="text-sm font-medium">
                Content
              </label>
              <Textarea
                id="kb-content"
                rows={6}
                maxLength={20000}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Paste your brand guidelines, product details, FAQs or any document text…"
              />
            </div>

            <Button
              className="mt-5"
              disabled={saveMutation.isPending || title.trim().length < 2 || content.trim().length < 3}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
              Add to knowledge base
            </Button>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-bold">Knowledge base</h2>
            {isLoading ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : documents && documents.length > 0 ? (
              <ul className="mt-5 space-y-3">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4 rounded-xl border border-border p-4"
                  >
                    <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <FileText className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold">{doc.title}</h3>
                        <Badge variant="secondary" className="rounded-full font-normal">
                          {DOC_TYPES.find((t) => t.value === doc.doc_type)?.label ?? doc.doc_type}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {doc.content}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${doc.title}`}
                      onClick={() => deleteMutation.mutate(doc.id)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No documents yet. Add your website info, brand guidelines or product details above.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <Brain className="size-4 text-primary" />
              <h2 className="font-bold">AI memory</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Facts your AI employees learned or you taught them. They are recalled on every task.
            </p>

            <div className="mt-4 grid gap-2">
              <Textarea
                rows={3}
                maxLength={400}
                value={memoryText}
                onChange={(event) => setMemoryText(event.target.value)}
                placeholder="We focus on UK ecommerce customers."
              />
              <Button
                variant="outline"
                disabled={memoryMutation.isPending || memoryText.trim().length < 4}
                onClick={() => memoryMutation.mutate()}
              >
                {memoryMutation.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
                Teach my AI team
              </Button>
            </div>

            <ul className="mt-5 space-y-2">
              {(memories ?? []).map((memory) => (
                <li
                  key={memory.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-xl border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm leading-relaxed">{memory.content}</p>
                    <span className="mt-1 inline-block text-xs uppercase tracking-wide text-muted-foreground">
                      {memory.category}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Forget this"
                    onClick={() => forgetMutation.mutate(memory.id)}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
              {memories && memories.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  Nothing remembered yet — memories build automatically as you chat.
                </li>
              ) : null}
            </ul>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Loader2, SendHorizonal, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmployeeAvatar } from "@/components/EmployeeAvatar";
import { agentConversationQuery } from "@/lib/queries";
import { sendAgentMessage } from "@/lib/agent-os.functions";
import { cn } from "@/lib/utils";

type LocalMessage = { id: string; role: string; content: string };

export function AgentChat({
  slug,
  name,
  accent,
  roleTitle,
}: {
  slug: string;
  name: string;
  accent: string;
  roleTitle: string;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(agentConversationQuery(slug));
  const send = useServerFn(sendAgentMessage);

  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<LocalMessage[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const messages: LocalMessage[] = [...(data?.messages ?? []), ...pending];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [slug]);

  const mutation = useMutation({
    mutationFn: (message: string) =>
      send({ data: { slug, conversationId: data?.conversationId ?? null, message } }),
    onSuccess: (result) => {
      setPending([]);
      queryClient.invalidateQueries({ queryKey: ["agent-conversation", slug] });
      if (result.learned > 0) {
        toast.success(`${name} saved ${result.learned} new thing${result.learned > 1 ? "s" : ""} to memory`);
      }
      inputRef.current?.focus();
    },
    onError: (error: Error) => {
      setPending([]);
      toast.error(error.message);
    },
  });

  function handleSubmit() {
    const message = draft.trim();
    if (!message || mutation.isPending) return;
    setPending([{ id: `local-${Date.now()}`, role: "user", content: message }]);
    setDraft("");
    mutation.mutate(message);
  }

  return (
    <section className="flex h-[640px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-border px-5 py-4">
        <EmployeeAvatar name={name} accent={accent} className="size-9 shrink-0" />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold">Chat with {name}</h2>
          <p className="truncate text-xs text-muted-foreground">
            {roleTitle} · remembers your business between conversations
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="mx-auto max-w-sm py-10 text-center">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Sparkles className="size-5" />
            </span>
            <p className="mt-4 text-sm font-semibold">Start working with {name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask a question, share context or assign work. They will use your knowledge base and
              everything they have learned so far.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] text-sm leading-relaxed",
                  message.role === "user"
                    ? "rounded-2xl bg-primary px-4 py-3 text-primary-foreground"
                    : "prose prose-sm max-w-none text-foreground prose-headings:font-display prose-headings:text-base prose-strong:text-foreground prose-a:text-primary",
                )}
              >
                {message.role === "user" ? (
                  message.content
                ) : (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                )}
              </div>
            </div>
          ))
        )}

        {mutation.isPending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {name} is thinking…
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <Textarea
            ref={inputRef}
            rows={2}
            maxLength={4000}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={`Message ${name}…`}
            className="min-h-0 resize-none"
          />
          <Button
            size="icon"
            className="shrink-0"
            onClick={handleSubmit}
            disabled={mutation.isPending || draft.trim().length === 0}
            aria-label="Send message"
          >
            {mutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <SendHorizonal />
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}

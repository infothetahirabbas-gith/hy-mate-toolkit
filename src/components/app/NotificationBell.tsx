import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { notificationsQuery } from "@/lib/queries";
import { markNotificationsRead } from "@/lib/workforce.functions";

export function NotificationBell() {
  const { data } = useQuery(notificationsQuery);
  const queryClient = useQueryClient();
  const items = data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  async function open(next: boolean) {
    if (next && unread > 0) {
      await markNotificationsRead({});
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  }

  return (
    <Popover onOpenChange={open}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4" />
          {unread > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">Notifications</div>
        <div className="max-h-80 overflow-y-auto">
          {items.length ? (
            items.map((n) => (
              <div key={n.id} className="border-b border-border px-4 py-3 last:border-b-0">
                <div className="text-sm font-medium">{n.title}</div>
                {n.body ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                ) : null}
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

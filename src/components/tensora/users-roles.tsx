import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DB_ROLES, ROLE_LABEL, primaryRole, type DbRole } from "@/lib/tensora/permissions";
import { useCan } from "@/lib/tensora/use-can";
import { useTensora } from "@/lib/tensora/store";
import { Panel, Tag } from "./ui";

export function UsersRoles() {
  const isAdmin = useCan("admin");
  const meId = useTensora((s) => s.me?.id);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["users-roles"],
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id, display_name, email").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (p.error) throw p.error;
      return (p.data ?? []).map((u) => ({
        ...u,
        roles: (r.data ?? []).filter((x) => x.user_id === u.id).map((x) => x.role as DbRole),
      }));
    },
  });

  const setRole = async (userId: string, role: DbRole) => {
    const del = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (del.error) return toast.error(del.error.message);
    const ins = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (ins.error) return toast.error(ins.error.message);
    toast.success(`Role set to ${ROLE_LABEL[role]}`);
    void qc.invalidateQueries({ queryKey: ["users-roles"] });
  };

  return (
    <Panel bodyClassName="p-0">
      {!isAdmin && <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">Only Plant Admins can change roles.</div>}
      {q.isLoading && <div className="p-4 text-sm text-muted-foreground">Loading users…</div>}
      {q.data?.map((u) => {
        const role = primaryRole(u.roles);
        return (
          <div key={u.id} className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-0">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-secondary font-mono text-xs">{(u.display_name || u.email || "?").slice(0, 2).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate">{u.display_name || u.email}</div>
              <div className="truncate text-xs text-muted-foreground">{u.email}</div>
            </div>
            {isAdmin && u.id !== meId ? (
              <Select value={role} onValueChange={(v) => void setRole(u.id, v as DbRole)}>
                <SelectTrigger className="h-9 w-[170px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{DB_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <Tag tone="telemetry">{ROLE_LABEL[role]}{u.id === meId ? " · you" : ""}</Tag>
            )}
          </div>
        );
      })}
    </Panel>
  );
}

import { useTensora } from "./store";
import { can, type Action } from "./permissions";

export function useCan(action: Action) {
  const role = useTensora((s) => s.me?.role ?? "buyer_auditor");
  return can(role, action);
}

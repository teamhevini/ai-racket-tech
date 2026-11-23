import { useQuery, useQueryClient } from "@tanstack/react-query";
import { entitlementsFor } from "@shared/tiers";
import type { Me } from "@/lib/types";

const guest: Me = {
  id: null,
  email: null,
  firstName: null,
  lastName: null,
  tier: "free",
  isAdmin: false,
  entitlements: entitlementsFor("free"),
};

/** The signed-in player (or a guest). Every page reads plan access from here. */
export function useMe() {
  const q = useQuery<Me>({ queryKey: ["/api/auth/me"], staleTime: 60_000 });
  const me = q.data ?? guest;
  return {
    me,
    loading: q.isLoading,
    signedIn: !!me.email,
    ent: me.entitlements,
  };
}

/** Call after login, logout, signup or a plan change. */
export function useRefreshMe() {
  const qc = useQueryClient();
  return (next?: Me) => {
    if (next) qc.setQueryData(["/api/auth/me"], next);
    return qc.invalidateQueries();
  };
}

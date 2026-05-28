import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type UserTier = "free" | "pro" | "club";

interface UserState {
  tier: UserTier;
  isAdmin: boolean;
  email: string | null;
  loading: boolean;
  isPro: boolean;
  isClub: boolean;
  canUseChat: boolean;
  canViewAllStringers: boolean;
  canViewAllRackets: boolean;
  canSaveHistory: boolean;
  canShare: boolean;
  canMultiProfile: boolean;
  refetch: () => void;
}

const defaultState: UserState = {
  tier: "free",
  isAdmin: false,
  email: null,
  loading: true,
  isPro: false,
  isClub: false,
  canUseChat: false,
  canViewAllStringers: false,
  canViewAllRackets: false,
  canSaveHistory: false,
  canShare: false,
  canMultiProfile: false,
  refetch: () => {},
};

const UserContext = createContext<UserState>(defaultState);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<UserState, "refetch">>(defaultState);

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { tier: UserTier; isAdmin: boolean; email: string | null }) => {
        const { tier, isAdmin, email } = data;
        const isPro = isAdmin || tier === "pro" || tier === "club";
        const isClub = isAdmin || tier === "club";
        setState({
          tier,
          isAdmin,
          email,
          loading: false,
          isPro,
          isClub,
          canUseChat: isClub,
          canViewAllStringers: isPro,
          canViewAllRackets: isPro,
          canSaveHistory: isPro,
          canShare: isPro,
          canMultiProfile: isClub,
        });
      })
      .catch(() => setState({ ...defaultState, loading: false }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo(() => ({ ...state, refetch: load }), [state, load]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}

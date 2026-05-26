import React, { createContext, useContext, useEffect, useState } from "react";

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
};

const UserContext = createContext<UserState>(defaultState);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UserState>(defaultState);

  useEffect(() => {
    fetch("/api/user/tier", { credentials: "include" })
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

  return <UserContext.Provider value={state}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}

'use client';

import { useState } from 'react';

type RateLimitState = {
  blocked: boolean;
  blockedUntil?: Date;
  remainingAttempts: number;
};

type UseRateLimitReturn = RateLimitState & {
  onFalha: (blockedUntil?: string) => void;
  reset: () => void;
};

// Hook client-side para refletir o estado de rate limit retornado pela API.
// O rate limit real é aplicado no servidor (lib/rate-limit.ts).
// Este hook apenas exibe feedback visual ao usuário.
export function useRateLimit(maxAttempts = 5): UseRateLimitReturn {
  const [state, setState] = useState<RateLimitState>({
    blocked: false,
    remainingAttempts: maxAttempts,
  });

  const onFalha = (blockedUntil?: string) => {
    if (blockedUntil) {
      setState({
        blocked: true,
        blockedUntil: new Date(blockedUntil),
        remainingAttempts: 0,
      });
    } else {
      setState((prev) => ({
        ...prev,
        remainingAttempts: Math.max(0, prev.remainingAttempts - 1),
      }));
    }
  };

  const reset = () =>
    setState({ blocked: false, remainingAttempts: maxAttempts });

  return { ...state, onFalha, reset };
}

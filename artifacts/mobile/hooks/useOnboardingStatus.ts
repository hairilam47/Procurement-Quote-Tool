import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

function getBaseURL(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "http://localhost:8080";
}

export interface OnboardingStatus {
  hasCompanyDetails: boolean;
  hasStripeConnect: boolean;
  hasClient: boolean;
  hasSentQuotation: boolean;
}

async function fetchOnboardingStatus(token: string): Promise<OnboardingStatus> {
  const res = await fetch(`${getBaseURL()}/api/onboarding/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch onboarding status");
  return res.json();
}

export function useOnboardingStatus() {
  const { getToken } = useAuth();

  return useQuery<OnboardingStatus>({
    queryKey: ["onboarding-status-mobile"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return fetchOnboardingStatus(token);
    },
    staleTime: 30_000,
    retry: false,
  });
}

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/shared/api/client";

interface HealthResponse {
  status?: string;
  ok?: boolean;
}

export function useApiHealth() {
  return useQuery({
    queryKey: ["api-health"],
    queryFn: () => apiGet<HealthResponse>("/api/v1/health"),
    retry: 1,
    staleTime: 30_000,
  });
}

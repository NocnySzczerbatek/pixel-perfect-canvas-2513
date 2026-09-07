import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { useSession } from "@/hooks/useSession";
import { getTrainerData, type TrainerData } from "@/lib/trainer.functions";

export const TRAINER_QUERY_KEY = ["trainer"] as const;

export function useTrainerData() {
  const { session, loading } = useSession();
  const fetchTrainer = useServerFn(getTrainerData);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: TRAINER_QUERY_KEY,
    queryFn: () => fetchTrainer(),
    enabled: !loading && Boolean(session),
  });

  const setData = (data: TrainerData) => queryClient.setQueryData(TRAINER_QUERY_KEY, data);

  return { ...query, session, sessionLoading: loading, setData };
}

import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function useProfileMap(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  return useQuery({
    queryKey: ["profile-map", ids.sort().join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,email,flat_number,wing,phone")
        .in("id", ids);
      const map: Record<string, any> = {};
      (data ?? []).forEach((p: any) => {
        map[p.id] = p;
      });
      return map;
    },
  });
}

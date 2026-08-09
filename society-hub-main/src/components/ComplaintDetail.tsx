import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useProfileMap } from "@/lib/use-profile-map";
import { format } from "date-fns";
import { toast } from "sonner";

async function signImage(path: string) {
  const { data } = await supabase.storage.from("complaint-images").createSignedUrl(path, 3600);
  return data?.signedUrl;
}

export function ComplaintDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [urls, setUrls] = useState<string[]>([]);

  const { data: complaint } = useQuery({
    queryKey: ["complaint", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("complaints").select("*").eq("id", id!).maybeSingle();
      return data;
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["complaint-comments", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("complaint_comments")
        .select("*")
        .eq("complaint_id", id!)
        .order("created_at");
      return data ?? [];
    },
  });

  const profileIds = [
    complaint?.resident_id,
    ...(comments?.map((c: any) => c.user_id) ?? []),
  ].filter(Boolean) as string[];
  const { data: pm } = useProfileMap(profileIds);
  const owner = complaint?.resident_id ? pm?.[complaint.resident_id] : undefined;

  useEffect(() => {
    if (!complaint?.images?.length) {
      setUrls([]);
      return;
    }
    Promise.all(complaint.images.map(signImage)).then((rs) =>
      setUrls(rs.filter(Boolean) as string[]),
    );
  }, [complaint?.images]);

  const addComment = useMutation({
    mutationFn: async () => {
      if (!comment.trim()) return;
      const { error } = await supabase
        .from("complaint_comments")
        .insert({ complaint_id: id!, user_id: user!.id, comment });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["complaint-comments", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-3xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{complaint?.title || "Complaint"}</DialogTitle>
        </DialogHeader>
        {complaint && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary" className="rounded-full">
                {complaint.category}
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                {complaint.priority}
              </Badge>
              <Badge className="rounded-full">{complaint.status}</Badge>
              {owner && (
                <span className="text-muted-foreground">
                  by {owner.full_name || owner.email} · {owner.wing ? `${owner.wing}-` : ""}
                  {owner.flat_number || ""}
                </span>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm">{complaint.description}</p>
            {urls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {urls.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer">
                    <img src={u} className="aspect-square w-full rounded-2xl object-cover" alt="" />
                  </a>
                ))}
              </div>
            )}
            <div>
              <div className="mb-2 text-sm font-semibold">Timeline & comments</div>
              <div className="space-y-2">
                {(comments ?? []).map((c: any) => {
                  const p = pm?.[c.user_id];
                  return (
                    <div key={c.id} className="rounded-2xl bg-muted p-3">
                      <div className="text-xs text-muted-foreground">
                        {p?.full_name || p?.email || "User"} ·{" "}
                        {format(new Date(c.created_at), "MMM d, HH:mm")}
                      </div>
                      <div className="text-sm">{c.comment}</div>
                    </div>
                  );
                })}
                {!comments?.length && (
                  <p className="text-xs text-muted-foreground">No comments yet.</p>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <Textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment…"
                  className="rounded-2xl"
                />
                <Button
                  onClick={() => addComment.mutate()}
                  disabled={!comment.trim() || addComment.isPending}
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

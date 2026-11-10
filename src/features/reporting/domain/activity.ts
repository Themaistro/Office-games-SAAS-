export type ActivityItem = {
  id: string;
  user_id: string;
  type: string;
  description: string;
  created_at: string;
  metadata: Record<string, unknown>;
  profiles?: { full_name: string; avatar_url: string };
};

export function latestActivityByUser(
  items: Pick<ActivityItem, "user_id" | "description">[],
) {
  const result = new Map<string, string>();
  for (const item of items)
    if (!result.has(item.user_id)) result.set(item.user_id, item.description);
  return result;
}

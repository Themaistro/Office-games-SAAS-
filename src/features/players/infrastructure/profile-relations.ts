import { query } from "@/server/database/connection";
import "server-only";
export async function attachGameProfiles(
  games: any[] | null,
  pairs: { left: string; right: string; leftKey: string; rightKey: string }[],
) {
  const rows = games || [];
  const ids = [
    ...new Set(
      rows.flatMap((game) =>
        pairs
          .flatMap((pair) => [game[pair.left], game[pair.right]])
          .filter(Boolean),
      ),
    ),
  ];
  if (ids.length === 0) return rows;
  const { rows: profiles } = await query(
    "SELECT id,full_name,avatar_url,chess_elo FROM profiles WHERE id=ANY($1::uuid[])",
    [ids],
  );
  const byId = new Map(
    (profiles || []).map((profile: any) => [profile.id, profile]),
  );
  return rows.map((game) => {
    const result = { ...game };
    for (const pair of pairs) {
      result[pair.leftKey] = byId.get(game[pair.left]) || null;
      result[pair.rightKey] = byId.get(game[pair.right]) || null;
    }
    return result;
  });
}

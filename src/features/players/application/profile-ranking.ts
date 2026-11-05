export type RankedProfile = {
  role: string;
  total_xp: number | null;
  full_name: string | null;
  department: string | null;
};
type CountResult = { count: number };
export interface ProfileRankingRepository {
  countHigherXp(xp: number): Promise<CountResult>;
  countEqualXpBeforeName(xp: number, name: string): Promise<CountResult>;
  countDepartmentHigherXp(department: string, xp: number): Promise<CountResult>;
  countDepartmentEqualXpBeforeName(
    department: string,
    xp: number,
    name: string,
  ): Promise<CountResult>;
}
export function createProfileRanking(repository: ProfileRankingRepository) {
  return async (profile: RankedProfile) => {
    if (profile.role === "admin") return { userRank: "Admin", deptRank: "--" };
    const xp = profile.total_xp || 0,
      name = profile.full_name;
    const [higher, tied, departmentHigher, departmentTied] = await Promise.all([
      repository.countHigherXp(xp),
      name ? repository.countEqualXpBeforeName(xp, name) : { count: 0 },
      profile.department
        ? repository.countDepartmentHigherXp(profile.department, xp)
        : { count: 0 },
      profile.department && name
        ? repository.countDepartmentEqualXpBeforeName(
            profile.department,
            xp,
            name,
          )
        : { count: 0 },
    ]);
    return {
      userRank: String(higher.count + tied.count + 1),
      deptRank: profile.department
        ? String(departmentHigher.count + departmentTied.count + 1)
        : "--",
    };
  };
}

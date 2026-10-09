import { query } from "@/lib/db";
import ClientExportButton from "./ClientExportButton";
import UserFilters from "./UserFilters";
import UserRosterTable from "./UserRosterTable";

export default async function UsersManagementPage(props: { searchParams: Promise<{ q?: string; department?: string; sort?: string; dir?: string; userId?: string; page?: string }> }) {
  const searchParams = await props.searchParams;
  const sortable: Record<string, string> = { name: "full_name", full_name: "full_name", department: "department", xp: "total_xp", total_xp: "total_xp", level: "current_level", streak: "current_streak", created_at: "created_at" };
  const orderColumn = sortable[searchParams.sort ?? ""] ?? "total_xp";
  const orderDirection = searchParams.dir === "asc" ? "ASC" : "DESC";
  const conditions = ["role = 'employee'"];
  const params: string[] = [];
  if (searchParams.q?.trim()) { params.push(`%${searchParams.q.trim()}%`); conditions.push(`full_name ILIKE $${params.length}`); }
  if (searchParams.department) { params.push(searchParams.department); conditions.push(`department = $${params.length}`); }
  const where = conditions.join(" AND ");
  const PAGE_SIZE = 50;
  const page = Math.max(1, Number.parseInt(searchParams.page || "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const [usersResult, countResult, departmentsResult] = await Promise.all([
    query(`SELECT * FROM profiles WHERE ${where} ORDER BY ${orderColumn} ${orderDirection} NULLS LAST, full_name ASC LIMIT ${PAGE_SIZE} OFFSET ${offset}`, params),
    query<{ count: number }>(`SELECT count(*)::int AS count FROM profiles WHERE ${where}`, params),
    query<{ id: string; name: string }>("SELECT * FROM departments ORDER BY name ASC"),
  ]);
  const users = usersResult.rows;
  const totalUsers = countResult.rows[0]?.count ?? 0;
  const totalPages = Math.ceil(totalUsers / PAGE_SIZE);
  const departments = departmentsResult.rows;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Player Roster</h1>
          <p className="text-muted-foreground mt-1">View and manage all arena participants.</p>
        </div>
        
        <ClientExportButton data={users || []} />
      </div>

      <UserFilters departments={departments || []} />

      <UserRosterTable 
        users={users || []} 
        departments={departments || []} 
        currentPage={page} 
        totalPages={totalPages} 
        totalUsers={totalUsers} 
      />
    </div>
  );
}


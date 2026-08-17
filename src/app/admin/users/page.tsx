import { createClient } from "@/lib/supabase/server";
import ClientExportButton from "./ClientExportButton";
import UserFilters from "./UserFilters";
import UserRosterTable from "./UserRosterTable";

export default async function UsersManagementPage(props: { searchParams: Promise<{ q?: string; department?: string; sort?: string; dir?: string; userId?: string; page?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("*")
    .eq("role", "employee");

  if (searchParams.sort) {
    const isAsc = searchParams.dir === "asc";
    query = query.order(searchParams.sort, { ascending: isAsc });
  } else {
    query = query.order("total_xp", { ascending: false }).order("full_name", { ascending: true });
  }

  if (searchParams.q) {
    query = query.ilike("full_name", `%${searchParams.q}%`);
  }
  
  if (searchParams.department) {
    query = query.eq("department", searchParams.department);
  }

  // Pagination logic
  const PAGE_SIZE = 50;
  const page = parseInt(searchParams.page || "1", 10);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Add exact count and range
  query = query.select("*", { count: "exact" }).range(from, to);

  const { data: users, error, count } = await query;
  const totalUsers = count || 0;
  const totalPages = Math.ceil(totalUsers / PAGE_SIZE);

  const { data: departments } = await supabase
    .from("departments")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching users:", error);
  }

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

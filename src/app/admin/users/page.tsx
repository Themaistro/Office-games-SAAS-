import { requireAdminPage } from "@/features/identity/composition";
import { roster } from "@/features/players/composition";
import ClientExportButton from "./ClientExportButton";
import UserFilters from "./UserFilters";
import UserRosterTable from "./UserRosterTable";

const { loadPlayerRoster } = roster;

export default async function UsersManagementPage(props: {
  searchParams: Promise<{
    q?: string;
    department?: string;
    sort?: string;
    dir?: string;
    userId?: string;
    page?: string;
  }>;
}) {
  await requireAdminPage();

  const searchParams = await props.searchParams;
  const { users, totalUsers, totalPages, page, departments } =
    await loadPlayerRoster(searchParams);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Player Roster
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage all arena participants.
          </p>
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

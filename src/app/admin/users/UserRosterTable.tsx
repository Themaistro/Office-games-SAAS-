"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import SortableHeader from "./SortableHeader";
import PlayerDrawer from "./PlayerDrawer";
import { Search, SearchX, RotateCcw, Power, PowerOff, CheckSquare, Square } from "lucide-react";
import { resetUserStreak, updateUserDepartment, toggleUserStatus, bulkResetStreaks, bulkDeactivate } from "./actions";

function formatRelativeTime(dateString: string | null) {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export default function UserRosterTable({ users, departments, currentPage = 1, totalPages = 1, totalUsers = 0 }: { users: any[], departments: any[], currentPage?: number, totalPages?: number, totalUsers?: number }) {
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleAll = () => {
    if (selectedUsers.size === users.length && users.length > 0) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const toggleUser = (id: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedUsers(newSet);
  };

  const handleBulkReset = async () => {
    if (selectedUsers.size === 0) return;
    setIsBulkProcessing(true);
    await bulkResetStreaks(Array.from(selectedUsers));
    setSelectedUsers(new Set());
    setIsBulkProcessing(false);
  };

  const handleBulkDeactivate = async () => {
    if (selectedUsers.size === 0) return;
    setIsBulkProcessing(true);
    const res = await bulkDeactivate(Array.from(selectedUsers));
    if (res.error) setErrorMsg(res.error);
    setSelectedUsers(new Set());
    setIsBulkProcessing(false);
  };

  const handleToggleStatus = async (id: string, currentlyActive: boolean) => {
    const res = await toggleUserStatus(id, currentlyActive);
    if (res.error) {
      setErrorMsg(res.error);
      setTimeout(() => setErrorMsg(""), 5000);
    }
  };

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="bg-destructive/15 text-destructive border border-destructive px-4 py-3 rounded-lg text-sm font-medium">
          Error: {errorMsg.includes("is_active") ? "You must run the SQL command to add 'is_active' column to the database." : errorMsg}
        </div>
      )}

      {selectedUsers.size > 0 && (
        <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium text-primary">{selectedUsers.size} players selected</span>
          <div className="flex gap-2">
            <button 
              onClick={handleBulkReset}
              disabled={isBulkProcessing}
              className="text-xs font-semibold bg-background hover:bg-muted border border-border px-3 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              Reset Streaks
            </button>
            <button 
              onClick={handleBulkDeactivate}
              disabled={isBulkProcessing}
              className="text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              Suspend Accounts
            </button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 border-b border-border text-muted-foreground">
              <tr>
                <th className="px-4 py-4 w-10">
                  <button onClick={toggleAll} className="hover:text-foreground">
                    {selectedUsers.size === users.length && users.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
                <th className="px-6 py-4 font-semibold"><SortableHeader label="Player" sortKey="full_name" /></th>
                <th className="px-6 py-4 font-semibold"><SortableHeader label="Department" sortKey="department" /></th>
                <th className="px-6 py-4 font-semibold"><SortableHeader label="Level" sortKey="current_level" /></th>
                <th className="px-6 py-4 font-semibold"><SortableHeader label="Total XP" sortKey="total_xp" /></th>
                <th className="px-6 py-4 font-semibold"><SortableHeader label="Streak" sortKey="current_streak" /></th>
                <th className="px-6 py-4 font-semibold"><SortableHeader label="Last Active" sortKey="last_played_at" /></th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="bg-muted/50 p-4 rounded-full mb-3">
                        <SearchX size={32} />
                      </div>
                      <p className="text-lg font-medium">No players found</p>
                      <p className="text-sm">Try adjusting your search or department filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isActive = u.is_active !== false; // default true if undefined
                  const isSelected = selectedUsers.has(u.id);
                  const lastActiveTime = u.last_played_at || u.updated_at;

                  return (
                    <tr key={u.id} className={`hover:bg-muted/30 transition-colors group ${isSelected ? 'bg-primary/5' : ''} ${!isActive ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-4">
                        <button onClick={() => toggleUser(u.id)} className="text-muted-foreground hover:text-foreground">
                          {isSelected ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} />}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center font-bold ${isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            {u.full_name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-2">
                              {u.full_name || "Unknown"}
                              {!isActive && <span className="text-[10px] uppercase bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">Suspended</span>}
                            </div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <form action={updateUserDepartment} className="flex items-center gap-1">
                          <input type="hidden" name="userId" value={u.id} />
                          <select 
                            name="department" 
                            defaultValue={u.department || ""}
                            className="text-xs font-medium rounded-full border border-border bg-muted/30 hover:bg-muted/50 px-3 py-1.5 shadow-sm transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">Unassigned</option>
                            {departments.map(d => (
                              <option key={d.id} value={d.name}>{d.name}</option>
                            ))}
                          </select>
                          <button type="submit" className="text-xs text-primary hover:underline px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            Save
                          </button>
                        </form>
                      </td>
                      <td className="px-6 py-4 font-bold">{u.current_level || 1}</td>
                      <td className="px-6 py-4 font-medium">{u.total_xp?.toLocaleString() || 0}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${u.current_streak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                            {u.current_streak || 0}
                          </span>
                          {u.current_streak > 0 && (
                            <form action={async () => { await resetUserStreak(u.id); }}>
                              <button type="submit" className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" title="Reset Streak">
                                <RotateCcw size={14} />
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {formatRelativeTime(lastActiveTime)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleToggleStatus(u.id, isActive)}
                            className={`p-1.5 rounded transition-colors ${isActive ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive' : 'text-destructive hover:bg-primary/10 hover:text-primary'}`}
                            title={isActive ? "Suspend User" : "Activate User"}
                          >
                            {isActive ? <PowerOff size={16} /> : <Power size={16} />}
                          </button>
                          <button onClick={() => setDrawerUserId(u.id)} className="text-muted-foreground hover:text-primary p-1.5" title="View Profile">
                             <Search size={16} />
                          </button>
                          {drawerUserId === u.id && <PlayerDrawer userId={drawerUserId!} onClose={() => setDrawerUserId(null)} />}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 text-sm text-muted-foreground">
          <div>
            Showing {users.length > 0 ? (currentPage - 1) * 50 + 1 : 0} to {Math.min(currentPage * 50, totalUsers)} of {totalUsers} players
          </div>
          <div className="flex gap-2">
            <button 
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="px-3 py-1 bg-card border border-border rounded hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1 font-medium text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="px-3 py-1 bg-card border border-border rounded hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

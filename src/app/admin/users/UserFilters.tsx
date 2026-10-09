"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";

export default function UserFilters({ departments }: { departments: { name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [department, setDepartment] = useState(searchParams.get("department") || "");

  const updateFilters = (newQuery: string, newDept: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newQuery) params.set("q", newQuery);
    else params.delete("q");

    if (newDept) params.set("department", newDept);
    else params.delete("department");

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center bg-card border border-border p-4 rounded-xl shadow-sm mb-6">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          type="text"
          placeholder="Search players by name..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            updateFilters(e.target.value, department);
          }}
          className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
      </div>
      
      <div className="w-full sm:w-64">
        <select
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value);
            updateFilters(query, e.target.value);
          }}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d.name} value={d.name}>{d.name}</option>
          ))}
        </select>
      </div>
      
      {isPending && <div className="text-sm text-primary font-medium animate-pulse">Filtering...</div>}
    </div>
  );
}

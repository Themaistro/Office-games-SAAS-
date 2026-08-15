"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export default function SortableHeader({ label, sortKey }: { label: string; sortKey: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const currentSort = searchParams.get("sort");
  const currentDir = searchParams.get("dir");

  const isActive = currentSort === sortKey;
  const isDesc = isActive && currentDir === "desc";

  const toggleSort = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (isActive) {
      if (isDesc) {
        // Toggle to asc
        params.set("dir", "asc");
      } else {
        // Remove sort
        params.delete("sort");
        params.delete("dir");
      }
    } else {
      // Set new sort, default desc (XP, level usually desc first)
      params.set("sort", sortKey);
      params.set("dir", "desc");
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <button 
      onClick={toggleSort}
      className="flex items-center gap-1 font-semibold hover:text-foreground transition-colors group"
    >
      {label}
      <span className="text-muted-foreground group-hover:text-foreground">
        {!isActive && <ArrowUpDown size={14} className="opacity-50" />}
        {isActive && isDesc && <ArrowDown size={14} />}
        {isActive && !isDesc && <ArrowUp size={14} />}
      </span>
    </button>
  );
}

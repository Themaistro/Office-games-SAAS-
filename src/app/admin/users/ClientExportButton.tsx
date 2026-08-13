"use client";

import { Download } from "lucide-react";
import { useState } from "react";

export default function ClientExportButton({ data }: { data: any[] }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    
    try {
      if (data.length === 0) {
        alert("No data to export");
        return;
      }

      // Convert JSON to CSV
      const headers = ["Name", "Email", "Department", "Position", "Level", "Total XP", "Streak", "Games Played", "Joined"];
      
      const csvRows = [
        headers.join(","),
        ...data.map(row => [
          `"${row.full_name || ''}"`,
          `"${row.email || ''}"`,
          `"${row.department || ''}"`,
          `"${row.position || ''}"`,
          row.current_level || 1,
          row.total_xp || 0,
          row.current_streak || 0,
          row.games_played || 0,
          `"${new Date(row.created_at).toLocaleDateString()}"`
        ].join(","))
      ];

      const csvString = csvRows.join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `office_games_leaderboard_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error("Export failed", error);
      alert("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground text-sm font-semibold rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
    >
      <Download size={16} />
      {isExporting ? "Exporting..." : "Export CSV"}
    </button>
  );
}

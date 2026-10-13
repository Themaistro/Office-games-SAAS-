"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateUserDepartment } from "./actions";
import { useToast } from "@/components/ui/ToastProvider";

type Department = { id: string; name: string };

export default function DepartmentAssignmentForm({ userId, currentDepartment, departments }: { userId: string; currentDepartment?: string | null; departments: Department[] }) {
  const router = useRouter();
  const [value, setValue] = useState(currentDepartment || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("userId", userId);
      formData.set("department", value);
      await updateUserDepartment(formData);
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Unable to update department.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1">
      <select
        name="department"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={saving}
        className="text-xs font-medium rounded-full border border-border bg-muted/30 hover:bg-muted/50 px-3 py-1.5 shadow-sm transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
        aria-label="Player department"
      >
        <option value="">Unassigned</option>
        {departments.map((department) => <option key={department.id} value={department.name}>{department.name}</option>)}
      </select>
      <button type="submit" disabled={saving} className="text-xs text-primary hover:underline px-2 py-1 disabled:opacity-50">
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

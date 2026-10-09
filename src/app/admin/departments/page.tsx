import { createClient } from "@/lib/supabase/server";
import { addDepartment } from "./actions";
import { Building } from "lucide-react";
import DepartmentManager from "./DepartmentManager";

export default async function DepartmentsManagementPage() {
  const supabase = await createClient();
  
  const { data: departmentsData, error } = await supabase
    .from("departments")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  // Get player counts
  const { data: profiles } = await supabase.from("profiles").select("department");
  
  const departmentCounts: Record<string, number> = {};
  if (profiles) {
    profiles.forEach(p => {
      if (p.department) {
        departmentCounts[p.department] = (departmentCounts[p.department] || 0) + 1;
      }
    });
  }

  const departments = (departmentsData || []).map(d => ({
    id: d.id,
    name: d.name,
    is_active: d.is_active,
    sort_order: d.sort_order || 0,
    playerCount: departmentCounts[d.name] || 0
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Departments</h1>
        <p className="text-muted-foreground mt-1">Manage the list of departments available during employee registration.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Form to add a new department */}
        <div className="md:col-span-1 bg-card border border-border rounded-xl shadow-sm p-6 self-start">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Building size={20} className="text-primary" />
            Add Department
          </h2>
          <form action={addDepartment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Department Name</label>
              <input 
                type="text" 
                name="name" 
                required 
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="e.g. Data Science"
              />
            </div>
            
            <button type="submit" className="w-full mt-4 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
              Add Department
            </button>
          </form>
        </div>

        {/* List of existing departments */}
        <div className="md:col-span-2">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <DepartmentManager initialDepartments={departments} />
          </div>
        </div>

      </div>
    </div>
  );
}

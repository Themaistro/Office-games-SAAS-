import { createClient } from "@/lib/supabase/server";
import { addDepartment, toggleDepartmentStatus, deleteDepartment } from "./actions";
import { Building, Trash2, Power, PowerOff } from "lucide-react";

export default async function DepartmentsManagementPage() {
  const supabase = await createClient();
  
  const { data: departments, error } = await supabase
    .from("departments")
    .select("*")
    .order("name", { ascending: true });

  const handleToggle = async (formData: FormData) => {
    "use server";
    const id = formData.get("id") as string;
    const isActive = formData.get("isActive") === "true";
    if (id) await toggleDepartmentStatus(id, isActive);
  };

  const handleDelete = async (formData: FormData) => {
    "use server";
    const id = formData.get("id") as string;
    if (id) await deleteDepartment(id);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Departments</h1>
        <p className="text-muted-foreground mt-1">Manage the list of departments available during employee registration.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Form to add a new department */}
        <div className="md:col-span-1 bg-card border border-border rounded-xl shadow-sm p-6">
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
            <div className="divide-y divide-border">
              {(!departments || departments.length === 0) ? (
                <div className="p-8 text-center text-muted-foreground">
                  No departments found.
                </div>
              ) : (
                departments.map((dept) => (
                  <div key={dept.id} className="p-4 hover:bg-muted/10 transition-colors flex justify-between items-center gap-4">
                    <div className="flex-1">
                      <p className={`font-bold text-foreground ${!dept.is_active && 'text-muted-foreground line-through'}`}>
                        {dept.name}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {dept.is_active ? 'Active on signup page' : 'Hidden from signup page'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <form action={handleToggle}>
                        <input type="hidden" name="id" value={dept.id} />
                        <input type="hidden" name="isActive" value={dept.is_active.toString()} />
                        <button type="submit" className={`p-2 rounded-md transition-colors ${dept.is_active ? 'text-orange-500 hover:bg-orange-500/10' : 'text-green-500 hover:bg-green-500/10'}`} title={dept.is_active ? "Disable" : "Enable"}>
                          {dept.is_active ? <PowerOff size={18} /> : <Power size={18} />}
                        </button>
                      </form>
                      
                      <form action={handleDelete}>
                        <input type="hidden" name="id" value={dept.id} />
                        <button type="submit" className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

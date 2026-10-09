"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Trash2, Power, PowerOff, GripVertical, Edit2, Check, X } from "lucide-react";
import { toggleDepartmentStatus, deleteDepartment, renameDepartment, updateDepartmentSortOrder } from "./actions";
import { useToast } from "@/components/ui/ToastProvider";
import ConfirmModal from "@/components/ui/ConfirmModal";

type Department = {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  playerCount: number;
};

export default function DepartmentManager({ initialDepartments }: { initialDepartments: Department[] }) {
  const [departments, setDepartments] = useState(initialDepartments);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const { toast } = useToast();

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(departments);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update state immediately for UX
    setDepartments(items);

    // Prepare updates for DB
    const updates = items.map((item, index) => ({
      id: item.id,
      sort_order: index
    }));

    await updateDepartmentSortOrder(updates);
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await toggleDepartmentStatus(id, isActive);
    setDepartments(departments.map(d => d.id === id ? { ...d, is_active: !isActive } : d));
  };

  const handleDelete = async (dept: Department) => {
    if (dept.playerCount > 0) {
      toast(`There are ${dept.playerCount} players in ${dept.name}. Reassign them in the Player Roster before deleting this department.`);
      return;
    }
    
    setDeleteTarget(dept);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDepartment(deleteTarget.id);
      setDepartments((current) => current.filter((d) => d.id !== deleteTarget.id));
    } catch (e: any) {
      toast(e.message || "Unable to delete the department.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const startEdit = (dept: Department) => {
    setEditingId(dept.id);
    setEditName(dept.name);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      await renameDepartment(id, editName);
      setDepartments(departments.map(d => d.id === id ? { ...d, name: editName.trim() } : d));
      setEditingId(null);
    } catch (e: any) {
      toast(e.message || "Unable to rename the department.");
    } finally {
      setIsSaving(false);
    }
  };

  if (departments.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No departments found.</div>;
  }

  return (
    <>
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="departments">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="divide-y divide-border">
            {departments.map((dept, index) => (
              <Draggable key={dept.id} draggableId={dept.id} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className="p-4 bg-card hover:bg-muted/10 transition-colors flex justify-between items-center gap-4"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div {...provided.dragHandleProps} className="text-muted-foreground hover:text-foreground cursor-grab">
                        <GripVertical size={20} />
                      </div>
                      
                      {editingId === dept.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input 
                            type="text" 
                            value={editName} 
                            onChange={e => setEditName(e.target.value)}
                            className="rounded-md border border-input bg-transparent px-2 py-1 text-sm w-full max-w-xs"
                            disabled={isSaving}
                            autoFocus
                          />
                          <button onClick={() => saveEdit(dept.id)} disabled={isSaving} className="text-green-500 hover:bg-green-500/10 p-1 rounded">
                            <Check size={18} />
                          </button>
                          <button onClick={() => setEditingId(null)} disabled={isSaving} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`font-bold text-foreground ${!dept.is_active && 'text-muted-foreground line-through'}`}>
                              {dept.name}
                            </p>
                            <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {dept.playerCount} Players
                            </span>
                            {dept.is_active ? (
                              <span className="text-xs font-medium bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full">Active</span>
                            ) : (
                              <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Hidden</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {editingId !== dept.id && (
                        <button onClick={() => startEdit(dept)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors" title="Rename">
                          <Edit2 size={18} />
                        </button>
                      )}
                      <button onClick={() => handleToggle(dept.id, dept.is_active)} className={`p-2 rounded-md transition-colors ${dept.is_active ? 'text-orange-500 hover:bg-orange-500/10' : 'text-green-500 hover:bg-green-500/10'}`} title={dept.is_active ? "Disable" : "Enable"}>
                        {dept.is_active ? <PowerOff size={18} /> : <Power size={18} />}
                      </button>
                      <button onClick={() => handleDelete(dept)} className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
    <ConfirmModal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} title="Delete department?" message={`Delete ${deleteTarget?.name || "this department"}? This cannot be undone.`} confirmText="Delete" />
    </>
  );
}


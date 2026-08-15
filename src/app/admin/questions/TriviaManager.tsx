"use client";

import { useState } from "react";
import { HelpCircle, Trash2, Calendar, Edit2 } from "lucide-react";

export default function TriviaManager({ 
  initialTrivia, 
  addAction, 
  editAction, 
  deleteAction, 
  toggleAction 
}: { 
  initialTrivia: any[],
  addAction: (data: FormData) => Promise<void>,
  editAction: (data: FormData) => Promise<void>,
  deleteAction: (id: string) => Promise<void>,
  toggleAction: (id: string, status: boolean) => Promise<void>
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form to add a new question */}
      <div className="lg:col-span-1 bg-card border border-border rounded-xl shadow-sm p-6 h-fit">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <HelpCircle size={20} className="text-primary" />
          Add New Question
        </h2>
        <form action={addAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Question Text</label>
            <textarea 
              name="question" 
              required 
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              placeholder="E.g., What year was our company founded?"
              rows={3}
            />
          </div>
          
          <div className="space-y-3">
            <label className="block text-sm font-medium">Multiple Choice Options</label>
            <div className="flex gap-2 items-center">
              <input type="radio" name="correctOption" value="1" required className="mt-1" />
              <input type="text" name="option1" required placeholder="Option 1" className="flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
            </div>
            <div className="flex gap-2 items-center">
              <input type="radio" name="correctOption" value="2" required className="mt-1" />
              <input type="text" name="option2" required placeholder="Option 2" className="flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
            </div>
            <div className="flex gap-2 items-center">
              <input type="radio" name="correctOption" value="3" required className="mt-1" />
              <input type="text" name="option3" required placeholder="Option 3" className="flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
            </div>
            <div className="flex gap-2 items-center">
              <input type="radio" name="correctOption" value="4" required className="mt-1" />
              <input type="text" name="option4" required placeholder="Option 4" className="flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Select the radio button next to the correct answer.</p>
          </div>

          <div className="pt-2 border-t border-border mt-4">
            <label className="block text-sm font-medium mb-1">Target Department</label>
            <select
              name="department"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              <option value="General">General (Everyone)</option>
              <option value="Engineering">Engineering</option>
              <option value="Sales">Sales</option>
              <option value="Marketing">Marketing</option>
              <option value="HR">HR</option>
            </select>
          </div>

          <div className="pt-2">
            <label className="block text-sm font-medium mb-1">Target Date (Optional)</label>
            <input 
              type="date" 
              name="targetDate" 
              min={new Date().toISOString().split('T')[0]}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Leave blank to add this to the "Anytime" pool.</p>
          </div>

          <button type="submit" className="w-full mt-4 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
            Add Question
          </button>
        </form>
      </div>

      {/* List of existing scheduled questions */}
      <div className="lg:col-span-2">
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar size={20} className="text-primary" />
              Trivia Database
            </h2>
          </div>
          
          <div className="divide-y divide-border">
            {(!initialTrivia || initialTrivia.length === 0) ? (
              <div className="p-8 text-center text-muted-foreground">
                No company trivia questions are scheduled. Add one to inject it into the daily game!
              </div>
            ) : (
              initialTrivia.map((t) => {
                const isEditing = editingId === t.id;
                
                if (isEditing) {
                  return (
                    <div key={t.id} className="p-4 bg-muted/20">
                      <form action={async (data) => {
                        await editAction(data);
                        setEditingId(null);
                      }} className="space-y-4">
                        <input type="hidden" name="id" value={t.id} />
                        
                        <div>
                          <label className="block text-xs font-medium mb-1">Question</label>
                          <textarea 
                            name="question" 
                            required 
                            defaultValue={t.question}
                            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                            rows={2}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="block text-xs font-medium">Options</label>
                            {t.options.map((opt: string, i: number) => (
                              <div key={i} className="flex gap-2 items-center">
                                <input type="radio" name="correctOption" value={i + 1} defaultChecked={opt === t.correct_answer} required />
                                <input type="text" name={`option${i + 1}`} required defaultValue={opt} className="flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
                              </div>
                            ))}
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-medium mb-1">Department</label>
                              <select name="department" defaultValue={t.department || "General"} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm">
                                <option value="General">General</option>
                                <option value="Engineering">Engineering</option>
                                <option value="Sales">Sales</option>
                                <option value="Marketing">Marketing</option>
                                <option value="HR">HR</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">Target Date</label>
                              <input type="date" name="targetDate" defaultValue={t.target_date || ""} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-border">
                          <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors">
                            Cancel
                          </button>
                          <button type="submit" className="px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                            Save Changes
                          </button>
                        </div>
                      </form>
                    </div>
                  );
                }

                return (
                  <div key={t.id} className="p-4 hover:bg-muted/10 transition-colors flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {t.target_date ? (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            📅 {t.target_date}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-600">
                            🔄 Anytime Pool
                          </span>
                        )}
                        <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                          {t.department || "General"}
                        </span>
                        
                        <button 
                          onClick={async () => {
                            await toggleAction(t.id, t.is_active);
                          }}
                          className={`text-xs font-bold px-2 py-0.5 rounded-full border transition-colors ${
                            t.is_active 
                              ? 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20' 
                              : 'bg-muted text-muted-foreground border-border hover:bg-muted-foreground/10'
                          }`}
                          title="Toggle active status"
                        >
                          {t.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                      <p className="font-bold text-foreground mb-2">{t.question}</p>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        {t.options.map((opt: string, i: number) => (
                          <li key={i} className={opt === t.correct_answer ? 'text-green-600 font-bold flex items-center gap-1' : ''}>
                            {opt === t.correct_answer ? '✓ ' : '• '}{opt}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <button onClick={() => setEditingId(t.id)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" title="Edit Question">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={async () => {
                        await deleteAction(t.id);
                      }} className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Delete Question">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

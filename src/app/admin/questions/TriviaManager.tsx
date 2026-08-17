"use client";

import { useState } from "react";
import { HelpCircle, Trash2, Calendar, Edit2 } from "lucide-react";

export default function TriviaManager({ 
  initialTrivia,
  gameTypes,
  departments,
  addAction, 
  editAction, 
  deleteAction, 
  toggleAction 
}: { 
  initialTrivia: any[],
  gameTypes: { slug: string, name: string }[],
  departments?: string[],
  addAction: (data: FormData) => Promise<void>,
  editAction: (data: FormData) => Promise<void>,
  deleteAction: (id: string) => Promise<void>,
  toggleAction: (id: string, status: boolean) => Promise<void>
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const compatibleGameSlugs = ['general-trivia', 'trivia', 'typing', 'typing-challenge'];
  const filteredGameTypes = gameTypes.filter(g => compatibleGameSlugs.includes(g.slug));
  
  const [selectedGameSlug, setSelectedGameSlug] = useState<string>(filteredGameTypes[0]?.slug || "trivia");

  const isMultipleChoice = ['general-trivia', 'trivia'].includes(selectedGameSlug);
  const isTargetText = ['typing', 'typing-challenge'].includes(selectedGameSlug);
  const isPuzzle = false;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form to add a new question */}
      <div className="lg:col-span-1 bg-card border border-border rounded-xl shadow-sm p-6 h-fit">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <HelpCircle size={20} className="text-primary" />
          Add New Question
        </h2>
        <form action={addAction} className="space-y-4">
          <div className="mb-2">
            <label className="block text-sm font-medium mb-2">Select Game Type</label>
            <input type="hidden" name="gameSlug" value={selectedGameSlug} />
            <div className="grid grid-cols-2 gap-3">
              {filteredGameTypes.map(gt => {
                const isSelected = selectedGameSlug === gt.slug;
                return (
                  <button
                    key={gt.slug}
                    type="button"
                    onClick={() => setSelectedGameSlug(gt.slug)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 text-sm transition-all ${
                      isSelected 
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-sm scale-[1.02]" 
                        : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    {gt.name}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              {isTargetText ? "Target Text" : isPuzzle ? "Puzzle Text" : "Question Text"}
            </label>
            <textarea 
              name="question" 
              required 
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              placeholder={isTargetText ? "E.g., The quick brown fox..." : isPuzzle ? "E.g., scrambled word like 'TAC' or 'H_LL_'" : "E.g., What year was our company founded? or What is 15 + 27?"}
              rows={3}
            />
            {isTargetText && (
              <p className="text-xs text-muted-foreground mt-1">This text will be used for both the prompt and the correct answer.</p>
            )}
          </div>

          {isPuzzle && (
             <div>
              <label className="block text-sm font-medium mb-1">Correct Answer</label>
              <input 
                type="text" 
                name="correctAnswerDirect" 
                required 
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="E.g., CAT or HELLO"
              />
            </div>
          )}
          
          {isMultipleChoice && (
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
          )}

          <div className="pt-2 border-t border-border mt-4">
            <label className="block text-sm font-medium mb-1">Target Department</label>
            <select
              name="department"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              <option value="General">General (Everyone)</option>
              {(departments || []).map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
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
              Custom Questions Database
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Manage scheduled and anytime custom questions.</p>
          </div>
          
          <div className="divide-y divide-border">
            {(!initialTrivia || initialTrivia.length === 0) ? (
              <div className="p-8 text-center text-muted-foreground">
                No custom questions are scheduled. Add one to inject it into the daily game!
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
                          <label className="block text-xs font-medium mb-2">Game Type</label>
                          <div className="grid grid-cols-2 gap-2">
                            {filteredGameTypes.map(gt => (
                              <label key={gt.slug} className="cursor-pointer">
                                <input 
                                  type="radio" 
                                  name="gameSlug" 
                                  value={gt.slug} 
                                  defaultChecked={(t.game_slug || "trivia") === gt.slug} 
                                  className="peer sr-only" 
                                />
                                <div className="text-center p-2 rounded-lg border-2 border-border text-xs text-muted-foreground peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-checked:font-bold transition-all hover:bg-muted">
                                  {gt.name}
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                        {(() => {
                          const currentSlug = t.game_slug || "trivia";
                          const isMC = ['general-trivia', 'trivia'].includes(currentSlug);
                          const isTarget = ['typing', 'typing-challenge'].includes(currentSlug);
                          const isPzl = false;
                          
                          return (
                            <>
                              <div>
                                <label className="block text-xs font-medium mb-1">
                                  {isTarget ? "Target Text" : isPzl ? "Puzzle Text" : "Question Text"}
                                </label>
                                <textarea 
                                  name="question" 
                                  required 
                                  defaultValue={t.question}
                                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                  rows={2}
                                />
                              </div>

                              {isPzl && (
                                <div>
                                  <label className="block text-xs font-medium mb-1">Correct Answer</label>
                                  <input 
                                    type="text" 
                                    name="correctAnswerDirect" 
                                    defaultValue={t.correct_answer}
                                    required 
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                  />
                                </div>
                              )}

                              {isMC && (
                                <div className="space-y-2">
                                  <label className="block text-xs font-medium">Options</label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="flex gap-2 items-center">
                                      <input type="radio" name="correctOption" value="1" defaultChecked={t.correct_answer === t.options?.[0]} required />
                                      <input type="text" name="option1" defaultValue={t.options?.[0]} required className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm" />
                                    </div>
                                    <div className="flex gap-2 items-center">
                                      <input type="radio" name="correctOption" value="2" defaultChecked={t.correct_answer === t.options?.[1]} required />
                                      <input type="text" name="option2" defaultValue={t.options?.[1]} required className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm" />
                                    </div>
                                    <div className="flex gap-2 items-center">
                                      <input type="radio" name="correctOption" value="3" defaultChecked={t.correct_answer === t.options?.[2]} required />
                                      <input type="text" name="option3" defaultValue={t.options?.[2]} required className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm" />
                                    </div>
                                    <div className="flex gap-2 items-center">
                                      <input type="radio" name="correctOption" value="4" defaultChecked={t.correct_answer === t.options?.[3]} required />
                                      <input type="text" name="option4" defaultValue={t.options?.[3]} required className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm" />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-medium mb-1">Department</label>
                              <select name="department" defaultValue={t.department || "General"} className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm">
                                <option value="General">General</option>
                                {(departments || []).map(dept => (
                                  <option key={dept} value={dept}>{dept}</option>
                                ))}
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
                        <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600">
                          {gameTypes.find(g => g.slug === (t.game_slug || 'trivia'))?.name || "Trivia"}
                        </span>
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

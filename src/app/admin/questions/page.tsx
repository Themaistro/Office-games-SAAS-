import { createClient } from "@/lib/supabase/server";
import { addCompanyTrivia, deleteTrivia, toggleTriviaStatus } from "./actions";
import { HelpCircle, Trash2, Calendar, Power } from "lucide-react";
import { revalidatePath } from "next/cache";

export default async function QuestionsManagementPage() {
  const supabase = await createClient();
  
  // Fetch existing scheduled trivia
  const { data: trivia, error } = await supabase
    .from("company_trivia")
    .select("*")
    .order("target_date", { ascending: true });

  // Inline server action to delete trivia
  const handleDelete = async (formData: FormData) => {
    "use server";
    const id = formData.get("id") as string;
    if (id) {
      await deleteTrivia(id);
    }
  };

  const handleToggle = async (formData: FormData) => {
    "use server";
    const id = formData.get("id") as string;
    const currentStatus = formData.get("currentStatus") === "true";
    if (id) {
      await toggleTriviaStatus(id, currentStatus);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Company Trivia</h1>
        <p className="text-muted-foreground mt-1">Inject custom company-specific questions into the daily games.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form to add a new question */}
        <div className="lg:col-span-1 bg-card border border-border rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <HelpCircle size={20} className="text-primary" />
            Add New Question
          </h2>
          <form action={addCompanyTrivia} className="space-y-4">
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

            <div className="pt-2">
              <label className="block text-sm font-medium mb-1">Target Date</label>
              <input 
                type="date" 
                name="targetDate" 
                required 
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">This question will appear for all users on this date.</p>
            </div>

            <button type="submit" className="w-full mt-4 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
              Schedule Question
            </button>
          </form>
        </div>

        {/* List of existing scheduled questions */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                Scheduled Questions Queue
              </h2>
            </div>
            
            <div className="divide-y divide-border">
              {(!trivia || trivia.length === 0) ? (
                <div className="p-8 text-center text-muted-foreground">
                  No company trivia questions are scheduled. Add one to inject it into the daily game!
                </div>
              ) : (
                trivia.map((t) => (
                  <div key={t.id} className="p-4 hover:bg-muted/10 transition-colors flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {t.target_date}
                        </span>
                        <form action={handleToggle} className="inline">
                          <input type="hidden" name="id" value={t.id} />
                          <input type="hidden" name="currentStatus" value={t.is_active ? "true" : "false"} />
                          <button 
                            type="submit" 
                            className={`text-xs font-bold px-2 py-0.5 rounded-full border transition-colors ${
                              t.is_active 
                                ? 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20' 
                                : 'bg-muted text-muted-foreground border-border hover:bg-muted-foreground/10'
                            }`}
                            title="Toggle active status"
                          >
                            {t.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </form>
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
                    
                    <form action={handleDelete}>
                      <input type="hidden" name="id" value={t.id} />
                      <button type="submit" className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Delete Question">
                        <Trash2 size={18} />
                      </button>
                    </form>
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

import { createClient } from "@/lib/supabase/server";
import { HelpCircle, Plus, Search } from "lucide-react";

export default async function AdminQuestionsPage() {
  const supabase = await createClient();
  
  const { data: questions } = await supabase
    .from("questions")
    .select(`
      id, difficulty, content, correct_answer, base_xp,
      game_types(name)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Question Bank</h1>
          <p className="text-muted-foreground mt-1">Manage all mini-game questions and add custom company trivia.</p>
        </div>
        <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Plus size={18} />
          Add Question
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search questions..." 
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex gap-2">
            <select className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option>All Types</option>
              <option>Trivia</option>
              <option>Logic</option>
              <option>Word</option>
              <option>Memory</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold">Content</th>
                <th className="px-6 py-3 font-semibold">Answer</th>
                <th className="px-6 py-3 font-semibold">Difficulty</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {questions?.map((q: any) => (
                <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs">
                      {q.game_types.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-md truncate">
                    {q.content.text}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">
                    {q.correct_answer}
                  </td>
                  <td className="px-6 py-4 capitalize">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      q.difficulty === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {q.difficulty}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-primary hover:underline text-xs font-medium">Edit</button>
                  </td>
                </tr>
              ))}
              
              {!questions || questions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <HelpCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p>No questions found. Add some to get started!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { addCompanyTrivia, deleteTrivia, toggleTriviaStatus, editCompanyTrivia } from "./actions";
import TriviaManager from "./TriviaManager";

export const dynamic = 'force-dynamic';

export default async function QuestionsManagementPage() {
  const supabase = await createClient();
  
  // Fetch existing scheduled trivia
  const { data: trivia, error } = await supabase
    .from("company_trivia")
    .select("*")
    .order("target_date", { ascending: true, nullsFirst: true });

  // Wrapper functions for actions to match the client component signature
  const handleDelete = async (id: string) => {
    "use server";
    await deleteTrivia(id);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    "use server";
    await toggleTriviaStatus(id, currentStatus);
  };

  // Fetch game types for custom questions
  const { data: gameTypes } = await supabase
    .from("game_types")
    .select("slug, name")
    .eq("is_active", true);

  // Fetch departments for target filtering
  const { data: departments } = await supabase
    .from("departments")
    .select("name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true, nullsFirst: false });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Custom Questions</h1>
        <p className="text-muted-foreground mt-1">Inject custom company-specific questions and typing challenges into the daily games.</p>
      </div>

      <TriviaManager 
        initialTrivia={trivia || []} 
        gameTypes={gameTypes || []}
        departments={(departments || []).map(d => d.name)}
        addAction={addCompanyTrivia} 
        editAction={editCompanyTrivia}
        deleteAction={handleDelete}
        toggleAction={handleToggle}
      />
    </div>
  );
}

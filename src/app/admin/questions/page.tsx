import { createClient } from "@/lib/supabase/server";
import { addCompanyTrivia, deleteTrivia, toggleTriviaStatus, editCompanyTrivia } from "./actions";
import TriviaManager from "./TriviaManager";

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

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Company Trivia</h1>
        <p className="text-muted-foreground mt-1">Inject custom company-specific questions into the daily games.</p>
      </div>

      <TriviaManager 
        initialTrivia={trivia || []} 
        addAction={addCompanyTrivia} 
        editAction={editCompanyTrivia}
        deleteAction={handleDelete}
        toggleAction={handleToggle}
      />
    </div>
  );
}

import { query } from "@/lib/db";
import { getActiveDepartments } from "@/lib/departments";
import { addCompanyTrivia, deleteTrivia, toggleTriviaStatus, editCompanyTrivia } from "./actions";
import TriviaManager from "./TriviaManager";

export const dynamic = 'force-dynamic';

export default async function QuestionsManagementPage() {
  // Fetch existing scheduled trivia
  const { rows: trivia } = await query("SELECT * FROM company_trivia ORDER BY target_date ASC NULLS FIRST");

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
  const { rows: gameTypes } = await query<{ slug: string; name: string }>("SELECT slug, name FROM game_types WHERE is_active = true");

  // Fetch departments for target filtering
  const departments = await getActiveDepartments();

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


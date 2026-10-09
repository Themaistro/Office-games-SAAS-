import { createClient } from "@/lib/supabase/server";
import { addPrize, deletePrize } from "./actions";
import { Trophy, Trash2, Gift } from "lucide-react";

export default async function PrizesManagementPage() {
  const supabase = await createClient();
  
  const { data: prizes, error } = await supabase
    .from("prizes")
    .select("*")
    .order("rank_requirement", { ascending: true });

  const handleDelete = async (formData: FormData) => {
    "use server";
    const id = formData.get("id") as string;
    if (id) await deletePrize(id);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Season Prizes</h1>
        <p className="text-muted-foreground mt-1">Configure what employees are competing for! These will be displayed proudly on the leaderboard.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Form to add a new prize */}
        <div className="md:col-span-1 bg-card border border-border rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Gift size={20} className="text-primary" />
            Add Prize
          </h2>
          <form action={addPrize} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Rank Required</label>
              <input 
                type="number"
                name="rank_requirement" 
                required 
                min="1"
                placeholder="e.g. 1 for 1st Place"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Prize Title</label>
              <input 
                type="text" 
                name="title" 
                required 
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="e.g. $100 Amazon Gift Card"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Emoji Icon</label>
              <input 
                type="text" 
                name="icon_emoji" 
                defaultValue="🏆"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-2xl"
                placeholder="🏆"
              />
              <p className="text-xs text-muted-foreground mt-1">Use a single emoji to represent this prize.</p>
            </div>

            <button type="submit" className="w-full mt-4 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
              Save Prize
            </button>
          </form>
        </div>

        {/* List of existing prizes */}
        <div className="md:col-span-2">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden h-full">
            <div className="p-4 border-b border-border bg-muted/30">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Trophy size={20} className="text-yellow-500" />
                Current Prize Pool
              </h2>
            </div>
            <div className="divide-y divide-border">
              {(!prizes || prizes.length === 0) ? (
                <div className="p-8 text-center text-muted-foreground">
                  No prizes configured for this season yet.
                </div>
              ) : (
                prizes.map((prize) => (
                  <div key={prize.id} className="p-4 hover:bg-muted/10 transition-colors flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{prize.icon_emoji}</div>
                      <div>
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary mb-1">
                          {prize.rank_requirement}{prize.rank_requirement === 1 ? 'st' : prize.rank_requirement === 2 ? 'nd' : prize.rank_requirement === 3 ? 'rd' : 'th'} Place
                        </span>
                        <p className="font-bold text-foreground text-lg">{prize.title}</p>
                      </div>
                    </div>
                    
                    <form action={handleDelete}>
                      <input type="hidden" name="id" value={prize.id} />
                      <button type="submit" className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Delete">
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

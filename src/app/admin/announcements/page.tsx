import { createClient } from "@/lib/supabase/server";
import { addAnnouncement, toggleAnnouncementStatus, deleteAnnouncement } from "./actions";
import { Megaphone, Trash2, Power, PowerOff } from "lucide-react";

export default async function AnnouncementsManagementPage() {
  const supabase = await createClient();
  
  const { data: announcements, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  const handleToggle = async (formData: FormData) => {
    "use server";
    const id = formData.get("id") as string;
    const isActive = formData.get("isActive") === "true";
    if (id) await toggleAnnouncementStatus(id, isActive);
  };

  const handleDelete = async (formData: FormData) => {
    "use server";
    const id = formData.get("id") as string;
    if (id) await deleteAnnouncement(id);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Announcements</h1>
        <p className="text-muted-foreground mt-1">Broadcast important messages directly to every employee's dashboard.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* Form to add a new announcement */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Megaphone size={20} className="text-primary" />
            New Broadcast
          </h2>
          <form action={addAnnouncement} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea 
                name="message" 
                required 
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="e.g. Only 3 days left in this month's season! Top 3 win a gift card!"
              />
            </div>
            
            <button type="submit" className="mt-4 rounded-md bg-primary px-6 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
              Publish Banner
            </button>
          </form>
        </div>

        {/* List of existing announcements */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <h2 className="text-lg font-bold">Announcement History</h2>
          </div>
          <div className="divide-y divide-border">
            {(!announcements || announcements.length === 0) ? (
              <div className="p-8 text-center text-muted-foreground">
                No announcements broadcasted yet.
              </div>
            ) : (
              announcements.map((msg) => (
                <div key={msg.id} className={`p-4 hover:bg-muted/10 transition-colors flex justify-between items-start gap-4 ${msg.is_active ? 'bg-primary/5' : ''}`}>
                  <div className="flex-1">
                    <p className={`font-bold text-foreground mb-1 ${!msg.is_active && 'text-muted-foreground line-through'}`}>
                      {msg.message}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${msg.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                        {msg.is_active ? 'Active on Dashboard' : 'Archived'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <form action={handleToggle}>
                      <input type="hidden" name="id" value={msg.id} />
                      <input type="hidden" name="isActive" value={msg.is_active.toString()} />
                      <button type="submit" className={`p-2 rounded-md transition-colors ${msg.is_active ? 'text-orange-500 hover:bg-orange-500/10' : 'text-green-500 hover:bg-green-500/10'}`} title={msg.is_active ? "Archive" : "Republish"}>
                        {msg.is_active ? <PowerOff size={18} /> : <Power size={18} />}
                      </button>
                    </form>
                    
                    <form action={handleDelete}>
                      <input type="hidden" name="id" value={msg.id} />
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
  );
}

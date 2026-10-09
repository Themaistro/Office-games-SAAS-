import { createClient } from "@/lib/supabase/server";
import { addAnnouncement, toggleAnnouncementStatus, deleteAnnouncement } from "./actions";
import { Trash2, Power, PowerOff } from "lucide-react";
import LiveAnnouncementForm from "./LiveAnnouncementForm";

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
        
        {/* Form to add a new announcement with live preview */}
        <LiveAnnouncementForm action={addAnnouncement} />

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
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Type: {msg.type || 'info'}
                      </span>
                      {msg.cta_text && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">CTA: {msg.cta_text}</span>
                        </>
                      )}
                    </div>
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

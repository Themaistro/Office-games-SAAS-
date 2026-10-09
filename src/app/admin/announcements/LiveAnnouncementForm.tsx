"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import AnnouncementBanner from "@/components/dashboard/AnnouncementBanner";

export default function LiveAnnouncementForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [ctaText, setCtaText] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    try {
      await action(formData);
      // Reset form
      setMessage("");
      setType("info");
      setCtaText("");
      setCtaLink("");
    } catch (err) {
      console.error(err);
      alert("Failed to add announcement");
    } finally {
      setIsPending(false);
    }
  };

  // Mock announcement for live preview
  const previewAnnouncement = {
    message: message || "Type your message above to see a preview here...",
    type,
    cta_text: ctaText,
    cta_link: ctaLink || "#"
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      {/* Form */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Megaphone size={20} className="text-primary" />
          New Broadcast
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea 
              name="message" 
              required 
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              placeholder="e.g. Only 3 days left in this month's season! Top 3 win a gift card!"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              <option value="info">Info (Blue)</option>
              <option value="success">Success (Green)</option>
              <option value="warning">Warning (Orange)</option>
              <option value="urgent">Urgent (Red)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">CTA Button Text (Optional)</label>
              <input 
                type="text"
                name="cta_text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="e.g. Play Now"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CTA Button URL (Optional)</label>
              <input 
                type="url"
                name="cta_link"
                value={ctaLink}
                onChange={(e) => setCtaLink(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="https://..."
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={isPending || !message.trim()}
            className="w-full mt-4 rounded-md bg-primary px-6 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isPending ? "Publishing..." : "Publish Banner"}
          </button>
        </form>
      </div>

      {/* Live Preview */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Live Preview</h3>
        <div className="bg-muted/10 border border-dashed border-border rounded-xl p-6 flex flex-col justify-center items-center h-[calc(100%-2.5rem)]">
          <div className="w-full max-w-2xl">
            <AnnouncementBanner announcements={[previewAnnouncement]} />
          </div>
          <p className="text-xs text-muted-foreground text-center">This is exactly how it will appear on employee dashboards.</p>
        </div>
      </div>
    </div>
  );
}

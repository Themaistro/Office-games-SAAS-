"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { updateProfile } from "@/app/profile/actions";
import { User, X, Check, Loader2, Edit3 } from "lucide-react";
import { clsx } from "clsx";

const AVATARS = [
  // Cute avatars (Lorelei)
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Mimi&backgroundColor=ffd5dc",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Bella&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Chloe&backgroundColor=d1d4f9",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Lily&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Sophie&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Zoe&backgroundColor=ffc0cb",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Mia&backgroundColor=a8e6cf",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Ruby&backgroundColor=ffd3b6",
  
  // Strong/Action avatars (Adventurer)
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Max&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Leo&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Ryder&backgroundColor=d1d4f9",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Tyson&backgroundColor=ffaaa5",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Hunter&backgroundColor=a8e6cf",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Axel&backgroundColor=dcedc1",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Zane&backgroundColor=ff8b94",

  // Modern / Minimalist (Micah)
  "https://api.dicebear.com/7.x/micah/svg?seed=Felix&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/micah/svg?seed=Aneka&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/micah/svg?seed=Nala&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/micah/svg?seed=Simon&backgroundColor=ffd5dc",
  "https://api.dicebear.com/7.x/micah/svg?seed=Jane&backgroundColor=ffc0cb",
  "https://api.dicebear.com/7.x/micah/svg?seed=Tom&backgroundColor=a8e6cf",
  "https://api.dicebear.com/7.x/micah/svg?seed=Sarah&backgroundColor=ffd3b6",
  "https://api.dicebear.com/7.x/micah/svg?seed=John&backgroundColor=d1d4f9",

  // Classic People (Avataaars)
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver&backgroundColor=a8e6cf",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma&backgroundColor=ffc0cb",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Liam&backgroundColor=d1d4f9",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Ava&backgroundColor=ffd3b6",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Noah&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Mason&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Isabella&backgroundColor=ffd5dc",

  // Robots (Bottts)
  "https://api.dicebear.com/7.x/bottts/svg?seed=Felix&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Aneka&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robo1&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robo2&backgroundColor=ffd5dc",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robo3&backgroundColor=a8e6cf",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robo4&backgroundColor=ffc0cb",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robo5&backgroundColor=d1d4f9",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robo6&backgroundColor=ffd3b6",

  // Pixel Art
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Player1&backgroundColor=ffc0cb",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Player2&backgroundColor=a8e6cf",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Player3&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Player4&backgroundColor=ffd5dc",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Player5&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Player6&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Player7&backgroundColor=d1d4f9",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Player8&backgroundColor=ffd3b6",

  // Fun Emoji
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Happy&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cool&backgroundColor=ffd5dc",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Wink&backgroundColor=a8e6cf",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Love&backgroundColor=ffc0cb",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Star&backgroundColor=ffd3b6",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Laugh&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Smile&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Grin&backgroundColor=d1d4f9",

  // Doodles (Croodles)
  "https://api.dicebear.com/7.x/croodles/svg?seed=Doodle1&backgroundColor=ffd3b6",
  "https://api.dicebear.com/7.x/croodles/svg?seed=Doodle2&backgroundColor=a8e6cf",
  "https://api.dicebear.com/7.x/croodles/svg?seed=Doodle3&backgroundColor=ffc0cb",
  "https://api.dicebear.com/7.x/croodles/svg?seed=Doodle4&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/croodles/svg?seed=Doodle5&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/croodles/svg?seed=Doodle6&backgroundColor=ffd5dc",
  "https://api.dicebear.com/7.x/croodles/svg?seed=Doodle7&backgroundColor=d1d4f9",
  "https://api.dicebear.com/7.x/croodles/svg?seed=Doodle8&backgroundColor=ffdfbf",
];

interface EditProfileModalProps {
  currentName: string;
  currentAvatar: string | null;
  currentDepartment?: string;
  children?: React.ReactNode;
}

export default function EditProfileModal({ currentName, currentAvatar, currentDepartment, children }: EditProfileModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [avatar, setAvatar] = useState(currentAvatar || AVATARS[0]);
  const [department, setDepartment] = useState(currentDepartment || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    await updateProfile(name, avatar, department);
    setIsSubmitting(false);
    setIsOpen(false);
  };

  return (
    <>
      {children ? (
        <div onClick={() => setIsOpen(true)} className="cursor-pointer inline-block group/edit">
          {children}
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="absolute top-4 right-4 p-2 bg-background/50 backdrop-blur border border-border/50 text-muted-foreground hover:text-foreground rounded-full transition-colors hover:bg-secondary z-10"
          title="Edit Profile"
        >
          <Edit3 size={18} />
        </button>
      )}

      {isOpen && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold">Edit Profile</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6 overflow-y-auto">
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Choose Avatar</label>
                <div className="max-h-[40vh] overflow-y-auto pr-2 pb-2 custom-scrollbar">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {AVATARS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAvatar(a)}
                        className={clsx(
                          "relative w-full aspect-square rounded-2xl border-2 transition-all p-1 flex items-center justify-center overflow-hidden hover:scale-105",
                          avatar === a ? "border-primary bg-primary/10 shadow-md" : "border-border bg-secondary hover:border-primary/50"
                        )}
                      >
                        <img src={a} alt="Avatar option" className="w-full h-full object-contain" />
                        {avatar === a && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-sm">
                            <Check size={14} strokeWidth={4} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Display Name</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-medium text-foreground transition-all"
                  required
                />
              </div>

              <div id="tour-profile-department" className="flex flex-col gap-2">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Department</label>
                <select 
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-medium text-foreground transition-all appearance-none"
                >
                  <option value="">Select your department...</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Design">Design</option>
                  <option value="Product">Product</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Operations">Operations</option>
                  <option value="Legal">Legal</option>
                </select>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isSubmitting || !name.trim()}
                  className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <><Loader2 className="animate-spin" size={20} /> Saving...</>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

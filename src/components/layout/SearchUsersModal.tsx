"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, User, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SearchUsersModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const searchUsers = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, department, avatar_url, role")
        .ilike("full_name", `%${query}%`)
        .eq("role", "employee")
        .order("full_name", { ascending: true })
        .limit(10);
      
      setResults(data || []);
      setIsSearching(false);
    };

    const timeout = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:pt-32">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-border gap-3">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for coworkers to challenge..."
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-lg"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button 
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded-full text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim().length > 0 && query.trim().length < 2 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Keep typing...
            </div>
          )}
          
          {isSearching && query.trim().length >= 2 && results.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          )}

          {!isSearching && query.trim().length >= 2 && results.length === 0 && (
            <div className="p-8 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                <Search className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-foreground font-semibold">No users found</p>
              <p className="text-sm text-muted-foreground">Try a different name</p>
            </div>
          )}

          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => {
                onClose();
                router.push(`/profile/${user.id}`);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-left group"
            >
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">{user.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.department || "No Department"}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 transform" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

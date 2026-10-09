"use client";

import React, { useEffect } from "react";
import { AlertCircle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  /** Tailwind class(es) to shift the centering area away from an overlapping panel, e.g. "sm:pr-[28rem]" */
  offsetClassName?: string;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = true,
  offsetClassName = "",
}: ConfirmModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
    }
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 ${offsetClassName}`}
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <div
        className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full shrink-0 ${isDestructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
              <AlertCircle size={24} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold tracking-tight mb-2">{title}</h3>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors -mt-1 -mr-1 p-1">
                  <X size={20} />
                </button>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-muted/50 p-4 border-t border-border flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors shadow-sm ${
              isDestructive 
                ? 'bg-destructive hover:bg-destructive/90' 
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

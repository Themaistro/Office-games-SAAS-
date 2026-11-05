"use client";

import { AlertCircle, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

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
  const dialog = useRef<HTMLDivElement>(null);
  const closeCallback = useRef(onClose);
  useEffect(() => {
    closeCallback.current = onClose;
  }, [onClose]);
  const titleId = useId();
  const messageId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCallback.current();
      if (e.key === "Tab") {
        const nodes = dialog.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      dialog.current
        ?.querySelector<HTMLElement>("button")
        ?.focus({ preventScroll: true });
    }
    return () => {
      window.removeEventListener("keydown", handleEscape);
      if (isOpen) previous?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 layer-confirmation flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 ${offsetClassName}`}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-full shrink-0 ${isDestructive ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
            >
              <AlertCircle size={24} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3
                  id={titleId}
                  className="text-xl font-bold tracking-tight mb-2"
                >
                  {title}
                </h3>
                <button
                  aria-label="Close confirmation"
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground transition-colors -mt-1 -mr-1 p-1"
                >
                  <X size={20} />
                </button>
              </div>
              <p
                id={messageId}
                className="text-muted-foreground text-sm leading-relaxed"
              >
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
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

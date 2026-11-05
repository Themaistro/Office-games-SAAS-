"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Palette } from "lucide-react";
import { useAppearance } from "@/components/providers/AppearanceProvider";
import styles from "./AppearanceSwitch.module.css";
const themes = [
  {
    id: "original",
    name: "Playground",
    description: "Bright, colourful & playful",
    colours: ["#4f46e5", "#0f766e", "#be123c", "#d5a141"],
  },
  {
    id: "combined",
    name: "Soft Focus",
    description: "Warm, gentle & easygoing",
    colours: ["#4f46e5", "#f8f7f4", "#a5c9c3", "#e5baa7"],
  },
] as const;
export default function AppearanceSwitch() {
  const { theme, setTheme } = useAppearance();
  const [open, setOpen] = useState(false);
  const id = useId(),
    root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = themes.find((item) => item.id === theme)!;
  useEffect(() => {
    if (!open) return;
    items.current[themes.findIndex((item) => item.id === theme)]?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, theme]);
  return (
    <div
      className={styles.root}
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        type="button"
        ref={trigger}
        className={styles.trigger}
        aria-label={`Appearance: ${selected.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <Palette size={17} aria-hidden="true" />
        <span>Appearance</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={open ? styles.chevronOpen : undefined}
        />
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          aria-label="Choose your appearance"
          className={styles.menu}
        >
          <div className={styles.heading}>
            Make it feel like you<span>Choose your Office Games style</span>
          </div>
          {themes.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="menuitemradio"
              aria-checked={theme === item.id}
              ref={(node) => {
                items.current[index] = node;
              }}
              className={styles.choice}
              onClick={() => {
                setTheme(item.id);
                setOpen(false);
                trigger.current?.focus();
              }}
              onKeyDown={(event) => {
                let next = index;
                if (event.key === "ArrowDown")
                  next = (index + 1) % themes.length;
                else if (event.key === "ArrowUp")
                  next = (index + themes.length - 1) % themes.length;
                else if (event.key === "Home") next = 0;
                else if (event.key === "End") next = themes.length - 1;
                else return;
                event.preventDefault();
                items.current[next]?.focus();
              }}
            >
              <span className={styles.preview} aria-hidden="true">
                {item.colours.map((colour) => (
                  <span key={colour} style={{ background: colour }} />
                ))}
              </span>
              <span className={styles.copy}>
                <strong>{item.name}</strong>
                <span>{item.description}</span>
              </span>
              <span className={styles.check} aria-hidden="true">
                {theme === item.id && <Check size={16} />}
              </span>
            </button>
          ))}
          <p className={styles.footer}>
            Applies everywhere · saved in this browser
          </p>
        </div>
      )}
    </div>
  );
}

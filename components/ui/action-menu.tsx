"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ActionMenuProps = {
  children: React.ReactNode;
  triggerLabel?: string;
  triggerClassName?: string;
  panelClassName?: string;
};

export function ActionMenu({
  children,
  triggerLabel = "⋯",
  triggerClassName,
  panelClassName,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  function updatePanelPosition() {
    if (!triggerRef.current || typeof window === "undefined") {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const panelWidth = 256;
    const viewportPadding = 8;
    const maxLeft = window.innerWidth - panelWidth - viewportPadding;
    const nextLeft = Math.min(Math.max(rect.right - panelWidth, viewportPadding), maxLeft);
    const nextTop = rect.bottom + 8;

    setPanelPosition({
      top: nextTop,
      left: nextLeft,
      width: panelWidth,
    });
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    updatePanelPosition();

    function onDocumentMouseDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    }

    function onWindowResize() {
      updatePanelPosition();
    }

    function onWindowScroll() {
      updatePanelPosition();
    }

    function onDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("keydown", onDocumentKeyDown);
    window.addEventListener("resize", onWindowResize);
    window.addEventListener("scroll", onWindowScroll, true);

    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("scroll", onWindowScroll, true);
    };
  }, [open]);

  const panel = open && panelPosition ? (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: panelPosition.top,
        left: panelPosition.left,
        width: panelPosition.width,
        zIndex: 1100,
      }}
      className={
        panelClassName ?? "rounded-md border-0 bg-white p-3 shadow-[0_14px_30px_-20px_rgba(15,23,42,0.45)]"
      }
    >
      {children}
    </div>
  ) : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-label="Abrir acciones"
        onClick={() => setOpen((value) => !value)}
        className={
          triggerClassName ??
          "inline-flex h-8 w-8 items-center justify-center rounded-md border-0 bg-slate-100 text-base font-semibold text-slate-700 transition hover:bg-slate-200"
        }
      >
        {triggerLabel}
      </button>

      {panel && typeof document !== "undefined" ? createPortal(panel, document.body) : null}
    </div>
  );
}

"use client";

import { useEffect, useId, useState } from "react";

type ModalButtonProps = {
  triggerLabel: string;
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
};

export function ModalButton({
  triggerLabel,
  title,
  description,
  className,
  children,
}: ModalButtonProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          "inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50",
          className ?? "",
        ].join(" ")}
      >
        {triggerLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            className="w-full max-w-2xl rounded-2xl border border-white/70 bg-white p-5 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id={titleId} className="text-base font-semibold tracking-tight text-slate-950">
                  {title}
                </h3>
                {description ? (
                  <p id={descriptionId} className="mt-1 text-sm text-slate-600">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50"
                aria-label="Cerrar detalle"
              >
                ×
              </button>
            </div>

            <div className="mt-4 max-h-[70vh] overflow-y-auto pr-1">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}

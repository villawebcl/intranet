"use client";

import { useFormStatus } from "react-dom";

type FormSubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
};

export function FormSubmitButton({
  children,
  pendingLabel,
  className,
  disabled = false,
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-busy={pending}
      className={[
        className ?? "",
        "inline-flex items-center justify-center rounded-md border-0 bg-slate-100 text-slate-700 transition hover:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60",
      ].join(" ")}
    >
      {pending ? pendingLabel ?? "Procesando..." : children}
    </button>
  );
}

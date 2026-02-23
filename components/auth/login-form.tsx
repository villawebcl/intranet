"use client";

import { FormEvent, useMemo, useState } from "react";

import { AlertBanner } from "@/components/ui/alert-banner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

type LoginFormProps = {
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function registerAuthLoginFromBrowser() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const { error } = await supabase.from("audit_logs").insert({
        actor_user_id: user.id,
        actor_role: profile?.role ?? "visitante",
        action: "auth_login",
        entity_type: "auth",
        metadata: {
          method: "password",
          source: "browser",
        },
      });

      if (error) {
        console.error("auth login audit insert failed (browser)", error);
      }
    } catch (auditError) {
      console.error("auth login audit browser flow failed", auditError);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError("No se pudo iniciar sesion. Revisa tus credenciales.");
      setIsSubmitting(false);
      return;
    }

    await registerAuthLoginFromBrowser();
    await new Promise((resolve) => setTimeout(resolve, 150));
    window.location.assign(nextPath);
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-800" htmlFor="email">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
          placeholder="usuario@anagami.cl"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-800" htmlFor="password">
          Contrasena
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
          placeholder="********"
        />
      </div>

      {error ? (
        <AlertBanner variant="error">{error}</AlertBanner>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-12px_rgba(15,23,42,0.8)] hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
      >
        {isSubmitting ? "Entrando..." : "Iniciar sesion"}
      </button>
    </form>
  );
}

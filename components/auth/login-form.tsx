import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { AlertBanner } from "@/components/ui/alert-banner";

type LoginFormProps = {
  nextPath: string;
  errorMessage?: string | null;
  action: (formData: FormData) => Promise<void>;
};

export function LoginForm({ nextPath, errorMessage, action }: LoginFormProps) {
  return (
    <form className="space-y-4" action={action}>
      <input type="hidden" name="nextPath" value={nextPath} />

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
          className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
          placeholder="usuario@empresa.cl"
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
          className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
          placeholder="********"
        />
      </div>

      {errorMessage ? <AlertBanner variant="error">{errorMessage}</AlertBanner> : null}

      <FormSubmitButton
        pendingLabel="Entrando..."
        className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-12px_rgba(15,23,42,0.8)] hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
      >
        Iniciar sesion
      </FormSubmitButton>
    </form>
  );
}

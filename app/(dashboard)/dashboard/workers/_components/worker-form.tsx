import Link from "next/link";

import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { FlashMessages } from "@/components/ui/flash-messages";

type WorkerFormValues = {
  rut: string;
  firstName: string;
  lastName: string;
  position: string;
  area: string;
  email: string;
  phone: string;
};

type WorkerFormProps = {
  title: string;
  description: string;
  submitLabel: string;
  action: (formData: FormData) => void | Promise<void>;
  values: WorkerFormValues;
  errorMessage?: string;
  successMessage?: string;
  showAccessSetup?: boolean;
};

function inputClassName() {
  return "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 transition focus:ring-2";
}

export function WorkerForm(props: WorkerFormProps) {
  const showAccessSetup = props.showAccessSetup ?? false;

  return (
    <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{props.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{props.description}</p>
      </header>

      <FlashMessages
        className="mt-4"
        error={props.errorMessage ?? null}
        success={props.successMessage ?? null}
      />

      <form action={props.action} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="rut" className="text-sm font-medium text-slate-900">
              RUT
            </label>
            <input
              id="rut"
              name="rut"
              required
              defaultValue={props.values.rut}
              className={inputClassName()}
              placeholder="12.345.678-9"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="position" className="text-sm font-medium text-slate-900">
              Cargo
            </label>
            <input
              id="position"
              name="position"
              defaultValue={props.values.position}
              className={inputClassName()}
              placeholder="Guardia"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="firstName" className="text-sm font-medium text-slate-900">
              Nombre
            </label>
            <input
              id="firstName"
              name="firstName"
              required
              defaultValue={props.values.firstName}
              className={inputClassName()}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="lastName" className="text-sm font-medium text-slate-900">
              Apellido
            </label>
            <input
              id="lastName"
              name="lastName"
              required
              defaultValue={props.values.lastName}
              className={inputClassName()}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="area" className="text-sm font-medium text-slate-900">
              Area
            </label>
            <input
              id="area"
              name="area"
              defaultValue={props.values.area}
              className={inputClassName()}
              placeholder="Operaciones"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-sm font-medium text-slate-900">
              Telefono
            </label>
            <input
              id="phone"
              name="phone"
              defaultValue={props.values.phone}
              className={inputClassName()}
              placeholder="+56 9 ..."
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-slate-900">
            Correo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={props.values.email}
            className={inputClassName()}
            placeholder="trabajador@empresa.cl"
          />
        </div>

        {showAccessSetup ? (
          <section className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-2">
              <input
                id="create-access-now"
                type="checkbox"
                name="createAccessNow"
                value="yes"
                defaultChecked
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-400"
              />
              <div>
                <label
                  htmlFor="create-access-now"
                  className="text-sm font-semibold text-slate-900"
                >
                  Crear acceso a intranet al guardar
                </label>
                <p className="mt-1 text-xs text-slate-600">
                  Usa el correo del trabajador para crear su cuenta de acceso en el mismo flujo.
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              <label htmlFor="temporaryPassword" className="text-sm font-medium text-slate-900">
                Contrasena temporal de acceso
              </label>
              <input
                id="temporaryPassword"
                name="temporaryPassword"
                type="password"
                minLength={8}
                autoComplete="new-password"
                className={inputClassName()}
                placeholder="Minimo 8 caracteres"
              />
            </div>
          </section>
        ) : null}

        <div className="flex items-center gap-3 pt-2">
          <FormSubmitButton
            pendingLabel="Guardando..."
            className="bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {props.submitLabel}
          </FormSubmitButton>
          <Link
            href="/dashboard/workers"
            className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Volver al listado
          </Link>
        </div>
      </form>
    </section>
  );
}

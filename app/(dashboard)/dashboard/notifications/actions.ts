"use server";

import { redirect } from "next/navigation";

import { setFlash } from "@/lib/flash";
import { sendResendEmail } from "@/lib/notifications/service";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export async function sendTestEmailAction() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    await setFlash({ error: "No tienes permisos para enviar emails de prueba" });
    redirect("/dashboard/notifications");
  }

  const email = user.email;
  if (!email) {
    await setFlash({ error: "Sin email en la cuenta" });
    redirect("/dashboard/notifications");
  }

  const ok = await sendResendEmail({
    to: email,
    subject: "Email de prueba · Intranet",
    html: `<p>Este es un email de prueba enviado desde el panel de administracion de Intranet.</p>
<p>Si recibes este mensaje, el servicio de email esta funcionando correctamente.</p>
<p><small>Enviado: ${new Date().toISOString()}</small></p>`,
  });

  if (!ok) {
    await setFlash({ error: "No se pudo enviar el email de prueba" });
    redirect("/dashboard/notifications");
  }

  await setFlash({ success: "Email de prueba enviado correctamente" });
  redirect("/dashboard/notifications");
}

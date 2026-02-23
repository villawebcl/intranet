import { AlertBanner } from "@/components/ui/alert-banner";

type FlashMessagesProps = {
  success?: string | null;
  error?: string | null;
  className?: string;
};

export function FlashMessages({ success, error, className }: FlashMessagesProps) {
  if (!success && !error) {
    return null;
  }

  return (
    <div className={["space-y-2", className ?? ""].join(" ")}>
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
    </div>
  );
}

"use client";

import { useTransition, useState } from "react";

import { getApprovedDownloadUrlAction } from "./actions";

type ApprovedDownloadButtonProps = {
  workerId: string;
  requestId: string;
  returnTo: string;
  buttonLabel: string;
  pendingLabel: string;
  buttonClassName: string;
  wrapperClassName?: string;
};

export function ApprovedDownloadButton({
  workerId,
  requestId,
  returnTo,
  buttonLabel,
  pendingLabel,
  buttonClassName,
  wrapperClassName,
}: ApprovedDownloadButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestUrl = () => {
    startTransition(async () => {
      const result = await getApprovedDownloadUrlAction({
        workerId,
        requestId,
        returnTo,
      });

      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }

      setErrorMessage(null);

      const popup = window.open(result.signedUrl, "_blank", "noopener,noreferrer");
      if (!popup) {
        window.location.assign(result.signedUrl);
      }
    });
  };

  return (
    <div className={wrapperClassName ?? "space-y-2"}>
      <button
        type="button"
        onClick={requestUrl}
        disabled={isPending}
        className={`rounded-sm transition ${buttonClassName}`}
      >
        {isPending ? pendingLabel : buttonLabel}
      </button>

      {errorMessage ? (
        <div className="rounded-sm border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p>{errorMessage}</p>
          <button
            type="button"
            onClick={requestUrl}
            disabled={isPending}
            className="mt-1 text-xs font-semibold underline underline-offset-2"
          >
            Reintentar
          </button>
        </div>
      ) : null}
    </div>
  );
}

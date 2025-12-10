import { ActionableNotification } from "@/components/actionableNotification";
import { getAudioCaptureErrorMessage } from "@/lib/audio/error";

export function AudioErrorNotification({
  error,
  onRetry,
  onStop,
}: {
  error: Error;
  onRetry: () => void;
  onStop: () => void;
}) {
  const { title, message } = getAudioCaptureErrorMessage(error);

  return (
    <ActionableNotification
      title={title}
      message={message}
      onDismiss={onRetry}
      actions={[
        { label: "Stop Call", onClick: onStop, variant: "destructive" },
        { label: "Retry", onClick: onRetry, variant: "secondary" },
      ]}
    />
  );
}

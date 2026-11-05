"use client";
import ConfirmModal from "@/components/ui/ConfirmModal";
export default function InviteSwitchConfirmation({
  confirmation,
  onClose,
  onConfirm,
}: {
  confirmation: { inDailyMission: boolean; inLiveMatch: boolean } | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmModal
      isOpen={Boolean(confirmation)}
      title="Accept this challenge?"
      message={
        confirmation?.inDailyMission
          ? "Your Daily Mission progress will be saved, but you will leave the mission to join this match."
          : "Accepting this challenge will resign your current live game and count as a loss."
      }
      confirmText="Accept challenge"
      cancelText="Stay here"
      isDestructive={Boolean(confirmation?.inLiveMatch)}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

"use client";
import { useProfileTutorial } from "@/hooks/useTutorials";

export default function ProfileTutorialTrigger() {
  useProfileTutorial();
  return null;
}

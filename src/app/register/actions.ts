"use server";

import { registerWithCredentials } from "@/features/identity/public-server";
import {
  parseRegistration,
  textField,
} from "@/features/identity/domain/credentials";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signup(formData: FormData) {
  const invitation = textField(formData.get("invitation_token"), 256);
  const errorPath = `/register?${invitation ? `invite=${encodeURIComponent(invitation)}&` : ""}error=`;
  const input = parseRegistration(formData);
  if (!input)
    redirect(
      errorPath +
        encodeURIComponent(
          "Check the required fields and password length (up to 72 UTF-8 bytes).",
        ),
    );
  const result = await registerWithCredentials(input);
  if ("error" in result) redirect(errorPath + encodeURIComponent(result.error));
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ErrorCode, fail, ok, type ActionResponse } from "@/lib/action-response";
import { ResponseService } from "@/services/response.service";

const SetFlagInput = z.object({
  responseId: z.string().min(1),
  brandSlug: z.string().min(1),
  flagged: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export type SetFlagState = ActionResponse<{ flagged: boolean }> | null;

export async function setResponseFlag(
  _previous: SetFlagState,
  formData: FormData,
): Promise<SetFlagState> {
  const parsed = SetFlagInput.safeParse({
    responseId: formData.get("responseId"),
    brandSlug: formData.get("brandSlug"),
    flagged: formData.get("flagged"),
  });

  if (!parsed.success) {
    return fail(ErrorCode.VALIDATION_FAILED, parsed.error.issues[0].message);
  }

  const { responseId, brandSlug, flagged } = parsed.data;

  try {
    const updated = await ResponseService.setFlag(responseId, flagged);

    if (!updated) {
      return fail(ErrorCode.NOT_FOUND, "That feedback no longer exists.");
    }

    revalidatePath(`/brands/${brandSlug}`);
    return ok({ flagged });
  } catch (error) {
    console.error("[setResponseFlag] failed", error);
    return fail(ErrorCode.UNKNOWN, "Could not update the flag. Please try again.");
  }
}

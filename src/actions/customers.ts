"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { ErrorCode, fail, ok, type ActionResponse } from "@/lib/action-response";
import { prisma } from "@/lib/prisma";

const AddCustomerInput = z.object({
  brandId: z.string().min(1),
  brandSlug: z.string().min(1),
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .trim()
    .regex(/^\+\d{10,15}$/, "Phone must be in international format, e.g. +919876543210"),
});

export type AddCustomerState = ActionResponse<{ id: string }> | null;

export async function addCustomer(
  _previous: AddCustomerState,
  formData: FormData,
): Promise<AddCustomerState> {
  const parsed = AddCustomerInput.safeParse({
    brandId: formData.get("brandId"),
    brandSlug: formData.get("brandSlug"),
    name: formData.get("name"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return fail(ErrorCode.VALIDATION_FAILED, parsed.error.issues[0].message);
  }

  const { brandId, brandSlug, name, phone } = parsed.data;

  try {
    const customer = await prisma.customer.create({
      data: { brandId, name, phone },
      select: { id: true },
    });

    revalidatePath(`/brands/${brandSlug}`);
    return ok(customer);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail(ErrorCode.DUPLICATE, "A customer with that phone number already exists.");
    }

    console.error("[addCustomer] failed", error);
    return fail(ErrorCode.UNKNOWN, "Could not add the customer. Please try again.");
  }
}

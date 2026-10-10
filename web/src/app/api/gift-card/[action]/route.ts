import { NextResponse } from "next/server";
import { AonikError } from "@/lib/aonik/errors";
import { decodeGiftDraft, type GiftDraft } from "@/lib/gifting/model";
import {
  giftPayment,
  payGift,
  prepareGift,
  readGift,
  recoverGift,
  saveGift,
  startGift,
} from "@/lib/gifting/server";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
function draftOf(value: unknown): GiftDraft {
  const draft = decodeGiftDraft(value);
  if (!draft) throw new Error("Please check your gift details.");
  return draft;
}
async function handle(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params;
  try {
    if (request.method === "GET") {
      if (action === "sync") return json(await readGift());
      if (action === "payment") return json(await giftPayment(true));
      return json({ message: "Not found." }, 404);
    }
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      return json({ message: "Please reload and try again." }, 403);
    const body = (await request.json()) as Record<string, unknown>;
    const version = request.headers.get("X-Cart-Version") ?? "";
    if (action === "start")
      return json(await startGift(draftOf(body.draft), true));
    if (!version)
      return json({ message: "Reload your gift before saving." }, 409);
    if (action === "draft")
      return json(await saveGift(draftOf(body.draft), version));
    if (action === "prepare")
      return json(await prepareGift(draftOf(body.draft), version));
    if (action === "pay") {
      if (
        typeof body.expectedTotalPence !== "number" ||
        !Number.isSafeInteger(body.expectedTotalPence) ||
        body.expectedTotalPence <= 0
      )
        return json({ message: "Review your total before paying." }, 400);
      return json(
        await payGift(
          version,
          body.expectedTotalPence,
          new URL(request.url).origin,
        ),
      );
    }
    if (action === "recover") {
      if (typeof body.paymentIntentId !== 'string' || !body.paymentIntentId) return json({ message: 'Reload your payment before returning to checkout.' }, 400);
      return json(await recoverGift(version, body.paymentIntentId));
    }
    return json({ message: "Not found." }, 404);
  } catch (error) {
    const status = error instanceof AonikError ? error.status : 400;
    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Your gift could not be saved.",
        ...(status === 409
          ? { current: await readGift().catch(() => null) }
          : {}),
      },
      status,
    );
  }
}
export const GET = handle;
export const PUT = handle;
export const POST = handle;

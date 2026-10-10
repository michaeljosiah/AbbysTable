import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cartCall, getBoxCart, readStoredBoxCart } from "@/lib/cart/server";
import type { CheckoutDraftResponseDto } from "@/lib/aonik/dto";
import { giftOptions, purchaseSelection } from "@/lib/gifting/server";
import { AonikError } from "@/lib/aonik/errors";
import { decodeGiftDraft, type GiftDraft } from "@/lib/gifting/model";
export const dynamic = "force-dynamic";
export async function PUT(request: Request) {
  const json = (body: unknown, status = 200) =>
    NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  if (
    request.headers.get("origin") &&
    request.headers.get("origin") !== new URL(request.url).origin
  )
    return json({ message: "Please reload and try again." }, 403);
  try {
    const body = (await request.json()) as {
      gift?: {
        giftIntent: boolean;
        hidePrices: boolean;
        includeGreetingCard: boolean;
        greetingCardMessage: string | null;
      };
      card?: GiftDraft | null;
    };
    if (
      body.gift &&
      (typeof body.gift.giftIntent !== "boolean" ||
        typeof body.gift.hidePrices !== "boolean" ||
        typeof body.gift.includeGreetingCard !== "boolean" ||
        (body.gift.greetingCardMessage !== null &&
          (typeof body.gift.greetingCardMessage !== "string" ||
            body.gift.greetingCardMessage.length > 240)))
    )
      return json({ message: "Please check your gift details." }, 400);
    if (
      body.card !== undefined &&
      body.card !== null &&
      (!decodeGiftDraft(body.card) || body.card.route !== "box")
    )
      return json({ message: "Please check your gift card details." }, 400);
    if (Object.keys(body).some((key) => key !== "gift" && key !== "card"))
      return json({ message: "Please check your gift details." }, 400);
    const options = body.card ? await giftOptions() : null;
    if (
      body.card &&
      (!options?.enabled ||
        options.draftVersion < 1 ||
        body.card.quantity > options.maximumQuantity)
    )
      return json(
        { message: "In-box gift-card purchasing is not available yet." },
        400,
      );
    const stored = await readStoredBoxCart();
    if (!stored) {
      // Pre-commit choices are pending UI intent. They do not create an active box.
      (await cookies()).set(
        "abbys-table-box-gift-pending",
        JSON.stringify({
          ...JSON.parse(
            (await cookies()).get("abbys-table-box-gift-pending")?.value ??
              "{}",
          ),
          ...body,
        }),
        {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 86400,
        },
      );
      return json({ cart: null, pendingGift: true });
    }
    const version = request.headers.get("X-Cart-Version") ?? undefined;
    const current = await cartCall<CheckoutDraftResponseDto>("/checkout-draft");
    const result = await cartCall<CheckoutDraftResponseDto>(
      "/checkout-draft",
      {
        method: "PUT",
        body: {
          ...current.draft,
          ...(body.gift ? { gift: body.gift } : {}),
          ...(body.card !== undefined ? { giftCardDraft: body.card } : {}),
        },
      },
      version,
    );
    if (body.card !== undefined) {
      const currentOptions = options ?? (await giftOptions());
      if (body.card) {
        if (
          body.card.route !== "box" ||
          !currentOptions.enabled ||
          !Number.isInteger(body.card.quantity) ||
          body.card.quantity < 1 ||
          body.card.quantity > 10
        )
          throw new Error("In-box gift-card purchasing is not available yet.");
        await cartCall(
          "/gift-card-purchase",
          { method: "PUT", body: purchaseSelection(body.card, currentOptions) },
          result.cartVersion,
        );
      } else
        await cartCall(
          "/gift-card-purchase",
          { method: "DELETE" },
          result.cartVersion,
        );
    }
    return json({ cart: await getBoxCart() });
  } catch (error) {
    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Your gift could not be saved.",
        cart: await getBoxCart().catch(() => null),
      },
      error instanceof AonikError ? error.status : 400,
    );
  }
}

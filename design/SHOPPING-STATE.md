# Abby’s Table — Shopping State & Site Logic Contract

At this point, Abby’s Table should stop treating these as isolated page behaviours. There should be **one shopping-state contract** that every page, CTA and component follows.

The central principle is:

> **Box state, dish state, gift-food-box state, gift-card state, delivery state, account state, rewards state and payment state are separate things. One should not be inferred indirectly from another.**

A customer should never lose meaningful progress because they navigated backwards, visited another page, encountered an error or changed one part of their order.

---

# 1. Core box lifecycle

| Customer state | Abby’s Table considers it | Sitewide CTA | CTA destination |
|---|---|---|---|
| Browsing; Step 1 never committed | No active box | **GET STARTED** | Step 1 |
| Step 1 open with default 6 visually selected | No active box | **GET STARTED** | Existing Step 1 |
| Customer changes box size but has not progressed | No active box | **GET STARTED** | Existing Step 1 |
| Genuine dish carried from a dish-detail page before box commit | Active box awaiting box-size commitment | **VIEW BOX** | Step 1 with carried dish preserved |
| Customer clicks **Add dishes** and progresses to Step 2 | **Active box** | **VIEW BOX** | Current valid order stage |
| Step 2 with 0 dishes | Active empty box | **VIEW BOX** | Step 2 |
| Step 2 with 1+ dishes | Active populated box | **VIEW BOX** | Furthest valid order stage |
| Customer removes final dish | Active empty box | **VIEW BOX** | Step 2 |
| Active order becomes invalid because a dish is unavailable | Active box requiring correction | **VIEW BOX** | Step 2 |
| Successful payment | Confirmed order; active draft cleared | **GET STARTED** | Fresh Step 1 journey |

This is the **single definition of an active box**.

A box normally becomes active when the customer commits a box size by progressing from Step 1 into Step 2, even if its dish count is zero.

A genuine dish carried from a dish-detail page is the one exception: it can establish active-order state before the normal Step 1 → Step 2 commit. Step 1 must preserve that carried dish while the customer chooses a valid box size, and committing the box must not add the dish twice.

Removing the last dish does **not** destroy an already active box.

### Resume behaviour

`VIEW BOX` should take the customer to the **furthest valid stage** of their current order.

For example:

- empty active box → Step 2
- complete box last left on Extras → Extras
- complete box last left on Review → Review
- valid checkout already in progress → Checkout
- order has become invalid because a dish is unavailable → Step 2, regardless of where they previously were

The customer should never be resumed into a later stage that is no longer valid.

---

# 2. Draft retention

For production, the active order draft should not depend on a browser tab remaining open.

Recommended housekeeping:

| Draft state | Retention |
|---|---:|
| Active box with 0 dishes | ~24 hours of inactivity |
| Active box containing dishes | ~7 days of inactivity |
| Delivery-date reservation | Separate 15-minute hold |

These are **backend housekeeping periods**, not customer-facing countdowns.

Meaningful order activity can refresh `lastActivityAt`, for example adding/removing dishes, changing box size, extras or gift state. Merely browsing marketing pages should not keep an abandoned draft alive indefinitely.

The 7-day populated-draft retention is unrelated to the separate **7-day confirmed-order change/cancellation policy**.

---

# 3. General box and dish behaviour

### Box-size rule

- minimum box size: **6 dishes**;
- maximum box size: **99 dishes**;
- any whole-number quantity from 6 to 99 is valid;
- 6 / 12 / 18 remain convenient preset choices where the approved interface uses them;
- **Set your own** allows other quantities.

Changing a box size must preserve compatible customer selections. Never auto-delete dishes merely to make a smaller box fit.

| Scenario | Site behaviour | Customer-facing state | CTA behaviour |
|---|---|---|---|
| Homepage/marketing page, no active box | Normal browsing | Normal marketing page | **GET STARTED** |
| Step 1 merely viewed | Default 6 may appear selected; nothing committed | Normal Step 1 | Local **ADD DISHES**; global remains **GET STARTED** |
| Customer selects 12/18/etc. but stays on Step 1 | Preserve as transient Step 1 selection | Selected state only | Global remains **GET STARTED** |
| Default 6 + **Add dishes** | Commit 6-dish box before opening Step 2 | 0/6 | Global becomes **VIEW BOX** |
| Other size + **Add dishes** | Commit selected capacity | 0/N | **VIEW BOX** |
| Customer leaves Step 2 with 0 dishes | Preserve active empty box | No warning | **VIEW BOX** resumes Step 2 |
| Empty box restored within retention | Restore capacity | No unnecessary message | **VIEW BOX** |
| Empty box expires | Clear stale draft | Fresh ordering state | **GET STARTED** |
| Populated box abandoned temporarily | Preserve compatible state | No warning | **VIEW BOX** |
| Populated box restored later | Quietly revalidate things that can have changed | No message unless something genuinely changed | **VIEW BOX** |
| First dish added | Dish count changes from 0 to 1 | Normal add state | **VIEW BOX** unchanged |
| Same dish added again in same size | Increment quantity | Quantity control updates | No global change |
| Same dish added in another portion size | Maintain variants distinctly | Portion and quantity shown clearly | No global change |
| Box reaches capacity | Prevent additional dish | “Your box is full. Increase your box size or remove a dish to add another.” | Box-size/change controls |
| One dish removed from full box | Preserve chosen capacity | Space becomes available | No forced action |
| Final dish removed | Preserve active box | 0/N | **VIEW BOX** remains |
| Step 2 → Step 1 | Preserve entire active box | Current box size and dish count restored | **ADD DISHES** returns to same box |
| Box size increased | Preserve dishes | Capacity increases | Continue |
| Box size decreased and dishes still fit | Preserve dishes | Capacity decreases | Continue |
| Box size decreased below dish count | Never auto-delete dishes | “Your box currently has 11 dishes. Choose a larger box or remove dishes before continuing.” | Progression blocked |
| Dish carried from dish page with no committed box | Preserve the carried dish and establish active-order state | Step 1 acknowledges the carried dish while box size is chosen | **VIEW BOX** globally; local **ADD DISHES** commits the size |
| Dish carried when active box already exists | Add to existing box, subject to capacity | Normal confirmation | **VIEW BOX** |
| Search produces no matches | Preserve box and filters | “No dishes match your search. Try another search or clear the filter.” | **CLEAR SEARCH** if useful |

---

# 4. Returning order and changing data

When restoring a populated box, Abby’s Table should quietly re-check data that may have changed since the customer last visited.

That includes things such as current dish availability, current portion availability, prices, promotional eligibility and later delivery availability.

If nothing has changed, **say nothing**.

Do not greet customers with generic messages such as:

> Your basket has been updated.

when nothing meaningful happened.

---

# 5. Saved dish becomes unavailable

This has now been tightened considerably.

A later order stage must **not remain valid** if Step 2 is no longer complete.

### If customer is already on Step 2

Stay on Step 2.

Show:

> **Your box needs 1 replacement**  
> Scent Leaf, Ginger & Lime Chicken is no longer available. We’ve kept everything else in your box. Choose any 1 dish below to complete it.

For multiple unavailable dishes:

> **Your box needs 2 replacements**  
> Two of your saved dishes are no longer available. We’ve kept everything else in your box. Choose any 2 dishes below to complete it.

The catalogue is already underneath, so **do not add a “Choose a replacement” CTA**.

The box rail/status becomes:

> **5 of 6 dishes**  
> Add 1 more dish to continue.

The normal Step 2 progression CTA remains in its normal location but is unavailable until the box is complete.

### If customer is on Extras, Review or Checkout

Automatically return them to Step 2.

Do **not** leave them on Extras or Checkout with an invalid box.

If they were already in Checkout, reassure them:

> **Your box needs 1 replacement**  
> Scent Leaf, Ginger & Lime Chicken is no longer available. We’ve kept the rest of your box and your checkout details. Choose any 1 dish below to complete your box.

Preserve all compatible downstream state.

After the replacement:

**Step 2 → Extras → Review → Checkout**

Previously selected extras and checkout information remain preserved.

### Unavailable dish representation

The unavailable dish may remain temporarily visible in **Your Box** so the customer understands what changed:

> Scent Leaf, Ginger & Lime Chicken  
> **Unavailable**

It no longer counts toward the valid dish total.

Once replaced, remove the unavailable line.

### Global CTA

Never change the sitewide CTA to **CHOOSE A REPLACEMENT**.

It remains:

> **VIEW BOX**

Recovery actions belong inside the ordering flow, not global navigation.

---

# 6. Extras

Extras remain optional.

| Scenario | Behaviour |
|---|---|
| Step 2 valid and complete | Customer may progress to Extras |
| Step 2 incomplete | Extras cannot be reached |
| No extras chosen | Valid state |
| Extras chosen | Persist independently from dishes |
| Returning to Extras | Existing selections remain selected |
| Dish replacement required | Customer is returned to Step 2 first |
| Replacement completed | Continue through Extras again with prior selections preserved |

The page can communicate that Extras is optional without creating a separate parallel journey.

---

# 7. Review

Review is the authoritative pre-checkout summary.

It should show the box, portions, extras, gift-food-box state and total.

Change links should be targeted.

| Action | Behaviour |
|---|---|
| Change dishes | Return to Step 2 with dishes preserved |
| Change extras | Return to Extras with selections preserved |
| Return after edit | Re-enter the order journey without destroying unaffected state |
| Order becomes invalid | Force correction at the earliest invalid stage rather than allowing Review to remain valid |

CTA:

> **CONTINUE TO CHECKOUT**

---

# 8. Checkout → Back

Returning from Checkout to Review must preserve:

- customer-entered checkout information;
- active gift state;
- rewards choices;
- delivery reservation while still valid.

Checkout's order summary is primarily a reference summary.

A prominent additional Edit button is unnecessary if **Back to review** already provides the correction route.

---

# 9. Gift food boxes — separate from Gift Cards

A **gift food box** and an **Abby’s Table Gift Card** must be treated as different concepts technically and in customer-facing language.

`giftIntent` applies only to a **food box being sent as a gift**.

Email/Post/In-box Gift Cards are separate products.

---

# 10. Gift food-box flow

### No active box → Gifting → Build their box

Set food-box gift intent and send the customer into Step 1.

Step 1 shows the gift-context banner:

> Sending this as a gift? Choose their box and dishes first. At checkout you can send it to their address, hide prices and add a personalised greeting card (+£3).

Once the customer progresses to Step 2, it becomes an active gift food box.

### Gift food box reaches Checkout

The gift section opens automatically within **Send to**.

State:

> **Is this box a gift?** ✓

Then:

- Hide prices: selected by default.
- Personalised greeting card +£3: **not** selected by default.
- Card message field appears only after greeting card is selected.

No additional Save CTA is needed.

### £3 greeting card

Copy:

> **Add a personalised greeting card +£3**

Supporting copy:

> Your message will be printed inside an Abby’s Table card.

This £3 greeting card does **not** earn loyalty points.

### Customer turns gift status off

If they turn off:

> **Is this box a gift?**

then:

- `giftIntent=false`;
- box size remains;
- dishes remain;
- portions remain;
- extras remain;
- Hide prices is removed;
- £3 personalised greeting card and its charge are removed.

This converts the same food box back into a normal food order.

It does **not** create a new box.

A separate Gift Card product already added to the box should not automatically be removed simply because the food box itself is no longer marked as a gift.

---

# 11. Existing normal box → Gifting

Do **not** silently convert a normal active food box into a gift merely because the customer visits Gifting.

If an active normal box exists, the Gifting page should recognise it.

Show:

> **You already have a box in progress.**

Primary action:

> **USE MY CURRENT BOX AS A GIFT**

Secondary:

> **KEEP MY CURRENT BOX**

If they choose **Keep my current box**, nothing changes and they remain on the Gifting page.

If they choose **Use my current box as a gift**:

- set `giftIntent=true`;
- preserve box size;
- preserve dishes;
- preserve portions;
- preserve extras;
- do not create another draft;
- return them to the furthest valid stage they had reached.

Examples:

- Step 2 → Step 2
- Extras → Extras
- Review → Review
- Checkout → Checkout

For Step 2/Extras/Review, a light contextual banner can say:

> **This box is now set as a gift**  
> At checkout, you can send it to their address, hide prices and add a personalised greeting card (+£3).

If returning directly to Checkout, the gift controls themselves are sufficient, optionally preceded once by:

> ✓ **This box is now set as a gift.**

No simultaneous second food box is created.

---

# 12. Existing gift food box → Gifting

If an active gift food box already exists, Gifting should recognise that state rather than offering to create another one.

The primary action can become:

> **CONTINUE YOUR GIFT BOX**

and resume the existing journey.

---

# 13. “Starting another order”

Abby’s Table does not currently need to support multiple simultaneous food-box drafts.

There is therefore no ordinary shopping path that silently abandons a gift box and creates a second normal box.

If a future **Start a new order** function is introduced, it must be explicit and confirm that the existing active draft will be replaced.

Do not build this merely to solve a hypothetical edge case.

---

# 14. Gift Cards

## Email Gift Card

Separate Gift Card purchase flow.

Collect relevant recipient/email/send-date information.

It does not use food-box `giftIntent`.

## Gift Card by post

Separate Gift Card purchase flow with recipient/postal details and applicable postage.

It does not use food-box `giftIntent`.

## Standalone Gift Card Checkout — account and points

A standalone Email or By-post Gift Card can still be purchased as a guest. Account creation must never be required to complete the purchase.

If the purchaser is already signed in:

- use the existing account;
- add qualifying Gift Card-purchase points after successful payment.

If the purchaser is signed out:

- keep guest checkout available;
- offer the **optional** opportunity to create an Abby's Table account so they can collect the points from the Gift Card purchase;
- do not request a password before payment;
- if they opt in, send a secure single-use setup/access link after successful payment;
- if the email already belongs to an account, do not create a duplicate, silently log the customer in, reveal account existence unnecessarily or block payment.

Qualifying points are **earned immediately against the successful Gift Card purchase**. If secure account setup/access is still incomplete, the points remain attached to the successful purchase and become visible in the account after secure setup/access is completed.

A guest who neither logs in nor opts to create an account must not be told that points were added to an account.

This is a **build-stage implementation requirement** using the established food-checkout account/points pattern. It does not require a redesign of the approved Gift Card Checkout prototype before build.

## Gift Card “In a food box”

If an active food box exists:

- add the Gift Card product to that current order;
- do not create another food box;
- do not automatically change the food box to `giftIntent=true`.

If no active food box exists:

- carry the Gift Card product into the box-building journey;
- customer builds a box;
- Gift Card remains associated with that order.

CTA:

> **BUILD YOUR BOX**

The Gift Card itself and whether the food box is being sent as a gift remain separate states.

---

# 15. Delivery postcode

| Scenario | Behaviour | Message / CTA |
|---|---|---|
| Valid and supported postcode | Continue | Normal |
| Outside delivery area | Block impossible delivery, preserve box | “We don’t currently deliver to [postcode]. We’re gradually expanding.” |
| Invalid postcode format | Preserve entered value | “Check your postcode and try again.” / **CHECK POSTCODE** |
| Address lookup unavailable | Provide manual route | “We couldn’t load address suggestions. Enter your address manually.” / **ENTER ADDRESS MANUALLY** |

An unsupported postcode must never clear the customer’s box.

---

# 16. Delivery-date selection

Simply displaying a suggested date does **not** reserve it.

Example:

> **NEXT AVAILABLE**  
> Thursday 6 August

Actions:

> **USE THIS DATE**  
> **CHOOSE A DIFFERENT DATE**

The reservation begins only when the customer actively selects or accepts a delivery date.

The ordering system should not offer delivery dates less than **7 days away**.

---

# 17. Active delivery reservation

Once selected:

> **Thursday 6 August is saved for you.**  
> You can change your delivery date at any time.

Secondary:

> **Reserved for another 14 min**

Reservation duration:

> **15 minutes**

The timer should use whole minutes and remain calm.

Near expiry:

> **Still reserved for you · 2 min**

No red panic treatment.

---

# 18. Changing delivery date

If the customer selects another date:

- release the old hold;
- confirm the new date is still available;
- create a new reservation;
- update the order.

No two delivery slots should be reserved simultaneously for the same draft.

---

# 19. Date unavailable/full

Calendar states must distinguish:

> **Fully booked**

from:

> **No delivery**

Both are disabled.

If a date looked available but fills before the server accepts the reservation:

> **That date has just filled. Please choose another available date.**

Do not create a standalone unavailable-date page.

---

# 20. Delivery reservation expires

Preserve everything except the expired reservation.

If the same date is still available:

> **Please choose your delivery date again. You can reselect the same date if it’s still available.**

If it is no longer available:

> **Your box and checkout details are still here. Please choose another available date.**

The customer should not need to rebuild anything.

---

# 21. Payment hold

Replace the earlier vague “payment grace” wording with a precise rule.

When the customer enters payment while a delivery reservation is still active:

1. Server revalidates the selected delivery date.
2. Payment session is created.
3. The normal checkout reservation becomes a short **payment hold**.
4. Payment hold: up to **10 additional minutes** while the customer enters payment details/completes authentication.
5. Do not allow repeated payment attempts to extend a scarce slot indefinitely.

Customer-facing message:

> **Your delivery date is reserved while you complete payment.**

There is no second scary timer during Stripe/payment authentication.

### Payment submitted but unresolved

If payment has actually been submitted and the result is still uncertain:

- do not immediately release the delivery capacity;
- do not tell the customer to pay again;
- resolve payment state with the payment provider first.

This prevents successful late-settling payments from ending up without a delivery slot.

---

# 22. Reservation service unavailable

Do not pretend a delivery date has been secured.

Show:

> **We can’t confirm delivery availability right now. Please try again.**

CTA:

> **TRY AGAIN**

Payment remains blocked until the server can confirm delivery availability.

---

# 23. Checkout — guest/account model

Guest checkout remains the default.

The customer is not required to create an account to purchase.

### Existing customer

Compact prompt:

> **Already have an account? Log in**

When Login is open:

- hide the Create Account checkbox;
- do not show contradictory registration controls.

If login succeeds, associate the active order draft with the authenticated account safely.

If login fails, preserve the entire checkout.

---

# 24. Optional account creation

Checkbox:

> **Create an Abby’s Table account**

Supporting copy:

> Collect your points and save your details for next time.

When selected:

> We’ll email you after payment to finish setting it up.

Do not introduce a password-registration detour before payment.

The same post-payment account-setup mechanism applies to standalone Gift Card Checkout when a signed-out purchaser opts to create an account to collect Gift Card-purchase points.

---

# 25. Existing email already belongs to an account

If the customer selects **Create an Abby’s Table account**, but the email already belongs to an account:

- do not create a duplicate;
- do not silently log them in;
- do not silently attach the order merely because the email matches;
- do not block payment;
- do not unnecessarily reveal account existence before authentication.

Complete the purchase normally.

After payment, send a secure single-use account access/setup link to that email.

Confirmation copy can work for both a genuinely new account and an existing one:

> **Check your email to finish setting up or access your account.**  
> We’ve sent you a secure link.

Until ownership is verified, do not silently attach sensitive account information.

If the customer never selected account creation and checked out as a guest, an email match alone does **not** attach the order to an existing account.

---

# 26. Loyalty points — earning rule

Final programme rate:

> **Spend £1 of eligible value → earn 2 points.**  
> **100 points = £1.**

Points never expire.

Points are calculated from **eligible spend after discounts**, not from gross/pre-discount spend.

Eligible spending rules are configurable by Abby’s Table.

Some products/promotions can be excluded from points earning or points redemption where appropriate.

Examples could include:

- specific promotional boxes;
- already heavily discounted items;
- selected extras;
- specific campaign products.

This must be an admin/business-rule decision rather than hard-coded universally.

---

# 27. Items that do not earn points

These do **not** earn points:

- delivery/postage charges;
- £3 personalised greeting card.

---

# 28. Gift Card points

The chosen Abby’s Table rule is:

> **The person buying an Abby’s Table Gift Card earns points on the amount they pay for the Gift Card value.**

Example:

£100 Gift Card bought for £100 → purchaser can earn points on £100.

If a £100 Gift Card is deliberately sold for £90 in a promotion → purchaser earns points on £90.

Postage for a physical Gift Card does not earn points. The £3 greeting card does not earn points.

If the purchaser is signed out, they can optionally create an account after payment using the secure setup/access flow described above. The points are earned immediately against the successful purchase and become visible in the account after secure setup/access is completed.

### When that Gift Card is later spent

The Gift Card-funded portion does **not** earn points again.

Example:

£120 eligible food order  
£100 paid by Gift Card  
£20 paid with new money

The recipient earns points on the eligible **£20 new-money spend**, not again on the £100 Gift Card value.

This prevents the same £100 being rewarded twice.

---

# 29. Using points to buy Gift Cards

By default:

> **Loyalty points cannot be redeemed against Gift Card value.**

This avoids converting loyalty rewards into transferable stored monetary value.

Ordinary vouchers should also not apply to Gift Card value by default, although Abby’s Table can deliberately enable a specific Gift Card promotion when desired.

---

# 30. Combining points, Gift Cards and vouchers

Customers may combine:

- vouchers;
- loyalty-point redemption;
- Gift Card payment;
- normal payment.

Subject to item-level eligibility rules.

Recommended calculation sequence:

**Product/promotional pricing → voucher → loyalty-point redemption on eligible spend → Gift Card payment → remaining card/payment method**

---

# 31. Points redemption in Checkout

For a logged-in customer with points:

> **You have 840 points**  
> Use your points on this order.

Rules:

- no minimum redemption;
- the customer chooses how many points to use;
- the maximum points value applied to one order is **20% of that order**;
- item-level eligibility can reduce the usable amount further.

Controls can include a direct entry:

> **Enter points to use**  
> [ 500 ]  
> **APPLY**

and a quick action that applies the **maximum allowed** by the customer's balance, the 20% cap and item eligibility. Do not label that action in a way that implies an unrestricted “use all” if the full balance cannot be applied.

Do not use a slider.

After applying:

> **500 points applied**  
> −£X.XX

with:

> **Change**

If only part of their balance can be used:

> **You can use up to 620 points on this order.**  
> Some items are not eligible for rewards.

If nothing in this order is eligible:

> **Points can’t be used on the items in this order.**

---

# 32. Earning and redeeming are separate

When points are redeemed, the points earned on the new order are recalculated from the **remaining eligible new-money spend**.

A Gift Card is a payment method, but because its value was rewarded when originally purchased, the Gift Card-funded portion does not generate new points again.

---

# 33. Points are added after successful payment

Qualifying points become earned/available **immediately after successful payment**.

Lifecycle:

> **Successful payment → qualifying points added**

For a logged-in customer, confirmation can say:

> **129 points earned**

If the customer selected account creation/setup during Checkout, the successful order can carry the earned points immediately, but they should appear in the account only after the customer securely completes account setup/access.

A guest who neither logs in nor creates an account does not receive an account points award merely because their email matches an account.

---

# 34. Points and refunds/cancellations

### Full cancellation/refund

Any points associated with eligible refunded spend are reversed from the account/order award.

### Partial refund

Reverse only the points attributable to the refunded eligible spend.

Refunding:

- delivery;
- the £3 greeting card;
- another non-points-earning item

does not reduce the points balance because those items never generated points.

### Points used on the refunded order

Redeemed points should be restored appropriately.

If an already-earned award has subsequently been spent before a later refund, reversing the original award may create a negative loyalty balance. Future points can offset that deficit.

The system should reverse **only points actually awarded**, not use crude order-level assumptions.

---

# 35. Guest points

A guest who neither logs in nor creates an account should not be told that points have been earned for them.

Do not show misleading:

> 129 points earned

to an accountless guest.

---

# 36. Points information

Mobile:

- modal bottom sheet;
- proper focus trap;
- background inert;
- focus returns to trigger.

Desktop:

- anchored popover is suitable.

The explanation should reflect the updated rules, including the 2-points-per-£1 rate, 100 points = £1, the 20% redemption cap, no expiry, and that qualifying points are added after successful payment.

---

# 37. Gift order Checkout

Gift-food-box controls belong within **Send to**, because the recipient/delivery context belongs there.

When gift mode is enabled:

- recipient details appear;
- Hide prices;
- optional £3 greeting card;
- message field when appropriate.

### Recipient phone helper

This helper is **only for gifting**, not normal food ordering:

> **So the courier can reach the right person on the day if needed.**

There is no equivalent recipient-phone helper in standard food checkout.

---

# 38. Required checkout field missing

If the customer taps the payment action while a required field is incomplete:

- do not show a vague page-level error;
- move/focus the customer to the first incomplete field;
- explain the specific issue there.

The payment CTA itself remains consistent.

---

# 39. Voucher errors

Invalid code:

> **We couldn’t apply that code. Check it and try again.**

Expired/used/ineligible codes should explain the actual reason where safely possible.

Do not collapse all cases into “Something went wrong.”

---

# 40. Legal links

Terms of Sale and Privacy Policy open in a **new tab** from Checkout.

The original Checkout remains open and retains its state.

The legal page shows:

> **← Back to checkout**

Do not make automatic closing of the legal tab part of the required experience.

Where possible, the browser may return/focus the customer to the existing checkout tab.

If the browser cannot programmatically switch back, simply make clear that Checkout remains in the previous tab.

Do not open another duplicate Checkout in the legal tab merely to implement Back to checkout.

The earlier standalone scenario **“Legal tab cannot close itself”** is removed.

---

# 41. Mobile Checkout

The mobile sticky control represents the same order journey; it must not invent different logic.

**View order** opens the order-summary bottom sheet.

Compact sticky payment CTA:

> **PAY SECURELY**

Expanded summary can use:

> **CONTINUE TO PAYMENT**

If required checkout information is incomplete, the CTA focuses the first missing item instead of silently doing nothing.

Modal bottom sheets with a dimmed background should:

- trap focus;
- make page background inert;
- prevent background scrolling;
- support close/backdrop/Esc as appropriate;
- return focus to the triggering control.

---

# 42. Payment states

| Scenario | Behaviour | Customer-facing state |
|---|---|---|
| Customer submits payment | Prevent duplicate submission | Secure transition |
| Payment actively processing | Restricted transaction chrome | **We’re confirming your payment. Please don’t close this page.** |
| Payment clearly failed/declined | Return to intact checkout | **Payment wasn’t completed. Your order is still here.** |
| 3DS/authentication failed | Same recovery model | Explain payment wasn’t completed |
| Customer deliberately cancels and provider confirms cancellation | Return to intact checkout | **Payment was cancelled. Your order is still here.** |
| Network drops after submission | Do not assume failure | **We’re checking your payment. Please don’t pay again yet.** |
| Provider status uncertain | Resolve status before another charge | **We’re checking your payment.** |
| Payment received but order finalisation delayed | Never ask for payment again | **Payment received. We’re confirming your order.** |
| Double-click/refresh | Idempotent handling | One order only |
| Payment completed in another tab | Disable duplicate checkout | **This order has already been completed.** |
| Successful payment | Convert draft to confirmed order exactly once | Order confirmation |

Only say **“Nothing has been charged”** when payment status makes that statement reliably true.

---

# 43. Successful payment

On confirmed success:

- create/finalise one confirmed order;
- add qualifying loyalty points immediately where the customer is eligible to receive them;
- consume/release the delivery hold correctly;
- clear the active shopping draft;
- prevent other tabs from submitting it;
- sitewide ordering CTA returns to **GET STARTED**.

The confirmed order becomes its own record; it is no longer an editable shopping draft.

---

# 44. Order confirmation

No checkout stepper.

Normal Abby’s Table navigation returns.

Core hierarchy:

> **Order confirmed**

> Thank you. We’ve emailed your order confirmation and delivery details.

Order number.

Delivery details.

Concise order summary.

Account/rewards state where appropriate.

Optional restrained Abby’s Private Table promotion may remain.

**No marketing-email/newsletter signup.**

---

# 45. Confirmation — logged-in customer

Qualifying points are added immediately after successful payment.

Show, for example:

> **129 points earned**  
> Added to your Abby’s Table account.

CTA where appropriate:

> **VIEW ORDER IN MY ACCOUNT**

---

# 46. Confirmation — account setup selected during Checkout

Use wording that also works safely if the email already belongs to an existing account:

> **Check your email to finish setting up or access your account.**  
> We’ve sent you a secure link.

Qualifying points are **earned immediately after successful payment and attached to the successful order**. If secure account setup/access is still incomplete, they are not pending or awaiting fulfilment; they become visible in the account once the customer securely completes account setup/access.

Do not necessarily say **Account created** unless the backend definitively knows a new account was created and that wording is useful.

---

# 47. Confirmation — guest

No account-created wording.

No misleading points-awarded claim.

The order is still fully confirmed.

---

# 48. Confirmed-order changes/cancellations

There is **no self-service order amendment or cancellation from the account area**.

Do not show:

- Change order;
- Cancel order;
- amendment deadline information.

The account area should simply provide:

> **Need help with an order?**  
> Contact us.

CTA:

> **CONTACT US**

The actual change/cancellation policy belongs in **Delivery & FAQs and Terms of Sale**, not the account area.

---

# 49. Seven-day order-change/cancellation policy

Customer-facing rule:

> **Please contact Abby’s Table at least 7 days before your scheduled delivery regarding changes or cancellations.**

Customers must contact Abby’s Table; there is no self-service change/cancel route.

Keep the policy deliberately simple:

- do not promise that every request received before the 7-day point is automatically guaranteed;
- do not spell out discretionary exceptions or internal flexibility;
- Abby’s Table may choose to be flexible case by case.

The exact legal wording belongs in Delivery & FAQs and Terms of Sale.

The ordering system will not offer delivery dates less than 7 days away, so a separate late-order rule is not needed.

---

# 50. Account order area

The account area remains primarily informational:

- order history;
- order status;
- points;
- account details;
- addresses.

Order detail pages can include:

> **Need help with an order?**  
> **CONTACT US**

No change/cancel controls.

---

# 51. Production order-draft persistence

Avoid customer-facing word **basket** if Abby’s Table does not use that terminology.

Technical implementation can use something such as:

> `orderDraftId`

or:

> `boxDraftId`

This is backend-only and never shown to customers.

Production behaviour:

- active anonymous box belongs to a secure server-side order draft;
- browser stores only the secure identifier/cache required to retrieve it;
- browser storage is not the sole source of truth;
- same browser/device can recover the active box after reopening the site, subject to retention;
- same browser/new tab should resolve to the same active order rather than create conflicting copies.

---

# 52. Cross-device anonymous recovery

A guest box on an iPhone does **not** magically appear on a laptop.

Cross-device recovery requires:

- authenticated account association; or
- a separate secure resume mechanism if introduced later.

Do not promise cross-device recovery for anonymous customers without building such a mechanism.

---

# 53. Multiple tabs

The server-side order draft is authoritative.

If two tabs have the same active order:

- both refer to the same order draft;
- stale state must be revalidated before mutation;
- one tab should not overwrite newer changes blindly;
- payment success in one tab immediately makes the draft non-payable in the other.

If the other tab attempts payment:

> **This order has already been completed.**

CTA:

> **VIEW ORDER**

---

# 54. Guest logs in and account already has a different active box

Do not silently destroy either meaningful populated box.

If both contain meaningful contents:

> **You already have another box saved to your account. Which would you like to continue?**

Actions:

> **KEEP THIS BOX**

> **USE SAVED BOX**

If one is merely an empty stale draft and the other contains meaningful selections, the system may resolve that more simply, but the populated customer work should never be silently thrown away.

---

# 55. 404

The main website is working; only the requested page is missing.

Use normal Abby’s Table chrome.

> **ERROR 404**

> **We couldn’t find that page.**

> The page may have moved, or the link may no longer be available.

Primary:

> **GO TO HOMEPAGE**

Secondary:

> **View the menu →**

Return a genuine HTTP 404 response.

---

# 56. 500

Potential service failure.

Use cut-down chrome.

> **ERROR 500**

> **Something didn’t go to plan.**

> We’re having trouble loading this page right now. Please try again in a moment.

Primary:

> **TRY AGAIN**

Secondary homepage route only if reliable.

Do not expose unnecessary ordering/navigation actions if the system itself may be unhealthy.

---

# 57. Maintenance

Use minimal Abby’s Table chrome.

No navigation into deliberately unavailable functionality.

Provide:

> **TRY AGAIN**

and a reliable support/contact route where appropriate.

---

# 58. Expired secure account/setup link

> **This link is no longer valid.**  
> For your security, this account link has expired.

CTA:

> **SEND A NEW LINK**

---

# 59. Business rules now settled

These are no longer open questions:

| Rule | Abby’s Table decision |
|---|---|
| Box size | **6–99 dishes**, any whole number; 6/12/18 remain presets |
| Points earning rate | **2 points per £1** of eligible spend |
| Points value | **100 points = £1** |
| Points expiry | **Never expire** |
| Points earning basis | Eligible spend **after discounts** |
| Reward eligibility | Configurable by item/category/promotion |
| Minimum points redemption | **None** |
| Maximum points redemption | **20% of an order**, subject to item eligibility |
| Delivery earns points | **No** |
| £3 greeting card earns points | **No** |
| Gift Card purchase earns points | **Yes — purchaser earns on amount actually paid for Gift Card value** |
| Signed-out Gift Card purchaser account option | **Optional account creation after payment via secure setup/access link; guest purchase still allowed** |
| Gift Card Checkout prototype redesign required before build | **No — implement the account/points behaviour at build stage using the established Checkout pattern** |
| Gift Card redemption earns points again | **No**, except additional eligible new-money spend |
| Points + vouchers + Gift Cards together | **Yes**, subject to eligibility |
| Points usable against Gift Card value | **No by default** |
| Points after successful payment | **Added immediately** for qualifying customers/orders |
| Account-setup points visibility | **Earned immediately against the successful order; visible in the account after secure setup/access** |
| Customer can change/cancel from account | **No** |
| Change/cancel request route | **Contact Abby’s Table** |
| Change/cancel policy | Contact at least **7 days before scheduled delivery**; no automatic guarantee stated |
| Minimum delivery lead time offered | **At least 7 days** |
| Checkout delivery reservation | **15 minutes** after active date selection |
| Payment hold | **Up to 10 additional minutes** once payment starts |
| Full refund/cancellation | Reverse associated points |
| Partial refund | Reverse only points attributable to refunded eligible spend |
| Redeemed points after refund | Restore appropriately |
| Account area cancellation/change copy | **None** |
| Account support copy | **Need help with an order? Contact us.** |
| Marketing email signup | **Removed entirely** |

---

# 60. Central implementation principle

The production system should expose **one shared shopping-state model** rather than allowing individual pages to derive state independently.

At minimum, the shared state should understand:

- active order draft ID;
- whether the box has been committed;
- box size/capacity;
- dish count;
- dish validity;
- furthest valid/resume stage;
- gift-food-box intent;
- Gift Card items separately;
- extras;
- postcode/delivery eligibility;
- delivery reservation state and expiry;
- payment-hold state;
- authentication state;
- account-setup state;
- available/redeemed/earned loyalty points and any account-association state;
- discounts/vouchers;
- checkout completion state;
- payment state;
- `lastActivityAt`.

The header, mobile purchase bar, Gifting and every order step should consume this shared state. **None should independently invent its own definition of “active order.”**

The most important operational rule remains:

> **Preserve everything that is still valid. Correct only what has actually become invalid. Never make the customer rebuild an order because one part of the state changed.**

This is now a much stronger basis for Claude to consolidate the ordering logic before any more page-level fixes are made.
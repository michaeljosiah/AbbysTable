# Abby's Table — Page Behaviour Guide

## Purpose of this guide

This is the plain-English build guide for **what each Abby's Table page is meant to do**.

It is deliberately different from `build-handoff.md` and `CLAUDE.md`:

- this guide explains the **customer journey and page behaviour**;
- `build-handoff.md` explains the design decisions, technical history and implementation cautions;
- `CLAUDE.md` holds the terse implementation/project rules.

Use the approved page designs for layout, styling and exact visual treatment. Use this guide to understand what should happen when a customer arrives, interacts, goes back, returns later or encounters an error.

### Important source note

This guide has been reconciled against the current `CLAUDE.md`, `build-handoff.md`, the supplied page files and the final shopping-state decisions agreed for Abby's Table. It does **not** silently fill gaps from general ecommerce practice. Where a genuine behaviour gap remains, it is still marked as **Partially documented**.

---

# A. Rules that apply across the site

## A1. Marketing and information pages

Most rebuilt marketing and information pages use the normal Abby's Table header, mobile drawer and footer.

The normal customer-facing routes include Menu, How it works, Gifting, Private Table, Our standards, Abby's Story, Delivery & FAQs, Allergens and Contact.

The checkout journey is different: Steps 1–5 use a **transactional checkout shell** rather than the full marketing navigation.

## A2. Signed-in state

When the customer is signed out, the normal account link reads:

**LOG IN**

When the customer is signed in, the same location reads:

**MY ACCOUNT**

A signed-out customer who tries to access My Account should be sent to Log in and then returned to the intended account page after successful authentication.

The production website must use the real signed-in session as the source of truth. The browser-only login state in the prototype is not the production model.

## A3. Order in progress

The site uses one shared definition of an active food box.

- merely opening Step 1 does **not** create an active box;
- the default 6-dish choice does **not** create an active box;
- changing the box size on Step 1 does **not** create an active box;
- pressing **ADD DISHES** commits the box and makes it active, even if Step 2 currently contains 0 dishes;
- a genuine dish carried from a dish-detail page can also establish active-order state before the normal Step 1 → Step 2 commit;
- once active, removing the final dish does not destroy the box.

When there is no active box, the normal purchase action is **GET STARTED**. When an active box exists, the header action becomes **VIEW BOX** and the mobile purchase bar becomes a summary of that box with **VIEW BOX**.

`VIEW BOX` returns the customer to the furthest stage that is still valid. If an earlier step has become invalid, it returns them to the stage that needs correcting instead of resuming them too far forward.

The prototype uses browser storage for some of this state. Production must instead use the server-side order draft described later in this guide.

## A4. Customer choices should survive normal navigation

Once a customer has started building an order, moving backwards, opening another relevant page and returning, or refreshing the journey should not create a new empty order by accident.

The server-side order draft is intended to hold the customer's chosen box, dishes, portions, Signature upgrades, extras, gift details, delivery details, codes and account-creation choice.

A short delivery reservation is separate from the longer-lived order draft. Losing or changing a delivery reservation must not erase the order itself.

## A5. Mobile and desktop

The same customer task should remain available at every screen size. The layout can change, but the journey should not become a different journey simply because the customer is on a phone.

Most rebuilt pages are mobile-first. **Choose Box is the deliberate exception** and keeps its existing approved responsive architecture.

### Desktop marketing/editorial header

From 1024px, the header on marketing/editorial pages hides after a meaningful scroll down and returns after a meaningful scroll up. Near the top of the page it remains visible.

This applies to:

- Homepage
- Menu
- How it works
- Gifting
- Private Table
- Our Standards
- Abby's Story
- Delivery & FAQs
- Contact

It deliberately does **not** apply to dish pages, Allergens, Privacy Policy, Terms of Sale, Log in, My Account, Order Confirmation, error pages or any ordering/checkout/payment page.

## A6. Shared accessibility behaviour

Interactive drawers and modal sheets must behave as real dialogs where the approved designs specify them:

- focus moves into the dialog when it opens;
- focus stays inside while it is open;
- Escape closes it;
- page scrolling is prevented where appropriate;
- focus returns to the control that opened it;
- interactive targets remain comfortably usable on touch screens.

## A7. Cookie consent and fixed controls

Where the cookie consent surface is unresolved, it takes priority over lower fixed purchase controls. The mobile purchase bar must not compete with or obscure consent controls.

---

# B. Marketing and discovery pages

## 1. Homepage

**Status in supplied handoff:** rebuilt/approved sections are documented; the handoff also records the final intended page order.

### Purpose

Introduce Abby's Table, explain the proposition quickly, show representative dishes and standards, introduce the founder and Private Table, and give the customer a clear route into ordering.

### Page order

The supplied handoff defines the final order as:

1. Hero
2. How it works
3. A taste of the table
4. Our standards
5. Meet the founder
6. Private Table
7. Footer

The old homepage boxes promotion and homepage gifting section are removed. Gifting remains a separate page in the navigation.

### What the customer can do

- Start building a box from the hero or purchase actions.
- Understand the four-step ordering process.
- Preview dishes and move to the Menu/dish pages.
- Open the full Our Standards page.
- Read Abby's Story from the founder section.
- Open Private Table.
- Use the main navigation and footer routes.

### How the four-step explanation works

The homepage explains:

1. **Build a box** — choose 6 or more dishes and select meals/portion size.
2. **We cook from scratch** — prepared in small batches with high-quality ingredients.
3. **Delivered chilled** — choose a Mainland UK delivery date.
4. **Heat, enjoy, live well**.

The earliest available delivery date is **not** shown on the homepage. It belongs in the ordering funnel.

### Mobile behaviour

The mobile header can hide while the customer scrolls down. A separate purchase bar becomes available after the hero purchase action is no longer visible.

Only one main purchase action should compete for attention at a time:

- scrolling down after the hero → purchase bar can appear;
- scrolling up → header returns and bar hides;
- drawer open → bar hides;
- unresolved cookie consent → bar hides;
- once the customer reaches the Private Table/footer end of the page → bar stays suppressed.

### If an order is already in progress

The normal start-purchase wording changes to **VIEW BOX** and the mobile purchase bar becomes a summary of the current box.

### Do not

- reintroduce an earliest-delivery date into the homepage;
- reintroduce the removed homepage boxes promotion or homepage gifting section;
- allow the mobile purchase bar to cover the Private Table/footer area;
- ship placeholder food photography or placeholder video as final assets.

---

## 2. Menu

**Status in supplied handoff:** Menu Landing v3 rebuilt.

### Purpose

Let customers browse the available dishes, search the menu, filter it and open individual dish pages.

### When the customer arrives

Show the menu catalogue with the approved dish-card information and the existing Search, Filters and Sort controls.

### What the customer can do

- Search the catalogue.
- Open Filters.
- Sort the menu.
- Apply filters such as protein source/eating-style data where available.
- Open a dish page.
- Use the Back to Top utility on long catalogues.

### Filters

Below desktop, Filters open as a bottom sheet. On desktop, the same filter content is shown inline.

On mobile/tablet, the filter sheet behaves as a modal dialog:

- focus is contained in it;
- Escape closes it;
- body scrolling is locked;
- focus returns to the Filters button.

On desktop it becomes normal inline content rather than a modal.

### Search/filter data rules visible to the customer

The dish data should support the controls accurately. The handoff specifically notes that:

- Lamb must be available as a protein filter because a lamb dish exists;
- “Under 500 kcal” should be calculated from the nutrition data, not manually tagged;
- some current filter vocabulary is still holding/unfinished data and must be confirmed before launch.

### Fixed mobile controls

The Menu has a priority order between drawer/filter sheet/consent, Back to Top, purchase bar and sticky header. Higher-priority overlays suppress the lower controls rather than allowing them to stack over each other.

### Do not

- rebuild a sticky filter strip that fights with the auto-hiding header;
- create separate duplicate filter content for mobile and desktop;
- ship invented/duplicated catalogue records used only for prototype stress-testing.

---

## 3. Dish detail — standard and Signature dishes

**Status in supplied files:** current Signature dish page supplied; handoff confirms dish routes and standards round-trip behaviour.

### Purpose

Give the customer the full information for one dish, let them choose an available portion, and move that dish into the box-building journey.

### When the customer arrives

Show the selected dish with its approved image/content, any relevant tags or Signature treatment, portion choices and key nutrition information.

### What the customer can do

- Choose a portion using the available portion choices.
- See the portion price difference where applicable.
- See the key nutrition figures update for the chosen portion.
- Open the full Nutrition section.
- Open Ingredients & allergens.
- Open Heating & storage.
- Read what Signature means on a Signature dish.
- Open **See our standards**.
- Select **ADD TO YOUR BOX**.

### Portion selection

The supplied Signature page currently presents two portion choices:

- Light Table
- Full Table

The exact weights, prices and nutrition values in the prototype are holding data and must be replaced by confirmed product data before launch.

### Add to your box

The dish page tells the customer there is a minimum order of six dishes and provides the **ADD TO YOUR BOX** action.

The page also surfaces the next-delivery information with an explanation that cooking runs have limited capacity and availability can change before checkout.

### Our Standards round trip

If the customer opens Our Standards from a dish page and then returns, the dish page should restore the customer's current dish choices rather than making them start the dish again.

The same principle applies to the Add Dishes details experience: returning from Standards should restore the relevant dish/details context.

### Important content requirement

Nutrition and allergen information must come from confirmed operational product data. The supplied page explicitly contains holding/example values that must not be treated as final.

### Do not

- lose the customer's selected portion when they temporarily open Our Standards;
- treat placeholder nutrition/allergen text as approved product data;
- create a different dish simply because the customer returns through browser Back.

---

## 4. How It Works

**Status in supplied handoff:** How It Works v2 built.

### Purpose

Explain the full Abby's Table journey in more depth than the short homepage band and give the customer a direct route into Build a Box.

### Overall structure

The page is a numbered sequence with a jump-navigation rail. The step rail is navigation, not checkout progress.

### Step 1 — choose a size

The customer can use the 6 / 12 / 18 preset choices or **Set your own** quantity, with any quantity from **6 to 99 dishes**, and then select **START BUILDING**.

The selected size is intended to travel into the Build a Box funnel so the customer is not asked to choose it twice.

**Important source gap:** the handoff explicitly says Choose Box did not yet read this parameter at the time of writing. Production needs to connect the selection correctly.

The price shown with the selected size updates with the choice. The handoff states that only the six-dish price was confirmed in that version; other displayed figures were still placeholders.

### Remaining explanation

The page continues through how Abby's Table cooks, delivers and prepares meals for reheating, supported by the approved imagery/sections.

### Main actions

- Hero/build CTA → Build a Box.
- Size picker → Start building with that selection carried forward.
- Step rail → jump to the relevant section.
- Closing CTA → Build a Box.

### Do not

- drop the customer's chosen size between this page and Step 1;
- treat the page's numbered rail as checkout progress;
- ship placeholder pricing or photography as final.

---

## 5. Our Standards

**Status:** Standards v2 is rebuilt and approved.

### Purpose

Explain Abby's Table's standards in full and act as the deeper destination for standards links from the Homepage, Allergens, dish pages and checkout dish/detail experiences.

### Page structure

The approved page expands the homepage Standards idea into a full editorial page:

- hero with the core standards/prohibitions;
- a **What goes in** chapter opener and index;
- five numbered standards sections;
- closing call to action.

The page is designed as a reading/exploration page, not an ordering step.

### What the customer can do

- Read the five standards in sequence.
- Use the index to understand the page structure.
- Follow the closing call to action.
- Arrive from the Homepage, Allergens, dish pages or Step 2 dish details.

### Dish/quick-view return behaviour

When Standards is opened from a dish/detail context, show the contextual **Back to dish** return only for that genuine origin.

Returning must restore the relevant dish context:

- selected portion where applicable;
- the open dish/details state;
- the customer's previous position where practical.

A normal navigation visit to Standards must not pretend the customer came from a dish.

### Do not

- replace the approved five-section page with the older mobile-accordion/jump-card version;
- lose the customer's dish selection when they temporarily open Standards;
- show a contextual Back-to-dish route on ordinary/direct visits.

---

## 6. Abby's Story

**Status in supplied handoff:** Abby's Story v2 built.

### Purpose

Tell the founder story and the journey that led to Abby's Table.

### Customer behaviour

This is primarily a reading/content page. Customers can scroll through the story and follow the normal site navigation/footer routes.

All site-wide **Abby's Story** links should point to this page rather than an old homepage anchor.

### Important page behaviour

- Normal marketing-page account/order state still applies.
- The mobile purchase bar follows the normal marketing logic but suppresses against the footer because this page does not have the Homepage Private Table tail section.
- Links must work as real links, including open-in-new-tab and modified clicks; they should not depend on JavaScript-only scrolling behaviour.

### “Remission became a mission” section

The handoff records this as a three-part section on desktop: copy, qualifications/certificates and quote, collapsing to one column at smaller widths.

### Do not

- send “Abby's Story” links back to an obsolete `#founder` anchor;
- reintroduce the old eyebrow treatment that was deliberately removed from this page.

---

## 7. Gifting

**Status in supplied handoff:** Gifting v2 built.

### Purpose

Present two separate gifting routes:

1. **Send a food box** — the purchaser chooses the dishes.
2. **Send a gift card** — the recipient can choose later.

These are deliberately presented as two different jobs.

### When the customer arrives

Show both routes clearly. On mobile they appear as a peeking horizontal carousel; on desktop they appear side by side.

There is **no mobile purchase bar on Gifting**, because a generic fixed Build a Box action would favour the food-box route over the gift-card route.

### Send a food box

The route takes the customer into the food-box building journey.

The “How it works” link on this route goes to the food-box section on the Gifting page itself, not to the separate How It Works page.

### If a normal food box is already in progress

Simply visiting Gifting must **not** convert the existing order into a gift.

If the customer chooses the food-box gifting route while a normal active box already exists, show:

**You already have a box in progress.**

Primary action:

**USE MY CURRENT BOX AS A GIFT**

Secondary action:

**KEEP MY CURRENT BOX**

**KEEP MY CURRENT BOX** leaves the existing box unchanged and keeps the customer on Gifting.

**USE MY CURRENT BOX AS A GIFT** converts the same box to a gift-food-box journey while preserving its box size, dishes, portions, extras and current progress. It must not create a second parallel food-box draft. Resume the customer at the furthest stage that is still valid.

### Send a gift card

The gift-card panel has three customer steps:

1. **Value** — choose a preset value or enter a custom value.
2. **Arrival** — choose how the gift card is delivered.
3. **Message** — add the relevant message/greeting-card option.

### Gift card delivery choices

The supplied design defines:

- Email — no postage.
- By post — postage added.
- In a food box — no separate postage because it joins a food-box order.

The selected arrival method determines the next action:

- Email / By post → **BUY GIFT CARD**.
- In a food box → **ADD TO FOOD BOX**.

### Greeting card/message

The paid greeting card is offered on the post and food-box routes. For email, the message is part of the gift email instead.

### Order summary

The summary updates as the customer changes value/arrival/message choices. Any confirmation line must be cleared when the customer changes the order, so it never describes an old selection.

### Source caution

The handoff also says some gifting mechanics and launch rules were still awaiting operational confirmation. Treat the design as the intended customer journey, but confirm final fulfilment/redemption rules before launch.

---

## 8. Private Table

**Status:** Private Table v2 is rebuilt and approved.

### Purpose

Explain the bespoke Private Table service and collect interest through a **waitlist**.

It is explicitly **not a booking page**. Consultations are not currently open.

### Page journey

The approved page presents:

- the Private Table proposition and credentials;
- **Who it's for**;
- **What we offer**, including the two service routes;
- **How it works**;
- the waitlist form.

The service remains separate from the normal food-box checkout.

### Main action

Every enquiry/conversion CTA for this service is **JOIN THE WAITLIST**.

The confirmation state must confirm successful waitlist submission without promising a consultation date or a reply window that has not been committed.

### Other behaviour

- Normal navigation links to this page.
- Contact does not use Private Table as a normal contact-form subject; customers are directed here instead.
- The page can explain Worldwide recipe development and UK-wide recipe development + meal preparation without turning either into an immediate booking flow.

### Do not

- describe the waitlist as a booking or consultation reservation;
- promise a consultation or response time in the success state;
- route Private Table enquiries into the ordinary food-box ordering journey.

---

# C. Information, support and legal pages

## 9. Delivery & FAQs

**Status in supplied handoff/source:** rebuilt.

### Purpose

Help customers understand delivery and common questions, with a clear postcode-checking route into ordering.

This is an **information page, not a sales page**. It deliberately has no mobile purchase bar because its own conversion path is:

**Check postcode → confirm delivery → Build a Box**.

### Postcode checker

The customer enters a postcode to find out whether Abby's Table delivers there and, where appropriate, see the next available delivery date.

### Postcode outcomes

**Supported postcode**

- show the successful delivery outcome;
- offer **BUILD A BOX**;
- carry the checked postcode into the box-building journey so it is not requested again immediately.

**Outside the delivery area**

- do not show Build a Box;
- offer the documented notify-me email capture instead.

**Invalid or empty postcode**

- show the correction beside the field;
- do not treat it as a result panel.

**Lookup/service failure**

- keep what the customer entered;
- explain neutrally that the lookup could not be completed;
- offer Retry rather than pretending it means “not in area”.

**Location permission refused**

- show the issue beside the postcode/location control rather than as a delivery result.

### Mobile result behaviour

After a genuine postcode outcome on mobile, bring the result panel into view below the sticky header so the customer can see that something changed.

Do not auto-scroll for a simple validation error.

### FAQ browsing/search

The customer can browse the topic groups or search the FAQ content.

Search behaviour:

- empty field → normal browse view;
- one character → show “Keep typing to search”;
- two or more characters → live results;
- every entered term must match;
- question-title matches rank above answer-only matches;
- changing the query closes any previously open answer;
- clearing search returns to the browse view.

### Changes and cancellations

Customer-facing policy should stay simple: customers should contact Abby's Table **at least 7 days before their scheduled delivery** regarding changes or cancellations.

Do not present this as a guarantee that every request made before that point must be accepted, and do not spell out discretionary flexibility. Abby's Table may choose to be flexible case by case.

The ordering system will not offer delivery dates less than 7 days away.

### Do not

- show Build a Box for an unsupported postcode;
- interpret a technical lookup failure as a delivery refusal;
- make the customer re-enter a postcode immediately after a successful check;
- add a generic persistent mobile purchase bar that competes with the checker.

---

## 10. Contact Us

**Status in supplied handoff/source:** rebuilt.

### Purpose

Give customers the fastest appropriate way to reach Abby's Table and provide a structured contact form when direct contact is not suitable.

### Direct contact options

Direct routes come before the main form. The page provides:

- WhatsApp
- Email
- FAQs
- Phone

WhatsApp is visually highlighted as the quickest route in the current design.

### Opening-hours state

The Phone/WhatsApp area can show **Open now** or **Closed** using the configured UK opening hours. The wording, not colour alone, communicates the state.

The handoff marks the actual hours/contact details as unverified placeholders that must be confirmed before launch.

### Contact form

The customer selects a subject and submits the form.

Documented subjects include:

- An existing order
- A new order
- Dish, ingredients or allergens
- Delivery
- Gifting
- Something else

Private Table is deliberately not a form subject; use the Private Table waitlist route instead.

### Existing-order enquiry

If the customer chooses **An existing order**, reveal an **optional order number** field.

The customer must still be able to send the message without the order number if they cannot find it.

### Validation

Errors appear inline beside the relevant fields.

On submit with errors:

- move focus to the first invalid field;
- keep the error visible until the field is corrected;
- clear the error when the customer fixes that field.

The message must be long enough to be actionable; the supplied handoff uses a 10-character minimum.

### Image attachments

The customer can optionally attach up to three JPG/PNG/HEIC images, up to 10 MB each.

If some files are invalid, report those files by name but keep valid attachments rather than rejecting the entire selection.

### Successful submission

Success **replaces the form**, rather than leaving a live form underneath a success message.

The current copy promises a response within two working days and echoes the contact address. The handoff flags reply-time/contact details for real-world confirmation before launch.

### Source gap

A contact-form technical failure state was not designed in the supplied handoff and remains open.

---

## 11. Allergens

**Status in supplied handoff/source:** rebuilt.

### Purpose

Provide clear site-wide allergen information, explain Abby's Table's approach and give customers routes to further help.

### Main allergen list

Show the UK regulated 14 allergens as a scannable list.

The items are **plain information**, not links or buttons. Do not add chevrons/icons that imply each allergen opens another destination unless that functionality is deliberately introduced later.

### What the customer can do

- Read the allergen list.
- Read the cross-contamination/caution statement.
- Read **Our approach**.
- Use **Need more help** routes.
- Open useful links such as Our Standards, Menu, Contact or Delivery & FAQs.

### Important content hierarchy

The documented order is:

1. Our approach
2. Need more help
3. Useful links

Keep the same logical/visual order at every width so keyboard focus does not jump unexpectedly.

### Important launch warning

The handoff says the allergen safety copy is placeholder operational copy until the real kitchen process is confirmed and signed off. Do not publish claims about separate storage, cleaning or staff training unless they are true of the operating kitchen.

---

## 12. Terms of Sale

**Status in supplied handoff:** rebuilt.

### Purpose

Present the Terms of Sale as a readable, navigable legal document.

### Document behaviour

All clauses are part of **one continuous document**. The section index navigates around the document; it does not replace the document with one section at a time.

### Customer navigation

The customer can:

- use **Jump to a section**;
- expand/collapse the relevant index group on small screens;
- use the floating **Sections** control on mobile once they are further down the document;
- use **Top** to return upward;
- follow direct links to durable section anchors.

### Mobile Sections sheet

When the section index opens as a bottom sheet:

- Escape closes it;
- focus returns to the Sections button;
- choosing a destination closes the sheet and moves to the selected clause/section.

### Direct links

Section links use human-readable anchors such as `#refunds` and `#allergen-information`. These anchors are intended to be durable links that customer service, FAQs and emails can use.

### Checkout entry

When Terms is opened from Checkout, open it in a new tab so the customer's checkout remains intact.

When opened from Checkout, show **← Back to checkout**. Where possible this may focus the existing Checkout tab, but automatic closing of the legal tab is not required. If the browser cannot switch back, tell the customer Checkout is still open in the previous tab. Never create a duplicate Checkout just to implement this return.

### Do not

- render only one Terms group at a time;
- use clause number alone as the permanent public link;
- let Terms policy contradict Delivery & FAQs, Allergens, Checkout, labels or order communications.

### Launch warning

The handoff says the Terms require solicitor review and contain placeholder company/payment details. They are not launch-ready solely because the page design is complete.

---

## 13. Privacy Policy

**Status in supplied handoff:** rebuilt.

### Purpose

Present the Privacy Policy in the same readable continuous-document pattern as Terms and provide the destination for privacy/cookie information.

### Customer navigation

The same long-document pattern applies:

- grouped index;
- jump links;
- continuous document;
- mobile Sections/Top controls;
- direct human-readable section anchors.

### Cookies section

`#cookies` is a committed destination. Cookie-consent surfaces use it for **Learn more about cookies**.

Do not rename that anchor without updating the site-wide consent journey.

### Cookie preferences

The Privacy page contains **Cookie preferences** controls. These open the consent manager rather than navigating away from the page.

### Checkout return

When Privacy is opened from Checkout, it follows the same new-tab return behaviour as Terms: keep the original Checkout intact, provide **← Back to checkout**, do not require the legal tab to close automatically, and never create a duplicate Checkout just to implement the return.

### Incomplete content

The supplied handoff marks multiple service-provider, retention, transfer and cookie-audit values as **to be confirmed**. The placeholder cookie technology table is deliberately not rendered as if it were complete.

### Launch warning

The handoff says the policy has not been legally reviewed and still contains explicit placeholders. The finished page design does not mean the policy content is ready to publish.

---

# D. Food-box ordering journey

## 14. Step 1 — Build your box / Choose Box

**Status in supplied handoff/source:** rebuilt/approved design; current source supplied.

### Purpose

Choose the food-box size and establish the order before the customer moves to dish selection.

### Page shell

This is Checkout **Step 1 of 5** and uses the transactional checkout shell:

- Abby's Table wordmark;
- Questions/help route;
- checkout progress band;
- simplified checkout footer;
- no normal marketing navigation/drawer.

### When the customer arrives

The page shows:

- **Build your box**;
- the delivery-postcode checker;
- the available box-size choices;
- the current Your Box summary.

The page currently tells the customer they will add dishes on the next step.

### What the customer can do

- Check delivery to a postcode.
- Choose a 6 / 12 / 18 preset box size.
- Use **Set your own** for any quantity from 6 to 99 dishes.
- Review the resulting box/price summary.
- Open the help drawer.
- Go back to the page they came from.
- Continue with **ADD DISHES**.

### Returning from another page

The Back action is intended to behave like real browser Back when possible, returning the customer to the page that led them into the builder.

### Dish carried into Step 1

If the customer arrived from a dish page, Step 1 shows that the dish has been carried into the journey while they choose their box size.

A genuine carried dish can establish active-order state even before the normal Step 1 → Step 2 commit. The customer must still choose/confirm a valid box size before continuing to Step 2. Do not add the carried dish twice when the box is committed.

### Gift card carried into a food box

If the customer chose **In a food box** while configuring a Gift Card, Step 1 can show that the Gift Card is saved and will be delivered inside the food box. The customer can edit the Gift Card details.

### Food-box gifting context

When Step 1 is entered as a gift-food-box journey, the current source can show the message explaining that the customer chooses the box/dishes now and can use recipient/hide-price/greeting-card options at checkout.

### Your Box summary

The summary updates with the chosen box size and any carried items. On mobile, the customer can open the Your Box summary sheet.

### Main action

**ADD DISHES** → Step 2.

For a normal Step 1 journey, pressing **ADD DISHES** is the commit point: the chosen box becomes active even if Step 2 initially contains 0 dishes. Merely viewing Step 1 or changing the displayed box size does not create an active box.

### Help

The Questions control opens the checkout help drawer rather than sending the customer out to the general FAQ page.

### Important source issues/open items

The handoff records several holding values that must be reconciled before launch, including:

- outdated funnel pricing compared with the homepage/How It Works pricing;
- an inconsistent Full Table upcharge between Step 1 and a dish page;
- prototype storage/state that must become a server-side order draft.

### Do not

- send the customer into normal marketing navigation from the transactional shell;
- lose a carried dish or in-box Gift Card when the customer chooses a size;
- treat holding prices as final launch data.

---

## 15. Step 2 — Add dishes

**Status in supplied handoff/source:** rebuilt/approved; current source supplied.

### Purpose

Let the customer fill the box chosen in Step 1.

### When the customer arrives

Show:

- **Step 2 of 5 — Add dishes**;
- the selected box in **Your box**;
- the number/contents required for that box;
- the dish catalogue;
- Search and Filters.

### What the customer can do

- Search dishes.
- Filter dishes.
- Open **View details** for a dish.
- Read Signature information on a Signature dish.
- Choose from the available portion/options shown on the dish card/dialog.
- Add dishes.
- Increase/decrease/remove selected lines through the Your Box controls.
- Edit an in-box Gift Card where one exists.
- Open the full Your Box sheet on mobile.
- Open Our Standards from the dish detail experience and return to the same dish/context.

### Search/filter no-results state

If nothing matches, show a clear message such as:

**No dishes match your search or filters.**

The customer's existing box remains untouched.

### Main action

Normal journey:

**CONTINUE** → Step 3 / Extras.

If the customer came back from Review to change dishes, the same location changes to **RETURN TO REVIEW** so they can return to the review journey after making the change.

### Entry/return behaviour

The customer may arrive from:

- Step 1;
- Review → Change dishes;
- View Box/resume;
- a Standards round trip.

The page must restore the relevant box/dish state rather than silently replacing it with the demo state.

### Removal/undo

The approved experience includes a temporary Undo for removals rather than immediately making an accidental removal irreversible.

### Standards round trip

If a customer opens Standards from a Step 2 dish detail, returning should reopen the relevant dish/details state rather than simply loading an unrelated top-of-page view.

### Gift-card confirmation

If a Gift Card has just been added to the food box, the ordering steps can show the one-off confirmation that the Gift Card was added/updated. The message must disappear if the Gift Card itself is removed.

### Important content warning

The handoff says nutrition figures in the Step 2 cards/dialogs are holding content and must be confirmed before launch.

---

## 16. Step 3 — Extras

**Status in supplied handoff:** rebuilt/approved; full behaviour is partly deferred to `CLAUDE.md`.

### Purpose

Offer optional extras after the food box itself is complete.

### Entry requirement

A **full/valid food box is required** to enter Step 3. If the box is not complete, production should return the customer to Step 2 rather than opening Extras with a fake/demo box.

### What the customer can do

- Browse the available extras.
- Open an extra's details.
- Select available options such as size/heat where provided.
- Add/remove/change extras.
- Edit dishes by returning to Step 2.
- Continue without adding extras.
- Open Standards from an extra/detail context and return to the same extra/option.

### Main actions

- **Back** / **Edit dishes** → Step 2 with the order preserved.
- **REVIEW** → Step 4.
- **No extras? Skip** → Step 4.

### Returning from Review

Review can send the customer back to Extras to make a change. Existing extra selections should be restored.

### Option changes

If the same extra can have different options, the selected option belongs to that selected line. Changing the option should move/merge the selected quantity correctly rather than accidentally creating conflicting duplicate lines.

### Details/option dialogs

The approved design has separate detail and option-selection overlays. The short option picker opens focused on the current selection; richer details can focus the content heading.

### Important launch warning

The handoff states that the Extras nutrition/ingredients/allergens/heating content includes example or “being confirmed” data and placeholder photography. None of that can ship as final product information.

---

## 17. Step 4 — Review

**Status:** Review v2 is rebuilt and approved.

### Purpose

Let the customer check the complete food-box order before entering Checkout and give them targeted routes to correct dishes or extras without losing the rest of the order.

### What the page shows

The approved Review page contains:

- **Your dishes** — read-only summary showing quantity, portion/weight, Signature status and relevant upcharges;
- **Extras** — grouped by item and selected option; if none are selected, make that clear and offer the route to add extras;
- **Gift Card** line where one has been added to the food box;
- **Order summary** with the total;
- main **CHECKOUT** action.

### Change actions

- **Change** on dishes → Step 2 in the Review-edit context.
- **Change** on extras → Step 3 in the Review-edit context.
- After editing, the customer can **RETURN TO REVIEW**.
- Checkout's **Back to Review** returns here.

Changing one part of the order must not clear unrelated valid selections.

### Validation

Review is valid only while the earlier required steps remain valid.

If the food box later becomes incomplete or a saved dish becomes unavailable, do not let Review remain the valid continuation point. Return the customer to the earliest step that needs correcting, preserving everything else that is still valid.

### Main action

**CHECKOUT** → Step 5.

### Mobile

The same order-summary content is available on mobile. Only one primary CHECKOUT action should compete for attention at a time.

### Do not

- make dishes editable directly inside the Review summary;
- wipe extras or checkout state simply because the customer returns to an earlier step;
- allow an invalid/incomplete box to continue to Checkout.

---

## 18. Step 5 — Checkout

**Status in supplied handoff/source:** Checkout v2 approved; current source supplied.

### Purpose

Collect the remaining customer, recipient, delivery and account information needed before handing the order to payment.

### Page structure

The handoff defines three main sections:

1. **Your details**
2. **Send to**
3. **Choose a delivery date**

The page also contains codes, the legal acknowledgement, and the Order summary.

### Back action

**Back to Review** returns to Step 4 without intentionally discarding the order.

### Your details

The customer enters their email and can use the inline **Already have an account? Log in** route.

If the customer is already signed in, the login prompt is replaced with the signed-in state and saved details can be filled.

### Optional account creation

The customer can choose **Create an Abby's Table account** as a checkout preference.

No password should be requested before payment. The intended flow is to complete payment first and then send the secure account-setup/access email.

If the email already belongs to an account, the production flow must use the normal secure account-access route rather than creating a duplicate account.

### Points

Final loyalty rules:

- earn **2 points per £1** of eligible spend after discounts;
- **100 points = £1**;
- points never expire;
- no minimum redemption;
- points used on an order are capped at **20% of that order**;
- delivery/postage and the £3 greeting card do not earn points;
- qualifying Gift Card value earns points for the purchaser, but that stored value does not earn again when later redeemed.

A logged-in customer can apply an allowed number of points at Checkout. Copy must not imply they can use more than the 20% order cap.

Qualifying new points are added **immediately after successful payment**. They are not held pending until fulfilment.

### Send to

The customer enters the recipient/delivery information.

The current Checkout design also contains the food-box gift controls:

- **Is this box a gift?**
- **Hide prices from the box**
- optional **personalised greeting card +£3**
- greeting-card message when selected

The greeting-card copy says the customer's message will be printed inside the Abby's Table card.

### Address entry

The design supports address lookup with manual entry as a fallback. Production needs a real address service; sample/local address data is not sufficient for launch.

### Choose a delivery date

The page initially shows the next available date and lets the customer either use it or open the calendar to choose another date.

Selecting a date creates a **15-minute reservation** while the customer finishes checkout.

The page explains:

- the date is temporarily saved while they finish checkout;
- they can change it before payment;
- it becomes confirmed when payment is complete;
- if the hold expires, the box/checkout details are kept and they choose a date again.

### Delivery reservation states

The checkout can display:

- active reservation;
- near-expiry state;
- reservation expired but same/another date can be chosen;
- selected date no longer available.

The page timer is only a display of server-held reservation time. The browser does not own capacity.

### When the customer enters payment

If the customer starts payment while the reservation is still valid:

1. revalidate the selected delivery date;
2. create the payment session;
3. protect the delivery capacity as a payment hold;
4. allow **up to 10 additional minutes** while the customer completes payment/authentication.

Do not show a second pressure countdown during payment, and do not let repeated payment attempts extend scarce capacity indefinitely.

If payment has actually been submitted but its result is uncertain, resolve the payment-provider result before releasing the slot or inviting another payment.

### Order summary

Desktop shows the order summary rail; mobile can show it in a bottom sheet.

Mobile informational/order sheets must behave as true modal dialogs with inert background, focus containment and focus return.

### Legal links

The legal line links to **Terms of Sale** and **Privacy Policy** in new tabs. Checkout stays open.

A legal page opened from Checkout shows **← Back to checkout**. Where the browser permits, that action may return/focus the existing Checkout tab. Automatic closing of the legal tab is **not** required.

If the browser cannot switch back, tell the customer that Checkout is still open in their previous tab. Never create a second Checkout merely to implement the return.

### Main action

**CONTINUE TO PAYMENT** with the Secure checkout message.

### Server responsibility

The checkout page does not create the final order by itself. The production server owns:

- the order draft;
- delivery reservation;
- exact total/order state;
- the conversion of draft → confirmed order exactly once after successful payment.

### Do not

- request a password before payment as part of optional account creation;
- treat the page timer as the source of truth for delivery capacity;
- navigate the customer away from Checkout to read legal pages;
- create a second order because the payment page is refreshed or revisited.

---

# E. Gift-card checkout and account pages

## 19. Gift Card Checkout

**Status:** rebuilt; the current prototype predates the final Gift Card purchaser account/points decision. Production must implement the final rule at build stage without requiring a redesign of the approved prototype.

### Purpose

Complete a standalone Email or By-post Gift Card purchase without sending the customer through the food-box checkout.

### Supported entry routes

One page serves the two standalone routes:

- Email Gift Card;
- Gift Card by post.

The selected route changes the recipient/delivery fields rather than creating a separate checkout page.

The **In a food box** route is different: it adds the Gift Card to the food-box journey rather than using standalone Gift Card Checkout.

### What changes by route

**Email**

- collect the relevant recipient email/send details;
- no postage charge.

**By post**

- collect the UK recipient/postal address;
- collect the courier contact information required for delivery;
- use a posting date rather than an email send date;
- add the applicable postage;
- offer the paid greeting card/message treatment defined for the postal route.

### Account and points

A signed-in customer should see the signed-in state rather than an unnecessary Log in prompt. Their qualifying Gift Card-purchase points are added to their existing account after successful payment.

A signed-out customer may still buy the Gift Card as a guest, but should also have the **optional** opportunity to create an Abby's Table account so they can collect the points from the purchase. Use the same post-payment account-setup principle as food-box Checkout:

- account creation is optional and must never block guest purchase;
- do not ask the customer to create a password before payment;
- if they opt in, send a secure setup/access link after successful payment;
- if the email already belongs to an account, do not create a duplicate, silently log them in or block payment;
- qualifying points are earned immediately against the successful Gift Card purchase;
- those points become visible in the account once secure setup/access is completed.

A guest who neither logs in nor opts to create an account should not be shown a misleading message saying points were added to an account.

Final business rule: the purchaser earns **2 points per £1** on the amount actually paid for eligible Gift Card value. Postage and the £3 greeting card do not earn points. The Gift Card-funded value does not earn again when the recipient later redeems it.

The existing prototype does not need to be redesigned to show this now. Treat the account/points addition as a **build-stage implementation requirement** using the established Checkout account/points pattern.

Any older prototype decision/copy saying Gift Card purchases do not earn points, or that Gift Card Checkout must never offer optional account creation, is stale and must not be treated as the launch rule.

### Address lookup

The lookup shown in the prototype is sample data. Production requires a real UK address service, with manual entry available as a fallback.

### Removal / unfinished gift

Removing the configured Gift Card removes it from the payable order but should preserve enough of the configuration for the approved Undo/restore journey during that session.

A standalone Gift Card becomes an unfinished gift only once the customer has actually entered Gift Card Checkout. Merely browsing the Gifting page must not create an unfinished checkout.

### Do not

- treat Email and By-post Gift Cards as food-box `giftIntent`;
- create a food box for a standalone Email/Post Gift Card;
- award points again on Gift Card-funded spend when that Gift Card is redeemed;
- require account creation in order to buy a Gift Card;
- redesign the approved Gift Card Checkout prototype solely to add the account/points state before build.

---

## 20. Log in

**Status:** dedicated Log in page rebuilt and approved.

### Purpose

Authenticate an existing Abby's Table customer and return them to the correct account/checkout context.

### Page behaviour

The approved page uses a focused sign-in card with:

- email;
- password;
- Show/Hide password control;
- primary Log in action;
- supported provider sign-in options.

There is no separate create-account journey on this page. Optional account creation belongs to Checkout.

### After successful login

- the normal site account label becomes **My Account**;
- a customer sent here from My Account should return to the intended account destination;
- a customer logging in during Checkout must keep the current guest order and have it safely associated/merged rather than receiving an empty order.

Production authentication comes from the real server session. The prototype's browser flag is not identity.

### Still partially documented

The complete password-reset journey and every possible authentication error state are not fully specified by this guide. Use the secure-link/error rules elsewhere in the project rather than inventing account-disclosure behaviour.

---

## 21. My Account

**Status in supplied handoff:** page behaviour described, although the handoff marks all figures as sample data.

### Purpose

Give signed-in customers access to their account information and previous/current orders.

### Main sections

The prototype defines:

- Overview
- Orders
- Points
- Gifts
- Addresses
- Details

### Orders

Show upcoming and past orders with order status, dishes and gift marker where relevant.

The prototype status vocabulary is holding/example fulfilment data and must be replaced with the real fulfilment states.

### Order again

The customer can start a **new** box from an existing order.

The supplied handoff describes an Order Again sheet where the previous dishes are preselected before handing off to Step 2.

Production must:

- re-price using today's prices;
- reject dishes no longer sold;
- rebuild a valid new food-box order;
- not carry the old delivery date, gift details or codes into the new order.

Confirmed orders are read-only in My Account. There is no self-service Change order or Cancel order action.

For help with an order, use:

**Need help with an order?**  
Contact us.

**CONTACT US**

Do not place cancellation/change deadlines or eligibility explanations in My Account. Those belong in Delivery & FAQs and Terms of Sale.

### Points

The page contains the customer's points balance/ledger, value and history.

Final rules shown here must match Checkout:

- 2 points per £1 of eligible spend;
- 100 points = £1;
- no expiry;
- no minimum redemption;
- maximum redemption of 20% of an order;
- qualifying new points are added after successful payment.

History can show earned, redeemed and adjusted entries with a running balance.

### Gift cards sent

The account can show sent Gift Cards. Email-Gift-Card resend requires a rate-limited resend service.

### Addresses

The customer can manage saved addresses and one default address for use at checkout.

### Details

The handoff describes:

- secure confirmation for email changes;
- password reset by emailed link;
- account deletion by contacting Abby's Table rather than one-click self-service deletion.

### Sign out

Ends the server session and returns the customer to the homepage.

---

## 22. Order Confirmation

**Status:** Order Confirmation v2 is rebuilt and approved.

### Purpose

Confirm that payment and order creation succeeded, give the customer the essential order/delivery information and return them to the normal Abby's Table site experience.

### Page behaviour

Checkout chrome ends here:

- no checkout stepper;
- normal Abby's Table navigation returns;
- the active shopping draft has been converted/cleared;
- the sitewide ordering CTA returns to **GET STARTED**.

### Main hierarchy

Show:

- **Order confirmed**;
- short thank-you/confirmation copy;
- order number with copy action;
- **Delivery details**;
- concise **Order summary**;
- relevant account/points state;
- the restrained Abby's Private Table banner.

Do not add a gifting promotion, **Manage delivery** action or separate marketing/newsletter signup.

### Logged-in customer

Qualifying points are added immediately after successful payment.

Show the earned points state, for example:

**129 points earned**

with the account message appropriate to the signed-in customer.

Where useful, offer **VIEW ORDER IN MY ACCOUNT**.

### Customer who selected account setup during Checkout

Use neutral secure wording that works whether the email is genuinely new or already belongs to an existing account:

**Check your email to finish setting up or access your account.**  
We've sent you a secure link.

Qualifying points are **earned immediately after successful payment and attached to the successful order**. If secure account setup/access is still incomplete, they are not pending or awaiting fulfilment; they become visible in the account once the customer completes secure setup/access.

Do not create a duplicate account or claim a new account definitely exists before the backend knows that.

### Guest

The order is fully confirmed, but do not show account-created wording or claim points have been added to a non-existent guest account.

### Do not

- call newly qualifying food-order points “pending until fulfilment”;
- leave Checkout navigation/stepper on the page;
- offer self-service order changes or cancellation from confirmation.

---

# F. Payment and recovery pages

## 23. Payment Processing

**Status in supplied handoff:** approved.

### Purpose

Hold the customer safely while the payment provider/server confirms the payment result.

### Page behaviour

This page deliberately removes normal shopping distractions.

Show:

- Abby's Table wordmark;
- Questions/help;
- payment-confirmation status;
- simplified checkout footer.

Do not show normal ordering or account actions while payment is resolving.

### What happens next

The **server** decides the outcome and sends the customer to one of:

- Order Confirmation;
- Payment wasn't completed;
- Payment cancelled.

The browser must not guess the result.

### Refresh/retry safety

Reloading Payment Processing must not create a second order or charge attempt. The same order/payment state is being checked.

---

## 24. Payment wasn't completed

**Status in supplied handoff:** built/in review.

### Purpose

Recover a failed/declined payment without losing the order.

### When the customer arrives

Keep the existing order draft, customer-entered details and the delivery reservation if it is still valid.

### Customer actions

- **TRY AGAIN** → reopen payment for the same order draft.
- **USE ANOTHER CARD** → reopen payment for the same order draft.
- **Return to checkout** → restore Checkout from the same draft.

### Important rule

Do not start a new order because the first payment attempt failed.

Any wording that says no money was charged must only be used where the payment-provider outcome makes that statement true.

---

## 25. Payment was cancelled

**Status in supplied handoff:** built/in review.

### Purpose

Return a customer who deliberately backed out of the payment-provider flow to the same order.

### Customer actions

- **CONTINUE TO PAYMENT** → reopen payment for the same draft.
- **USE ANOTHER CARD** → reopen payment for the same draft.

### Important rule

Cancelling payment does not mean cancelling or deleting the food order draft.

---

# G. Error and system pages

## 26. Page Not Found — 404

**Status in supplied handoff:** built/in review.

### Purpose

Explain that the requested page does not exist while the rest of Abby's Table is still functioning normally.

### Page behaviour

Use the normal marketing-site chrome and account/order state.

Show:

- 404 message;
- **GO TO HOMEPAGE**;
- **View the menu**.

If the customer already has an order in progress, the normal marketing chrome can still show **VIEW BOX**. Signed-in customers still see **My Account**.

### Important server behaviour

Return a real **HTTP 404**. Do not redirect to a “404 page” with a 200 status.

---

## 27. Something went wrong — 500

**Status in supplied handoff:** built/in review.

### Purpose

Handle an application/server failure even if the main site cannot load correctly.

### Page behaviour

Use reduced, resilient chrome rather than the normal interactive site.

Show:

- wordmark;
- Contact us;
- **TRY AGAIN**;
- **Back to homepage** where appropriate;
- direct email/phone support.

Do not show normal account/order/newsletter/consent functionality that may depend on the failed application.

### Important server behaviour

Return a real **HTTP 500** and serve the page as a static/resilient asset rather than redirecting to it.

---

## 28. We'll be back shortly — maintenance

**Status in supplied handoff/source:** built/in review; current Back Shortly file supplied.

### Purpose

Tell customers the site is deliberately unavailable for planned maintenance.

### Page behaviour

This is even more restricted than the 500 page.

Do **not** provide links into areas of the website that are intentionally unavailable.

Use generic maintenance copy. If Abby's Table wants to publish a return time, the handoff says to use social channels rather than editing the emergency page during the outage.

### Important server behaviour

Return **HTTP 503** with an appropriate Retry-After response, not a 200 and not a redirect.

---

## 29. Link no longer valid

**Status in supplied handoff:** built/in review.

### Purpose

Handle an expired, already-used or invalid secure emailed account/password link without exposing whether an account exists.

### Customer action

**SEND A NEW LINK**

### Behaviour

The server attempts to resolve the secure token and, where appropriate, issues a new link. The page shows the same neutral **Check your email** type of outcome regardless of whether a matching account was found.

Do not display the customer's email address or reveal account existence through different messages.

### Important server behaviour

The handoff specifies HTTP 410/no-store/no-referrer handling for this secure-link state and rate limiting for resend requests.

---

# H. Shared server-side order behaviour

## 30. Order draft

The production order must have a server-side draft as the source of truth.

The draft is intended to contain the customer choices across the funnel, including:

- box size;
- dishes;
- portions;
- Signature upgrades;
- extras/options;
- gift configuration and greeting-card message;
- recipient/address/phone;
- delivery date/time window/notes;
- reservation;
- applied codes;
- account-creation choice.

Anonymous checkout must remain possible.

## 31. Same browser / multiple tabs

The same browser should resolve to the same order draft rather than creating a different order per tab.

If another tab changes the order, the stale tab must refresh/reconcile before overwriting newer information.

## 32. Login during checkout

Logging in during an anonymous order must attach/merge the existing order safely. Do not replace it with an empty account order.

## 33. Cross-device recovery

The handoff only supports automatic cross-device recovery for account-linked/logged-in orders. An anonymous browser order does not automatically follow the customer to another device unless a separate secure resume mechanism is later built.

## 34. Delivery reservation

The delivery reservation is shorter-lived than the order draft.

- order draft persists for days;
- delivery reservation is 15 minutes from active date selection;
- changing date releases the old hold and creates the new one;
- reservation expiry removes only the reservation, not the whole order.

When payment begins while the reservation is valid, the server revalidates the date and protects it as a payment hold for **up to 10 additional minutes** while payment/authentication is completed. This must not be extended indefinitely by repeated retries.

If payment has actually been submitted and its result is uncertain, resolve the payment-provider result before releasing capacity or inviting another payment.

## 35. Successful payment

Payment success converts the order draft into the confirmed order **exactly once**. Repeated provider callbacks, redirects or refreshes must not create duplicate orders.

---

# I. Site-wide cookie consent surface

The consent manager is a site-wide surface rather than a normal page.

### Initial consent

The customer can accept, reject or customise optional cookies. The banner should not steal focus on load.

### Cookie preferences

Cookie-preferences links/buttons reopen the manager later. The Privacy Policy's `#cookies` section is the deeper information destination.

### Fixed-control priority

Cookie consent takes priority over the mobile purchase bar and other lower fixed controls so important consent actions are not obscured.

### Important source limitation

The handoff says the consent manager design/contract exists but several launch dependencies, including the actual cookie audit/category content, still need operational completion.

---

# J. Pages/areas that still have genuine source limitations

The current `CLAUDE.md` and handoff now provide enough behaviour to document Standards, Private Table, Review and Order Confirmation in this guide.

Gift Card Checkout is now behaviourally defined: the purchaser can earn points and a signed-out purchaser can optionally create an account after payment to collect them. The current prototype may remain visually stale; the account/points addition is a build-stage implementation requirement, not a redesign prerequisite.

Remaining genuine gaps are narrower:

- **Log in / password reset** — the approved sign-in page is documented, but the complete reset/error journey is not fully specified here.
- **Contact form service failure** — the customer-facing technical failure state remains open.
- **Operational/legal data** — delivery coverage, final food/allergen data, contact details, legal placeholders and similar launch data still require real-world confirmation.

Do not fill these remaining gaps by assumption.

---

# K. Conflicts and open items in the supplied documents that should be resolved before build sign-off

These are important because the page designs can look complete while the underlying business behaviour is still holding data.

1. **Pricing conflict:** Homepage/How It Works and the food-box funnel contain different price models in the handoff. The funnel values are explicitly called obsolete in the handoff.
2. **Portion/upcharge conflict:** Choose Box and a dish page show different Full Table upcharges in the documented prototype.
3. **Delivery date:** “6 August” is hard-coded across several funnel pages and must come from one real availability source.
4. **Delivery coverage:** some exclusion lists are placeholders/assumptions and need actual courier coverage.
5. **Gift fulfilment:** parts of the Gift Card/gifting mechanics are marked operationally unconfirmed.
6. **Contact details/hours:** phone, WhatsApp, email/opening-hours values are marked unverified placeholders in the handoff.
7. **Product content:** dish nutrition/allergen values and some Extras content are holding/example data.
8. **Photography/video:** food imagery/video is placeholder and is explicitly a launch blocker.
9. **Legal content:** Terms and Privacy still require review/completion and contain placeholders.
10. **Prototype/business-rule reconciliation:** any live prototype copy that still shows old points rules, old gifting/legal-return behaviour, or the older Gift Card Checkout no-account/no-points treatment must be brought into line during build; the final behaviour is now defined in this guide and `SHOPPING-STATE.md`.

---

# L. Simple acceptance test for every page

Before calling any page complete, a tester should be able to answer these questions without reading the code:

1. **Why has the customer come to this page?**
2. **What should already be visible/restored when they arrive?**
3. **What are the main things they can do?**
4. **Where does every important button/link take them?**
5. **What happens if input is invalid or a service fails?**
6. **What happens when they go Back?**
7. **What customer choices must survive when they leave and return?**
8. **What changes for signed-in customers?**
9. **What changes when there is an order already in progress?**
10. **Does mobile perform the same task as desktop, even if the layout differs?**

If any of those answers is unclear, the page behaviour is not fully specified yet.


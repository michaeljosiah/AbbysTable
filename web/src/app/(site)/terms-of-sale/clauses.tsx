import type { ReactNode } from 'react';

import {
  CompanyEmail,
  CompanyName,
  CompanyNumber,
  CompanyPhone,
  DocLink,
  InfoGrid,
  InfoItem,
  InfoValue,
  LabelHeading,
  Note,
  PaymentProvider,
  RegisteredAddress,
  RegisteredOffice,
  SiteLink,
  StandardsList,
} from '@/components/legal/prose';
import { CONTACT_HREF } from '@/lib/content/navigation';
import type { TermsSlug } from '@/lib/legal/terms';

/*
 * Terms of Sale — the 56 clause bodies, keyed by slug. Titles, numbers and
 * groups come from `@/lib/legal/terms`; the record type makes a missing body a
 * build error.
 *
 * COPY IS VERBATIM from design/Abby's Table - Terms of Sale.dc.html: the
 * client's working draft, awaiting solicitor review (build-handoff.md, open
 * items; #38). Do not reword it here. Literal markup rather than data, because
 * editability matters more than cleverness while it is under review.
 *
 * Company details come from `@/lib/content/company`, never from the design's
 * placeholders, and print as "to be confirmed" until they are set.
 *
 * Contact and Private Table are designed but not built yet; their links take
 * the site's current destinations (`CONTACT_HREF`, the homepage band).
 */

/** The homepage's Private Table band, until the Private Table page is built. */
const PRIVATE_TABLE_HREF = '/#private';

/**
 * Clause 4's five food standards. In-house glyphs drawn in the Our standards
 * language (thin 1.6 stroke, brass-ink, aria-hidden), each standard stated in
 * words beside it.
 */
const FOOD_STANDARDS = [
  {
    label: 'No commercial seasoning blends',
    glyph: (
      <>
        <path d="M9 4.5h6l.6 3H8.4z" />
        <path d="M7.6 7.5h8.8l.9 12H6.7z" />
        <path d="M10.6 11.5h2.8M10.6 14.5h2.8" />
      </>
    ),
  },
  {
    label: 'No bouillon or seasoning cubes',
    glyph: (
      <>
        <path d="M12 3.2l7 3.9v7.8l-7 3.9-7-3.9V7.1z" />
        <path d="M5 7.1l7 3.9 7-3.9M12 11v7.8" />
      </>
    ),
  },
  {
    label: 'No added MSG',
    glyph: (
      <>
        <path d="M9.6 3.5h4.8v4.2l3.4 10.3a1.6 1.6 0 0 1-1.5 2.1H7.7a1.6 1.6 0 0 1-1.5-2.1L9.6 7.7z" />
        <path d="M8.6 3.5h6.8" />
      </>
    ),
  },
  {
    label: 'No seed oils',
    glyph: <path d="M12 3.4c2.6 3.2 4.4 5.7 4.4 8.1a4.4 4.4 0 1 1-8.8 0c0-2.4 1.8-4.9 4.4-8.1z" />,
  },
  {
    label: 'No refined sugars',
    glyph: (
      <>
        <path d="M12 3.4l6.1 3.5v7l-6.1 3.5-6.1-3.5v-7z" />
        <circle cx="12" cy="10.4" r="2.4" />
      </>
    ),
  },
] as const;

export const TERMS_CLAUSES: Record<TermsSlug, ReactNode> = {
  'about-abbys-table': (
    <>
      <p>
        Abby&apos;s Table is a trading name of <CompanyName />, a company registered in England and
        Wales.
      </p>
      {/* The registered details: address, registration number, how to reach us. No VAT number —
          Abby's Table is not VAT registered at launch (build-handoff.md, open items). */}
      <InfoGrid variant="sand">
        <InfoItem label="Registered office">
          <InfoValue>
            <RegisteredOffice />
          </InfoValue>
        </InfoItem>
        <InfoItem label="Company number">
          <InfoValue>
            <CompanyNumber />
          </InfoValue>
        </InfoItem>
        <InfoItem label="Get in touch">
          <InfoValue>
            <CompanyEmail pending="email address to be confirmed" />
          </InfoValue>
          <InfoValue>
            <CompanyPhone link pending="telephone number to be confirmed" />
          </InfoValue>
        </InfoItem>
      </InfoGrid>
      <p>
        In these Terms of Sale, <strong>“Abby&apos;s Table”, “we”, “us” and “our”</strong> mean the
        business identified above.
      </p>
      <p><strong>“You” and “your”</strong> mean the person placing an order with us.</p>
    </>
  ),
  'what-these-terms-cover': (
    <>
      <p>
        These terms apply when you buy food products directly from Abby&apos;s Table through our
        website, including:
      </p>
      <ul>
        <li>prepared meals;</li>
        <li>meal boxes;</li>
        <li>sides and extras;</li>
        <li>food ordered as a gift; and</li>
        <li>any other products expressly stated to be covered by these terms.</li>
      </ul>
      <p>These terms do not cover:</p>
      <ul>
        <li>Abby&apos;s Private Table services;</li>
        <li>catering supplied under a separate agreement;</li>
        <li>wholesale or corporate supply arrangements;</li>
        <li>products purchased from an independent third-party retailer; or</li>
        <li>any other service for which separate terms are provided.</li>
      </ul>
      <p>
        Orders placed through our consumer website are intended for personal and domestic use unless
        we agree otherwise.
      </p>
      <p>Products must not be purchased for commercial resale without our prior agreement.</p>
    </>
  ),
  'our-food': (
    <>
      <p>
        Abby&apos;s Table prepares Nigerian fusion food in small cooking runs against confirmed
        orders.
      </p>
      <p>
        Our dishes are prepared using the ingredients and recipes described on our website, then
        chilled and packaged for delivery.
      </p>
      <p>
        Because our food is cooked by hand using natural ingredients, reasonable variations can
        occur between batches. These may include differences in:
      </p>
      <ul>
        <li>appearance;</li>
        <li>colour;</li>
        <li>size;</li>
        <li>texture;</li>
        <li>placement of ingredients; and</li>
        <li>presentation.</li>
      </ul>
      <p>
        These reasonable natural variations do not mean that a product is defective or not as
        described.
      </p>
      <p>
        However, the food we supply must still correspond with the material description under which
        it was sold and meet the quality standards required by law.
      </p>
    </>
  ),
  'food-standards': (
    <>
      <p>
        Where we state that Abby&apos;s Table food is prepared to particular standards, we intend
        those statements to be accurate.
      </p>
      <p>Our standards may include, where stated for the relevant products:</p>
      <StandardsList items={FOOD_STANDARDS} />
      <p>
        Individual dish descriptions, ingredients and labels should always be read alongside these
        general standards.
      </p>
      <p>If a standard applies only to certain dishes or products, we will make that clear.</p>
      <p>
        We may develop recipes and food standards over time. Changes will apply to future orders and
        will not retrospectively change the material description of an order we have already
        accepted.
      </p>
    </>
  ),
  'choosing-your-order': (
    <>
      <p>
        The website will show the dishes, sizes, portion choices and extras currently available.
      </p>
      <p>Not every option will be available for every dish.</p>
      <p>Before placing your order, please check your:</p>
      <ul>
        <li>dishes;</li>
        <li>quantities;</li>
        <li>portion selections;</li>
        <li>extras;</li>
        <li>delivery address;</li>
        <li>delivery date;</li>
        <li>contact details;</li>
        <li>allergen information; and</li>
        <li>total price.</li>
      </ul>
      <p>You will have an opportunity to review your order before you commit to payment.</p>
    </>
  ),
  'minimum-orders-boxes': (
    <>
      <p>Some orders may be subject to:</p>
      <ul>
        <li>a minimum number of dishes;</li>
        <li>a minimum box size;</li>
        <li>a minimum order value; or</li>
        <li>another ordering requirement shown on the website.</li>
      </ul>
      <p>Any applicable minimum will be displayed before you complete checkout.</p>
      <p>We may change minimum quantities, box formats or minimum values for future orders.</p>
      <p>Those changes will not alter an order we have already accepted.</p>
    </>
  ),
  'cooking-runs-availability': (
    <>
      <p>
        We take a limited number of orders for each cooking run so that we can prepare each order
        properly.
      </p>
      <p>
        The delivery dates shown on our website therefore reflect our{' '}
        <strong>next available cooking and delivery capacity</strong>.
      </p>
      <p>A cooking run may become fully booked while you are browsing.</p>
      <p>Adding products to your basket does not reserve a cooking-run place or delivery date.</p>
      <p>
        Your order is secured only when it has been accepted by us in accordance with section 8.
      </p>
    </>
  ),
  'how-a-contract-is-formed': (
    <>
      <p>
        When you submit your order and payment information, you are making an offer to buy the
        products shown in your checkout.
      </p>
      <p>We may send an automatic email confirming that we have received your order.</p>
      <p>
        A receipt or acknowledgement of your order does not necessarily mean that we have accepted
        it.
      </p>
      <p>
        A binding contract between you and Abby&apos;s Table is formed when we send you an{' '}
        <strong>Order Confirmation</strong> confirming that your order has been accepted.
      </p>
      <p>Your confirmation will normally include or identify:</p>
      <ul>
        <li>your order number;</li>
        <li>the products ordered;</li>
        <li>quantities and selected options;</li>
        <li>the total price;</li>
        <li>your delivery information;</li>
        <li>the expected delivery date;</li>
        <li>any applicable change or cancellation deadline; and</li>
        <li>the Terms of Sale applying to the order.</li>
      </ul>
      <p>Please retain your Order Confirmation until your order has been completed.</p>
    </>
  ),
  'when-we-may-decline-an-order': (
    <>
      <p>We may decline an order before acceptance where there is a reasonable reason to do so.</p>
      <p>Examples include where:</p>
      <ul>
        <li>the relevant cooking run has reached capacity;</li>
        <li>an important ingredient or product is unexpectedly unavailable;</li>
        <li>we cannot deliver to the address supplied;</li>
        <li>payment cannot be authorised;</li>
        <li>we identify an obvious pricing or description error;</li>
        <li>we reasonably suspect fraud or misuse;</li>
        <li>fulfilling the order would create a food-safety concern; or</li>
        <li>an unexpected operational problem means we cannot safely produce the order.</li>
      </ul>
      <p>If we cannot accept an order, we will tell you.</p>
      <p>
        If payment has already been taken, it will be returned to the original payment method as
        soon as reasonably possible.
      </p>
    </>
  ),
  'prices': (
    <>
      <p>All prices on the Abby&apos;s Table website are shown in pounds sterling (£).</p>
      <p>Abby’s Table is not currently VAT registered, so no VAT is added to our prices.</p>
      <p>
        Any compulsory delivery charge or other mandatory fee will be shown before you place your
        order.
      </p>
      <p>The total price payable will be displayed at checkout.</p>
      <p>We may change prices for future orders.</p>
      <p>A later price change will not alter the price of an order we have already accepted.</p>
    </>
  ),
  'obvious-pricing-errors': (
    <>
      <p>We take reasonable care to ensure that our prices are accurate.</p>
      <p>Occasionally, an obvious pricing error may occur.</p>
      <p>
        If we identify an obvious error before accepting your order, we may correct it and ask
        whether you still wish to proceed at the correct price.
      </p>
      <p>We will not charge you a higher amount than you authorised without your agreement.</p>
      <p>
        If an error is identified after an order has been accepted, we will deal with it reasonably
        and in accordance with applicable consumer law.
      </p>
    </>
  ),
  'payment': (
    <>
      <p>Payment must be made using one of the payment methods offered during checkout.</p>
      <p>
        Payments may be processed on our behalf by a third-party payment provider such as{' '}
        <PaymentProvider strong />.
      </p>
      <p>Payment may be authorised or collected when your order is placed.</p>
      <p>If your order is subsequently not accepted, any payment collected will be returned.</p>
      <p>We will never ask you to send full payment-card details to us through:</p>
      <ul>
        <li>email;</li>
        <li>WhatsApp;</li>
        <li>the Contact form; or</li>
        <li>social media.</li>
      </ul>
    </>
  ),
  'where-we-deliver': (
    <>
      <p>We deliver to the areas currently shown as eligible on our website.</p>
      <p>Delivery availability may depend on your postcode.</p>
      <p>
        Entering a postcode does not itself guarantee delivery unless the order has subsequently
        been accepted.
      </p>
      <p>We may change our delivery areas for future orders.</p>
      <p>
        This will not remove our obligation to deal appropriately with an order that we have already
        accepted.
      </p>
    </>
  ),
  'delivery-dates-time-windows': (
    <>
      <p>Your Order Confirmation will state the delivery date associated with your order.</p>
      <p>
        Unless we expressly promise an exact delivery time, any courier time window is an estimate
        rather than a guaranteed minute-by-minute appointment.
      </p>
      <p>
        We will take reasonable steps to keep you informed of a material change to your expected
        delivery.
      </p>
      <p>
        If delivery timing is essential for a particular purpose, you should tell us before ordering
        so that we can confirm whether we can accommodate it.
      </p>
    </>
  ),
  'delivery-information-you-provide': (
    <>
      <p>You are responsible for providing complete and accurate delivery information.</p>
      <p>This includes, where relevant:</p>
      <ul>
        <li>recipient name;</li>
        <li>building number;</li>
        <li>street;</li>
        <li>postcode;</li>
        <li>flat or apartment number;</li>
        <li>access instructions;</li>
        <li>gate or concierge information; and</li>
        <li>contact details required for delivery.</li>
      </ul>
      <p>Please check this information carefully before placing your order.</p>
      <p>If you notice an error after ordering, contact us as soon as possible.</p>
      <p>
        We will try to update the details where reasonably possible, but changes may not be possible
        once fulfilment is underway.
      </p>
    </>
  ),
  'receiving-chilled-deliveries': (
    <>
      <p>Our meals are delivered chilled.</p>
      <p>
        Please make appropriate arrangements for the delivery to be received on the agreed date.
      </p>
      <p>
        Where the service requires somebody to accept the parcel, you should ensure that either you
        or another appropriate person is available.
      </p>
      <p>
        If we offer a nominated neighbour, safe-location or other alternative delivery arrangement,
        any special conditions will be shown when that option is selected.
      </p>
      <p>
        Where Abby&apos;s Table chooses the carrier, goods generally remain at the trader&apos;s
        risk until they come into the physical possession of the customer or another person
        identified by the customer to take possession of them.
      </p>
    </>
  ),
  'failed-delivery': (
    <>
      <p>
        If a reasonable delivery attempt cannot be completed because of circumstances within your
        control — for example:
      </p>
      <ul>
        <li>an incorrect address;</li>
        <li>incomplete access information;</li>
        <li>an inaccessible building; or</li>
        <li>nobody being available where attendance was required —</li>
      </ul>
      <p>we will try to contact you.</p>
      <p>
        Because the order contains perishable chilled food, it may not always be safe or practical
        to redeliver the same products.
      </p>
      <p>
        Where a further delivery or replacement is reasonably required because of information or
        circumstances for which you were responsible, we may ask you to pay reasonable additional
        costs actually incurred.
      </p>
      <p>This does not affect your statutory rights.</p>
      <p>
        Any refund due will be handled in accordance with{' '}
        <DocLink href="#refunds">section 30 — Refunds</DocLink>.
      </p>
    </>
  ),
  'delays-and-events-outside-our-control': (
    <>
      <p>Occasionally an order may be affected by an event outside our reasonable control.</p>
      <p>Examples may include:</p>
      <ul>
        <li>severe weather;</li>
        <li>major transport disruption;</li>
        <li>widespread courier disruption;</li>
        <li>significant utility failure;</li>
        <li>emergency restrictions;</li>
        <li>an unexpected food-safety event; or</li>
        <li>another exceptional event that could not reasonably have been avoided.</li>
      </ul>
      <p>If an event materially affects an accepted order, we will take reasonable steps to:</p>
      <ul>
        <li>minimise disruption;</li>
        <li>keep you informed; and</li>
        <li>offer an appropriate solution.</li>
      </ul>
      <p>
        We will not use an event outside our control as a reason to retain payment indefinitely for
        products that we ultimately cannot supply.
      </p>
      <p>Where a refund becomes due, <DocLink href="#refunds">section 30</DocLink> applies.</p>
    </>
  ),
  'ingredients-recipe-changes': (
    <>
      <p>Fresh ingredient availability and suppliers may occasionally change.</p>
      <p>We may make minor changes that do not materially alter:</p>
      <ul>
        <li>the nature of the dish;</li>
        <li>its declared allergens;</li>
        <li>an important dietary characteristic;</li>
        <li>the quantity ordered; or</li>
        <li>another material product description.</li>
      </ul>
      <p>
        We will not knowingly make a substitution that materially changes a declared allergen or
        important characteristic without taking appropriate action.
      </p>
      <p>
        Where a material change becomes necessary after an order has been accepted, we may contact
        you to discuss available alternatives.
      </p>
    </>
  ),
  'allergen-information': (
    <>
      <p>
        Allergens contained in each dish are identified through the allergen information available
        on our website before you order and provided again with your food when it is delivered.
      </p>
      <p>Recipes, ingredients and suppliers can change, so you should:</p>
      <ul>
        <li>check the current allergen information for every dish when ordering; and</li>
        <li>check the information supplied with the delivered product again before eating it.</li>
      </ul>
      <p>This is particularly important if you are ordering food for another person.</p>
      <p>
        For food sold at a distance, mandatory allergen information must be available before the
        purchase is concluded and again when the food is delivered.
      </p>
      <Note>
        If the allergen information supplied with your delivery differs from information you
        previously viewed online, or if a label is missing, damaged or unclear,{' '}
        <strong>
          do not eat the dish until you have contacted us and we have confirmed the information
        </strong>
        .
      </Note>
    </>
  ),
  'cross-contact-severe-allergies': (
    <>
      <p>
        We maintain procedures designed to manage allergens and reduce unintended cross-contact.
      </p>
      <p>Different allergens are nevertheless handled within our production environment.</p>
      <p>
        Where our allergen risk assessment identifies an unavoidable cross-contact risk that cannot
        adequately be controlled, we will identify the relevant allergen using appropriate
        precautionary wording such as <strong>“may contain [allergen]”</strong>.
      </p>
      <p>
        Precautionary allergen warnings will be based on assessed risk and are not used as a
        substitute for appropriate food-safety controls.
      </p>
      <p>
        Unless a product is expressly described as <strong>free from</strong> a particular allergen,
        you should not assume that it is suitable for someone who must completely avoid that
        allergen.
      </p>
      <p>If you have:</p>
      <ul>
        <li>a severe allergy;</li>
        <li>a food intolerance;</li>
        <li>a specific allergen concern; or</li>
        <li>any uncertainty about the information provided,</li>
      </ul>
      <p>
        please <SiteLink href={CONTACT_HREF}>contact us</SiteLink>{' '}
        <strong>before placing your order</strong>.
      </p>
      <p>
        Nothing in this section limits Abby&apos;s Table&apos;s responsibilities under food-safety
        or consumer law.
      </p>
    </>
  ),
  'dietary-descriptions': (
    <>
      <p>Descriptions such as:</p>
      <ul>
        <li>vegan;</li>
        <li>vegetarian;</li>
        <li>plant-led;</li>
        <li>balanced;</li>
        <li>carb-conscious; or</li>
        <li>Mediterranean-inspired</li>
      </ul>
      <p>describe the recipe or menu category.</p>
      <p>They do not automatically mean that the dish is free from a particular allergen.</p>
      <p>
        For example, vegan labelling does not itself guarantee that food is free from allergens such
        as milk or egg resulting from cross-contact.
      </p>
      <p>Always check the specific allergen information for the dish.</p>
    </>
  ),
  'nutrition-information': (
    <>
      <p>Where we provide nutritional values such as:</p>
      <ul>
        <li>energy;</li>
        <li>protein;</li>
        <li>fibre;</li>
        <li>carbohydrate;</li>
        <li>fat; or</li>
        <li>other nutritional information,</li>
      </ul>
      <p>
        the figures may be calculated from recipe data, supplier information and standard ingredient
        values.
      </p>
      <p>
        Natural ingredients and cooking processes can create reasonable variation between portions.
      </p>
      <p>We take reasonable care to ensure published nutrition information is accurate.</p>
      <p>
        Unless expressly stated otherwise, general nutrition information on the Abby&apos;s Table
        website is provided to help customers understand our food.
      </p>
      <p>It is not personalised medical or dietetic advice.</p>
      <p>Abby&apos;s Table meals are not intended to diagnose, treat, cure or prevent disease.</p>
      <p>
        If you require food to meet a medically prescribed diet, seek appropriate professional
        advice where necessary.
      </p>
    </>
  ),
  'portion-choices': (
    <>
      <p>Some dishes may be offered in different portion sizes.</p>
      <p>The portion option you select will form part of your order.</p>
      <p>Portion descriptions distinguish between available product sizes.</p>
      <p>
        They are not a medical recommendation or prescription about how much any individual should
        eat.
      </p>
    </>
  ),
  'changing-an-order': (
    <>
      <p>
        You may request changes to an order until the{' '}
        <strong>change deadline shown for that order</strong>.
      </p>
      <p>Changes are subject to:</p>
      <ul>
        <li>ingredient availability;</li>
        <li>cooking-run capacity;</li>
        <li>delivery availability; and</li>
        <li>whether fulfilment has already begun.</li>
      </ul>
      <p>We cannot guarantee that every requested amendment can be made.</p>
      <p>If a change alters the price, we will tell you before completing it.</p>
    </>
  ),
  'cancelling-before-cutoff': (
    <>
      <p>
        Although our food is made against confirmed orders, we may provide a voluntary cancellation
        period before production is committed.
      </p>
      <p>The applicable cancellation deadline will be shown:</p>
      <ul>
        <li>during checkout;</li>
        <li>in your Order Confirmation; and/or</li>
        <li>in your account where applicable.</li>
      </ul>
      <p>
        If you cancel an eligible order before that deadline, any refund due will be handled under{' '}
        <DocLink href="#refunds">section 30</DocLink>.
      </p>
    </>
  ),
  'perishable-food-and-cancellation-rights': (
    <>
      <p>Different cancellation rules apply to perishable food.</p>
      <p>
        The usual statutory 14-day change-of-mind cancellation right does not apply to goods that
        are liable to deteriorate or expire rapidly.
      </p>
      <p>
        Our chilled prepared meals fall within the type of perishable products for which this
        exception may apply.
      </p>
      <p>This does <strong>not</strong> remove your rights if food is:</p>
      <ul>
        <li>faulty;</li>
        <li>unsafe;</li>
        <li>not as described; or</li>
        <li>otherwise not supplied in accordance with your statutory rights.</li>
      </ul>
      <p>
        Any voluntary cancellation period offered by Abby&apos;s Table is additional to your
        statutory rights.
      </p>
      <p>
        Different rules may apply to non-perishable products, and where relevant these will be made
        clear before purchase.
      </p>
    </>
  ),
  'requests-after-cutoff': (
    <>
      <p>After the change or cancellation deadline has passed, we may already have:</p>
      <ul>
        <li>committed ingredients;</li>
        <li>allocated production capacity;</li>
        <li>begun preparation;</li>
        <li>begun cooking;</li>
        <li>packed your products; or</li>
        <li>committed delivery resources.</li>
      </ul>
      <p>
        For that reason, we may be unable to accept a change-of-mind cancellation or amendment after
        the deadline.
      </p>
      <p>You may still contact us and we will consider what is reasonably possible.</p>
      <p>
        Agreeing to an exception on one occasion does not require us to offer the same exception for
        future orders.
      </p>
    </>
  ),
  'if-we-cancel-an-accepted-order': (
    <>
      <p>
        Very occasionally we may need to cancel an order after acceptance for a legitimate reason.
      </p>
      <p>Examples may include:</p>
      <ul>
        <li>a serious food-safety issue;</li>
        <li>critical equipment failure;</li>
        <li>unexpected loss of a key ingredient;</li>
        <li>an emergency affecting production;</li>
        <li>inability to fulfil the delivery safely; or</li>
        <li>another serious event preventing fulfilment.</li>
      </ul>
      <p>We will contact you as soon as reasonably possible.</p>
      <p>Where appropriate we may offer options such as:</p>
      <ul>
        <li>moving the order to another available cooking run; or</li>
        <li>cancelling the affected order.</li>
      </ul>
      <p>You do not have to accept an alternative cooking run.</p>
      <p>Any refund due is governed by <DocLink href="#refunds">section 30</DocLink>.</p>
    </>
  ),
  'refunds': (
    <>
      <p>This section explains when and how refunds are handled.</p>
      <LabelHeading>When a refund may be due</LabelHeading>
      <p>
        Depending on the circumstances and your legal rights, a refund may be appropriate where:
      </p>
      <ul>
        <li>an accepted order is not supplied;</li>
        <li>an item is missing;</li>
        <li>the wrong product is delivered;</li>
        <li>food arrives materially damaged;</li>
        <li>food arrives in a condition that means it is not safe to consume;</li>
        <li>the product is materially not as described;</li>
        <li>the product does not meet the legal standard of satisfactory quality;</li>
        <li>we cancel an accepted order and you do not choose an alternative; or</li>
        <li>another right to a refund arises under applicable consumer law.</li>
      </ul>
      <LabelHeading>Full and partial refunds</LabelHeading>
      <p>
        Where only part of an order is affected, the appropriate refund may relate only to the
        affected product or part of the order.
      </p>
      <p>Where the problem affects the entire order, a full refund may be appropriate.</p>
      <p>Your statutory rights determine the remedy available in each case.</p>
      <LabelHeading>Change-of-mind cancellations</LabelHeading>
      <p>Change-of-mind cancellation requests are governed by sections 26–28.</p>
      <p>
        The absence of a statutory cooling-off right for applicable perishable food does not affect
        rights arising because something has gone wrong with the product.
      </p>
      <LabelHeading>How refunds are paid</LabelHeading>
      <p>
        Where you are entitled to a monetary refund, we will normally refund the payment to the{' '}
        <strong>same payment method used for the purchase</strong>, unless you expressly agree
        otherwise.
      </p>
      <p>We will not charge a fee for providing a statutory refund.</p>
      <p>
        Your bank or payment provider may require additional time before the payment appears in your
        account.
      </p>
      <LabelHeading>Delivery charges</LabelHeading>
      <p>Whether a delivery charge is refunded will depend on:</p>
      <ul>
        <li>what part of the order is affected;</li>
        <li>what has been supplied; and</li>
        <li>your rights under applicable consumer law.</li>
      </ul>
      <p>
        Where the whole transaction must legally be refunded, we will refund any delivery amount
        required by law.
      </p>
      <LabelHeading>Store credit</LabelHeading>
      <p>We may occasionally offer:</p>
      <ul>
        <li>account credit;</li>
        <li>replacement food;</li>
        <li>another cooking date; or</li>
        <li>another resolution</li>
      </ul>
      <p>as an option.</p>
      <Note>
        You will <strong>not</strong> be required to accept store credit instead of a monetary
        refund where you are legally entitled to receive money back.
      </Note>
    </>
  ),
  'checking-your-order': (
    <>
      <p>Please inspect your delivery reasonably promptly after it arrives.</p>
      <p>Check that:</p>
      <ul>
        <li>the parcel appears intact;</li>
        <li>the products ordered are present;</li>
        <li>the correct dishes have been supplied;</li>
        <li>chilled food appears appropriately chilled; and</li>
        <li>there is no obvious indication that a product may be unsafe.</li>
      </ul>
      <Note>
        If you reasonably believe food may be unsafe,{' '}
        <strong>do not eat it to test whether it is safe</strong>.{' '}
        <SiteLink href={CONTACT_HREF}>Contact us</SiteLink>.
      </Note>
    </>
  ),
  'storage-use-by-information': (
    <>
      <p>Please follow the storage instructions supplied with each dish.</p>
      <p>
        The product label provided with your food takes precedence over general website guidance
        where the two differ.
      </p>
      <p>
        Chilled products should be placed into appropriate refrigeration promptly after receipt.
      </p>
      <p>Follow the use-by date shown on the product.</p>
      <p>Do not eat food after its use-by date.</p>
    </>
  ),
  'freezing-defrosting': (
    <>
      <p>
        Where a dish is described as suitable for freezing, follow the freezing and defrosting
        instructions provided.
      </p>
      <p>
        Our general website guidance may state that suitable dishes can be frozen on arrival for a
        specified period, but the instructions on the individual dish remain the authoritative
        instructions for that product.
      </p>
      <p>Not every dish will necessarily have the same freezing characteristics.</p>
      <p>Food should not be refrozen where the supplied instructions tell you not to do so.</p>
    </>
  ),
  'reheating': (
    <>
      <p>Follow the reheating instructions supplied for the particular dish.</p>
      <p>Food should be reheated in accordance with those instructions before consumption.</p>
      <p>
        Repeated reheating, improper defrosting or failure to store food correctly can affect both
        safety and quality.
      </p>
      <p>
        Subject to your statutory rights, we are not responsible for deterioration caused after
        delivery by a failure to follow reasonable:
      </p>
      <ul>
        <li>storage;</li>
        <li>use-by;</li>
        <li>freezing;</li>
        <li>defrosting; or</li>
        <li>reheating instructions,</li>
      </ul>
      <p>to the extent that the customer&apos;s handling caused the problem.</p>
    </>
  ),
  'product-recalls-food-safety-notices': (
    <>
      <p>
        If we identify a food-safety issue affecting a product you have purchased, we may contact
        you using the details associated with your order.
      </p>
      <p>A recall or safety notice may instruct you:</p>
      <ul>
        <li>not to consume a product;</li>
        <li>to retain it;</li>
        <li>to dispose of it;</li>
        <li>to return it through an agreed process; or</li>
        <li>to take another food-safety action.</li>
      </ul>
      <p>Please follow any safety instructions promptly.</p>
      <p>
        Any refund or other remedy arising from a recall will be dealt with in accordance with{' '}
        <DocLink href="#refunds">section 30</DocLink> and applicable law.
      </p>
    </>
  ),
  'reporting-a-problem': (
    <>
      <p>
        If there is a problem with an order, please contact us through our{' '}
        <SiteLink href={CONTACT_HREF}>Contact page</SiteLink>.
      </p>
      <p>Providing your order number helps us identify your order and respond more efficiently.</p>
      <p>Where relevant, it can also help if you provide photographs of:</p>
      <ul>
        <li>the product;</li>
        <li>its label;</li>
        <li>packaging;</li>
        <li>the delivery box; or</li>
        <li>visible damage.</li>
      </ul>
      <p>Our Contact form allows you to upload images for this purpose.</p>
      <p>
        Photographs can help us investigate, but we will not automatically refuse a valid statutory
        claim merely because you could not provide a photograph.
      </p>
      <p>We may ask for reasonable proof of purchase where necessary.</p>
    </>
  ),
  'perishable-food-complaints': (
    <>
      <p>
        Because our products are perishable, some issues are easier to investigate when reported
        quickly.
      </p>
      <p>Please contact us as soon as reasonably possible about concerns involving:</p>
      <ul>
        <li>delivery temperature;</li>
        <li>damaged packaging;</li>
        <li>food condition;</li>
        <li>missing products; or</li>
        <li>another issue apparent on delivery.</li>
      </ul>
      <p>
        For these types of issues, contacting us <strong>ideally within 24 hours</strong> can help
        us investigate what happened.
      </p>
      <p>
        This is not an absolute legal deadline and does not remove or reduce your statutory consumer
        rights.
      </p>
    </>
  ),
  'returns-food': (
    <>
      <p>
        Please do not send chilled or perishable food back to us through the post unless we
        specifically ask you to.
      </p>
      <p>Depending on the issue, we may instead ask you to:</p>
      <ul>
        <li>retain the product temporarily;</li>
        <li>keep the label or packaging;</li>
        <li>photograph it;</li>
        <li>make it available for collection; or</li>
        <li>safely dispose of it.</li>
      </ul>
      <p>We will tell you what is appropriate.</p>
      <p>
        Where the law requires Abby&apos;s Table to bear reasonable return costs for rejected goods,
        we will do so.
      </p>
    </>
  ),
  'complaints-procedure': (
    <>
      <p>We want to resolve concerns fairly and promptly.</p>
      <InfoGrid variant="outline">
        <InfoItem label="Email">
          <InfoValue>
            <CompanyEmail />
          </InfoValue>
        </InfoItem>
        <InfoItem label="Telephone">
          <InfoValue>
            <CompanyPhone link />
          </InfoValue>
        </InfoItem>
        <InfoItem label="Online" labelTone="brass">
          <InfoValue>
            <SiteLink href={CONTACT_HREF}>Contact us</SiteLink>
          </InfoValue>
        </InfoItem>
      </InfoGrid>
      <p>Please include your order number where possible.</p>
      <p>We will:</p>
      <ol>
        <li>acknowledge your complaint;</li>
        <li>review the relevant order and information;</li>
        <li>investigate what happened where necessary; and</li>
        <li>respond with our proposed resolution.</li>
      </ol>
      <p>
        If a dispute remains unresolved and a legally applicable or recognised alternative
        dispute-resolution process is available or required, we will provide the relevant
        information where appropriate.
      </p>
    </>
  ),
  'gifting-food': (
    <>
      <p>You may order Abby&apos;s Table food for another person where gifting is available.</p>
      <p>You are responsible for providing accurate recipient and delivery information.</p>
      <p>
        If you are selecting food for someone else, you should consider whether the recipient has:
      </p>
      <ul>
        <li>food allergies;</li>
        <li>intolerances;</li>
        <li>dietary restrictions; or</li>
        <li>another relevant food requirement.</li>
      </ul>
      <p>
        Allergen information will remain available before purchase and appropriate information will
        be supplied with the delivered food.
      </p>
      <p>
        Sending food to somebody does not automatically subscribe that recipient to Abby&apos;s
        Table marketing communications.
      </p>
    </>
  ),
  'gift-cards-vouchers': (
    <>
      <p>
        If Abby&apos;s Table offers monetary gift cards or vouchers, any additional conditions
        applying to them will be provided before purchase.
      </p>
      <p>These may cover:</p>
      <ul>
        <li>value;</li>
        <li>redemption;</li>
        <li>validity period;</li>
        <li>exclusions;</li>
        <li>lost or stolen codes;</li>
        <li>combination with promotions; and</li>
        <li>refund arrangements.</li>
      </ul>
      <p>Gift-card terms will not override statutory consumer rights.</p>
    </>
  ),
  'promotions-discount-codes': (
    <>
      <p>From time to time we may offer promotions or discount codes.</p>
      <p>Individual promotions may have specific conditions relating to:</p>
      <ul>
        <li>eligible products;</li>
        <li>minimum spend;</li>
        <li>qualifying customers;</li>
        <li>promotional period;</li>
        <li>number of uses;</li>
        <li>combination with other offers; and</li>
        <li>geographical or delivery restrictions.</li>
      </ul>
      <p>Unless stated otherwise, promotional codes:</p>
      <ul>
        <li>cannot be exchanged for cash;</li>
        <li>cannot be applied retrospectively to completed orders; and</li>
        <li>must be used before the stated expiry.</li>
      </ul>
      <p>
        We may refuse use of a promotion where we reasonably identify fraud, manipulation or use
        contrary to clearly stated promotional conditions.
      </p>
    </>
  ),
  'account-credits': (
    <>
      <p>
        Where we issue Abby&apos;s Table account credit, we will tell you the material conditions
        applying to that credit when it is issued.
      </p>
      <p>This may include:</p>
      <ul>
        <li>the value;</li>
        <li>how it can be redeemed;</li>
        <li>any applicable expiry;</li>
        <li>eligible products; and</li>
        <li>whether it can be combined with other credit or promotions.</li>
      </ul>
      <p>We will distinguish where appropriate between:</p>
      <ul>
        <li>promotional credit; and</li>
        <li>value that a customer has purchased or is otherwise legally entitled to.</li>
      </ul>
      <p>
        We will not introduce a previously undisclosed expiry retrospectively merely by changing
        these Terms of Sale.
      </p>
    </>
  ),
  'customer-accounts': (
    <>
      <p>If you create an Abby&apos;s Table account, you are responsible for:</p>
      <ul>
        <li>providing accurate information;</li>
        <li>keeping your login credentials reasonably secure; and</li>
        <li>contacting us if you believe somebody has gained unauthorised access.</li>
      </ul>
      <p>
        We may temporarily suspend or restrict an account where reasonably necessary because of:
      </p>
      <ul>
        <li>security concerns;</li>
        <li>suspected fraud;</li>
        <li>abusive behaviour;</li>
        <li>material misuse of our website; or</li>
        <li>another legitimate reason.</li>
      </ul>
      <p>
        Account suspension does not remove your statutory rights relating to orders already placed.
      </p>
    </>
  ),
  'private-table-waitlist': (
    <>
      <p>At launch, <strong>Abby&apos;s Private Table is coming soon</strong>.</p>
      <p>
        Joining the <SiteLink href={PRIVATE_TABLE_HREF}>Private Table</SiteLink> waitlist means that
        you are asking us to let you know when consultations or the service become available.
      </p>
      <p>Joining the waitlist:</p>
      <ul>
        <li>does not constitute the purchase of Private Table;</li>
        <li>does not create a Private Table service contract;</li>
        <li>does not guarantee acceptance into the service;</li>
        <li>does not reserve a consultation;</li>
        <li>does not guarantee a particular launch date;</li>
        <li>does not require you to purchase anything later; and</li>
        <li>is free unless we expressly state otherwise.</li>
      </ul>
      <p>Private Table will be subject to separate service terms when it launches.</p>
    </>
  ),
  'our-responsibility-to-you': (
    <>
      <p>
        We are responsible for foreseeable loss or damage caused by our failure to comply with our
        contractual obligations or by our negligence where applicable.
      </p>
      <p>Loss or damage is foreseeable if either:</p>
      <ul>
        <li>it was obvious that it would happen; or</li>
        <li>both you and we knew that it might happen when the contract was formed.</li>
      </ul>
      <p>Subject to your statutory rights, we are not responsible for loss caused solely by:</p>
      <ul>
        <li>inaccurate information you supplied;</li>
        <li>failure to follow reasonable storage or reheating instructions;</li>
        <li>mishandling of the food after delivery;</li>
        <li>another action or omission for which we were not responsible.</li>
      </ul>
      <p>
        Where an order is purchased as a consumer order, we supply it for personal and domestic use.
      </p>
      <p>We are not responsible under this consumer contract for business losses such as:</p>
      <ul>
        <li>loss of profit;</li>
        <li>loss of business;</li>
        <li>business interruption; or</li>
        <li>loss of commercial opportunity.</li>
      </ul>
    </>
  ),
  'liability-we-cannot-exclude': (
    <>
      <p>Nothing in these terms excludes or limits liability where doing so would be unlawful.</p>
      <p>In particular, nothing excludes or restricts:</p>
      <ul>
        <li>your statutory rights as a consumer;</li>
        <li>liability for death or personal injury caused by negligence;</li>
        <li>liability for fraud or fraudulent misrepresentation;</li>
        <li>
          responsibility for goods that are faulty or materially not as described where liability
          cannot lawfully be excluded; or
        </li>
        <li>another liability that the law does not permit us to exclude.</li>
      </ul>
    </>
  ),
  'personal-information': (
    <>
      <p>We use personal information in accordance with our Privacy Policy.</p>
      <p>Information used to fulfil an order may include:</p>
      <ul>
        <li>your name;</li>
        <li>email address;</li>
        <li>telephone number;</li>
        <li>delivery address;</li>
        <li>order history;</li>
        <li>payment-related transaction information; and</li>
        <li>information you choose to provide when contacting us.</li>
      </ul>
      <p>Agreeing to these Terms of Sale does not constitute consent to unrelated marketing.</p>
      <p>Where consent is required for marketing, it will be requested separately.</p>
    </>
  ),
  'images-you-upload': (
    <>
      <p>
        If you upload photographs or other images when contacting us, please only provide material:
      </p>
      <ul>
        <li>relevant to your enquiry; and</li>
        <li>that you have the right to provide.</li>
      </ul>
      <p>We may use those images where reasonably necessary to:</p>
      <ul>
        <li>investigate your enquiry;</li>
        <li>resolve a complaint;</li>
        <li>assess product condition;</li>
        <li>review packaging or delivery performance;</li>
        <li>investigate a food-safety issue;</li>
        <li>maintain appropriate records; or</li>
        <li>comply with a legal obligation.</li>
      </ul>
      <p>
        Submitting a complaint image does not give Abby&apos;s Table an unrestricted right to use it
        in advertising or marketing.
      </p>
    </>
  ),
  'changes-to-these-terms': (
    <>
      <p>We may update these terms from time to time.</p>
      <p>The updated version will apply to future orders from the date it takes effect.</p>
      <p>
        The Terms of Sale applying to an existing accepted order will generally be the version in
        effect when the relevant contract was formed.
      </p>
      <p>
        We will not rely on a later website update to retrospectively remove contractual or
        statutory rights relating to an existing order.
      </p>
      <p>
        The <strong>Last updated</strong> date at the top of this page identifies the current
        version.
      </p>
    </>
  ),
  'severability': (
    <>
      <p>Each section of these Terms of Sale operates separately.</p>
      <p>
        If a court or competent authority determines that a particular provision is unlawful or
        unenforceable, the remaining provisions will continue to apply so far as legally possible.
      </p>
    </>
  ),
  'delay-in-enforcing-a-right': (
    <>
      <p>
        If we do not immediately enforce a provision of these terms, this does not necessarily mean
        that we have permanently waived the relevant right.
      </p>
      <p>
        Likewise, allowing an exception on one occasion does not automatically change these terms
        for future orders.
      </p>
      <p>Nothing in this section limits a consumer right that cannot legally be waived.</p>
    </>
  ),
  'transferring-rights-obligations': (
    <>
      <p>
        We will not transfer our rights or obligations under your contract in a way that materially
        reduces your consumer protections without complying with applicable law.
      </p>
      <p>
        You may not transfer an order to another person where doing so would materially interfere
        with our ability to fulfil it unless we agree to the change.
      </p>
      <p>
        This does not prevent you from ordering food as a gift in accordance with{' '}
        <DocLink href="#gifting-food">section 40</DocLink>.
      </p>
    </>
  ),
  'third-party-rights': (
    <>
      <p>
        Unless these terms expressly state otherwise, the contract is between you and Abby&apos;s
        Table.
      </p>
      <p>
        A person who is not a party to the contract does not have a contractual right to enforce
        these terms merely because they benefit from the order, except where applicable law provides
        otherwise.
      </p>
    </>
  ),
  'governing-law-jurisdiction': (
    <>
      <p>These Terms of Sale are governed by the law of <strong>England and Wales</strong>.</p>
      <p>
        If you are a consumer who lives in Scotland, Northern Ireland or another jurisdiction where
        mandatory consumer protections apply, you retain any protections that cannot lawfully be
        excluded.
      </p>
      <p>
        Nothing in these terms is intended to prevent a consumer from bringing proceedings in a
        court available to them under applicable consumer law.
      </p>
    </>
  ),
  'how-to-contact-us': (
    <>
      <p>If you have a question about:</p>
      <ul>
        <li>these Terms of Sale;</li>
        <li>an order;</li>
        <li>delivery;</li>
        <li>allergens;</li>
        <li>a refund; or</li>
        <li>another Abby&apos;s Table matter,</li>
      </ul>
      <p>please <SiteLink href={CONTACT_HREF}>contact us</SiteLink>.</p>
      <RegisteredAddress />
      <p>
        Our current opening hours are available on our{' '}
        <SiteLink href={CONTACT_HREF}>Contact Us</SiteLink> page and are stated in UK time.
      </p>
    </>
  ),
};

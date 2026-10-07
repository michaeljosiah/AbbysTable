import type { ReactNode } from 'react';

import {
  CompanyEmail,
  CompanyName,
  CompanyNumber,
  CompanyPhone,
  CookiePreferences,
  DefinitionList,
  DocLink,
  InfoGrid,
  InfoItem,
  InfoValue,
  MinorHead,
  OutlineLinkCta,
  PaymentProvider,
  PendingPanel,
  RegisteredOffice,
  Row,
  SiteLink,
  Subhead,
  Tbc,
} from '@/components/legal/prose';
import { CONTACT_HREF, TERMS_ITEM } from '@/lib/content/navigation';
import type { PrivacySlug } from '@/lib/legal/privacy';

/*
 * Privacy Policy — the 11 section bodies, keyed by slug, and the unnumbered
 * closing section. Titles, numbers and groups come from `@/lib/legal/privacy`.
 *
 * COPY IS VERBATIM from design/Abby's Table - Privacy Policy.dc.html: the
 * client's draft, not yet legally reviewed (build-handoff.md, open items;
 * #38). Do not reword it here.
 *
 * The 21 "to be confirmed" items stay VISIBLE until production values exist
 * (build-handoff.md §3q, "Launch checklist"; #38): 20 dotted-underline marks —
 * the seven service providers, the named payment provider, the waitlist
 * unsubscribe method, the advertising providers, nine retention periods and the
 * international-transfer providers — and section 7's cookie list, a "not yet
 * published" panel until the cookie audit is done. The payment provider is the
 * one Terms of Sale names too, so it is read from `@/lib/content/company`
 * (`PaymentProvider`) like the company details, which are marked the same way
 * while they are unset. Fill the rest in here, in the copy.
 */

export const PRIVACY_SECTIONS: Record<PrivacySlug, ReactNode> = {
  'who-we-are': (
    <>
      <p>
        Abby’s Table is a trading name of <CompanyName />, a company registered in England and
        Wales.
      </p>
      <InfoGrid variant="plain">
        <InfoItem label="Registered office">
          <InfoValue>
            <RegisteredOffice inline />
          </InfoValue>
        </InfoItem>
        <InfoItem label="Company number">
          <InfoValue>
            <CompanyNumber />
          </InfoValue>
        </InfoItem>
      </InfoGrid>
      <p>
        For data-protection purposes, <CompanyName /> is responsible for the personal information
        described in this policy.
      </p>
      <p>If you have a question about your personal information, you can contact us at:</p>
      <InfoGrid variant="plain">
        <InfoItem label="Email">
          <InfoValue>
            <CompanyEmail />
          </InfoValue>
        </InfoItem>
        <InfoItem label="Telephone">
          <InfoValue>
            <CompanyPhone />
          </InfoValue>
        </InfoItem>
      </InfoGrid>
      <p>Written enquiries can be sent to our registered office above.</p>
    </>
  ),
  'what-information-we-collect': (
    <>
      <p>The information we collect depends on how you use Abby’s Table.</p>
      <Subhead>When you place an order or create an account</Subhead>
      <p>We may collect:</p>
      <ul>
        <li>your name;</li>
        <li>email address;</li>
        <li>telephone number;</li>
        <li>billing and delivery address;</li>
        <li>delivery instructions;</li>
        <li>account details;</li>
        <li>order history;</li>
        <li>dishes, quantities and portion choices;</li>
        <li>payment and refund status; and</li>
        <li>credits, promotions or other account information.</li>
      </ul>
      <Subhead>When you contact us</Subhead>
      <p>We may collect:</p>
      <ul>
        <li>your contact details;</li>
        <li>your order number;</li>
        <li>your message;</li>
        <li>our correspondence with you;</li>
        <li>complaint or customer-service information; and</li>
        <li>images you choose to upload.</li>
      </ul>
      <Subhead>When you use our website</Subhead>
      <p>We may collect information such as:</p>
      <ul>
        <li>IP address;</li>
        <li>browser and device information;</li>
        <li>account and security activity;</li>
        <li>pages viewed and interactions with the website;</li>
        <li>cookie and similar technology identifiers;</li>
        <li>analytics information; and</li>
        <li>
          advertising or attribution information where those technologies are used and permitted.
        </li>
      </ul>
      <Subhead>If someone sends you a gift</Subhead>
      <p>The person placing the order may provide us with information such as your:</p>
      <ul>
        <li>name;</li>
        <li>delivery address;</li>
        <li>telephone number; and</li>
        <li>delivery instructions.</li>
      </ul>
      <p>We use this information to fulfil and support the gift order.</p>
      <p>
        Receiving an Abby’s Table gift does <strong>not</strong> automatically subscribe you to our
        marketing.
      </p>
      <Subhead>Allergies and dietary information</Subhead>
      <p>
        You may also choose to provide information about allergies, intolerances, dietary
        requirements or other health-related information where it is relevant to your order or
        enquiry.
      </p>
      <p>
        We explain how we handle this more sensitive information in{' '}
        <DocLink href="#allergies-sensitive-information">section 4</DocLink>.
      </p>
    </>
  ),
  'how-and-why-we-use-your-information': (
    <>
      <p>We only use personal information where we have a lawful reason to do so.</p>
      <DefinitionList head={['We use your information to', 'Our usual legal reason']}>
        <Row term="Take and fulfil your order">Contract</Row>
        <Row term="Process payments and refunds">Contract and/or legal obligations</Row>
        <Row term="Arrange delivery">Contract</Row>
        <Row term="Manage your Abby’s Table account">Contract</Row>
        <Row term="Send order and delivery updates">Contract</Row>
        <Row term="Respond to enquiries and complaints">Contract and/or legitimate interests</Row>
        <Row term="Manage food safety, traceability and recalls">
          Legal obligations and/or legitimate interests
        </Row>
        <Row term="Keep tax and accounting records">Legal obligation</Row>
        <Row term="Prevent fraud and protect our website">Legitimate interests</Row>
        <Row term="Improve customer service and operations">Legitimate interests</Row>
        <Row term="Send marketing you have chosen to receive">
          Consent or another lawful route where applicable
        </Row>
        <Row term="Manage the Private Table waitlist">Consent</Row>
        <Row term="Use analytics, advertising or similar technologies">Consent where required</Row>
      </DefinitionList>
      <p>
        Where we rely on <strong>legitimate interests</strong>, these may include protecting Abby’s
        Table and our customers from fraud, keeping our website secure, investigating service
        problems, improving our operations and protecting our legal rights.
      </p>
      <p>
        Some information is necessary for us to provide a service. For example, we cannot normally
        deliver an order without your name, contact details and delivery address.
      </p>
      <p>Where information is optional, we aim to make that clear when we ask for it.</p>
    </>
  ),
  'allergies-sensitive-information': (
    <>
      <p>
        Information about a person’s health may receive additional protection under UK
        data-protection law.
      </p>
      <p>This can include some information relating to:</p>
      <ul>
        <li>allergies;</li>
        <li>intolerances;</li>
        <li>medical dietary requirements; or</li>
        <li>other health-related information.</li>
      </ul>
      <p>We only use this type of information where:</p>
      <ul>
        <li>there is a genuine reason for us to need it;</li>
        <li>we have an appropriate legal basis;</li>
        <li>any additional legal condition required for sensitive information applies; and</li>
        <li>access is limited to people who reasonably need it.</li>
      </ul>
      <p>
        Where we rely on your <strong>explicit consent</strong>, we will ask for that consent
        clearly and separately.
      </p>
      <Subhead>General enquiries</Subhead>
      <p>Our ordinary Contact form is not intended for detailed medical histories.</p>
      <p>
        If you voluntarily provide health information that is relevant to your enquiry, we will only
        use it where lawful and reasonably necessary to deal with that enquiry.
      </p>
      <Subhead>Private Table</Subhead>
      <p>
        At launch, the Private Table waitlist will{' '}
        <strong>not ask you for detailed medical or health information</strong>.
      </p>
      <p>
        If Private Table later requires health-related information as part of a consultation, we
        will provide additional privacy information at the point that information is collected.
      </p>
    </>
  ),
  'who-we-share-information-with': (
    <>
      <p>
        We may share personal information with organisations that help us provide Abby’s Table
        services.
      </p>
      <p>These may include:</p>
      <DefinitionList head={['Service', 'Provider']}>
        <Row term="Payments">
          <PaymentProvider />
        </Row>
        <Row term="Delivery"><Tbc /></Row>
        <Row term="Website and hosting"><Tbc /></Row>
        <Row term="Email and customer communications"><Tbc /></Row>
        <Row term="Analytics"><Tbc />, where permitted</Row>
        <Row term="Advertising and measurement"><Tbc />, where permitted</Row>
        <Row term="Fraud and security"><Tbc /></Row>
      </DefinitionList>
      <p>We may also share information where appropriate with:</p>
      <ul>
        <li>accountants;</li>
        <li>solicitors;</li>
        <li>insurers;</li>
        <li>auditors;</li>
        <li>food-safety authorities;</li>
        <li>HMRC;</li>
        <li>courts;</li>
        <li>law-enforcement agencies; and</li>
        <li>regulators or other public authorities where required.</li>
      </ul>
      <p>We only share information that is reasonably necessary for the relevant purpose.</p>
      <Subhead>Payments</Subhead>
      <p>Payments are processed by our payment provider, <PaymentProvider />.</p>
      <p>
        Where payment details are entered directly into the payment provider’s system, Abby’s Table
        does not receive or store your complete payment-card number.
      </p>
      <Subhead>Customer-service images</Subhead>
      <p>
        If you upload an image to help us investigate an enquiry or complaint, we may use it to
        assess matters such as food condition, packaging, delivery or product quality.
      </p>
      <p>
        Uploading an image for customer service does <strong>not</strong> give Abby’s Table a
        general right to use that image for advertising or social media.
      </p>
      <Subhead>We do not sell your information</Subhead>
      <p>
        <strong>
          Abby’s Table does not sell your personal information to advertisers or data brokers.
        </strong>
      </p>
    </>
  ),
  'marketing-and-private-table': (
    <>
      <Subhead>Marketing</Subhead>
      <p>If you choose to receive Abby’s Table marketing, we may send you information about:</p>
      <ul>
        <li>new dishes;</li>
        <li>menu launches;</li>
        <li>offers;</li>
        <li>events;</li>
        <li>gifting;</li>
        <li>Abby’s Table news; and</li>
        <li>other relevant products or services.</li>
      </ul>
      <p>At launch, we intend to use a clear, unticked opt-in for general marketing.</p>
      <p>
        You can unsubscribe at any time using the unsubscribe link in a marketing email or by
        contacting us.
      </p>
      <p>Marketing is separate from:</p>
      <ul>
        <li>placing an order;</li>
        <li>accepting our <SiteLink href={TERMS_ITEM.href}>Terms</SiteLink>;</li>
        <li>receiving transactional order messages;</li>
        <li>receiving a gift; and</li>
        <li>joining the Private Table waitlist.</li>
      </ul>
      <p>
        Unsubscribing from marketing does not prevent us from contacting you about an order,
        delivery, payment, refund, food-safety issue or other service matter.
      </p>
      <Subhead>Private Table waitlist</Subhead>
      <p>If you join the Private Table waitlist, we use your information to:</p>
      <ul>
        <li>manage the waitlist; and</li>
        <li>let you know when Private Table consultations or availability open.</li>
      </ul>
      <p>
        Joining the waitlist does <strong>not</strong> automatically subscribe you to general Abby’s
        Table marketing.
      </p>
      <p>
        You can leave the waitlist at any time using the unsubscribe method stated in our waitlist
        emails (<Tbc />) or by contacting us.
      </p>
    </>
  ),
  'cookies': (
    <>
      <p>
        Abby’s Table uses cookies and similar technologies to operate our website, keep it secure,
        remember certain choices and, where you allow us, understand how the website is used and
        measure our marketing.
      </p>
      <p>
        A cookie is a small piece of information stored on your device when you visit a website.
      </p>
      <p>We may also use similar technologies, such as pixels, tags, scripts or browser storage.</p>
      <Subhead>The types of cookies we use</Subhead>
      <MinorHead>Essential</MinorHead>
      <p>These are used where necessary for the website to work properly.</p>
      <p>They may support functions such as:</p>
      <ul>
        <li>website security;</li>
        <li>login and account access;</li>
        <li>your basket;</li>
        <li>checkout;</li>
        <li>fraud prevention;</li>
        <li>remembering your cookie choices; and</li>
        <li>other essential site functions.</li>
      </ul>
      <p>
        Where these technologies are strictly necessary for the service you have requested, they may
        be used without asking for consent.
      </p>
      <MinorHead>Preferences</MinorHead>
      <p>
        These may remember optional choices you make so that we can provide a more personalised or
        convenient experience.
      </p>
      <p>Where consent is required, we will only use them after you have made that choice.</p>
      <MinorHead>Analytics</MinorHead>
      <p>Analytics technologies help us understand how customers use Abby’s Table.</p>
      <p>For example, they may help us understand:</p>
      <ul>
        <li>which pages are visited;</li>
        <li>how customers navigate the website;</li>
        <li>whether parts of the site are difficult to use; and</li>
        <li>how the website performs.</li>
      </ul>
      <p>
        Where consent is required, analytics technologies will not be used until you have agreed to
        them.
      </p>
      <MinorHead>Advertising and measurement</MinorHead>
      <p>Where used, advertising technologies may help us:</p>
      <ul>
        <li>understand whether an advert led to a visit or purchase;</li>
        <li>measure the effectiveness of advertising campaigns;</li>
        <li>limit unnecessary advertising; or</li>
        <li>personalise advertising where permitted.</li>
      </ul>
      <p>These technologies may be provided by third parties (<Tbc />).</p>
      <p>Where consent is required, they will not be used unless you have agreed to them.</p>
      <Subhead>Cookies and services we use</Subhead>
      {/* The cookie table is deliberately NOT rendered: a table of placeholders is furniture.
          Replace this panel with the real audit before launch — every cookie and similar
          technology actually running, with provider, purpose, category and duration (#38). */}
      <PendingPanel title="This list is not yet published">
        <p>
          Before launch we will publish each cookie and similar technology actually running on this
          website, with its provider, purpose, category and duration.
        </p>
        <p>We will not list technologies that Abby’s Table does not use.</p>
      </PendingPanel>
      <Subhead>Third-party cookies</Subhead>
      <p>Some technologies may be provided by other organisations, for example our:</p>
      <ul>
        <li>analytics provider;</li>
        <li>payment provider;</li>
        <li>advertising platforms;</li>
        <li>embedded service providers; or</li>
        <li>other technology partners.</li>
      </ul>
      <p>
        Where another organisation receives information through its own technologies, its use of
        that information may also be governed by its own privacy information.
      </p>
      <Subhead>Your cookie choices</Subhead>
      <p>
        When you first visit Abby’s Table, our cookie banner lets you make choices about cookies and
        similar technologies that require consent.
      </p>
      <p>You may be able to:</p>
      <ul>
        <li>accept optional cookies;</li>
        <li>reject optional cookies; or</li>
        <li>choose individual categories.</li>
      </ul>
      <p>
        <strong>
          Essential cookies cannot normally be disabled through our cookie controls because they are
          required for core website functions.
        </strong>
      </p>
      <CookiePreferences />
      <p>
        Changing your preferences does not affect the lawfulness of processing that took place
        before you changed them.
      </p>
      <p>
        Your browser may also allow you to block or delete cookies. However, blocking essential
        technologies may prevent parts of the Abby’s Table website from working correctly.
      </p>
    </>
  ),
  'how-long-we-keep-your-information': (
    <>
      <p>We keep personal information only for as long as it is reasonably needed.</p>
      <p>The period depends on things such as:</p>
      <ul>
        <li>why we collected it;</li>
        <li>tax and accounting requirements;</li>
        <li>food-safety and traceability obligations;</li>
        <li>complaint or insurance requirements;</li>
        <li>fraud prevention;</li>
        <li>legal claims; and</li>
        <li>whether you still have an active relationship with Abby’s Table.</li>
      </ul>
      <p>Our expected retention periods are:</p>
      <DefinitionList head={['Information', 'Typical retention']}>
        <Row term="Orders and accounting records"><Tbc /></Row>
        <Row term="Customer account information">While active, then <Tbc /></Row>
        <Row term="Customer enquiries"><Tbc /> after resolution</Row>
        <Row term="Complaint records"><Tbc /></Row>
        <Row term="Complaint images"><Tbc />, unless needed for an ongoing matter</Row>
        <Row term="Food-safety and recall records"><Tbc /></Row>
        <Row term="Refund records"><Tbc /></Row>
        <Row term="Private Table waitlist">Until you ask to leave, or <Tbc /></Row>
        <Row term="Marketing preferences">
          Until you opt out, or as needed to honour your choice
        </Row>
        <Row term="Security logs"><Tbc /></Row>
        <Row term="Cookies and similar technologies">
          As stated in <DocLink href="#cookies">section 7</DocLink>
        </Row>
      </DefinitionList>
      <p>
        We may keep particular information for longer where this is necessary to comply with the
        law, manage a food-safety matter, prevent fraud or establish or defend a legal claim.
      </p>
      <p>
        When information is no longer needed, we delete, anonymise or otherwise dispose of it
        appropriately.
      </p>
    </>
  ),
  'your-rights': (
    <>
      <p>Depending on the circumstances, you may have the right to:</p>
      <DefinitionList head={['Right', 'What it means']}>
        <Row term="Access">Ask for a copy of personal information we hold about you.</Row>
        <Row term="Correct">Ask us to correct inaccurate or incomplete information.</Row>
        <Row term="Delete">Ask us to delete information where the law gives you that right.</Row>
        <Row term="Restrict">Ask us to limit how we use certain information.</Row>
        <Row term="Data portability">
          Ask to receive certain information in a reusable electronic format.
        </Row>
        <Row term="Object">Object to certain uses of your information.</Row>
        <Row term="Withdraw consent">Withdraw consent where we rely on consent.</Row>
      </DefinitionList>
      <p>Withdrawing consent does not make earlier lawful use of your information unlawful.</p>
      <Subhead>Your right to object to marketing</Subhead>
      <p>
        <strong>
          You can object to the use of your personal information for direct marketing at any time.
        </strong>
      </p>
      <p>If you do, we will stop using your information for that purpose.</p>
      <p>You may also have a right to object where we rely on legitimate interests.</p>
      <p>
        To exercise any of your privacy rights, email{' '}
        <CompanyEmail pending="address to be confirmed" /> or use our{' '}
        <SiteLink href={CONTACT_HREF}>contact form</SiteLink>.
      </p>
      <p>We may ask for reasonable information to confirm your identity.</p>
      <Subhead>Closing your account</Subhead>
      <p>You can ask us to close your Abby’s Table account.</p>
      <p>Closing your account does not always mean that every record can immediately be deleted.</p>
      <p>For example, we may need to keep records relating to:</p>
      <ul>
        <li>previous orders;</li>
        <li>tax and accounting;</li>
        <li>refunds;</li>
        <li>food safety;</li>
        <li>product recalls;</li>
        <li>fraud prevention;</li>
        <li>complaints; or</li>
        <li>legal claims.</li>
      </ul>
      <p>Any information we retain will continue to be handled in accordance with this policy.</p>
    </>
  ),
  'security-and-international-transfers': (
    <>
      <Subhead>Keeping your information secure</Subhead>
      <p>
        We use appropriate technical and organisational measures designed to protect personal
        information from:
      </p>
      <ul>
        <li>loss;</li>
        <li>misuse;</li>
        <li>unauthorised access;</li>
        <li>alteration; and</li>
        <li>unlawful disclosure.</li>
      </ul>
      <p>
        These measures may include appropriate access controls, secure service providers,
        authentication, encryption, monitoring and staff procedures.
      </p>
      <p>
        No online system can be guaranteed to be completely secure, but we review the safeguards
        appropriate to the information we hold.
      </p>
      <Subhead>International transfers</Subhead>
      <p>
        Some organisations that provide services to Abby’s Table may process information outside the
        United Kingdom.
      </p>
      <p>
        Where UK data-protection law requires safeguards for an international transfer, we use an
        appropriate legal mechanism.
      </p>
      <p>This may include:</p>
      <ul>
        <li>a UK adequacy arrangement;</li>
        <li>approved contractual safeguards; or</li>
        <li>another legally permitted mechanism.</li>
      </ul>
      <p>
        The providers involved and the safeguards that apply to them are{' '}
        <Tbc>to be confirmed before launch</Tbc>.
      </p>
      <p>
        You can contact us if you would like more information about the safeguards relating to a
        particular transfer.
      </p>
    </>
  ),
  'questions-and-complaints': (
    <>
      <p>
        If you have a question, concern or complaint about how Abby’s Table uses your personal
        information, please contact us.
      </p>
      <InfoGrid variant="plain">
        <InfoItem label="Email">
          <InfoValue>
            <CompanyEmail />
          </InfoValue>
        </InfoItem>
        <InfoItem label="Telephone">
          <InfoValue>
            <CompanyPhone />
          </InfoValue>
        </InfoItem>
        <InfoItem label="Online">
          <InfoValue>
            <SiteLink href={CONTACT_HREF}>Our contact form</SiteLink>
          </InfoValue>
        </InfoItem>
        <InfoItem label="Post">
          <InfoValue>
            <RegisteredOffice inline />
          </InfoValue>
        </InfoItem>
      </InfoGrid>
      <p>
        We will investigate privacy complaints and respond within the timescales required by law.
      </p>
      <p>
        You also have the right to complain to the{' '}
        <strong>Information Commissioner’s Office (ICO)</strong>, the UK’s independent
        data-protection regulator.
      </p>
      <p>Contacting Abby’s Table first does not affect your right to contact the ICO.</p>
      <OutlineLinkCta href="https://ico.org.uk">Contact the ICO</OutlineLinkCta>
    </>
  ),
};

/** The closing "Changes to this Privacy Policy": about the document, so unnumbered and unindexed. */
export const PRIVACY_CLOSING = {
  group: 'About this policy',
  title: 'Changes to this Privacy Policy',
  body: (
    <>
      <p>
        We may update this Privacy Policy as Abby’s Table, our technology or legal requirements
        change.
      </p>
      <p>
        When we do, we will update the <strong>Last updated</strong> date at the top of this page.
      </p>
      <p>
        Where a change materially affects how we use existing personal information, we will take
        reasonable steps to bring that change to the attention of affected customers where required.
      </p>
    </>
  ),
};

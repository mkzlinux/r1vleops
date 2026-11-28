import { COMPANY } from "../catalog";
import type { LegalDoc } from "./types";

export const TERMS: LegalDoc = {
  id: "terms",
  title: "Terms and Conditions",
  version: "2026-11-28",
  effective: "28 November 2026",
  summary: "How quotes, deposits, delivery, refunds, ownership and liability work when you hire R1VLE.",
  intro: [
    `These terms apply to every quote, invoice, order and project between ${COMPANY.name}, a technology studio based in Harare, Zimbabwe ("R1VLE", "we", "us"), and you, the client ("you"). By placing an order, accepting a quote, paying an invoice or ticking "I agree", you accept these terms. If you accept on behalf of a company, you confirm you have authority to bind it.`,
    "If a signed proposal or statement of work says something different from these terms, the signed document wins for that project.",
  ],
  sections: [
    {
      heading: "1. Quotes, prices and negotiation",
      body: [
        "Prices are in US dollars. Zimbabwe prices apply to clients located in Zimbabwe, decided from your network location when you order. If we find a project was priced for the wrong region, we will tell you before work starts and you may cancel for a full refund.",
        "Quotes and counter-offers are valid for 14 days unless they say otherwise. A quote becomes binding when you accept it and the deposit invoice is created.",
        "Prices cover the scope listed on the invoice and in your brief. Anything else is a change (see section 3).",
      ],
    },
    {
      heading: "2. Payment",
      body: [
        `Work starts after we receive a ${COMPANY.depositPct}% deposit. The balance is due before final files, source code, credentials or reports are handed over. Retainers are billed monthly in advance.`,
        "We accept Paynow (EcoCash, OneMoney, InnBucks and cards) and USDC on the networks shown at checkout. You pay any fees your payment provider or network charges.",
        "For USDC, send the exact amount shown, on the network shown, to the address shown. Funds sent on another network, to another address or as another token may be unrecoverable; we will help where we can but cannot guarantee recovery.",
        "Invoices are due within 7 days. If a balance is more than 14 days overdue we may pause the work and withhold deliverables until it is paid.",
      ],
    },
    {
      heading: "3. Scope, changes and delays",
      body: [
        "If you want to add to or change the scope, we will quote the change. It becomes part of the project once you accept it in writing (email, WhatsApp or the ticket page is enough).",
        "Timelines are estimates and start when we have the deposit and everything we need from you. Delays in your feedback, content or access move the timeline by at least the same amount.",
        "If we hear nothing from you for 30 days, we may pause the project. After 60 days of silence we may close it; the deposit pays for work done and a restart is quoted as new work.",
      ],
    },
    {
      heading: "4. Your responsibilities",
      body: [
        [
          "Give us accurate information and timely feedback.",
          "Supply content, brand assets, accounts and access we need, and make sure you have the right to let us use them.",
          "Keep your own backups of systems and data we work on.",
          "Use what we deliver lawfully.",
        ],
      ],
    },
    {
      heading: "5. Delivery, revisions and acceptance",
      body: [
        "Creative work includes two rounds of revisions on the agreed concept unless your invoice says otherwise. Further rounds, or a new concept, are billed as changes.",
        "You have 5 working days after delivery to tell us about anything that doesn't match the agreed scope. If you don't, or once you use the work in production, it is treated as accepted.",
        "Software is delivered with a 30-day fix period for defects against the agreed scope. New features, third-party changes and issues caused by others' edits are not defects.",
      ],
    },
    {
      heading: "6. Cancellation and refunds",
      body: [
        "Before work starts: cancel any time for a full refund of the deposit, less payment fees we can't recover.",
        "After work starts: the deposit is not refundable, because it pays for time already reserved and spent. If you cancel, you pay for work done beyond the deposit, and you receive the work paid for.",
        "If we don't start within 14 days of receiving your deposit and everything we need from you, you may cancel for a full refund.",
        "If we cancel for reasons on our side, we refund everything you paid for work not delivered.",
        "Refunds go back by the method you paid with where possible. USDC refunds are sent in USDC to an address you give us.",
      ],
    },
    {
      heading: "7. Ownership and licences",
      body: [
        "Once you have paid in full, you own the final deliverables made specifically for you: designs, footage edits, documents and project code.",
        "We keep ownership of our pre-existing tools, libraries, templates, methods and know-how. Where they are part of a deliverable, you get a permanent, non-exclusive licence to use them as part of that deliverable.",
        "Third-party items (fonts, stock media, open-source software, plugins) stay under their own licences. We'll tell you if any need a paid licence in your name.",
        "Until full payment, everything we produce remains ours and you may not use it.",
        "We may show non-confidential work in our portfolio, unless you ask us not to or a signed NDA covers it.",
      ],
    },
    {
      heading: "8. Security services",
      body: [
        "We only test systems after you sign an Authorization to Test that names what is in scope. We do not test anything outside that scope.",
        "You confirm you own the systems in scope or have the owner's written permission, including any hosting or cloud provider whose policies require notice.",
        "Testing finds weaknesses that exist at the time and within the scope tested. No assessment can find every vulnerability, and a report is not a guarantee that a system is secure.",
        "Testing can cause slowdowns or outages despite care. We avoid destructive techniques unless you approve them in writing. Back up before testing begins.",
        "Findings, evidence and reports are confidential and handled under section 9.",
      ],
    },
    {
      heading: "9. Confidentiality",
      body: [
        "Each of us keeps the other's non-public information confidential and uses it only for the project. This doesn't cover information that is public, already known, independently developed, or that the law requires to be disclosed. A signed NDA, where there is one, takes priority.",
      ],
    },
    {
      heading: "10. Tools, team and subcontractors",
      body: [
        "We may use software tools, including AI-assisted tools, and trusted subcontractors under our supervision. We stay responsible for their work and they are bound by confidentiality. We don't put your confidential material into tools that train on it.",
      ],
    },
    {
      heading: "11. Warranties and liability",
      body: [
        "We do the work with reasonable skill and care. Apart from what these terms say, the work is provided without other warranties, including fitness for a particular purpose or uninterrupted, error-free operation.",
        "Our total liability for any project is limited to the fees you paid for that project in the 12 months before the claim.",
        "Neither of us is liable for indirect or consequential loss, such as lost profit, revenue, data or goodwill.",
        "Nothing in these terms limits liability that cannot be limited by law, including for fraud or wilful misconduct.",
        "You are responsible for claims that arise from materials you supplied or from your instructions, including testing systems you weren't entitled to authorise.",
      ],
    },
    {
      heading: "12. Things outside our control",
      body: [
        "Neither of us is responsible for delays caused by events outside reasonable control, such as power or network outages, natural disasters, government action or provider failures. The affected party tells the other promptly and the timeline moves accordingly.",
      ],
    },
    {
      heading: "13. Law and disputes",
      body: [
        "These terms are governed by the laws of Zimbabwe. We'll first try to settle any dispute by talking in good faith for 30 days. If that fails, the courts of Zimbabwe sitting in Harare have jurisdiction, unless we both agree to mediation or arbitration.",
        "Electronic acceptance, typed signatures and records kept on this site are valid evidence of agreement.",
      ],
    },
    {
      heading: "14. General",
      body: [
        "We may update these terms. Changes apply to orders placed after the new version is published; your current project stays on the version you accepted.",
        "If any part of these terms is unenforceable, the rest still applies. Not enforcing a right straight away doesn't waive it.",
        `Questions: ${COMPANY.email} or WhatsApp ${COMPANY.phoneDisplay}.`,
      ],
    },
  ],
};

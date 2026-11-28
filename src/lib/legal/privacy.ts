import { COMPANY } from "../catalog";
import type { LegalDoc } from "./types";

export const PRIVACY: LegalDoc = {
  id: "privacy",
  title: "Privacy Policy",
  version: "2026-11-28",
  effective: "28 November 2026",
  summary: "What we collect, why, who processes it, how long we keep it, and your rights under Zimbabwe's Cyber and Data Protection Act.",
  intro: [
    `${COMPANY.name} ("we") is the controller of the personal information you give us through this site, WhatsApp and email. We handle it in line with the Cyber and Data Protection Act [Chapter 12:07] of Zimbabwe and, for clients elsewhere, the main principles of laws such as the GDPR.`,
  ],
  sections: [
    {
      heading: "1. What we collect",
      body: [
        [
          "Contact details: name, company, email and WhatsApp number.",
          "Project details: briefs, requests, messages, files you upload, quotes and invoices.",
          "Payment records: amounts, status and references. Card and mobile-money details are entered with Paynow, not on our site, and we never see them. For USDC we record the network and the public transaction hash.",
          "Signed agreements: what you typed into the form, the time, your IP address and browser details, kept as evidence of signing.",
          "Technical data: the country your connection comes from (to show the right prices) and a short-lived record of your IP address for rate limiting and abuse prevention.",
        ],
      ],
    },
    {
      heading: "2. Why we use it",
      body: [
        [
          "To quote, invoice, deliver and support your project (performing our contract with you).",
          "To take and confirm payments, and keep accounting records (legal obligation).",
          "To protect the site and our clients from fraud and attacks (legitimate interest).",
          "To keep proof of agreements you sign (legitimate interest and legal claims).",
        ],
        "We don't sell your information, use it for advertising, or send marketing without your consent.",
      ],
    },
    {
      heading: "3. Who processes it for us",
      body: [
        [
          "Vercel Inc. (website hosting, United States).",
          "Cloudflare Inc. (database and file storage).",
          "Paynow Zimbabwe (payments you make through Paynow).",
          "WhatsApp and our email provider (messages you send us).",
          "Public blockchain networks (USDC transactions are public by design).",
        ],
        "Some of these providers store data outside Zimbabwe. We use providers with recognised security standards and contractual safeguards, and share only what each needs.",
        "We may disclose information when the law requires it or to protect our legal rights.",
      ],
    },
    {
      heading: "4. On your device",
      body: [
        "This site stores your contact details, bucket and tracking codes in your browser's local storage so you don't retype them. You can clear them by clearing site data. We don't use advertising or analytics cookies. The operator sign-in uses one secure cookie, only for our staff.",
      ],
    },
    {
      heading: "5. How long we keep it",
      body: [
        [
          "Invoices, payments and order records: at least 6 years, for tax and accounting.",
          "Signed agreements: for as long as the agreement applies and 6 years after.",
          "Project files you upload: up to 12 months after the project closes, unless you ask us to delete them sooner or we agree otherwise.",
          "Rate-limit records: a few hours.",
        ],
      ],
    },
    {
      heading: "6. Security",
      body: [
        "Data is encrypted in transit, files are stored privately and shared only through short-lived links, operator access is protected by passwords and two-step verification, and requests are rate-limited. No system is perfectly secure; if a breach affects your information, we will tell you and the regulator as the law requires.",
      ],
    },
    {
      heading: "7. Your rights",
      body: [
        "You may ask to see the information we hold about you, correct it, delete it (unless we must keep it by law), object to or restrict how we use it, or get a copy to take elsewhere.",
        `Email ${COMPANY.email} from the address you used with us. We reply within 30 days. If you're not satisfied, you can complain to the Postal and Telecommunications Regulatory Authority of Zimbabwe (POTRAZ), the Data Protection Authority, or the regulator where you live.`,
      ],
    },
    {
      heading: "8. Children",
      body: ["Our services are for businesses and adults. We don't knowingly collect information from anyone under 18."],
    },
    {
      heading: "9. Changes",
      body: ["We'll post any changes here with a new effective date. Significant changes affecting current clients will be communicated directly."],
    },
  ],
};

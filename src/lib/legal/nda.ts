import { COMPANY } from "../catalog";
import type { LegalDoc } from "./types";

export const NDA: LegalDoc = {
  id: "nda",
  title: "Mutual Non-Disclosure Agreement",
  version: "2026-11-28",
  effective: "28 November 2026",
  summary: "Both sides keep each other's confidential information private, before and during a project.",
  intro: [
    `This agreement is between ${COMPANY.name}, a technology studio based in Harare, Zimbabwe ("R1VLE"), and the person or company named in the signature block ("the Client"). Each is a "Party". It covers information either Party shares about the purpose stated below the signature block, or, if none is stated, any possible or actual project between them.`,
  ],
  sections: [
    {
      heading: "1. Confidential Information",
      body: [
        "\"Confidential Information\" is any non-public information one Party (the Discloser) shares with the other (the Recipient), in any form, that is marked confidential or that a reasonable person would understand to be confidential. It includes business plans, product ideas, designs, source code, systems and network details, credentials, security findings, customer and financial data, and the existence and terms of any project.",
      ],
    },
    {
      heading: "2. What is not confidential",
      body: [
        "Information is not Confidential Information if the Recipient can show it:",
        [
          "is or becomes public without the Recipient breaking this agreement;",
          "was lawfully known to the Recipient before it was shared;",
          "was received lawfully from a third party without a duty of confidence; or",
          "was developed independently without using the Discloser's information.",
        ],
      ],
    },
    {
      heading: "3. Obligations",
      body: [
        "The Recipient will:",
        [
          "use Confidential Information only for the purpose of this agreement;",
          "not disclose it to anyone except its employees, contractors and advisers who need to know it and are bound by confidentiality duties at least as strict as these;",
          "protect it with at least the care it uses for its own confidential information, and no less than reasonable care; and",
          "tell the Discloser promptly if it learns of any unauthorised use or disclosure.",
        ],
        "The Recipient is responsible for anyone it shares Confidential Information with.",
      ],
    },
    {
      heading: "4. Disclosure required by law",
      body: [
        "If the law, a court or a regulator requires the Recipient to disclose Confidential Information, it may do so, but only the part required, and where allowed it will first tell the Discloser so it can seek protection.",
      ],
    },
    {
      heading: "5. Returning information",
      body: [
        "On written request, or when the purpose ends, the Recipient will return or destroy the Confidential Information, except copies it must keep by law or that sit in routine backups, which remain confidential.",
      ],
    },
    {
      heading: "6. No other rights",
      body: [
        "Sharing information doesn't give the Recipient any licence or ownership of it, and doesn't oblige either Party to start or continue a project. Information is shared \"as is\".",
        "R1VLE won't show work for the Client in its portfolio or name the Client publicly without the Client's written permission.",
      ],
    },
    {
      heading: "7. Term",
      body: [
        "This agreement starts when signed and covers information shared for 2 years after that. The duty to keep information confidential lasts for 3 years after the information was shared, and for credentials, security findings and trade secrets for as long as they remain confidential.",
      ],
    },
    {
      heading: "8. Remedies",
      body: [
        "A breach may cause harm that money can't fully repair, so the Discloser may seek an interdict or other urgent relief, in addition to any other remedy.",
      ],
    },
    {
      heading: "9. General",
      body: [
        "This agreement is governed by the laws of Zimbabwe, and the courts of Zimbabwe sitting in Harare have jurisdiction. It can be changed only in writing signed by both Parties. If any part is unenforceable, the rest applies.",
        "The Parties agree that signing electronically, by typing a name and confirming on this site, is valid and binding, and that this site's signed copy is evidence of the agreement. R1VLE signs by publishing this agreement and accepting the Client's signature.",
      ],
    },
  ],
};

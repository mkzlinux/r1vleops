import { COMPANY } from "../catalog";
import type { LegalDoc } from "./types";

export const AUTHORIZATION: LegalDoc = {
  id: "authorization",
  title: "Authorization to Test",
  version: "2026-11-28",
  effective: "28 November 2026",
  summary: "Written permission for R1VLE to run a security assessment on the systems you list, within the rules you set.",
  intro: [
    `The person signing below ("the Client") authorises ${COMPANY.name}, a technology studio based in Harare, Zimbabwe ("R1VLE"), to carry out the security testing described in this form. Without this authorisation, the same activity could be unlawful, so R1VLE will not start testing until it is signed by someone with authority over the systems.`,
  ],
  sections: [
    {
      heading: "1. Scope",
      body: [
        "R1VLE may test only the systems listed as in scope below the signature block, during the testing window, using the techniques ticked there. Anything not listed, including systems that are discovered during testing, is out of scope until the Client approves it in writing.",
        "Denial-of-service, destructive actions, and deleting or changing production data are excluded unless expressly approved in writing.",
      ],
    },
    {
      heading: "2. The Client confirms",
      body: [
        [
          "they own the in-scope systems or have the written permission of the owner, and the authority to sign this form;",
          "they have told, or will tell, any hosting, cloud or managed-service provider whose rules require notice of testing;",
          "they have current backups and accept that testing can cause slowdowns or outages despite care;",
          "the emergency contact below can be reached during the testing window and can tell R1VLE to stop.",
        ],
      ],
    },
    {
      heading: "3. How R1VLE tests",
      body: [
        [
          "Testing is done by R1VLE staff and supervised contractors bound by confidentiality, from the addresses or locations given to the Client on request.",
          "R1VLE stops immediately when asked by the Client or the emergency contact, and pauses and reports straight away if it finds a critical risk, evidence of an existing breach, or illegal content.",
          "R1VLE accesses only as much data as it needs to prove a finding, doesn't copy personal data unless necessary, and deletes test evidence after the report is accepted, except what both agree to keep.",
          "Credentials, findings and reports are confidential and shared only with the Client's named contacts.",
        ],
      ],
    },
    {
      heading: "4. Responsibility",
      body: [
        "The Client agrees not to bring claims or complaints against R1VLE for activity within this authorisation, and is responsible for claims by third parties arising from systems the Client wasn't entitled to authorise. R1VLE is responsible for acting outside this authorisation. The Terms and Conditions, including their limits on liability, also apply.",
        "A report reflects what was found within the scope and time tested. It doesn't guarantee the absence of other weaknesses.",
      ],
    },
    {
      heading: "5. Signing",
      body: [
        "This authorisation is valid for the testing window stated, and can be withdrawn at any time by notice to R1VLE. It is governed by the laws of Zimbabwe. Signing electronically on this site is valid and binding.",
      ],
    },
  ],
};

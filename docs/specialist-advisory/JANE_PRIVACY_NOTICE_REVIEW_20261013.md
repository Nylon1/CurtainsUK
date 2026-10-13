# Jane AI consultation: customer notice review

Status: draft for owner/privacy review, not published. The public Jane switch remains off.

## Current live-policy gap

The [live privacy policy](https://www.curtainsuk.com/policies/privacy-policy), read on 13 October 2026, describes Fabric Intelligence but not Jane's separate signed, saved AI consultation. Its service-provider and retention paragraphs also say processor details and the record-specific schedule still require confirmation. The Jane room supplies an explicit opt-in, OpenAI disclosure, 90-day saved-record limit, account recovery and a delete control, but links to this incomplete policy. Do not mark the public privacy gate passed on the room copy alone.

## Proposed Jane-specific addition for review

> **Jane AI interior design consultations.** If you choose to speak with Jane, we use your signed-in CurtainsUK customer account to keep your consultation private to you. With your explicit consent, the room details, preferences, selected fabric identities, messages, Jane's replies and consultation summary are sent to our AI provider, OpenAI, to generate advice, and are saved in encrypted CurtainsUK advisory storage hosted on Supabase so you can return to them. Vercel hosts the consultation API. Jane does not place an order or decide current stock or pricing. Please do not send payment details or sensitive personal information. You may delete a saved consultation from Jane's room or contact support@curtainsuk.com for help. The active advisory record expires after up to 90 days from its last saved activity and a bounded daily deletion job removes expired records. Deletion from the live advisory record does not itself guarantee immediate removal from provider security logs or database backups; applicable retention periods and request handling should be confirmed in the main policy. We do not use Jane conversations to change authoritative product facts automatically.

This is proposed language, not a legal sign-off. Before publication, the owner should confirm the actual processor agreement and international-transfer terms, the documented backup deletion window, the lawful basis and withdrawal handling, and whether OpenAI account data sharing remains at its default-off setting. OpenAI's [API data-controls guidance](https://developers.openai.com/api/docs/guides/your-data) states that API inputs and outputs are not used to train models by default unless the organisation opts in, and describes default abuse-monitoring logs retained for up to 30 days with exceptions. Those provider terms are distinct from CurtainsUK's 90-day active advisory record.

## Evidence to attach before public release

- Live privacy policy and room text readback after any approved edit.
- Provider/data-sharing configuration and current agreements checked without revealing credentials.
- First actual scheduled expiry-job result and backup-retention handling.
- Signed customer deletion and cross-customer isolation results.

Do not amend the live policy through a theme upload. It is a separate Shopify policy resource and needs its own reviewed change and readback.

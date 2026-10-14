# Jane customer sign-in return

Status: account navigation saved on the live Shopify store; theme improvement is a separate draft release candidate. Jane's existing consultation service is unchanged by this work.

## Customer path

- The signed-out Jane room presents a clear **Sign in to speak with Jane** link. Shopify's customer authentication receives a same-store `return_to` path and returns the customer to `/pages/meet-our-team?jane_return=1`.
- The team controller reopens Jane after that return. A valid fabric-detail entry retains its exact `jane_fabric` identity in the return path; duplicate or invalid identities are discarded.
- Start and consent controls appear only after the Shopify proxy confirms the signed-in customer's owner binding. A service error does not invite sign-in or show those controls.
- The customer account menu provides **Meet our AI advisers** as a permanent route back to `/pages/meet-our-team`. Jane is the only operational adviser; the other five remain previews.

## Shopify account menu record

Store: `carpetup.myshopify.com`. Existing customer account menu: `customer-account-main-menu`, Admin menu ID `259346039163`. Before this change it contained **Orders** and **Profile**. On 13 October 2026, **Meet our AI advisers** was added as a third item pointing to `https://www.curtainsuk.com/pages/meet-our-team`. Shopify Admin displayed **Menu updated**, and the signed-in live storefront account menu displayed the new item. No theme file was uploaded by this account-menu change.

To roll back the menu, remove only **Meet our AI advisers** from this menu and save. Retain **Orders** and **Profile**.

## Theme release boundary

PR #191 now also contains the selected-fabric discussion correction. Its seven changed theme files must pass the protected PR checks and enter `release/production` before any scoped MAIN-theme upload. Back up and compare each corresponding live asset before upload. If a live asset has newer unrelated edits, reconcile them first. Upload only the files that differ from protected source, read them back, then test signed-out sign-in, signed-in return, new-fabric discussion, account switching, mobile and keyboard behavior. Roll back only those uploaded files from their saved live copies if the journey fails. The [selected-fabric record](JANE_SELECTED_FABRIC_TOPIC_20261014.md) lists the exact customer behaviour.

This worktree includes the already merged PR #190 source. Its new changes make no Supabase, OpenAI provider, indexing, Vercel or purchase-flow change.

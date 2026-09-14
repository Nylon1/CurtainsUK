import type { Metadata } from "next";
export const metadata: Metadata = {title:"Room-image privacy | CurtainsUK",robots:{index:false,follow:false}};
export default function ImagePrivacy() {
  return <main className="mx-auto max-w-3xl px-6 py-12 leading-8">
    <p>Apex Curtains Ltd trading as Curtains UK</p><h1 className="my-6 text-4xl">Your room image, privately used</h1>
    <p>Adding an image is optional. You can use one room or reference image per consultation, or continue using questions alone.</p>
    <h2 className="mt-8 text-2xl">What happens to your image</h2>
    <p>Your image is processed privately to suggest colours for your consultation and has no public image URL. Raw reference images are automatically deleted no later than 30 days after upload. Our current service discards the raw image after analysis, so deletion currently happens sooner. We do not keep a raw-image archive.</p>
    <p>We do not use your image for model training without separate explicit permission. Please avoid including people, addresses or other personal information.</p>
    <h2 className="mt-8 text-2xl">What we retain</h2>
    <p>We retain the original colour observation, your confirmed palette and corrections, the image hash and analysis version, consultation answers, and recommendation and journey events. These derived records may be retained where required to operate and improve the service, including supporting your consultation, resuming your choices and reviewing service quality. We retain them only for as long as needed for those purposes and applicable legal obligations. A hash identifies the image without storing a viewable copy. Individual feedback does not automatically retrain our recommendations.</p>
    <h2 className="mt-8 text-2xl">Deletion and questions</h2>
    <p>You may request earlier deletion of your consultation information by emailing <a className="underline" href="mailto:enquiries@curtainsuk.com?subject=CurtainsUK%20consultation%20privacy">enquiries@curtainsuk.com</a>. Include your consultation reference; please do not resend the image. We will verify the request before deleting personal information. There is no saved raw image to retrieve or delete in the current service.</p>
    <p>Apex Curtains Ltd trading as Curtains UK<br />36–44 Bolton Road<br />Blackburn<br />BB2 3FA</p>
    <p className="mt-8"><a className="underline" href="https://www.curtainsuk.com/policies/privacy-policy">Full CurtainsUK privacy policy</a></p>
  </main>;
}

import type { Metadata } from "next";
export const metadata: Metadata = {title:"Room-image privacy | CurtainsUK",robots:{index:false,follow:false}};
export default function ImagePrivacy() {
  return <main className="mx-auto max-w-3xl px-6 py-12 leading-8">
    <p>CurtainsUK</p><h1 className="my-6 text-4xl">Your room image, privately used</h1>
    <p>Adding an image is optional. You can use one room or reference image per consultation, or continue using questions alone.</p>
    <h2 className="mt-8 text-2xl">What happens to your image</h2>
    <p>Your image is processed privately on our servers to suggest colours for that consultation. It has no public image URL. Our current service does not save the raw image: it is discarded after analysis, sooner than our maximum 30-day retention period. We do not keep an image archive.</p>
    <p>We do not use your image for model training without separate explicit permission. Please avoid including people, addresses or other personal information.</p>
    <h2 className="mt-8 text-2xl">What we retain</h2>
    <p>We retain the original colour observation, your confirmed palette and corrections, the image hash and analysis version, consultation answers, and recommendation and journey events. These support your consultation, resuming your choices and reviewing service quality. A hash identifies the image without storing a viewable copy. Individual feedback does not automatically retrain our recommendations.</p>
    <h2 className="mt-8 text-2xl">Deletion and questions</h2>
    <p>You may request earlier deletion of your consultation information by emailing <a className="underline" href="mailto:enquiries@curtainsuk.com?subject=CurtainsUK%20consultation%20privacy">enquiries@curtainsuk.com</a>. Include your consultation reference; please do not resend the image. We will verify the request before deleting personal information. There is no saved raw image to retrieve or delete in the current service.</p>
    <p className="mt-8"><a className="underline" href="https://www.curtainsuk.com/policies/privacy-policy">Full CurtainsUK privacy policy</a></p>
  </main>;
}

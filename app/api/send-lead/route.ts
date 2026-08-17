import { Resend } from "resend";

function toBase64(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString("base64");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(req: Request) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return Response.json(
        {
          ok: false,
          error: "Email service is not configured.",
        },
        { status: 503 }
      );
    }

    const resend = new Resend(resendApiKey);
    const formData = await req.formData();

    const name = String(formData.get("name") || "");
    const email = String(formData.get("email") || "");
    const phone = String(formData.get("phone") || "");
    const postcode = String(formData.get("postcode") || "");

    const windowType = String(formData.get("windowType") || "");
    const purpose = String(formData.get("purpose") || "");
    const fabricStyle = String(formData.get("fabricStyle") || "");
    const liningType = String(formData.get("liningType") || "");
    const roomType = String(formData.get("roomType") || "");
    const headingStyle = String(formData.get("headingStyle") || "");
    const contactTime = String(formData.get("contactTime") || "");

    const arloPriority = String(formData.get("arloPriority") || "");
    const arloStyle = String(formData.get("arloStyle") || "");
    const suggestedHeading = String(formData.get("suggestedHeading") || "");
    const suggestedLining = String(formData.get("suggestedLining") || "");
    const recommendationTitle = String(formData.get("recommendationTitle") || "");
    const photoName = String(formData.get("photoName") || "");

    const uploaded = formData.get("imageFile");

    const attachments: Array<{
      filename: string;
      content: string;
    }> = [];

    if (uploaded instanceof File) {
      const arrayBuffer = await uploaded.arrayBuffer();
      attachments.push({
        filename: uploaded.name || "window-photo.jpg",
        content: toBase64(arrayBuffer),
      });
    }

    const emailResult = await resend.emails.send({
      from: "Apex Curtains <hello@apexcurtains.com>",
      to: ["hello@apexcurtains.com"],
      replyTo: email || undefined,
      subject: `New Curtain Design Lead - ${name || "Unknown"}`,
      html: `
        <h2>New Curtain Design Lead</h2>

        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
        <p><strong>Postcode:</strong> ${escapeHtml(postcode)}</p>

        <h3>Design Details</h3>
        <p><strong>Window Type:</strong> ${escapeHtml(windowType)}</p>
        <p><strong>Purpose:</strong> ${escapeHtml(purpose)}</p>
        <p><strong>Fabric Style:</strong> ${escapeHtml(fabricStyle)}</p>
        <p><strong>Lining Type:</strong> ${escapeHtml(liningType)}</p>
        <p><strong>Room Type:</strong> ${escapeHtml(roomType)}</p>
        <p><strong>Heading Style:</strong> ${escapeHtml(headingStyle)}</p>
        <p><strong>Best Time to Contact:</strong> ${escapeHtml(contactTime)}</p>

        <h3>Arlo Recommendation</h3>
        <p><strong>Recommendation Title:</strong> ${escapeHtml(recommendationTitle)}</p>
        <p><strong>Arlo Priority:</strong> ${escapeHtml(arloPriority)}</p>
        <p><strong>Arlo Style:</strong> ${escapeHtml(arloStyle)}</p>
        <p><strong>Suggested Heading:</strong> ${escapeHtml(suggestedHeading)}</p>
        <p><strong>Suggested Lining:</strong> ${escapeHtml(suggestedLining)}</p>
        <p><strong>Photo Name from Arlo:</strong> ${escapeHtml(photoName)}</p>

        <p><strong>Attachment included:</strong> ${uploaded instanceof File ? "Yes" : "No"}</p>
      `,
      text: `
New Curtain Design Lead

Name: ${name}
Email: ${email}
Phone: ${phone}
Postcode: ${postcode}

Design Details
Window Type: ${windowType}
Purpose: ${purpose}
Fabric Style: ${fabricStyle}
Lining Type: ${liningType}
Room Type: ${roomType}
Heading Style: ${headingStyle}
Best Time to Contact: ${contactTime}

Arlo Recommendation
Recommendation Title: ${recommendationTitle}
Arlo Priority: ${arloPriority}
Arlo Style: ${arloStyle}
Suggested Heading: ${suggestedHeading}
Suggested Lining: ${suggestedLining}
Photo Name from Arlo: ${photoName}

Attachment included: ${uploaded instanceof File ? "Yes" : "No"}
      `.trim(),
      attachments,
    });

    return Response.json({
      ok: true,
      email: emailResult,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * SCS USA — Form Submission Handler
 * Cloudflare Pages Function
 *
 * Receives all form POSTs, formats them, and sends to configured inbox via Resend.
 *
 * Environment variables (set in Cloudflare dashboard):
 *   CONTACT_EMAIL  — inbox to receive submissions (e.g. info@smartercity.com)
 *   RESEND_API_KEY — API key from resend.com
 *   FROM_EMAIL     — (optional) verified sender, defaults to onboarding@resend.dev
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  const CONTACT_EMAIL = env.CONTACT_EMAIL;
  const RESEND_API_KEY = env.RESEND_API_KEY;
  const FROM_EMAIL = env.FROM_EMAIL || "SCS Website <onboarding@resend.dev>";

  if (!CONTACT_EMAIL || !RESEND_API_KEY) {
    return Response.json(
      { success: false, error: "Server not configured" },
      { status: 500 }
    );
  }

  try {
    // Parse form data (supports both FormData and JSON)
    let data;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      data = await request.json();
    } else {
      const formData = await request.formData();
      data = Object.fromEntries(formData.entries());
    }

    // Extract form name and clean up
    const formName = data.form_name || "Website Form";
    delete data.form_name;

    // Build email body
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "full",
      timeStyle: "short",
    });

    const fields = Object.entries(data)
      .filter(([_, v]) => v && v.toString().trim())
      .map(([key, value]) => {
        const label = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        return `<tr>
          <td style="padding:8px 16px;font-weight:600;color:#15626C;vertical-align:top;white-space:nowrap">${label}</td>
          <td style="padding:8px 16px;color:#334155">${escapeHtml(value.toString())}</td>
        </tr>`;
      })
      .join("");

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#15626C,#2C7480);padding:24px 32px;border-radius:12px 12px 0 0">
          <h2 style="margin:0;color:#fff;font-size:20px;font-weight:600">New ${formName} Submission</h2>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:13px">${timestamp}</p>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:8px 0">
          <table style="width:100%;border-collapse:collapse;font-size:15px">
            ${fields}
          </table>
        </div>
        <p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:24px">
          Sent from smartercitysolutions.com
        </p>
      </div>
    `;

    const text = Object.entries(data)
      .filter(([_, v]) => v && v.toString().trim())
      .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`)
      .join("\n");

    // Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [CONTACT_EMAIL],
        subject: `[SCS Website] New ${formName} Submission`,
        html: html,
        text: `New ${formName} Submission\n${timestamp}\n\n${text}`,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return Response.json(
        { success: false, error: "Failed to send" },
        { status: 502 }
      );
    }

    // Return success — redirect or JSON based on request type
    if (contentType.includes("application/json")) {
      return Response.json({ success: true, message: "Submission received" });
    }

    // For regular form POST, redirect to thank-you or back with success param
    const referer = request.headers.get("referer") || "/";
    const redirectUrl = new URL(referer);
    redirectUrl.searchParams.set("submitted", formName);
    return Response.redirect(redirectUrl.toString(), 303);

  } catch (err) {
    console.error("Submit error:", err);
    return Response.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

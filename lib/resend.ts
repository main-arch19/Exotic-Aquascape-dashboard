import { Resend } from 'resend';

export interface EmailResult {
  success: boolean;
  id: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<EmailResult> {
  const resend = new Resend(process.env.RESEND_API_KEY);

  console.log(`\n[Resend] ✉  Sending email`);
  console.log(`[Resend]    To      : ${to}`);
  console.log(`[Resend]    Subject : "${subject}"`);

  try {
    const result = await resend.emails.send({
      from: 'noreply@exoticaquascape.local',
      to,
      subject,
      html,
    });

    if (result.error) {
      console.error(`[Resend] ✗ Failed:`, result.error);
      return { success: false, id: '' };
    }

    console.log(`[Resend] ✓ Sent (ID: ${result.data?.id})`);
    return { success: true, id: result.data?.id ?? '' };
  } catch (error) {
    console.error(`[Resend] ✗ Exception:`, error);
    return { success: false, id: '' };
  }
}

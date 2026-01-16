/**
 * Email service for sending approved external drafts
 * In production, this would integrate with an email provider (SendGrid, AWS SES, etc.)
 */

export interface EmailParams {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export class EmailService {
  /**
   * Send an email (currently logs to console, in production would send via email provider)
   */
  static async sendEmail(params: EmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // In production, this would call an email service API
      // For now, we'll log it and return success
      console.log("[Email] Sending email:");
      console.log(`  To: ${params.to}`);
      console.log(`  Subject: ${params.subject}`);
      console.log(`  Body: ${params.body.substring(0, 100)}...`);

      // Simulate email sending
      // In production, replace this with actual email service call:
      // const result = await emailProvider.send({
      //   to: params.to,
      //   subject: params.subject,
      //   html: params.body,
      //   from: params.from || "noreply@generic-corp.com",
      // });

      // For now, return a simulated message ID
      const messageId = `email-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Validate email address format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

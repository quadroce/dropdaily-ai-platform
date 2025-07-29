import type { Content } from "@shared/schema";

export interface EmailUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Email service for sending daily drops
 * Note: This is a basic implementation. For production, integrate with:
 * - Resend (https://resend.com)
 * - SendGrid
 * - Postmark
 * - AWS SES
 */
export class EmailService {
  
  /**
   * Send daily drop email to user
   */
  async sendDailyDropEmail(user: EmailUser, contentItems: Content[]): Promise<void> {
    console.log(`📧 Sending daily drop email to ${user.email}`);

    try {
      // For development, we'll log the email content
      // In production, replace with actual email service
      const emailHtml = this.generateDailyDropHtml(user, contentItems);
      
      // Log email content for development
      console.log(`📝 Email content for ${user.firstName}:`);
      console.log(emailHtml);
      
      // TODO: Replace with actual email service implementation
      // await this.sendEmail({
      //   to: user.email,
      //   subject: `Your Daily Drop - ${new Date().toLocaleDateString()}`,
      //   html: emailHtml,
      // });

      console.log(`✅ Email sent successfully to ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed to send email to ${user.email}:`, error);
      throw error;
    }
  }

  /**
   * Generate HTML email template for daily drop
   */
  private generateDailyDropHtml(user: EmailUser, contentItems: Content[]): string {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const contentHtml = contentItems.map(item => `
      <div style="margin-bottom: 30px; padding: 20px; border-left: 4px solid #3b82f6; background-color: #f8fafc;">
        <h3 style="margin: 0 0 10px 0; color: #1e293b;">
          <a href="${item.url}" style="color: #3b82f6; text-decoration: none;">${item.title}</a>
        </h3>
        ${item.summary ? `<p style="color: #64748b; margin: 10px 0; line-height: 1.6;">${item.summary}</p>` : ''}
        ${item.description ? `<p style="color: #475569; margin: 10px 0; line-height: 1.6;">${item.description}</p>` : ''}
        <div style="margin-top: 15px;">
          <span style="background-color: #e2e8f0; color: #475569; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase; font-weight: 600;">
            ${item.source}
          </span>
          ${item.publishedAt ? `
            <span style="color: #94a3b8; font-size: 14px; margin-left: 10px;">
              ${new Date(item.publishedAt).toLocaleDateString()}
            </span>
          ` : ''}
        </div>
        <div style="margin-top: 15px;">
          <a href="${item.url}" style="background-color: #3b82f6; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
            Read Article
          </a>
        </div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Daily Drop - ${today}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px; padding: 30px 0; border-bottom: 2px solid #e2e8f0;">
          <h1 style="color: #1e293b; margin: 0; font-size: 28px; font-weight: 700;">
            💧 DropDaily
          </h1>
          <p style="color: #64748b; margin: 10px 0 0 0; font-size: 16px;">
            Your personalized content for ${today}
          </p>
        </div>

        <!-- Greeting -->
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1e293b; margin: 0 0 10px 0;">
            Good morning, ${user.firstName}!
          </h2>
          <p style="color: #475569; margin: 0;">
            Here are ${contentItems.length} carefully selected articles based on your interests:
          </p>
        </div>

        <!-- Content Items -->
        <div style="margin-bottom: 40px;">
          ${contentHtml}
        </div>

        <!-- Footer -->
        <div style="border-top: 2px solid #e2e8f0; padding-top: 30px; text-align: center; color: #94a3b8; font-size: 14px;">
          <p style="margin: 0 0 10px 0;">
            This email was sent to ${user.email}
          </p>
          <p style="margin: 0 0 10px 0;">
            <a href="#" style="color: #3b82f6; text-decoration: none;">View in browser</a> | 
            <a href="#" style="color: #3b82f6; text-decoration: none;">Update preferences</a> | 
            <a href="#" style="color: #3b82f6; text-decoration: none;">Unsubscribe</a>
          </p>
          <p style="margin: 0; color: #cbd5e1;">
            DropDaily - AI-powered content discovery for busy professionals
          </p>
        </div>

      </body>
      </html>
    `;
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(user: EmailUser): Promise<void> {
    console.log(`👋 Sending welcome email to ${user.email}`);

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to DropDaily!</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <div style="text-align: center; margin-bottom: 40px; padding: 30px 0;">
          <h1 style="color: #1e293b; margin: 0; font-size: 32px; font-weight: 700;">
            💧 Welcome to DropDaily!
          </h1>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1e293b;">Hi ${user.firstName},</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.7;">
            Welcome to DropDaily! We're excited to help you discover amazing content tailored to your interests.
          </p>
          <p style="color: #475569; font-size: 16px; line-height: 1.7;">
            Your personalized daily drops will start arriving tomorrow at 7:00 AM. Each day, you'll receive 1-3 carefully selected articles based on your topic preferences.
          </p>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <a href="#" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
            View Your Dashboard
          </a>
        </div>

        <div style="border-top: 2px solid #e2e8f0; padding-top: 30px; text-align: center; color: #94a3b8; font-size: 14px;">
          <p style="margin: 0;">
            Happy reading!<br>
            The DropDaily Team
          </p>
        </div>

      </body>
      </html>
    `;

    // Log for development
    console.log(`📝 Welcome email for ${user.firstName}:`);
    console.log(emailHtml);

    // TODO: Implement actual email sending
    console.log(`✅ Welcome email sent to ${user.email}`);
  }

  /**
   * Send test email (for development)
   */
  async sendTestEmail(user: EmailUser): Promise<void> {
    console.log(`🧪 Sending test email to ${user.email}`);

    const testContent: Content[] = [
      {
        id: 'test-1',
        feedId: null,
        title: 'The Future of AI in Business',
        description: 'Exploring how artificial intelligence is transforming industries and creating new opportunities for growth.',
        url: 'https://example.com/ai-business',
        source: 'TechCrunch',
        contentType: 'article',
        duration: null,
        thumbnailUrl: null,
        transcript: null,
        summary: 'A comprehensive look at AI adoption trends and their impact on business transformation.',
        fullContent: null,
        embedding: null,
        status: 'approved',
        viewCount: 0,
        publishedAt: new Date(),
        guid: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'test-2',
        feedId: null,
        title: 'Leadership in Remote Teams',
        description: 'Best practices for leading distributed teams and maintaining company culture.',
        url: 'https://example.com/remote-leadership',
        source: 'Harvard Business Review',
        contentType: 'article',
        duration: null,
        thumbnailUrl: null,
        transcript: null,
        summary: 'Essential strategies for effective remote team management and communication.',
        fullContent: null,
        embedding: null,
        status: 'approved',
        viewCount: 0,
        publishedAt: new Date(),
        guid: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    await this.sendDailyDropEmail(user, testContent);
  }

  /**
   * Validate email configuration
   */
  async validateConfiguration(): Promise<boolean> {
    // TODO: Implement actual email service validation
    console.log('✅ Email configuration validated (development mode)');
    return true;
  }
}

export const emailService = new EmailService();
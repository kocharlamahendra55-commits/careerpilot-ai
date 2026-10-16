/**
 * Email service for CareerPilot AI - Password Reset functionality
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send email using Resend service
 */
export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.warn('[Email] RESEND_API_KEY not configured. Email functionality disabled.');
    // In development, we'll just log the email instead of sending it
    console.log('[Email] Would send email:', { to, subject, html });
    return true; // Return success for development
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `CareerPilot AI <${process.env.FROM_EMAIL || "onboarding@resend.dev"}>`,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Email] Send failed:', errorData);
      return false;
    }

    const result = await response.json();
    console.log('[Email] Sent successfully:', result.id);
    return true;
  } catch (error) {
    console.error('[Email] Error sending email:', error);
    return false;
  }
}

/**
 * Generate password reset email HTML
 */
export function generatePasswordResetEmail(resetUrl: string, userName?: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - CareerPilot AI</title>
      <style>
        body { 
          margin: 0; 
          padding: 0; 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f8fafc;
          color: #334155;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white; 
          padding: 32px 24px;
          text-align: center;
        }
        .logo { 
          font-size: 24px; 
          font-weight: bold; 
          margin-bottom: 8px;
        }
        .content { 
          padding: 32px 24px;
        }
        .greeting { 
          font-size: 18px; 
          margin-bottom: 16px;
          color: #1e293b;
        }
        .message { 
          line-height: 1.6; 
          margin-bottom: 24px;
          color: #475569;
        }
        .button { 
          display: inline-block; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white; 
          padding: 14px 28px; 
          text-decoration: none; 
          border-radius: 8px;
          font-weight: 600;
          margin: 16px 0;
        }
        .button:hover {
          transform: translateY(-1px);
        }
        .footer { 
          padding: 24px;
          background-color: #f1f5f9;
          font-size: 14px;
          color: #64748b;
          text-align: center;
        }
        .security-note {
          background-color: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 16px;
          margin: 20px 0;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🧠 CareerPilot AI</div>
          <div>Password Reset Request</div>
        </div>
        
        <div class="content">
          <div class="greeting">
            Hello${userName ? ` ${userName}` : ''}!
          </div>
          
          <div class="message">
            We received a request to reset the password for your CareerPilot AI account. 
            If you made this request, click the button below to set a new password:
          </div>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset My Password</a>
          </div>
          
          <div class="security-note">
            <strong>🔒 Security Notice:</strong><br>
            • This link will expire in 1 hour<br>
            • If you didn't request this reset, you can safely ignore this email<br>
            • Your account remains secure
          </div>
          
          <div class="message">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
          </div>
        </div>
        
        <div class="footer">
          This email was sent by CareerPilot AI. If you have questions, please contact our support team.
          <br><br>
          <strong>Need help?</strong> Visit our help center or reply to this email.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string, 
  resetToken: string, 
  userName?: string
): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;
  
  const htmlContent = generatePasswordResetEmail(resetUrl, userName);
  
  return sendEmail({
    to: email,
    subject: 'Reset Your CareerPilot AI Password',
    html: htmlContent,
  });
}
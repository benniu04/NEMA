import nodemailer, { Transporter } from 'nodemailer';
import { ENV_VARS } from './envVars.js';
import logger from './logger.js';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
}

// Create transporter
let transporter: Transporter | null = null;

// Initialize email transporter
const initializeTransporter = (): Transporter | null => {
  if (!ENV_VARS.EMAIL_USER || !ENV_VARS.EMAIL_PASS) {
    logger.warn('⚠️  Email credentials not configured. Email features will be disabled.');
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: ENV_VARS.EMAIL_USER,
      pass: ENV_VARS.EMAIL_PASS,
    },
  });

  // Verify connection
  transporter.verify((error: Error | null, success: boolean) => {
    if (error) {
      logger.error('Email transporter verification failed:', { error: error.message });
    } else {
      logger.info('Email transporter ready');
    }
  });

  return transporter;
};

// Get or create transporter
const getTransporter = (): Transporter | null => {
  if (!transporter) {
    transporter = initializeTransporter();
  }
  return transporter;
};

// Send email helper
export const sendEmail = async ({ to, subject, html, text }: EmailOptions): Promise<EmailResult> => {
  const transport = getTransporter();

  if (!transport) {
    logger.warn('Email not sent - transporter not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const mailOptions = {
      from: `"NEMA" <${ENV_VARS.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Fallback text version
    };

    const info = await transport.sendMail(mailOptions);
    logger.info('Email sent successfully', { to, subject, messageId: info.messageId });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to send email:', { error: err.message, to, subject });
    return { success: false, error: err.message };
  }
};

// Email templates
export const emailTemplates = {
  passwordReset: (resetUrl: string, userName?: string): EmailTemplate => ({
    subject: 'Reset Your NEMA Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #000000;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="100%" style="max-width: 500px; background-color: #111111; border: 1px solid #222222;">
                <tr>
                  <td style="padding: 40px 30px; text-align: center;">
                    <!-- Logo -->
                    <h1 style="margin: 0 0 30px 0; font-size: 32px; font-weight: 300; letter-spacing: 0.3em; color: #ffffff;">NEMA</h1>

                    <!-- Content -->
                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #ffffff;">
                      Hi${userName ? ` ${userName}` : ''},
                    </p>
                    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #cccccc;">
                      We received a request to reset your password. Click the button below to create a new password.
                    </p>

                    <!-- Button -->
                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 40px; background-color: #ffffff; color: #000000; text-decoration: none; font-size: 14px; font-weight: 500; letter-spacing: 0.05em;">
                      RESET PASSWORD
                    </a>

                    <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: #666666;">
                      This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 30px; border-top: 1px solid #222222; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #666666;">
                      © ${new Date().getFullYear()} NEMA. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  }),

  emailVerification: (verifyUrl: string, userName?: string): EmailTemplate => ({
    subject: 'Verify Your NEMA Account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #000000;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="100%" style="max-width: 500px; background-color: #111111; border: 1px solid #222222;">
                <tr>
                  <td style="padding: 40px 30px; text-align: center;">
                    <!-- Logo -->
                    <h1 style="margin: 0 0 30px 0; font-size: 32px; font-weight: 300; letter-spacing: 0.3em; color: #ffffff;">NEMA</h1>

                    <!-- Content -->
                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #ffffff;">
                      Welcome${userName ? `, ${userName}` : ''}!
                    </p>
                    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #cccccc;">
                      Thank you for joining NEMA. Please verify your email address to get full access to all features.
                    </p>

                    <!-- Button -->
                    <a href="${verifyUrl}" style="display: inline-block; padding: 14px 40px; background-color: #ffffff; color: #000000; text-decoration: none; font-size: 14px; font-weight: 500; letter-spacing: 0.05em;">
                      VERIFY EMAIL
                    </a>

                    <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: #666666;">
                      This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 30px; border-top: 1px solid #222222; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #666666;">
                      © ${new Date().getFullYear()} NEMA. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  }),

  welcomeEmail: (userName?: string): EmailTemplate => ({
    subject: 'Welcome to NEMA',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #000000;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="100%" style="max-width: 500px; background-color: #111111; border: 1px solid #222222;">
                <tr>
                  <td style="padding: 40px 30px; text-align: center;">
                    <!-- Logo -->
                    <h1 style="margin: 0 0 30px 0; font-size: 32px; font-weight: 300; letter-spacing: 0.3em; color: #ffffff;">NEMA</h1>

                    <!-- Content -->
                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #ffffff;">
                      Welcome to NEMA${userName ? `, ${userName}` : ''}!
                    </p>
                    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #cccccc;">
                      Your email has been verified. You now have full access to discover and enjoy independent cinema from around the world.
                    </p>

                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #666666;">
                      Start exploring our curated collection of films.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 30px; border-top: 1px solid #222222; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #666666;">
                      © ${new Date().getFullYear()} NEMA. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  }),
};

export default { sendEmail, emailTemplates };


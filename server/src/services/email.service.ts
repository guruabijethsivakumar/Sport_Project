import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  /**
   * Initializes or updates the SMTP transporter from current config.
   */
  public initTransporter(): void {
    if (config.EMAIL_TRANSPORT === 'smtp') {
      const hasAuth = Boolean(config.SMTP_USER && config.SMTP_USER.trim().length > 0);
      const isGmail =
        Boolean(config.SMTP_HOST?.includes('gmail')) ||
        Boolean(config.SMTP_USER && config.SMTP_USER.includes('@gmail.com'));
      const cleanPass = (config.SMTP_PASS || '').replace(/\s+/g, '');

      if (isGmail) {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          pool: true,
          maxConnections: 3,
          maxMessages: 100,
          rateLimit: 5,
          auth: hasAuth
            ? {
                user: config.SMTP_USER,
                pass: cleanPass,
              }
            : undefined,
          tls: {
            rejectUnauthorized: false,
          },
        });
      } else {
        this.transporter = nodemailer.createTransport({
          host: config.SMTP_HOST,
          port: config.SMTP_PORT,
          secure: config.SMTP_PORT === 465,
          pool: true,
          maxConnections: 3,
          auth: hasAuth
            ? {
                user: config.SMTP_USER,
                pass: cleanPass,
              }
            : undefined,
          tls: {
            rejectUnauthorized: false,
          },
        });
      }
    } else {
      this.transporter = null;
    }
  }

  /**
   * Verifies the SMTP connection and credentials.
   */
  public async verifySmtpConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error({ error, host: config.SMTP_HOST, port: config.SMTP_PORT }, 'SMTP verification failed');
      return false;
    }
  }

  /**
   * Attempts to deliver an email via Resend HTTP API.
   * Returns true on success, false if Resend is not configured or rejected the request.
   */
  private async sendViaResend(options: EmailOptions): Promise<boolean> {
    if (!config.RESEND_API_KEY || config.RESEND_API_KEY.trim().length === 0) {
      return false;
    }

    try {
      const fromAddress = config.EMAIL_FROM.includes('resend.dev')
        ? config.EMAIL_FROM
        : 'PlayMatch <onboarding@resend.dev>';

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.RESEND_API_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [options.to],
          subject: options.subject,
          text: options.text,
          html: options.html,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as any;

      if (response.ok) {
        logger.info(
          { to: options.to, subject: options.subject, messageId: data?.id },
          'Email sent successfully via Resend API',
        );
        return true;
      }

      logger.warn(
        {
          to: options.to,
          subject: options.subject,
          status: response.status,
          error: data?.message || data?.name,
        },
        'Resend API rejected email, falling back to SMTP transport',
      );
      return false;
    } catch (error) {
      logger.error({ error, to: options.to }, 'Failed to deliver email via Resend API, falling back to SMTP');
      return false;
    }
  }

  /**
   * Generic sender method handling Resend, SMTP, and console simulation.
   */
  public async sendEmail(options: EmailOptions): Promise<void> {
    if (config.EMAIL_TRANSPORT === 'console' || config.NODE_ENV === 'test') {
      logger.info(
        {
          to: options.to,
          subject: options.subject,
          transport: 'console',
        },
        `[EmailService:Console] Email to ${options.to} | Subject: "${options.subject}"\n${options.text}`,
      );
      return;
    }

    // 1. Attempt delivery via Resend API first if configured
    if (config.RESEND_API_KEY && config.RESEND_API_KEY.trim().length > 0) {
      const resendSuccess = await this.sendViaResend(options);
      if (resendSuccess) {
        return;
      }
    }

    // 2. SMTP Delivery (or fallback when Resend is restricted/unverified for recipient)
    if (!this.transporter) {
      this.initTransporter();
    }

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: config.EMAIL_FROM,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
          headers: {
            'X-Priority': '1 (Highest)',
            'X-MSMail-Priority': 'High',
            'Importance': 'High',
            'Priority': 'Urgent',
          },
        });
        logger.info(
          { to: options.to, subject: options.subject, messageId: info.messageId },
          'Email sent successfully via SMTP',
        );
      } catch (error) {
        logger.error({ error, to: options.to, subject: options.subject }, 'Failed to deliver email via SMTP');
        logger.warn(
          { to: options.to, subject: options.subject },
          `[EmailService:Fallback] SMTP delivery failed. Fallback content:\n${options.text}`,
        );
      }
    } else {
      logger.warn(
        { to: options.to },
        `[EmailService:Notice] SMTP transport requested but no transporter initialized. Fallback content:\n${options.text}`,
      );
    }
  }

  /**
   * Sends email verification link with one-time token.
   */
  public async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const verificationUrl = `${config.CLIENT_WEB_URL}/verify-email?token=${encodeURIComponent(token)}`;
    const subject = 'Verify your PlayMatch account';
    const text = `Hello ${name},\n\nWelcome to PlayMatch! Please verify your email by clicking the link below:\n${verificationUrl}\n\nThis link will expire in ${config.EMAIL_TOKEN_TTL}.\n\nIf you did not create an account, you can safely ignore this email.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2b6cb0;">Welcome to PlayMatch, ${name}!</h2>
        <p>Please click the button below to verify your email address and activate your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="color: #718096; font-size: 14px;">Or copy and paste this link into your browser:<br/><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p style="color: #a0aec0; font-size: 12px; margin-top: 30px;">This link will expire in ${config.EMAIL_TOKEN_TTL}. If you did not create a PlayMatch account, please ignore this email.</p>
      </div>
    `;

    await this.sendEmail({ to, subject, text, html });
  }

  /**
   * Sends password reset link with one-time token.
   */
  public async sendPasswordResetEmail(
    to: string,
    name: string,
    token: string,
    clientUrl?: string,
  ): Promise<void> {
    const rawBaseUrl = clientUrl && clientUrl.trim().length > 0 ? clientUrl : config.CLIENT_WEB_URL;
    const baseUrl = rawBaseUrl.replace(/\/+$/, '');
    const resetUrl = `${baseUrl}/login?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`;
    const recipientName = name || 'Player';
    const subject = 'Reset your PlayMatch password';
    const text = `Hello ${recipientName},\n\nWe received a request to reset your password for your PlayMatch account.\nClick the link below to set a new password on the sign-in page:\n${resetUrl}\n\nThis link will expire in ${config.PASSWORD_RESET_TOKEN_TTL}.\n\nIf you did not request a password reset, you can safely ignore this email.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2b6cb0;">Password Reset Request</h2>
        <p>Hello ${recipientName},</p>
        <p>We received a request to reset your PlayMatch account password. Click the button below to choose a new password directly on the sign-in page:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #718096; font-size: 14px;">Or copy and paste this link into your browser:<br/><a href="${resetUrl}">${resetUrl}</a></p>
        <p style="color: #a0aec0; font-size: 12px; margin-top: 30px;">This link will expire in ${config.PASSWORD_RESET_TOKEN_TTL}. If you did not request a password reset, your password remains secure and no action is required.</p>
      </div>
    `;

    await this.sendEmail({ to, subject, text, html });
  }
}

export const emailService = new EmailService();

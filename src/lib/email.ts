import nodemailer from 'nodemailer'

const transporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}) : null

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!transporter) {
    console.log(`[EMAIL] Would send to ${options.to}: ${options.subject}`)
    return false // Email not configured
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@whaatopro.com',
      ...options,
    })
    return true
  } catch (error) {
    console.error('[EMAIL] Failed to send:', error)
    return false
  }
}

export function renderPasswordResetEmail(resetUrl: string): EmailOptions & { subject: string; html: string } {
  return {
    to: '', // Set by caller
    subject: 'Reset your WhaatoPro password',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #10b981;">Reset your password</h2>
        <p>You requested a password reset. Click the button below to set a new password.</p>
        <a href="${resetUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reset Password</a>
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
    text: `Reset your password: ${resetUrl}`,
  }
}

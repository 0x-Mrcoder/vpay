import nodemailer from 'nodemailer';
import { SystemSetting } from '../models/SystemSetting';
import config from '../config';

class EmailService {
    private async getTransporter() {
        // Try to get settings from DB
        const settings = await SystemSetting.findOne();

        if (settings && settings.emailConfig && settings.emailConfig.provider) {
            const { provider, gmail, smtp } = settings.emailConfig;

            if (provider === 'gmail') {
                return nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: gmail.user,
                        pass: gmail.pass,
                    },
                });
            } else {
                return nodemailer.createTransport({
                    host: smtp.host,
                    port: smtp.port,
                    secure: smtp.secure,
                    auth: {
                        user: smtp.user,
                        pass: smtp.pass,
                    },
                });
            }
        }

        // Fallback to Environment Variables
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            console.log('[EmailService] Using environment variables for email configuration');
            return nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
        }

        // Fallback for Gmail via Env
        if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
            console.log('[EmailService] Using GMAIL environment variables');
            return nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_PASS,
                },
            });
        }

        throw new Error('Email configuration not found in DB or Environment');
    }

    /**
     * Send a single email
     */
    async sendEmail(to: string, subject: string, html: string): Promise<void> {
        try {
            const transporter = await this.getTransporter();
            const settings = await SystemSetting.findOne();
            const from = settings?.general?.supportEmail || 'noreply@vtpay.com';
            const companyName = settings?.general?.companyName || 'VTStack';

            await transporter.sendMail({
                from: `"${companyName}" <${from}>`,
                to,
                subject,
                html,
            });
            console.log(`[EmailService] Email sent to ${to}`);
        } catch (error) {
            console.error('[EmailService] Failed to send email:', error);
        }
    }

    /**
     * Send bulk emails
     */
    async sendBulkEmail(emails: string[], subject: string, message: string): Promise<void> {
        try {
            const transporter = await this.getTransporter();
            const settings = await SystemSetting.findOne();
            const from = settings?.general?.supportEmail || 'noreply@vtpay.com';
            const companyName = settings?.general?.companyName || 'VTStack';

            // Convert plain text message to simple HTML (replace newlines with <br>)
            const html = `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                    ${message.replace(/\n/g, '<br>')}
                </div>
            `;

            // Send emails in parallel or chunks
            // For simplicity, we'll send them in parallel here, but for large lists, chunks are better
            const sendPromises = emails.map(email =>
                transporter.sendMail({
                    from: `"${companyName}" <${from}>`,
                    to: email,
                    subject,
                    html,
                }).catch(err => console.error(`[EmailService] Failed to send to ${email}:`, err))
            );

            await Promise.all(sendPromises);
            console.log(`[EmailService] Bulk email process completed for ${emails.length} recipients`);
        } catch (error) {
            console.error('[EmailService] Bulk email failed:', error);
        }
    }

    /**
     * Send verification OTP
     */
    async sendOtpEmail(email: string, otp: string): Promise<void> {
        const html = `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #16a34a;">Verify your VTStack Account</h2>
                <p>Welcome to VTStack! Please use the OTP below to verify your email address and activate your account.</p>
                <div style="margin: 30px 0; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #16a34a; text-align: center;">
                    ${otp}
                </div>
                <p style="color: #666; font-size: 12px;">This OTP is valid for 10 minutes. Do not share this code with anyone.</p>
            </div>
        `;
        return this.sendEmail(email, 'Verify your VTStack Account', html);
    }

    /**
     * Send verification email (Legacy)
     */
    async sendVerificationEmail(email: string, token: string): Promise<void> {
        const verificationLink = `${config.app.url || 'http://localhost:5173'}/verify-email?token=${token}`;
        const html = `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #16a34a;">Verify your VTStack Account</h2>
                <p>Welcome to VTStack! Please click the button below to verify your email address and activate your account.</p>
                <div style="margin: 30px 0;">
                    <a href="${verificationLink}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; rounded: 5px; font-weight: bold;">Verify Email Address</a>
                </div>
                <p style="color: #666; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="color: #666; font-size: 12px;">${verificationLink}</p>
            </div>
        `;
        return this.sendEmail(email, 'Verify your VTStack Account', html);
    }

    /**
     * Send account approval email
     */
    async sendApprovalEmail(email: string, name: string): Promise<void> {
        const dashboardLink = `${config.app.url || 'http://localhost:5173'}/dashboard`;
        const html = `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #16a34a;">Account Approved!</h2>
                <p>Hello ${name},</p>
                <p>We are pleased to inform you that your VTStack account has been reviewed and approved. You now have full access to all our features, including:</p>
                <ul style="color: #444;">
                    <li>Live API access for payment processing</li>
                    <li>Dedicated Virtual Accounts</li>
                    <li>Instant Wallet Payouts</li>
                    <li>Developer Tools and Webhooks</li>
                </ul>
                <p>You can now log in to your dashboard to start integrating and processing payments.</p>
                <div style="margin: 30px 0; text-align: center;">
                    <a href="${dashboardLink}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
                </div>
                <p style="color: #666; font-size: 14px;">If you have any questions, feel free to reply to this email or contact our support team.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">&copy; ${new Date().getFullYear()} VTStack. All rights reserved.</p>
            </div>
        `;
        return this.sendEmail(email, 'Your VTStack Account has been Approved!', html);
    }
    /**
     * Send transaction notification email
     */
    async sendTransactionNotification(email: string, name: string, transaction: any): Promise<void> {
        const amount = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(transaction.amount / 100);
        const date = new Date(transaction.createdAt).toLocaleString();
        const dashboardLink = `${config.app.url || 'http://localhost:5173'}/dashboard`;

        const html = `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #16a34a;">Transaction Successful</h2>
                <p>Hello ${name},</p>
                <p>You have received a new deposit of <strong>${amount}</strong>.</p>
                
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Reference:</strong> ${transaction.reference}</p>
                    <p style="margin: 5px 0;"><strong>Amount:</strong> ${amount}</p>
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
                    <p style="margin: 5px 0;"><strong>Narration:</strong> ${transaction.narration}</p>
                </div>

                <p>You can view the details in your dashboard.</p>
                <div style="margin: 30px 0; text-align: center;">
                    <a href="${dashboardLink}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Dashboard</a>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">&copy; ${new Date().getFullYear()} VTStack. All rights reserved.</p>
            </div>
        `;
        return this.sendEmail(email, 'Transaction Notification - VTStack', html);
    }

    /**
     * Send payout success notification email
     */
    async sendPayoutSuccessEmail(email: string, name: string, payout: any): Promise<void> {
        const amount = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(payout.amount / 100);
        const date = new Date(payout.completedAt || payout.updatedAt).toLocaleString();
        const dashboardLink = `${config.app.url || 'http://localhost:5173'}/dashboard/payout`;

        const html = `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #16a34a;">Payout Successful</h2>
                <p>Hi ${name},</p>
                <p>Your payout request of <strong>${amount}</strong> has been successfully processed to your bank account (<strong>${payout.bankCode} - ${payout.accountNumber}</strong>).</p>
                
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${payout.reference}</p>
                    <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${date}</p>
                </div>

                <p>You can view the details of this payout in your VTpay dashboard.</p>
                <div style="margin: 30px 0; text-align: center;">
                    <a href="${dashboardLink}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Payout History</a>
                </div>
                
                <p>Thank you for using VTpay!</p>
                <p>- The VTpay Team</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">&copy; ${new Date().getFullYear()} VTStack. All rights reserved.</p>
            </div>
        `;
        return this.sendEmail(email, 'Payout Successful - VTStack', html);
    }

    /**
     * Send webhook failure notification email
     */
    /**
     * Send notification to admins for KYC or Business Upgrade submission
     */
    async sendKycSubmissionAdminNotification(user: any, submissionType: 'KYC' | 'Business Upgrade'): Promise<void> {
        const adminEmails = ['aminumuhammad00015@gmail.com', 'vtpayltd@gmail.com'];
        const settings = await SystemSetting.findOne();
        const companyName = settings?.general?.companyName || 'VTStack';

        const html = `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #16a34a;">New Document Submission</h2>
                <p>Hello Admin,</p>
                <p>A user has submitted documents for <strong>${submissionType}</strong> verification on ${companyName}.</p>
                
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>User Name:</strong> ${user.fullName || (user.firstName + ' ' + user.lastName)}</p>
                    <p style="margin: 5px 0;"><strong>User Email:</strong> ${user.email}</p>
                    <p style="margin: 5px 0;"><strong>Submission Type:</strong> ${submissionType}</p>
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                </div>

                <p>Please log in to the admin dashboard to review and approve/reject this submission.</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
        `;

        const subject = `New ${submissionType} Submission - ${user.fullName || user.email}`;

        // Send to each admin email
        const sendPromises = adminEmails.map(email => this.sendEmail(email, subject, html));
        await Promise.all(sendPromises);
        console.log(`[EmailService] KYC submission notification sent to admins for user ${user.email}`);
    }
}

export const emailService = new EmailService();
export default EmailService;

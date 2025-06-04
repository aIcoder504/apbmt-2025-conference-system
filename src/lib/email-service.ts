// src/lib/email-service.ts
import nodemailer from 'nodemailer'

// Email configuration
const emailConfig = {
  service: process.env.EMAIL_SERVICE || 'gmail',
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
}

// Create transporter
let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(emailConfig)
  }
  return transporter
}

// Email interfaces
export interface EmailData {
  to: string
  cc?: string
  bcc?: string
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    path?: string
    content?: Buffer
    contentType?: string
  }>
}

export interface AbstractSubmissionEmailData {
  submissionId: string
  abstractId: string
  title: string
  author: string
  email: string
  institution: string
  attachedFiles: number
  submissionDate: string
}

export interface StatusUpdateEmailData {
  submissionId: string
  abstractId: string
  title: string
  author: string
  email: string
  status: 'approved' | 'rejected'
  comments?: string
  reviewDate: string
}

// Send email function
export async function sendEmail(emailData: EmailData): Promise<boolean> {
  try {
    const transport = getTransporter()
    
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_USER}>`,
      to: emailData.to,
      cc: emailData.cc,
      bcc: emailData.bcc,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      replyTo: process.env.EMAIL_REPLY_TO,
      attachments: emailData.attachments
    }

    const result = await transport.sendMail(mailOptions)
    console.log('📧 Email sent successfully:', result.messageId)
    return true
  } catch (error) {
    console.error('❌ Email sending failed:', error)
    return false
  }
}

// Generate submission confirmation email
export function generateSubmissionConfirmationEmail(data: AbstractSubmissionEmailData): EmailData {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Abstract Submission Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .detail-box { background: white; padding: 20px; margin: 15px 0; border-left: 4px solid #667eea; border-radius: 5px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; padding: 20px; color: #666; font-size: 14px; }
        .success-badge { background: #d4edda; color: #155724; padding: 10px; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Abstract Submission Successful!</h1>
          <p>${process.env.CONFERENCE_NAME}</p>
        </div>
        
        <div class="content">
          <div class="success-badge">
            ✅ Your abstract has been successfully submitted and is under review.
          </div>
          
          <p>Dear <strong>${data.author}</strong>,</p>
          
          <p>Thank you for submitting your abstract to ${process.env.CONFERENCE_NAME}. We have received your submission and it is now under review by our academic committee.</p>
          
          <div class="detail-box">
            <h3>📋 Submission Details</h3>
            <p><strong>Submission ID:</strong> ${data.submissionId}</p>
            <p><strong>Abstract ID:</strong> ${data.abstractId}</p>
            <p><strong>Title:</strong> ${data.title}</p>
            <p><strong>Author:</strong> ${data.author}</p>
            <p><strong>Institution:</strong> ${data.institution}</p>
            <p><strong>Submitted:</strong> ${new Date(data.submissionDate).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p><strong>Attached Files:</strong> ${data.attachedFiles} file(s)</p>
          </div>
          
          <div class="detail-box">
            <h3>📅 Next Steps</h3>
            <ul>
              <li>Your abstract will be reviewed within <strong>7-14 business days</strong></li>
              <li>You will receive an email notification about the review status</li>
              <li>If approved, you will receive presentation guidelines</li>
              <li>Registration details will be sent separately</li>
            </ul>
          </div>
          
          <div class="detail-box">
            <h3>📞 Need Help?</h3>
            <p>If you have any questions or need to make changes to your submission, please contact us:</p>
            <p>📧 Email: <a href="mailto:${process.env.CONFERENCE_EMAIL}">${process.env.CONFERENCE_EMAIL}</a></p>
            <p>🌐 Website: <a href="${process.env.CONFERENCE_WEBSITE}">${process.env.CONFERENCE_WEBSITE}</a></p>
          </div>
          
          <p>We appreciate your contribution to ${process.env.CONFERENCE_NAME} and look forward to your participation.</p>
          
          <p>Best regards,<br>
          <strong>${process.env.ADMIN_NAME}</strong><br>
          ${process.env.CONFERENCE_NAME}</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>© 2025 ${process.env.CONFERENCE_NAME}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return {
    to: data.email,
    subject: `✅ Abstract Submission Confirmed - ${data.submissionId}`,
    html,
    text: `Your abstract "${data.title}" has been successfully submitted to ${process.env.CONFERENCE_NAME}. Submission ID: ${data.submissionId}`
  }
}

// Generate admin notification email
export function generateAdminNotificationEmail(data: AbstractSubmissionEmailData): EmailData {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Abstract Submission</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
        .detail-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #dc3545; }
        .button { display: inline-block; padding: 10px 20px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🚨 New Abstract Submission</h2>
          <p>Admin Notification</p>
        </div>
        
        <div class="content">
          <p>A new abstract has been submitted and requires review.</p>
          
          <div class="detail-box">
            <h3>📋 Submission Details</h3>
            <p><strong>ID:</strong> ${data.submissionId}</p>
            <p><strong>Title:</strong> ${data.title}</p>
            <p><strong>Author:</strong> ${data.author}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Institution:</strong> ${data.institution}</p>
            <p><strong>Files:</strong> ${data.attachedFiles}</p>
            <p><strong>Submitted:</strong> ${new Date(data.submissionDate).toLocaleString()}</p>
          </div>
          
          <a href="${process.env.CONFERENCE_WEBSITE}/admin" class="button">Review in Admin Panel</a>
        </div>
      </div>
    </body>
    </html>
  `

  return {
    to: process.env.ADMIN_EMAIL || '',
    subject: `🚨 New Abstract Submission - ${data.title}`,
    html,
    text: `New abstract submitted: "${data.title}" by ${data.author} (${data.email})`
  }
}

// Generate status update email
export function generateStatusUpdateEmail(data: StatusUpdateEmailData): EmailData {
  const isApproved = data.status === 'approved'
  const statusColor = isApproved ? '#28a745' : '#dc3545'
  const statusEmoji = isApproved ? '🎉' : '❌'
  const statusText = isApproved ? 'APPROVED' : 'REJECTED'
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Abstract Review Status</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${statusColor}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .status-badge { background: ${statusColor}; color: white; padding: 15px; border-radius: 5px; text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; }
        .detail-box { background: white; padding: 20px; margin: 15px 0; border-left: 4px solid ${statusColor}; border-radius: 5px; }
        .footer { text-align: center; margin-top: 30px; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${statusEmoji} Abstract Review Complete</h1>
          <p>${process.env.CONFERENCE_NAME}</p>
        </div>
        
        <div class="content">
          <div class="status-badge">
            ${statusEmoji} YOUR ABSTRACT HAS BEEN ${statusText}
          </div>
          
          <p>Dear <strong>${data.author}</strong>,</p>
          
          <p>We have completed the review of your abstract submission. Please find the details below:</p>
          
          <div class="detail-box">
            <h3>📋 Submission Details</h3>
            <p><strong>Submission ID:</strong> ${data.submissionId}</p>
            <p><strong>Abstract ID:</strong> ${data.abstractId}</p>
            <p><strong>Title:</strong> ${data.title}</p>
            <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
            <p><strong>Review Date:</strong> ${new Date(data.reviewDate).toLocaleDateString()}</p>
          </div>
          
          ${data.comments ? `
          <div class="detail-box">
            <h3>💬 Review Comments</h3>
            <p>${data.comments}</p>
          </div>
          ` : ''}
          
          ${isApproved ? `
          <div class="detail-box">
            <h3>🎯 Next Steps</h3>
            <ul>
              <li>You will receive presentation guidelines within 2-3 business days</li>
              <li>Please complete your conference registration</li>
              <li>Prepare your presentation according to the guidelines</li>
              <li>Join us at ${process.env.CONFERENCE_NAME}!</li>
            </ul>
          </div>
          ` : `
          <div class="detail-box">
            <h3>🔄 Submission Options</h3>
            <p>While this submission was not accepted, we encourage you to:</p>
            <ul>
              <li>Review the feedback and consider resubmitting with improvements</li>
              <li>Attend the conference as a participant</li>
              <li>Submit to future conference calls</li>
            </ul>
          </div>
          `}
          
          <p>Thank you for your interest in ${process.env.CONFERENCE_NAME}.</p>
          
          <p>Best regards,<br>
          <strong>${process.env.ADMIN_NAME}</strong><br>
          ${process.env.CONFERENCE_NAME}</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>© 2025 ${process.env.CONFERENCE_NAME}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return {
    to: data.email,
    subject: `${statusEmoji} Abstract Review ${statusText} - ${data.submissionId}`,
    html,
    text: `Your abstract "${data.title}" has been ${statusText.toLowerCase()}. Submission ID: ${data.submissionId}`
  }
}

// Test email function
export async function sendTestEmail(toEmail: string): Promise<boolean> {
  const testEmailData: EmailData = {
    to: toEmail,
    subject: '✅ APBMT Email System Test',
    html: `
      <h2>🎉 Email System Working!</h2>
      <p>This is a test email from the APBMT Abstract Submission System.</p>
      <p>If you received this email, the email system is configured correctly.</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    `,
    text: 'APBMT Email System Test - Email working correctly!'
  }
  
  return await sendEmail(testEmailData)
}
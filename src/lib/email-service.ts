// src/lib/email-service.ts
import nodemailer from 'nodemailer';

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
};

console.log('📧 Email Service Configuration:', {
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  hasUser: !!emailConfig.auth.user,
  hasPass: !!emailConfig.auth.pass
});

// Create transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    try {
      transporter = nodemailer.createTransporter(emailConfig);
      console.log('✅ Email transporter created successfully');
    } catch (error) {
      console.error('❌ Email transporter creation failed:', error);
      throw error;
    }
  }
  return transporter;
}

// Email interfaces
export interface EmailData {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
  }>;
}

export interface AbstractSubmissionEmailData {
  submissionId: string;
  abstractId: string;
  title: string;
  author: string;
  email: string;
  institution: string;
  attachedFiles: number;
  submissionDate: string;
}

export interface StatusUpdateEmailData {
  submissionId: string;
  abstractId: string;
  title: string;
  author: string;
  email: string;
  status: 'approved' | 'rejected';
  comments?: string;
  reviewDate: string;
}

// Send email function with enhanced error handling
export async function sendEmail(emailData: EmailData): Promise<boolean> {
  try {
    console.log('📧 Attempting to send email to:', emailData.to);
    
    // Validate email configuration
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ Email credentials not configured');
      return false;
    }

    const transport = getTransporter();
    
    // Verify transporter configuration
    try {
      await transport.verify();
      console.log('✅ Email transporter verified successfully');
    } catch (verifyError) {
      console.error('❌ Email transporter verification failed:', verifyError);
      return false;
    }
    
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'APBMT 2025'} <${process.env.EMAIL_USER}>`,
      to: emailData.to,
      cc: emailData.cc,
      bcc: emailData.bcc,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text || emailData.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      replyTo: process.env.EMAIL_REPLY_TO || process.env.CONFERENCE_EMAIL,
      attachments: emailData.attachments
    };

    console.log('📧 Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    const result = await transport.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', {
      messageId: result.messageId,
      to: emailData.to,
      subject: emailData.subject
    });
    return true;
    
  } catch (error) {
    console.error('❌ Email sending failed:', {
      error: error.message,
      to: emailData.to,
      subject: emailData.subject
    });
    return false;
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
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0;
          background-color: #f8f9fa;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 40px 30px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .header p {
          margin: 10px 0 0 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .content { 
          padding: 40px 30px; 
        }
        .success-badge { 
          background: #d4edda; 
          color: #155724; 
          padding: 15px 20px; 
          border-radius: 8px; 
          margin: 20px 0; 
          border-left: 4px solid #28a745;
          font-weight: 500;
        }
        .detail-box { 
          background: #f8f9fa; 
          padding: 25px; 
          margin: 20px 0; 
          border-left: 4px solid #667eea; 
          border-radius: 8px;
        }
        .detail-box h3 {
          margin: 0 0 15px 0;
          color: #495057;
          font-size: 18px;
        }
        .detail-box p {
          margin: 8px 0;
        }
        .detail-box strong {
          color: #212529;
        }
        .detail-box ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .detail-box li {
          margin: 5px 0;
        }
        .footer { 
          background: #f8f9fa;
          text-align: center; 
          padding: 30px; 
          color: #6c757d; 
          font-size: 14px;
          border-top: 1px solid #dee2e6;
        }
        .contact-info {
          background: #e3f2fd;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .contact-info a {
          color: #1976d2;
          text-decoration: none;
        }
        .contact-info a:hover {
          text-decoration: underline;
        }
        @media (max-width: 600px) {
          .container { margin: 0; }
          .header, .content { padding: 20px; }
          .detail-box { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Submission Successful!</h1>
          <p>${process.env.CONFERENCE_NAME || 'APBMT 2025 Conference'}</p>
        </div>
        
        <div class="content">
          <div class="success-badge">
            ✅ Your abstract has been successfully submitted and is under review by our scientific committee.
          </div>
          
          <p>Dear <strong>${data.author}</strong>,</p>
          
          <p>Thank you for submitting your abstract to ${process.env.CONFERENCE_NAME || 'APBMT 2025 Conference'}. We have received your submission and it is now being processed by our academic review committee.</p>
          
          <div class="detail-box">
            <h3>📋 Submission Details</h3>
            <p><strong>Submission ID:</strong> ${data.submissionId}</p>
            <p><strong>Abstract ID:</strong> ${data.abstractId}</p>
            <p><strong>Title:</strong> ${data.title}</p>
            <p><strong>Presenting Author:</strong> ${data.author}</p>
            <p><strong>Institution:</strong> ${data.institution}</p>
            <p><strong>Submission Date:</strong> ${new Date(data.submissionDate).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short'
            })}</p>
            <p><strong>Attached Files:</strong> ${data.attachedFiles} file(s)</p>
          </div>
          
          <div class="detail-box">
            <h3>📅 Review Process & Timeline</h3>
            <ul>
              <li><strong>Review Period:</strong> Your abstract will be reviewed within 7-14 business days</li>
              <li><strong>Notification:</strong> You will receive an email notification about the review decision</li>
              <li><strong>If Approved:</strong> Presentation guidelines and conference details will be provided</li>
              <li><strong>Registration:</strong> Conference registration information will be sent separately</li>
            </ul>
          </div>
          
          <div class="detail-box">
            <h3>📝 Important Information</h3>
            <ul>
              <li>Please keep this email for your records</li>
              <li>Use your Submission ID (${data.submissionId}) for any correspondence</li>
              <li>No changes can be made to your submission after this point</li>
              <li>All correspondence will be sent to: ${data.email}</li>
            </ul>
          </div>
          
          <div class="contact-info">
            <h3>📞 Need Assistance?</h3>
            <p>If you have any questions or concerns about your submission, please contact us:</p>
            <p>📧 <strong>Email:</strong> <a href="mailto:${process.env.CONFERENCE_EMAIL || 'info@apbmt2025.org'}">${process.env.CONFERENCE_EMAIL || 'info@apbmt2025.org'}</a></p>
            <p>🌐 <strong>Website:</strong> <a href="${process.env.NEXTAUTH_URL || 'https://apbmt2025.org'}">${process.env.NEXTAUTH_URL || 'https://apbmt2025.org'}</a></p>
            <p>📱 <strong>Phone:</strong> Available during business hours</p>
          </div>
          
          <p>We appreciate your contribution to ${process.env.CONFERENCE_NAME || 'APBMT 2025'} and look forward to your participation in this prestigious event.</p>
          
          <p>Best regards,<br>
          <strong>${process.env.ADMIN_NAME || 'Conference Organizing Committee'}</strong><br>
          ${process.env.CONFERENCE_NAME || 'APBMT 2025 Conference'}</p>
        </div>
        
        <div class="footer">
          <p>This is an automated confirmation message. Please do not reply directly to this email.</p>
          <p>© 2025 ${process.env.CONFERENCE_NAME || 'APBMT Conference'}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Abstract Submission Confirmation - ${process.env.CONFERENCE_NAME || 'APBMT 2025'}

Dear ${data.author},

Your abstract "${data.title}" has been successfully submitted.

Submission Details:
- Submission ID: ${data.submissionId}
- Abstract ID: ${data.abstractId}
- Title: ${data.title}
- Author: ${data.author}
- Institution: ${data.institution}
- Submitted: ${new Date(data.submissionDate).toLocaleString()}
- Files: ${data.attachedFiles}

Your abstract is now under review. You will receive notification within 7-14 business days.

For questions, contact: ${process.env.CONFERENCE_EMAIL || 'info@apbmt2025.org'}

Best regards,
${process.env.ADMIN_NAME || 'Conference Organizing Committee'}
  `;

  return {
    to: data.email,
    subject: `✅ Abstract Submission Confirmed - ${data.submissionId} | ${process.env.CONFERENCE_NAME || 'APBMT 2025'}`,
    html,
    text: textContent
  };
}

// Generate admin notification email
export function generateAdminNotificationEmail(data: AbstractSubmissionEmailData): EmailData {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Abstract Submission - Admin Notification</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0;
          background-color: #f8f9fa;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); 
          color: white; 
          padding: 30px; 
          text-align: center; 
        }
        .header h2 {
          margin: 0;
          font-size: 24px;
        }
        .content { 
          padding: 30px; 
        }
        .detail-box { 
          background: #f8f9fa; 
          padding: 20px; 
          margin: 15px 0; 
          border-left: 4px solid #dc3545; 
          border-radius: 5px;
        }
        .detail-box h3 {
          margin: 0 0 15px 0;
          color: #495057;
        }
        .detail-box p {
          margin: 5px 0;
        }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background: #dc3545; 
          color: white !important; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 20px 0;
          font-weight: 500;
        }
        .button:hover {
          background: #c82333;
        }
        .urgent {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🚨 New Abstract Submission</h2>
          <p>Admin Review Required</p>
        </div>
        
        <div class="content">
          <div class="urgent">
            <strong>⚠️ Action Required:</strong> A new abstract has been submitted and is awaiting your review.
          </div>
          
          <p>A new abstract submission has been received and requires administrative review.</p>
          
          <div class="detail-box">
            <h3>📋 Submission Information</h3>
            <p><strong>Submission ID:</strong> ${data.submissionId}</p>
            <p><strong>Abstract ID:</strong> ${data.abstractId}</p>
            <p><strong>Title:</strong> ${data.title}</p>
            <p><strong>Presenting Author:</strong> ${data.author}</p>
            <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
            <p><strong>Institution:</strong> ${data.institution}</p>
            <p><strong>Attached Files:</strong> ${data.attachedFiles} file(s)</p>
            <p><strong>Submitted:</strong> ${new Date(data.submissionDate).toLocaleString('en-US', {
              year: 'numeric',
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short'
            })}</p>
          </div>
          
          <div class="detail-box">
            <h3>⏰ Review Timeline</h3>
            <p>Please review this submission within the next 7-14 business days to maintain our response timeline commitments to submitters.</p>
          </div>
          
          <a href="${process.env.NEXTAUTH_URL || 'https://conference.org'}/admin" class="button">
            📝 Review in Admin Panel
          </a>
          
          <p><small>This notification was sent to: ${process.env.ADMIN_EMAIL || 'admin@conference.org'}</small></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
NEW ABSTRACT SUBMISSION - Admin Notification

Submission Details:
- ID: ${data.submissionId}
- Title: ${data.title}
- Author: ${data.author}
- Email: ${data.email}
- Institution: ${data.institution}
- Files: ${data.attachedFiles}
- Submitted: ${new Date(data.submissionDate).toLocaleString()}

Review required within 7-14 business days.
Admin Panel: ${process.env.NEXTAUTH_URL || 'https://conference.org'}/admin
  `;

  return {
    to: process.env.ADMIN_EMAIL || 'admin@conference.org',
    cc: process.env.CONFERENCE_EMAIL,
    subject: `🚨 New Abstract Submission: ${data.title} | Review Required`,
    html,
    text: textContent
  };
}

// Generate status update email
export function generateStatusUpdateEmail(data: StatusUpdateEmailData): EmailData {
  const isApproved = data.status === 'approved';
  const statusColor = isApproved ? '#28a745' : '#dc3545';
  const statusEmoji = isApproved ? '🎉' : '❌';
  const statusText = isApproved ? 'APPROVED' : 'REJECTED';
  const statusBg = isApproved ? '#d4edda' : '#f8d7da';
  const statusTextColor = isApproved ? '#155724' : '#721c24';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Abstract Review Decision</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0;
          background-color: #f8f9fa;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background: ${statusColor}; 
          color: white; 
          padding: 40px 30px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content { 
          padding: 40px 30px; 
        }
        .status-badge { 
          background: ${statusBg}; 
          color: ${statusTextColor}; 
          padding: 20px; 
          border-radius: 8px; 
          text-align: center; 
          font-size: 20px; 
          font-weight: bold; 
          margin: 25px 0;
          border: 2px solid ${statusColor};
        }
        .detail-box { 
          background: #f8f9fa; 
          padding: 25px; 
          margin: 20px 0; 
          border-left: 4px solid ${statusColor}; 
          border-radius: 8px;
        }
        .detail-box h3 {
          margin: 0 0 15px 0;
          color: #495057;
          font-size: 18px;
        }
        .detail-box p {
          margin: 8px 0;
        }
        .detail-box ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .detail-box li {
          margin: 8px 0;
        }
        .comments-box {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
        }
        .next-steps {
          background: ${isApproved ? '#d1ecf1' : '#f8d7da'};
          border-left: 4px solid ${isApproved ? '#17a2b8' : '#dc3545'};
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
        }
        .footer { 
          background: #f8f9fa;
          text-align: center; 
          padding: 30px; 
          color: #6c757d; 
          font-size: 14px;
          border-top: 1px solid #dee2e6;
        }
        .contact-info {
          background: #e3f2fd;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        @media (max-width: 600px) {
          .container { margin: 0; }
          .header, .content { padding: 20px; }
          .detail-box { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${statusEmoji} Review Complete</h1>
          <p>${process.env.CONFERENCE_NAME || 'APBMT 2025 Conference'}</p>
        </div>
        
        <div class="content">
          <div class="status-badge">
            ${statusEmoji} YOUR ABSTRACT HAS BEEN ${statusText}
          </div>
          
          <p>Dear <strong>${data.author}</strong>,</p>
          
          <p>We have completed the peer review of your abstract submission. Please find the detailed review decision and next steps below:</p>
          
          <div class="detail-box">
            <h3>📋 Submission Details</h3>
            <p><strong>Submission ID:</strong> ${data.submissionId}</p>
            <p><strong>Abstract ID:</strong> ${data.abstractId}</p>
            <p><strong>Title:</strong> ${data.title}</p>
            <p><strong>Review Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
            <p><strong>Review Completed:</strong> ${new Date(data.reviewDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
          
          ${data.comments ? `
          <div class="comments-box">
            <h3>💬 Reviewer Comments</h3>
            <p>${data.comments}</p>
          </div>
          ` : ''}
          
          ${isApproved ? `
          <div class="next-steps">
            <h3>🎯 Next Steps for Approved Abstract</h3>
            <ul>
              <li><strong>Presentation Guidelines:</strong> You will receive detailed presentation guidelines within 2-3 business days</li>
              <li><strong>Conference Registration:</strong> Please complete your conference registration using the link that will be provided</li>
              <li><strong>Presentation Preparation:</strong> Begin preparing your presentation according to the guidelines</li>
              <li><strong>Travel Arrangements:</strong> Start planning your travel and accommodation</li>
              <li><strong>Certificate:</strong> You will receive a participation certificate after the conference</li>
            </ul>
          </div>
          ` : `
          <div class="next-steps">
            <h3>🔄 Options Moving Forward</h3>
            <p>While your current submission was not accepted for presentation, we encourage you to:</p>
            <ul>
              <li><strong>Review Feedback:</strong> Consider the reviewer comments for future submissions</li>
              <li><strong>Conference Attendance:</strong> You are welcome to attend the conference as a participant</li>
              <li><strong>Future Submissions:</strong> We encourage you to submit to future conference calls</li>
              <li><strong>Networking:</strong> The conference offers excellent networking opportunities</li>
            </ul>
          </div>
          `}
          
          <div class="contact-info">
            <h3>📞 Questions or Concerns?</h3>
            <p>If you have any questions about this decision or need clarification, please contact us:</p>
            <p>📧 <strong>Email:</strong> <a href="mailto:${process.env.CONFERENCE_EMAIL || 'info@apbmt2025.org'}">${process.env.CONFERENCE_EMAIL || 'info@apbmt2025.org'}</a></p>
            <p>📱 <strong>Phone:</strong> Available during business hours</p>
          </div>
          
          <p>Thank you for your interest and contribution to ${process.env.CONFERENCE_NAME || 'APBMT 2025'}. We appreciate your participation in advancing medical research and education.</p>
          
          <p>Best regards,<br>
          <strong>${process.env.ADMIN_NAME || 'Scientific Review Committee'}</strong><br>
          ${process.env.CONFERENCE_NAME || 'APBMT 2025 Conference'}</p>
        </div>
        
        <div class="footer">
          <p>This is an automated notification. Please do not reply directly to this email.</p>
          <p>© 2025 ${process.env.CONFERENCE_NAME || 'APBMT Conference'}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Abstract Review Decision - ${process.env.CONFERENCE_NAME || 'APBMT 2025'}

Dear ${data.author},

Your abstract "${data.title}" has been ${statusText.toLowerCase()}.

Submission Details:
- Submission ID: ${data.submissionId}
- Abstract ID: ${data.abstractId}
- Status: ${statusText}
- Review Date: ${new Date(data.reviewDate).toLocaleString()}

${data.comments ? `Reviewer Comments: ${data.comments}` : ''}

${isApproved ? 
  'Next Steps: You will receive presentation guidelines within 2-3 business days. Please complete conference registration when prompted.' :
  'Future Opportunities: Consider attending the conference as a participant and submitting to future calls.'
}

Questions? Contact: ${process.env.CONFERENCE_EMAIL || 'info@apbmt2025.org'}

Best regards,
${process.env.ADMIN_NAME || 'Scientific Review Committee'}
  `;

  return {
    to: data.email,
    subject: `${statusEmoji} Abstract Review ${statusText}: ${data.submissionId} | ${process.env.CONFERENCE_NAME || 'APBMT 2025'}`,
    html,
    text: textContent
  };
}

// Test email function
export async function sendTestEmail(toEmail: string): Promise<boolean> {
  console.log('📧 Sending test email to:', toEmail);
  
  const testEmailData: EmailData = {
    to: toEmail,
    subject: '✅ APBMT Email System Test - Success!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 500px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px; }
          .content { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .success { background: #d4edda; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🎉 Email System Test</h2>
            <p>APBMT Conference Management</p>
          </div>
          
          <div class="content">
            <div class="success">
              ✅ <strong>Email System Working Perfectly!</strong>
            </div>
            
            <p>This is a test email from the APBMT Abstract Submission System.</p>
            
            <p><strong>Test Details:</strong></p>
            <ul>
              <li><strong>Recipient:</strong> ${toEmail}</li>
              <li><strong>Sent:</strong> ${new Date().toLocaleString()}</li>
              <li><strong>System:</strong> ${process.env.EMAIL_HOST || 'SMTP Service'}</li>
              <li><strong>Status:</strong> Email delivery successful</li>
            </ul>
            
            <p>If you received this email, the email notification system is configured correctly and ready for production use.</p>
            
            <p><strong>System Configuration:</strong></p>
            <ul>
              <li>Email Service: ${process.env.EMAIL_SERVICE || 'Gmail'}</li>
              <li>SMTP Host: ${process.env.EMAIL_HOST || 'smtp.gmail.com'}</li>
              <li>From Address: ${process.env.EMAIL_USER || 'Not configured'}</li>
              <li>Conference: ${process.env.CONFERENCE_NAME || 'APBMT 2025'}</li>
            </ul>
            
            <p>All email notifications for abstract submissions, status updates, and admin notifications are now operational.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
APBMT Email System Test - Success!

This is a test email from the APBMT Abstract Submission System.

Test Details:
- Recipient: ${toEmail}
- Sent: ${new Date().toLocaleString()}
- System: ${process.env.EMAIL_HOST || 'SMTP Service'}
- Status: Email delivery successful

If you received this email, the system is working correctly.

Configuration:
- Email Service: ${process.env.EMAIL_SERVICE || 'Gmail'}
- SMTP Host: ${process.env.EMAIL_HOST || 'smtp.gmail.com'}
- From: ${process.env.EMAIL_USER || 'Not configured'}
- Conference: ${process.env.CONFERENCE_NAME || 'APBMT 2025'}

All email notifications are now operational.
    `
  };
  
  return await sendEmail(testEmailData);
}

// Bulk email function for multiple recipients
export async function sendBulkEmails(emails: EmailData[]): Promise<{
  sent: number;
  failed: number;
  results: Array<{ email: string; success: boolean; error?: string }>;
}> {
  console.log('📧 Starting bulk email send for', emails.length, 'emails');
  
  const results = [];
  let sent = 0;
  let failed = 0;

  for (const emailData of emails) {
    try {
      const success = await sendEmail(emailData);
      if (success) {
        sent++;
        results.push({ email: emailData.to, success: true });
      } else {
        failed++;
        results.push({ email: emailData.to, success: false, error: 'Send failed' });
      }
      
      // Small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      failed++;
      results.push({ 
        email: emailData.to, 
        success: false, 
        error: error.message || 'Unknown error' 
      });
    }
  }

  console.log(`📊 Bulk email completed: ${sent} sent, ${failed} failed`);
  
  return { sent, failed, results };
}

// Email validation function
export function validateEmailAddress(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Check email service configuration
export function checkEmailConfiguration(): {
  configured: boolean;
  missing: string[];
  status: string;
} {
  const missing = [];
  
  if (!process.env.EMAIL_USER) missing.push('EMAIL_USER');
  if (!process.env.EMAIL_PASS) missing.push('EMAIL_PASS');
  if (!process.env.EMAIL_HOST) missing.push('EMAIL_HOST');
  
  const configured = missing.length === 0;
  const status = configured ? 'Ready' : `Missing: ${missing.join(', ')}`;
  
  return { configured, missing, status };
}

// Export email service status
export async function getEmailServiceStatus(): Promise<{
  operational: boolean;
  configuration: any;
  lastTest?: Date;
}> {
  const config = checkEmailConfiguration();
  
  return {
    operational: config.configured,
    configuration: {
      service: process.env.EMAIL_SERVICE || 'gmail',
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || '587',
      secure: process.env.EMAIL_SECURE === 'true',
      hasCredentials: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
      fromName: process.env.EMAIL_FROM_NAME || 'APBMT 2025',
      adminEmail: process.env.ADMIN_EMAIL || 'Not configured',
      conferenceEmail: process.env.CONFERENCE_EMAIL || 'Not configured'
    },
    lastTest: new Date()
  };
}

// src/app/api/abstracts/email/route.js
import { NextResponse } from 'next/server';
import { 
  sendEmail, 
  generateSubmissionConfirmationEmail,
  generateAdminNotificationEmail,
  generateStatusUpdateEmail,
  sendTestEmail
} from '../../../../lib/email-service.ts';
import { getAbstractById, getUserById } from '../../../../lib/database-postgres.js';

console.log('📧 APBMT Abstracts Email API loaded at:', new Date().toISOString());

// POST - Handle email notifications for abstracts
export async function POST(request) {
  try {
    console.log('📨 Abstract email request received');
    
    const { type, data, abstractIds, status, comments } = await request.json();
    console.log('📧 Email type:', type, 'Data:', data ? 'Present' : 'Missing');

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Email type is required' },
        { status: 400 }
      );
    }

    let emailsSent = 0;
    let emailsTotal = 0;
    let errors = [];

    switch (type) {
      case 'submission_confirmation':
        if (!data || !data.email || !data.abstractId) {
          return NextResponse.json(
            { success: false, error: 'Missing required data for submission confirmation' },
            { status: 400 }
          );
        }
        
        console.log('📧 Sending submission confirmation to:', data.email);
        
        const confirmationEmail = generateSubmissionConfirmationEmail({
          submissionId: data.submissionId || data.abstractId,
          abstractId: data.abstractId,
          title: data.title,
          author: data.author,
          email: data.email,
          institution: data.institution,
          attachedFiles: data.attachedFiles || 0,
          submissionDate: data.submissionDate || new Date().toISOString()
        });
        
        const confirmationSent = await sendEmail(confirmationEmail);
        
        if (confirmationSent) {
          emailsSent = 1;
          console.log('✅ Submission confirmation sent successfully');
        } else {
          errors.push('Failed to send submission confirmation');
        }
        emailsTotal = 1;
        break;

      case 'admin_notification':
        if (!data || !data.title) {
          return NextResponse.json(
            { success: false, error: 'Missing required data for admin notification' },
            { status: 400 }
          );
        }
        
        console.log('📧 Sending admin notification for:', data.title);
        
        const adminEmail = generateAdminNotificationEmail({
          submissionId: data.submissionId || data.abstractId,
          abstractId: data.abstractId,
          title: data.title,
          author: data.author,
          email: data.email,
          institution: data.institution,
          attachedFiles: data.attachedFiles || 0,
          submissionDate: data.submissionDate || new Date().toISOString()
        });
        
        const adminSent = await sendEmail(adminEmail);
        
        if (adminSent) {
          emailsSent = 1;
          console.log('✅ Admin notification sent successfully');
        } else {
          errors.push('Failed to send admin notification');
        }
        emailsTotal = 1;
        break;

      case 'status_update':
        if (!data || !data.email || !data.status) {
          return NextResponse.json(
            { success: false, error: 'Missing required data for status update' },
            { status: 400 }
          );
        }
        
        console.log('📧 Sending status update to:', data.email, 'Status:', data.status);
        
        const statusEmail = generateStatusUpdateEmail({
          submissionId: data.submissionId || data.abstractId,
          abstractId: data.abstractId,
          title: data.title,
          author: data.author,
          email: data.email,
          status: data.status,
          comments: data.comments,
          reviewDate: data.reviewDate || new Date().toISOString()
        });
        
        const statusSent = await sendEmail(statusEmail);
        
        if (statusSent) {
          emailsSent = 1;
          console.log('✅ Status update email sent successfully');
        } else {
          errors.push('Failed to send status update email');
        }
        emailsTotal = 1;
        break;

      case 'bulk_status_update':
        if (!abstractIds || !Array.isArray(abstractIds) || !status) {
          return NextResponse.json(
            { success: false, error: 'Missing abstractIds array or status for bulk update' },
            { status: 400 }
          );
        }
        
        console.log('📧 Sending bulk status update emails for', abstractIds.length, 'abstracts');
        
        emailsTotal = abstractIds.length;
        
        for (const abstractId of abstractIds) {
          try {
            // Get abstract details from database
            const abstract = await getAbstractById(abstractId);
            if (!abstract) {
              console.error('❌ Abstract not found:', abstractId);
              errors.push(`Abstract ${abstractId} not found`);
              continue;
            }

            // Get user details from database
            const user = await getUserById(abstract.user_id);
            if (!user || !user.email) {
              console.error('❌ User email not found for abstract:', abstractId);
              errors.push(`User email not found for abstract ${abstractId}`);
              continue;
            }

            console.log('📧 Sending bulk email to:', user.email, 'for abstract:', abstractId);

            const bulkStatusEmail = generateStatusUpdateEmail({
              submissionId: abstract.abstract_number || abstractId,
              abstractId: abstractId,
              title: abstract.title,
              author: abstract.presenter_name,
              email: user.email,
              status: status,
              comments: comments,
              reviewDate: new Date().toISOString()
            });
            
            const bulkSent = await sendEmail(bulkStatusEmail);
            
            if (bulkSent) {
              emailsSent++;
              console.log('✅ Bulk email sent to:', user.email);
            } else {
              errors.push(`Failed to send email to ${user.email} for abstract ${abstractId}`);
              console.error('❌ Failed to send bulk email to:', user.email);
            }
            
            // Small delay to avoid overwhelming the email service
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (bulkError) {
            console.error('❌ Bulk email error for abstract', abstractId, ':', bulkError);
            errors.push(`Error processing abstract ${abstractId}: ${bulkError.message}`);
          }
        }
        
        console.log(`📊 Bulk email completed: ${emailsSent}/${emailsTotal} sent`);
        break;

      case 'test':
        if (!data || !data.email) {
          return NextResponse.json(
            { success: false, error: 'Email address required for test' },
            { status: 400 }
          );
        }
        
        console.log('📧 Sending test email to:', data.email);
        
        const testSent = await sendTestEmail(data.email);
        
        if (testSent) {
          emailsSent = 1;
          console.log('✅ Test email sent successfully');
        } else {
          errors.push('Failed to send test email');
        }
        emailsTotal = 1;
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid email type: ' + type },
          { status: 400 }
        );
    }

    // Return results
    const success = emailsSent > 0;
    const message = emailsTotal === 1 
      ? (success ? `${type.replace('_', ' ')} email sent successfully` : `Failed to send ${type.replace('_', ' ')} email`)
      : `Bulk email completed: ${emailsSent}/${emailsTotal} sent successfully`;

    return NextResponse.json({
      success,
      message,
      type,
      results: {
        emailsSent,
        emailsTotal,
        successRate: emailsTotal > 0 ? `${((emailsSent / emailsTotal) * 100).toFixed(1)}%` : '0%',
        errors: errors.length > 0 ? errors : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Abstract email API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// GET - Email system status for abstracts
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const email = url.searchParams.get('email');

    if (action === 'test' && email) {
      console.log('📧 Testing email system with:', email);
      
      const testSent = await sendTestEmail(email);
      
      return NextResponse.json({
        success: testSent,
        message: testSent ? 'Test email sent successfully' : 'Test email failed',
        testEmail: email,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Abstract email API is operational',
      endpoints: {
        POST: 'Send emails (submission_confirmation, admin_notification, status_update, bulk_status_update, test)',
        'GET?action=test&email=xxx': 'Send test email to specified address'
      },
      supportedTypes: [
        'submission_confirmation',
        'admin_notification', 
        'status_update',
        'bulk_status_update',
        'test'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Abstract email GET error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process request',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

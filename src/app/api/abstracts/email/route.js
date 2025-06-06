// src/app/api/abstracts/email/route.js - VERCEL PRODUCTION READY
import { NextResponse } from 'next/server';

// ✅ FIXED: Use .js import for Vercel compatibility
const {
  sendEmail,
  generateStatusUpdateEmail,
  sendTestEmail,
  sendBulkEmails
} = require('../../../../lib/email-service.js');

console.log('📧 APBMT Abstracts Email API loaded at:', new Date().toISOString());

// POST - Handle email notifications for abstracts
export async function POST(request) {
  try {
    console.log('📨 Abstract email request received');
    
    const body = await request.json();
    const { type, data, abstractIds, status, comments } = body;
    
    console.log('📧 Email request:', {
      type: type,
      hasData: !!data,
      abstractIdsCount: abstractIds?.length || 0,
      status: status
    });

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
      case 'status_update':
        if (!data || !data.email || !data.status) {
          return NextResponse.json(
            { success: false, error: 'Missing required data: email and status required' },
            { status: 400 }
          );
        }
        
        console.log('📧 Sending status update to:', data.email, 'Status:', data.status);
        
        try {
          const statusEmail = generateStatusUpdateEmail({
            submissionId: data.submissionId || data.abstractId,
            abstractId: data.abstractId,
            title: data.title,
            name: data.name,
            email: data.email,
            status: data.status,
            comments: data.comments,
            category: data.category,
            institution: data.institution,
            reviewDate: data.reviewDate || new Date().toISOString()
          });
          
          const result = await sendEmail(statusEmail);
          
          if (result.success) {
            emailsSent = 1;
            console.log('✅ Status update email sent successfully to:', data.email);
          } else {
            errors.push(`Failed to send email to ${data.email}: ${result.error}`);
            console.error('❌ Status update email failed:', result.error);
          }
          
        } catch (statusError) {
          console.error('❌ Status update error:', statusError);
          errors.push(`Status update error: ${statusError.message}`);
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
        
        try {
          const bulkResult = await sendBulkEmails(abstractIds, status, comments);
          
          if (bulkResult.success) {
            emailsSent = bulkResult.results.successful;
            emailsTotal = bulkResult.results.total;
            
            if (bulkResult.results.failed > 0) {
              errors.push(`${bulkResult.results.failed} emails failed to send`);
            }
            
            console.log(`📊 Bulk email completed: ${emailsSent}/${emailsTotal} sent`);
          } else {
            errors.push(`Bulk email process failed: ${bulkResult.error}`);
            emailsTotal = abstractIds.length;
          }
          
        } catch (bulkError) {
          console.error('❌ Bulk email error:', bulkError);
          errors.push(`Bulk email error: ${bulkError.message}`);
          emailsTotal = abstractIds.length;
        }
        break;

      case 'test':
        if (!data || !data.email) {
          return NextResponse.json(
            { success: false, error: 'Email address required for test' },
            { status: 400 }
          );
        }
        
        console.log('📧 Sending test email to:', data.email);
        
        try {
          const testSent = await sendTestEmail(data.email);
          
          if (testSent) {
            emailsSent = 1;
            console.log('✅ Test email sent successfully to:', data.email);
          } else {
            errors.push('Failed to send test email');
            console.error('❌ Test email failed');
          }
          
        } catch (testError) {
          console.error('❌ Test email error:', testError);
          errors.push(`Test email error: ${testError.message}`);
        }
        
        emailsTotal = 1;
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid email type: ' + type },
          { status: 400 }
        );
    }

    // Calculate success
    const success = emailsSent > 0;
    const successRate = emailsTotal > 0 ? ((emailsSent / emailsTotal) * 100).toFixed(1) : '0';
    
    console.log(`📊 Email operation completed: ${emailsSent}/${emailsTotal} (${successRate}%) successful`);

    // Return results
    return NextResponse.json({
      success,
      message: emailsTotal === 1 
        ? (success ? `Email sent successfully` : `Failed to send email`)
        : `Bulk email: ${emailsSent}/${emailsTotal} sent (${successRate}%)`,
      type,
      results: {
        emailsSent,
        emailsTotal,
        successRate: `${successRate}%`,
        errors: errors.length > 0 ? errors : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Abstract email API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// GET - Email system status and test
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const email = url.searchParams.get('email');

    if (action === 'test' && email) {
      console.log('📧 Testing email system with:', email);
      
      try {
        const testSent = await sendTestEmail(email);
        
        return NextResponse.json({
          success: testSent,
          message: testSent ? 'Test email sent successfully' : 'Test email failed',
          testEmail: email,
          timestamp: new Date().toISOString()
        });
        
      } catch (testError) {
        console.error('❌ Email test error:', testError);
        return NextResponse.json({
          success: false,
          message: 'Test email failed',
          error: testError.message,
          testEmail: email,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Default status response
    return NextResponse.json({
      success: true,
      message: 'Abstract email API is operational',
      endpoints: {
        POST: 'Send emails (status_update, bulk_status_update, test)',
        'GET?action=test&email=xxx': 'Send test email to specified address'
      },
      supportedTypes: [
        'status_update',
        'bulk_status_update',
        'test'
      ],
      configuration: {
        hasEmailUser: !!process.env.EMAIL_USER,
        hasEmailPass: !!process.env.EMAIL_PASS,
        emailService: 'Gmail SMTP'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Abstract email GET error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process request',
        details: error.message,
        timestamp: new Date().toISOString()
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

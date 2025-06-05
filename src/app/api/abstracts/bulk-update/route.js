// src/app/api/abstracts/bulk-update/route.js
// COMPLETE PRODUCTION-READY BULK UPDATE API - PostgreSQL Version
import { NextResponse } from 'next/server';
import { 
  bulkUpdateAbstractStatus, 
  getAllAbstracts, 
  getStatistics, 
  testConnection 
} from '@/lib/database-postgres';

// API Configuration
const API_VERSION = '2.0';
const MAX_BULK_SIZE = 100;

// Initialize API
console.log('🚀 APBMT Bulk Update API v' + API_VERSION + ' (PostgreSQL) loaded at:', new Date().toISOString());

// Utility Functions
function generateRequestId() {
  return 'REQ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

function createApiResponse(success, data, message, metadata = {}) {
  return {
    // Standard response format
    success,
    message,
    data,
    timestamp: new Date().toISOString(),
    version: API_VERSION,
    
    // Bulk operation specific fields
    successful: data?.successful || 0,
    failed: data?.failed || 0,
    total: data?.total || 0,
    results: data?.results || [],
    
    // Alternative naming conventions (frontend compatibility)
    updatedCount: data?.successful || 0,
    failedCount: data?.failed || 0,
    totalCount: data?.total || 0,
    
    // Status flags
    operationSuccess: success,
    databaseUpdated: (data?.successful || 0) > 0,
    hasErrors: (data?.failed || 0) > 0,
    allSuccessful: success && (data?.failed || 0) === 0,
    partialSuccess: success && (data?.failed || 0) > 0 && (data?.successful || 0) > 0,
    noUpdates: (data?.successful || 0) === 0,
    
    // Error information
    error: success ? null : (message || 'Operation failed'),
    errors: data?.errors || null,
    
    // Metadata
    metadata: {
      requestId: metadata.requestId,
      processingTime: metadata.processingTime,
      database: 'PostgreSQL',
      ...metadata
    }
  };
}

// Validation Functions
function validateBulkRequest(body) {
  const errors = [];
  
  // Check required fields
  if (!body.abstractIds) {
    errors.push('abstractIds field is required');
  } else if (!Array.isArray(body.abstractIds)) {
    errors.push('abstractIds must be an array');
  } else if (body.abstractIds.length === 0) {
    errors.push('abstractIds array cannot be empty');
  } else if (body.abstractIds.length > MAX_BULK_SIZE) {
    errors.push(`Cannot process more than ${MAX_BULK_SIZE} abstracts at once`);
  }
  
  // Check status
  const validStatuses = ['pending', 'approved', 'rejected', 'final_submitted'];
  if (!body.status) {
    errors.push('status field is required');
  } else if (!validStatuses.includes(body.status)) {
    errors.push(`status must be one of: ${validStatuses.join(', ')}`);
  }
  
  // Check abstract IDs format
  if (body.abstractIds && Array.isArray(body.abstractIds)) {
    body.abstractIds.forEach((id, index) => {
      if (!id || (typeof id !== 'string' && typeof id !== 'number')) {
        errors.push(`Invalid abstract ID at index ${index}: ${id}`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Email Notification Function
async function sendBulkStatusNotification(abstractIds, newStatus, comments) {
  try {
    console.log(`📧 Queuing bulk status update emails for ${abstractIds.length} abstracts`);
    
    // Send bulk email notification (async, don't wait)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    fetch(`${baseUrl}/api/abstracts/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'bulk_status_update',
        abstractIds: abstractIds,
        status: newStatus,
        comments: comments,
        reviewDate: new Date().toISOString()
      })
    }).catch(err => {
      console.error(`❌ Bulk email notification failed:`, err.message);
    });
    
  } catch (error) {
    console.error(`❌ Bulk email notification error:`, error);
  }
}

// Main Bulk Update Handler
async function processBulkUpdate(abstractIds, status, comments, updatedBy, requestId) {
  const startTime = Date.now();
  console.log(`🔄 [${requestId}] Starting PostgreSQL bulk update: ${abstractIds.length} abstracts → ${status}`);
  
  try {
    // Test database connection
    await testConnection();

    // Bulk update in PostgreSQL
    const updatedAbstracts = await bulkUpdateAbstractStatus(abstractIds, status, comments);
    
    if (!updatedAbstracts || updatedAbstracts.length === 0) {
      console.log(`❌ [${requestId}] No abstracts were updated`);
      return {
        successful: 0,
        failed: abstractIds.length,
        total: abstractIds.length,
        results: abstractIds.map(id => ({
          id,
          success: false,
          error: 'Abstract not found or update failed'
        })),
        errors: ['No abstracts were updated']
      };
    }

    // Process results
    const successful = updatedAbstracts.length;
    const failed = abstractIds.length - successful;
    const updatedIds = updatedAbstracts.map(a => a.id.toString());
    
    const results = abstractIds.map(id => {
      const updated = updatedAbstracts.find(a => a.id.toString() === id.toString());
      if (updated) {
        return {
          id: id,
          success: true,
          title: updated.title,
          author: updated.presenter_name,
          oldStatus: 'pending', // We don't track old status in this simple implementation
          newStatus: updated.status,
          updatedAt: updated.updated_at
        };
      } else {
        return {
          id: id,
          success: false,
          error: 'Abstract not found or update failed',
          title: null,
          oldStatus: null,
          newStatus: null
        };
      }
    });

    // Send email notifications
    if (successful > 0) {
      await sendBulkStatusNotification(updatedIds, status, comments);
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`🏁 [${requestId}] PostgreSQL bulk update completed in ${processingTime}ms: ${successful} successful, ${failed} failed`);
    
    return {
      successful,
      failed,
      total: abstractIds.length,
      results,
      errors: failed > 0 ? [`${failed} abstracts could not be updated`] : null,
      processingTime,
      summary: {
        totalProcessed: abstractIds.length,
        successfulUpdates: successful,
        failedUpdates: failed,
        successRate: `${((successful / abstractIds.length) * 100).toFixed(1)}%`,
        avgTimePerUpdate: `${(processingTime / abstractIds.length).toFixed(1)}ms`
      }
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ [${requestId}] PostgreSQL bulk update fatal error after ${processingTime}ms:`, error);
    
    return {
      successful: 0,
      failed: abstractIds.length,
      total: abstractIds.length,
      results: abstractIds.map(id => ({
        id,
        success: false,
        error: 'Database error: ' + error.message
      })),
      errors: ['Database error: ' + error.message],
      processingTime
    };
  }
}

// API Route Handlers
export async function POST(request) {
  const requestId = generateRequestId();
  const requestStart = Date.now();
  
  try {
    console.log(`📥 [${requestId}] PostgreSQL bulk update request received`);
    
    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log(`📄 [${requestId}] Request body:`, JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error(`❌ [${requestId}] Failed to parse request body:`, parseError);
      return NextResponse.json(
        createApiResponse(false, null, 'Invalid JSON in request body', { requestId }),
        { status: 400 }
      );
    }
    
    // Validate request
    const validation = validateBulkRequest(body);
    if (!validation.isValid) {
      console.log(`❌ [${requestId}] Validation failed:`, validation.errors);
      return NextResponse.json(
        createApiResponse(false, {
          successful: 0,
          failed: 0,
          total: 0,
          results: [],
          errors: validation.errors
        }, 'Validation failed', { requestId }),
        { status: 400 }
      );
    }
    
    console.log(`✅ [${requestId}] Request validation passed`);
    
    // Extract validated data
    const { abstractIds, status, updatedBy, comments } = body;
    
    // Process bulk update
    const updateResult = await processBulkUpdate(
      abstractIds, 
      status, 
      comments, 
      updatedBy || 'admin', 
      requestId
    );
    
    const totalProcessingTime = Date.now() - requestStart;
    const isSuccess = updateResult.successful > 0;
    
    // Create response
    const response = createApiResponse(
      isSuccess,
      updateResult,
      isSuccess 
        ? `Successfully updated ${updateResult.successful} out of ${updateResult.total} abstract(s)`
        : 'No abstracts were successfully updated',
      { 
        requestId, 
        processingTime: totalProcessingTime,
        bulkOperation: true,
        statusChanged: status,
        updatedBy: updatedBy || 'admin',
        database: 'PostgreSQL'
      }
    );
    
    console.log(`🏁 [${requestId}] Request completed in ${totalProcessingTime}ms - Success: ${isSuccess}`);
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'X-Request-ID': requestId,
        'X-Processing-Time': totalProcessingTime.toString(),
        'X-Operation-Status': isSuccess ? 'SUCCESS' : 'FAILED',
        'X-Updated-Count': updateResult.successful.toString(),
        'X-Failed-Count': updateResult.failed.toString(),
        'X-Total-Count': updateResult.total.toString(),
        'X-API-Version': API_VERSION,
        'X-Database': 'PostgreSQL'
      }
    });
    
  } catch (error) {
    const totalProcessingTime = Date.now() - requestStart;
    console.error(`❌ [${requestId}] Fatal API error after ${totalProcessingTime}ms:`, error);
    
    return NextResponse.json(
      createApiResponse(false, {
        successful: 0,
        failed: 0,
        total: 0,
        results: [],
        errors: ['Internal server error: ' + error.message]
      }, 'Internal server error', { 
        requestId, 
        processingTime: totalProcessingTime,
        errorType: error.constructor.name,
        database: 'PostgreSQL'
      }),
      {
        status: 200, // Frontend compatibility
        headers: {
          'X-Request-ID': requestId,
          'X-Processing-Time': totalProcessingTime.toString(),
          'X-Operation-Status': 'ERROR',
          'X-Error-Type': 'FATAL_ERROR',
          'X-API-Version': API_VERSION,
          'X-Database': 'PostgreSQL'
        }
      }
    );
  }
}

// GET - Health check and API info
export async function GET(request) {
  const requestId = generateRequestId();
  
  try {
    const { searchParams } = new URL(request.url);
    const abstractId = searchParams.get('id');
    
    // Test database connection
    await testConnection();
    
    if (abstractId) {
      // Get specific abstract status from PostgreSQL
      console.log(`📊 [${requestId}] Getting status for abstract: ${abstractId}`);
      
      const { getAbstractById } = await import('@/lib/database-postgres');
      const abstract = await getAbstractById(abstractId);
      
      if (!abstract) {
        return NextResponse.json(
          createApiResponse(false, null, 'Abstract not found', { requestId }),
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        createApiResponse(true, {
          abstract: {
            id: abstract.id,
            title: abstract.title,
            status: abstract.status,
            updated_at: abstract.updated_at,
            submission_date: abstract.submission_date
          }
        }, 'Abstract found', { requestId, database: 'PostgreSQL' })
      );
      
    } else {
      // Health check
      console.log(`🏥 [${requestId}] Health check requested`);
      
      const stats = await getStatistics();
      const allAbstracts = await getAllAbstracts();
      
      const statusCounts = {
        pending: stats.find(s => s.presentation_type === 'pending')?.pending || 0,
        approved: stats.find(s => s.presentation_type === 'approved')?.approved || 0,
        rejected: stats.find(s => s.presentation_type === 'rejected')?.rejected || 0,
        final_submitted: stats.find(s => s.presentation_type === 'final_submitted')?.final_submitted || 0
      };
      
      return NextResponse.json(
        createApiResponse(true, {
          status: 'healthy',
          version: API_VERSION,
          uptime: process.uptime(),
          database: {
            type: 'PostgreSQL',
            connected: true,
            connectionString: !!process.env.DATABASE_URL
          },
          statistics: {
            totalAbstracts: allAbstracts.length,
            statusCounts,
            lastUpdated: allAbstracts.length > 0 ? Math.max(...allAbstracts.map(a => new Date(a.updated_at || a.submission_date).getTime())) : null
          },
          features: {
            maxBulkSize: MAX_BULK_SIZE,
            supportedStatuses: ['pending', 'approved', 'rejected', 'final_submitted'],
            emailNotifications: true,
            auditLogging: true,
            bulkOperations: true
          }
        }, 'API is healthy and operational', { requestId, database: 'PostgreSQL' })
      );
    }
    
  } catch (error) {
    console.error(`❌ [${requestId}] GET request error:`, error);
    return NextResponse.json(
      createApiResponse(false, null, 'Database connection error: ' + error.message, { requestId }),
      { status: 500 }
    );
  }
}

// OPTIONS - CORS handling
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
      'Access-Control-Expose-Headers': 'X-Request-ID, X-Processing-Time, X-Operation-Status, X-API-Version, X-Database',
      'X-API-Version': API_VERSION,
      'X-Database': 'PostgreSQL'
    },
  });
}

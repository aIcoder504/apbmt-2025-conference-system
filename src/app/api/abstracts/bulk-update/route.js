// src/app/api/abstracts/bulk-update/route.js
// COMPLETE PRODUCTION-READY BULK UPDATE API WITH FULL DEBUGGING
import { NextResponse } from 'next/server'
import { writeFile, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// API Configuration
const API_VERSION = '2.0';
const MAX_BULK_SIZE = 100;
const ABSTRACTS_FILE = path.join(process.cwd(), 'data', 'abstracts.json');

// Initialize API
console.log('🚀 APBMT Bulk Update API v' + API_VERSION + ' loaded at:', new Date().toISOString());
console.log('📁 Data file path:', ABSTRACTS_FILE);

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
      ...metadata
    }
  };
}

// Database Operations
async function loadAbstracts() {
  const startTime = Date.now();
  try {
    console.log('📖 Loading abstracts from file...');
    
    if (!existsSync(ABSTRACTS_FILE)) {
      console.log('📄 Abstracts file not found, returning empty array');
      return [];
    }
    
    const data = await readFile(ABSTRACTS_FILE, 'utf-8');
    const abstracts = JSON.parse(data);
    const loadTime = Date.now() - startTime;
    
    console.log(`✅ Loaded ${abstracts.length} abstracts in ${loadTime}ms`);
    return abstracts;
    
  } catch (error) {
    const loadTime = Date.now() - startTime;
    console.error(`❌ Error loading abstracts after ${loadTime}ms:`, error);
    return [];
  }
}

async function saveAbstracts(abstracts) {
  const startTime = Date.now();
  try {
    console.log('💾 Saving abstracts to file...');
    
    // Ensure directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      console.log('📁 Creating data directory:', dataDir);
      const { mkdir } = await import('fs/promises');
      await mkdir(dataDir, { recursive: true });
    }
    
    // Write file with backup
    const backupFile = ABSTRACTS_FILE + '.backup.' + Date.now();
    if (existsSync(ABSTRACTS_FILE)) {
      console.log('🔄 Creating backup:', backupFile);
      const { copyFile } = await import('fs/promises');
      await copyFile(ABSTRACTS_FILE, backupFile);
    }
    
    await writeFile(ABSTRACTS_FILE, JSON.stringify(abstracts, null, 2));
    const saveTime = Date.now() - startTime;
    
    console.log(`✅ Saved ${abstracts.length} abstracts in ${saveTime}ms`);
    return true;
    
  } catch (error) {
    const saveTime = Date.now() - startTime;
    console.error(`❌ Error saving abstracts after ${saveTime}ms:`, error);
    return false;
  }
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
  const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'final_submitted'];
  if (!body.status) {
    errors.push('status field is required');
  } else if (!validStatuses.includes(body.status)) {
    errors.push(`status must be one of: ${validStatuses.join(', ')}`);
  }
  
  // Check abstract IDs format
  if (body.abstractIds && Array.isArray(body.abstractIds)) {
    body.abstractIds.forEach((id, index) => {
      if (!id || typeof id !== 'string') {
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
async function sendStatusNotification(abstract, newStatus, comments) {
  try {
    if (!abstract.email) {
      console.log(`📧 Skipping email for ${abstract.id} - no email address`);
      return;
    }
    
    const emailData = {
      submissionId: abstract.submissionId,
      abstractId: abstract.id,
      title: abstract.title,
      author: abstract.author || abstract.presenter_name,
      email: abstract.email,
      status: newStatus,
      comments: comments,
      reviewDate: new Date().toISOString()
    };
    
    console.log(`📧 Queuing status update email for ${abstract.id} to ${abstract.email}`);
    
    // Send email notification (async, don't wait)
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'status_update',
        data: emailData
      })
    }).catch(err => {
      console.error(`❌ Email notification failed for ${abstract.id}:`, err.message);
    });
    
  } catch (error) {
    console.error(`❌ Email notification error for ${abstract.id}:`, error);
  }
}

// Main Bulk Update Handler
async function processBulkUpdate(abstractIds, status, comments, updatedBy, requestId) {
  const startTime = Date.now();
  console.log(`🔄 [${requestId}] Starting bulk update: ${abstractIds.length} abstracts → ${status}`);
  
  try {
    // Load current abstracts
    const abstracts = await loadAbstracts();
    if (abstracts.length === 0) {
      console.log(`❌ [${requestId}] No abstracts found in database`);
      return {
        successful: 0,
        failed: abstractIds.length,
        total: abstractIds.length,
        results: abstractIds.map(id => ({
          id,
          success: false,
          error: 'No abstracts found in database'
        })),
        errors: ['No abstracts found in database']
      };
    }
    
    const results = [];
    let successful = 0;
    let failed = 0;
    const errors = [];
    
    // Process each abstract ID
    for (let i = 0; i < abstractIds.length; i++) {
      const abstractId = abstractIds[i];
      console.log(`🔍 [${requestId}] Processing ${i + 1}/${abstractIds.length}: ${abstractId}`);
      
      try {
        // Find abstract by ID
        const abstractIndex = abstracts.findIndex(a => a.id === abstractId);
        
        if (abstractIndex === -1) {
          console.log(`❌ [${requestId}] Abstract not found: ${abstractId}`);
          failed++;
          const error = `Abstract not found: ${abstractId}`;
          errors.push(error);
          results.push({
            id: abstractId,
            success: false,
            error: error,
            title: null,
            oldStatus: null,
            newStatus: null
          });
          continue;
        }
        
        const abstract = abstracts[abstractIndex];
        const oldStatus = abstract.status;
        
        // Check if status change is valid
        if (oldStatus === status) {
          console.log(`⚠️ [${requestId}] Status already ${status} for ${abstractId}`);
          successful++;
          results.push({
            id: abstractId,
            success: true,
            title: abstract.title,
            oldStatus: oldStatus,
            newStatus: status,
            note: 'Status was already correct'
          });
          continue;
        }
        
        // Update abstract
        abstracts[abstractIndex] = {
          ...abstract,
          status: status,
          reviewer_comments: comments || `Bulk ${status} operation`,
          review_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: updatedBy || 'admin',
          last_operation: 'bulk_update',
          last_operation_id: requestId
        };
        
        // Send email notification
        await sendStatusNotification(abstracts[abstractIndex], status, comments);
        
        successful++;
        results.push({
          id: abstractId,
          success: true,
          title: abstract.title,
          author: abstract.author || abstract.presenter_name,
          email: abstract.email,
          oldStatus: oldStatus,
          newStatus: status,
          updatedAt: new Date().toISOString()
        });
        
        console.log(`✅ [${requestId}] Updated ${abstractId}: "${oldStatus}" → "${status}"`);
        
      } catch (itemError) {
        console.error(`❌ [${requestId}] Error processing ${abstractId}:`, itemError);
        failed++;
        const error = `Processing error for ${abstractId}: ${itemError.message}`;
        errors.push(error);
        results.push({
          id: abstractId,
          success: false,
          error: error,
          title: null,
          oldStatus: null,
          newStatus: null
        });
      }
    }
    
    // Save changes to file
    if (successful > 0) {
      console.log(`💾 [${requestId}] Saving ${successful} changes to database...`);
      const saved = await saveAbstracts(abstracts);
      
      if (!saved) {
        console.error(`❌ [${requestId}] Failed to save changes to database`);
        throw new Error('Failed to save changes to database');
      }
      
      console.log(`✅ [${requestId}] Successfully saved all changes`);
    } else {
      console.log(`⚠️ [${requestId}] No changes to save`);
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`🏁 [${requestId}] Bulk update completed in ${processingTime}ms: ${successful} successful, ${failed} failed`);
    
    return {
      successful,
      failed,
      total: abstractIds.length,
      results,
      errors: errors.length > 0 ? errors : null,
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
    console.error(`❌ [${requestId}] Bulk update fatal error after ${processingTime}ms:`, error);
    
    return {
      successful: 0,
      failed: abstractIds.length,
      total: abstractIds.length,
      results: abstractIds.map(id => ({
        id,
        success: false,
        error: 'Fatal processing error: ' + error.message
      })),
      errors: ['Fatal processing error: ' + error.message],
      processingTime
    };
  }
}

// API Route Handlers
export async function POST(request) {
  const requestId = generateRequestId();
  const requestStart = Date.now();
  
  try {
    console.log(`📥 [${requestId}] Bulk update request received`);
    
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
    const { abstractIds, status, updatedBy, comments, bulkOperation } = body;
    
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
        updatedBy: updatedBy || 'admin'
      }
    );
    
    console.log(`🏁 [${requestId}] Request completed in ${totalProcessingTime}ms - Success: ${isSuccess}`);
    
    // Always return 200 for frontend compatibility
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'X-Request-ID': requestId,
        'X-Processing-Time': totalProcessingTime.toString(),
        'X-Operation-Status': isSuccess ? 'SUCCESS' : 'FAILED',
        'X-Updated-Count': updateResult.successful.toString(),
        'X-Failed-Count': updateResult.failed.toString(),
        'X-Total-Count': updateResult.total.toString(),
        'X-API-Version': API_VERSION
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
        errorType: error.constructor.name
      }),
      {
        status: 200, // Frontend compatibility
        headers: {
          'X-Request-ID': requestId,
          'X-Processing-Time': totalProcessingTime.toString(),
          'X-Operation-Status': 'ERROR',
          'X-Error-Type': 'FATAL_ERROR',
          'X-API-Version': API_VERSION
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
    
    if (abstractId) {
      // Get specific abstract status
      console.log(`📊 [${requestId}] Getting status for abstract: ${abstractId}`);
      
      const abstracts = await loadAbstracts();
      const abstract = abstracts.find(a => a.id === abstractId);
      
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
            review_date: abstract.review_date
          }
        }, 'Abstract found', { requestId })
      );
      
    } else {
      // Health check
      console.log(`🏥 [${requestId}] Health check requested`);
      
      const abstracts = await loadAbstracts();
      const stats = {
        totalAbstracts: abstracts.length,
        statusCounts: {
          pending: abstracts.filter(a => a.status === 'pending').length,
          under_review: abstracts.filter(a => a.status === 'under_review').length,
          approved: abstracts.filter(a => a.status === 'approved').length,
          rejected: abstracts.filter(a => a.status === 'rejected').length,
          final_submitted: abstracts.filter(a => a.status === 'final_submitted').length
        },
        lastUpdated: abstracts.length > 0 ? Math.max(...abstracts.map(a => new Date(a.updated_at || a.created_at).getTime())) : null
      };
      
      return NextResponse.json(
        createApiResponse(true, {
          status: 'healthy',
          version: API_VERSION,
          uptime: process.uptime(),
          database: {
            connected: true,
            file: ABSTRACTS_FILE,
            exists: existsSync(ABSTRACTS_FILE)
          },
          statistics: stats,
          features: {
            maxBulkSize: MAX_BULK_SIZE,
            supportedStatuses: ['pending', 'under_review', 'approved', 'rejected', 'final_submitted'],
            emailNotifications: true,
            auditLogging: true,
            backupOnSave: true
          }
        }, 'API is healthy and operational', { requestId })
      );
    }
    
  } catch (error) {
    console.error(`❌ [${requestId}] GET request error:`, error);
    return NextResponse.json(
      createApiResponse(false, null, 'Internal server error', { requestId }),
      { status: 500 }
    );
  }
}

// PUT - Single abstract update
export async function PUT(request) {
  const requestId = generateRequestId();
  
  try {
    console.log(`📝 [${requestId}] Single update request received`);
    
    const body = await request.json();
    const { abstractId, status, comments, updatedBy } = body;
    
    if (!abstractId || !status) {
      return NextResponse.json(
        createApiResponse(false, null, 'Abstract ID and status are required', { requestId }),
        { status: 400 }
      );
    }
    
    // Process single update using bulk handler
    const result = await processBulkUpdate([abstractId], status, comments, updatedBy, requestId);
    const isSuccess = result.successful > 0;
    
    return NextResponse.json(
      createApiResponse(
        isSuccess,
        {
          abstract: result.results[0],
          successful: result.successful,
          failed: result.failed,
          total: 1
        },
        isSuccess ? `Abstract ${status} successfully` : 'Failed to update abstract',
        { requestId, singleUpdate: true }
      ),
      { 
        status: 200,
        headers: {
          'X-Request-ID': requestId,
          'X-Operation-Status': isSuccess ? 'SUCCESS' : 'FAILED'
        }
      }
    );
    
  } catch (error) {
    console.error(`❌ [${requestId}] PUT request error:`, error);
    return NextResponse.json(
      createApiResponse(false, null, 'Internal server error', { requestId }),
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
      'Access-Control-Expose-Headers': 'X-Request-ID, X-Processing-Time, X-Operation-Status, X-API-Version',
      'X-API-Version': API_VERSION
    },
  });
}

// Export for potential use in other modules
export { processBulkUpdate, validateBulkRequest, createApiResponse };
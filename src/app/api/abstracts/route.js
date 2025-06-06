// src/app/api/abstracts/route.js - ONLY REPLACE THE GET METHOD
// 🚀 KEEP ALL OTHER METHODS (POST, PUT, DELETE) AS THEY WERE
// ONLY REPLACE THE GET METHOD WITH THIS FIXED VERSION

// Enhanced logging
console.log('🚀 APBMT Abstracts API Route (PostgreSQL) loaded at:', new Date().toISOString());

// ========================================
// 🚀 FIXED GET METHOD - Replace only this part
// ========================================

// GET - Retrieve all abstracts (COMPLETELY FIXED)
export async function GET(request) {
  try {
    console.log('📊 [API] GET abstracts request received');
    
    // Import database functions
    const { getAllAbstracts, testConnection } = await import('../../../lib/database-postgres.js');
    
    // Test database connection
    await testConnection();
    console.log('✅ [API] Database connection successful');
    
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    
    console.log('📊 [API] Request filters - Status:', status, 'Limit:', limit);
    
    // ========================================
    // 🚀 GET ABSTRACTS WITH PROPER FIELD MAPPING
    // ========================================
    
    let abstracts;
    try {
      abstracts = await getAllAbstracts();
      console.log(`📊 [API] Retrieved ${abstracts.length} abstracts from database`);
    } catch (dbError) {
      console.error('❌ [API] Database query error:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch abstracts from database: ' + dbError.message,
        data: [], // Return empty array on error
        abstracts: [],
        count: 0,
        total: 0
      }, { status: 500 });
    }
    
    // ========================================
    // 🚀 SAFE FILTERING WITH NULL CHECKS
    // ========================================
    
    // Filter by status if provided
    if (status && status !== 'all') {
      const originalCount = abstracts.length;
      abstracts = abstracts.filter(abstract => {
        // Safe status comparison
        const abstractStatus = abstract.status ? abstract.status.toLowerCase() : 'pending';
        const filterStatus = status.toLowerCase();
        return abstractStatus === filterStatus;
      });
      console.log(`🔍 [API] Filtered ${originalCount} → ${abstracts.length} with status: ${status}`);
    }
    
    // ========================================
    // 🚀 SAFE SORTING WITH DATE HANDLING
    // ========================================
    
    // Sort by submission date (newest first) with safe date handling
    abstracts.sort((a, b) => {
      try {
        const dateA = new Date(a.submission_date || a.submissionDate || Date.now());
        const dateB = new Date(b.submission_date || b.submissionDate || Date.now());
        return dateB - dateA;
      } catch (sortError) {
        console.warn('⚠️ [API] Date sorting error:', sortError);
        return 0; // Keep original order if date parsing fails
      }
    });
    
    // ========================================
    // 🚀 APPLY LIMIT
    // ========================================
    
    const originalCount = abstracts.length;
    abstracts = abstracts.slice(0, limit);
    
    if (originalCount > limit) {
      console.log(`📋 [API] Limited results from ${originalCount} to ${limit}`);
    }
    
    // ========================================
    // 🚀 CALCULATE STATISTICS SAFELY
    // ========================================
    
    let stats;
    try {
      // Get fresh data for statistics
      const allAbstracts = await getAllAbstracts();
      
      stats = {
        total: allAbstracts.length,
        pending: allAbstracts.filter(a => (a.status || 'pending').toLowerCase() === 'pending').length,
        approved: allAbstracts.filter(a => (a.status || 'pending').toLowerCase() === 'approved').length,
        rejected: allAbstracts.filter(a => (a.status || 'pending').toLowerCase() === 'rejected').length,
        final_submitted: allAbstracts.filter(a => (a.status || 'pending').toLowerCase() === 'final_submitted').length
      };
      
      console.log('📊 [API] Statistics calculated:', stats);
    } catch (statsError) {
      console.error('❌ [API] Statistics calculation error:', statsError);
      stats = {
        total: abstracts.length,
        pending: 0,
        approved: 0,
        rejected: 0,
        final_submitted: 0
      };
    }
    
    // ========================================
    // 🚀 FINAL VALIDATION OF ABSTRACTS
    // ========================================
    
    // Ensure all abstracts have required fields for frontend
    const validatedAbstracts = abstracts.map((abstract, index) => {
      // Additional safety validation
      return {
        ...abstract,
        
        // 🚀 ENSURE CORE FIELDS EXIST
        id: abstract.id || index + 1,
        title: abstract.title || 'Untitled',
        author: abstract.author || abstract.presenter_name || 'Unknown',
        presenter_name: abstract.presenter_name || abstract.author || 'Unknown',
        email: abstract.email || 'N/A',
        mobile_no: abstract.mobile_no || abstract.phone || abstract.mobile || 'N/A',
        status: abstract.status || 'pending',
        category: abstract.category || abstract.presentation_type || 'Free Paper',
        presentation_type: abstract.presentation_type || abstract.category || 'Free Paper',
        
        // 🚀 ENSURE SAFE STRING OPERATIONS
        statusLower: (abstract.status || 'pending').toLowerCase(),
        presentationTypeLower: (abstract.presentation_type || abstract.category || 'free paper').toLowerCase(),
        
        // 🚀 ENSURE DATES ARE VALID
        submission_date: abstract.submission_date || new Date().toISOString(),
        submissionDate: abstract.submissionDate || abstract.submission_date || new Date().toISOString(),
        
        // 🚀 ENSURE OTHER FIELDS
        co_authors: abstract.co_authors || abstract.coAuthors || 'N/A',
        institution_name: abstract.institution_name || abstract.institution || abstract.affiliation || 'N/A',
        abstract_number: abstract.abstract_number || abstract.abstractNumber || `ABST-${String(index + 1).padStart(3, '0')}`,
        registration_id: abstract.registration_id || abstract.registrationId || 'N/A'
      };
    });
    
    console.log('📤 [API] Preparing response with', validatedAbstracts.length, 'validated abstracts');
    
    // ========================================
    // 🚀 RETURN RESPONSE IN MULTIPLE FORMATS FOR FRONTEND COMPATIBILITY
    // ========================================
    
    const response = {
      // Primary success indicator
      success: true,
      message: `Retrieved ${validatedAbstracts.length} abstracts successfully`,
      
      // Multiple data format options for frontend compatibility
      data: validatedAbstracts, // Primary format - frontend expects 'data' array
      abstracts: validatedAbstracts, // Alternative format
      
      // Count information
      count: validatedAbstracts.length,
      total: validatedAbstracts.length,
      
      // Statistics
      stats: stats,
      statistics: stats, // Alternative field name
      
      // Metadata
      timestamp: new Date().toISOString(),
      filters: {
        status: status || 'all',
        limit: limit
      },
      
      // Additional response info
      version: '2.0',
      database: 'PostgreSQL'
    };
    
    console.log('✅ [API] GET request successful:', {
      abstractsReturned: response.count,
      totalInDatabase: stats.total,
      statusFilter: status || 'all'
    });
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'X-Total-Count': stats.total.toString(),
        'X-Returned-Count': validatedAbstracts.length.toString(),
        'X-API-Version': '2.0',
        'X-Database': 'PostgreSQL'
      }
    });
    
  } catch (error) {
    console.error('❌ [API] GET abstracts fatal error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch abstracts: ' + error.message,
      message: 'Internal server error occurred while fetching abstracts',
      
      // Return empty data on error
      data: [],
      abstracts: [],
      count: 0,
      total: 0,
      stats: {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      },
      
      // Error metadata
      timestamp: new Date().toISOString(),
      errorType: error.constructor.name,
      version: '2.0',
      database: 'PostgreSQL'
    }, { status: 500 });
  }
}

// ========================================
// 🚀 KEEP ALL OTHER METHODS UNCHANGED
// ========================================

// Import statements and other methods (POST, PUT, DELETE) remain exactly the same
// Only the GET method above should be replaced in your existing file

/*
IMPORTANT: In your existing src/app/api/abstracts/route.js file:

1. Keep all the existing imports at the top
2. Keep the POST, PUT, DELETE, and OPTIONS methods exactly as they are
3. Only replace the GET method with the fixed version above
4. Keep all helper functions like verifyToken() unchanged

The file structure should be:
- Import statements (unchanged)
- Helper functions (unchanged) 
- POST method (unchanged)
- GET method (REPLACE with fixed version above)
- PUT method (unchanged)
- DELETE method (unchanged)
- OPTIONS method (unchanged)
*/

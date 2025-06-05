// src/app/api/abstracts/route.js - PostgreSQL Version
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { 
  createAbstract, 
  getAllAbstracts, 
  updateAbstract, 
  deleteAbstract,
  getAbstractById,
  testConnection 
} from '../../../lib/database-postgres.js';

// Enhanced logging
console.log('🚀 APBMT Abstracts API Route (PostgreSQL) loaded at:', new Date().toISOString());

// Helper function to verify JWT token
function verifyToken(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No token provided');
    }

    const token = authHeader.substring(7);
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
  } catch (error) {
    console.error('❌ Token verification failed:', error);
    throw error;
  }
}

// POST - Submit new abstract
export async function POST(request) {
  try {
    console.log('📤 New abstract submission received');
    
    // Test database connection first
    await testConnection();
    console.log('✅ Database connection successful');

    // Parse request data
    let submissionData;
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      submissionData = await request.json();
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      submissionData = {
        title: formData.get('title'),
        presenter_name: formData.get('presenter_name'),
        institution_name: formData.get('institution_name'),
        presentation_type: formData.get('presentation_type'),
        abstract_content: formData.get('abstract_content'),
        co_authors: formData.get('co_authors') || '',
        registration_id: formData.get('registration_id') || '',
        userEmail: formData.get('userEmail'),
        userId: formData.get('userId')
      };
      
      // Handle file if present
      const file = formData.get('file');
      if (file && file.size > 0) {
        submissionData.file = file;
      }
    } else {
      submissionData = await request.json();
    }

    console.log('📝 Submission data received:', {
      title: submissionData.title?.substring(0, 50) + '...',
      presenter: submissionData.presenter_name,
      type: submissionData.presentation_type
    });

    // Get user info from token (if available)
    let decoded = null;
    try {
      decoded = verifyToken(request);
      console.log('✅ User authenticated:', decoded.email);
    } catch (authError) {
      console.log('⚠️ No valid token provided, treating as guest submission');
    }

    // Validation
    const requiredFields = ['title', 'presenter_name', 'institution_name', 'presentation_type', 'abstract_content'];
    const missingFields = requiredFields.filter(field => !submissionData[field]);
    
    if (missingFields.length > 0) {
      console.log('❌ Missing required fields:', missingFields);
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields', 
          missingFields 
        },
        { status: 400 }
      );
    }

    // Validate word count based on presentation type
    const wordLimits = {
      'Free Paper': 250,
      'Poster': 200,
      'E-Poster': 200,
      'Award Paper': 250
    };

    const wordCount = submissionData.abstract_content.trim().split(/\s+/).length;
    const limit = wordLimits[submissionData.presentation_type];
    
    if (limit && wordCount > limit) {
      console.log('❌ Word count exceeded:', wordCount, 'limit:', limit);
      return NextResponse.json(
        { 
          success: false, 
          error: `Abstract exceeds word limit. ${wordCount} words (max ${limit} for ${submissionData.presentation_type})` 
        },
        { status: 400 }
      );
    }

    // Prepare abstract data for database
    const abstractData = {
      user_id: decoded?.userId || 1, // Default to 1 if no auth
      title: submissionData.title,
      presenter_name: submissionData.presenter_name,
      institution_name: submissionData.institution_name,
      presentation_type: submissionData.presentation_type,
      abstract_content: submissionData.abstract_content,
      co_authors: submissionData.co_authors || '',
      registration_id: submissionData.registration_id || '',
      file_path: null,
      file_name: null,
      file_size: null
    };

    // Handle file upload if present
    if (submissionData.file) {
      console.log('📎 File attached:', submissionData.file.name, submissionData.file.size);
      abstractData.file_name = submissionData.file.name;
      abstractData.file_size = submissionData.file.size;
      abstractData.file_path = `/uploads/${Date.now()}-${submissionData.file.name}`;
    }

    console.log('✅ Validation passed, creating abstract in PostgreSQL...');

    // Create abstract in database
    const newAbstract = await createAbstract(abstractData);
    console.log('✅ Abstract created successfully:', newAbstract.id);

    // Send confirmation email (async, don't wait)
    try {
      const emailData = {
        abstractId: newAbstract.id,
        title: newAbstract.title,
        author: newAbstract.presenter_name,
        email: submissionData.userEmail || decoded?.email || 'not-provided@example.com',
        institution: newAbstract.institution_name,
        submissionDate: newAbstract.submission_date
      };

      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      fetch(`${baseUrl}/api/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'submission_confirmation',
          data: emailData
        })
      }).catch(err => console.error('Confirmation email failed:', err));

    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the submission if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Abstract submitted successfully',
      abstract: {
        id: newAbstract.id,
        title: newAbstract.title,
        presenter_name: newAbstract.presenter_name,
        status: newAbstract.status,
        submission_date: newAbstract.submission_date,
        abstract_number: newAbstract.abstract_number
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Abstract submission error:', error);
    
    if (error.message === 'No token provided' || error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to submit abstract',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// GET - Retrieve all abstracts (for admin)
export async function GET(request) {
  try {
    console.log('📊 GET abstracts request received');
    
    await testConnection();
    
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    console.log('📊 GET request - Status filter:', status, 'Limit:', limit);
    
    // Load abstracts from PostgreSQL
    let abstracts = await getAllAbstracts();
    
    // Filter by status if provided
    if (status && status !== 'all') {
      const originalCount = abstracts.length;
      abstracts = abstracts.filter(abstract => abstract.status === status);
      console.log(`🔍 Filtered ${originalCount} abstracts to ${abstracts.length} with status: ${status}`);
    }
    
    // Sort by submission date (newest first)
    abstracts.sort((a, b) => new Date(b.submission_date) - new Date(a.submission_date));
    
    // Limit results
    const originalCount = abstracts.length;
    abstracts = abstracts.slice(0, limit);
    
    if (originalCount > limit) {
      console.log(`📋 Limited results from ${originalCount} to ${limit}`);
    }
    
    // Calculate statistics
    const allAbstracts = await getAllAbstracts();
    const stats = {
      total: allAbstracts.length,
      pending: allAbstracts.filter(a => a.status === 'pending').length,
      approved: allAbstracts.filter(a => a.status === 'approved').length,
      rejected: allAbstracts.filter(a => a.status === 'rejected').length,
      final_submitted: allAbstracts.filter(a => a.status === 'final_submitted').length
    };
    
    console.log('📊 Returning', abstracts.length, 'abstracts with stats:', stats);
    
    return NextResponse.json({
      success: true,
      abstracts,
      stats,
      total: abstracts.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching abstracts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch abstracts', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update abstract
export async function PUT(request) {
  try {
    console.log('📝 PUT request received');
    
    await testConnection();
    const body = await request.json();
    
    console.log('📄 Request body:', JSON.stringify(body, null, 2));
    
    // Check if it's a bulk update
    if (Array.isArray(body) || body.bulk || body.bulkUpdate) {
      console.log('🔄 Processing bulk update - redirecting to bulk-update API');
      return NextResponse.json({
        success: false,
        error: 'Bulk updates should use /api/abstracts/bulk-update endpoint'
      }, { status: 400 });
    }
    
    // Single update
    const decoded = verifyToken(request);
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Abstract ID is required' },
        { status: 400 }
      );
    }

    // Check if abstract exists and belongs to user
    const existingAbstract = await getAbstractById(id);
    if (!existingAbstract) {
      return NextResponse.json(
        { success: false, message: 'Abstract not found' },
        { status: 404 }
      );
    }

    if (existingAbstract.user_id !== decoded.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if abstract can be edited (only pending abstracts)
    if (existingAbstract.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'Cannot edit abstract that is already reviewed' },
        { status: 400 }
      );
    }

    const updatedAbstract = await updateAbstract(id, updateData);

    console.log('✅ Abstract updated successfully:', id);

    return NextResponse.json({
      success: true,
      message: 'Abstract updated successfully',
      abstract: updatedAbstract
    });

  } catch (error) {
    console.error('❌ PUT request error:', error);
    
    if (error.message === 'No token provided' || error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update abstract', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete abstract
export async function DELETE(request) {
  try {
    console.log('🗑️ DELETE request received');
    
    await testConnection();
    const decoded = verifyToken(request);
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Abstract ID is required' },
        { status: 400 }
      );
    }

    // Check if abstract exists and belongs to user
    const existingAbstract = await getAbstractById(id);
    if (!existingAbstract) {
      return NextResponse.json(
        { success: false, message: 'Abstract not found' },
        { status: 404 }
      );
    }

    if (existingAbstract.user_id !== decoded.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if abstract can be deleted (only pending abstracts)
    if (existingAbstract.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'Cannot delete abstract that is already reviewed' },
        { status: 400 }
      );
    }

    await deleteAbstract(id);

    console.log('✅ Abstract deleted successfully:', id);

    return NextResponse.json({
      success: true,
      message: 'Abstract deleted successfully'
    });

  } catch (error) {
    console.error('❌ DELETE request error:', error);
    
    if (error.message === 'No token provided' || error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to delete abstract', details: error.message },
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

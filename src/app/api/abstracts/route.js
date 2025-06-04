// src/app/api/abstracts/route.js
import { NextResponse } from 'next/server'
import { writeFile, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// Enhanced logging
console.log('🚀 APBMT Abstracts API Route loaded at:', new Date().toISOString());

// Path for storing abstracts (in production, use proper database)
const ABSTRACTS_FILE = path.join(process.cwd(), 'data', 'abstracts.json')

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data')
  if (!existsSync(dataDir)) {
    const { mkdir } = await import('fs/promises')
    await mkdir(dataDir, { recursive: true })
    console.log('📁 Created data directory:', dataDir);
  }
}

// Load existing abstracts
async function loadAbstracts() {
  try {
    if (existsSync(ABSTRACTS_FILE)) {
      const data = await readFile(ABSTRACTS_FILE, 'utf-8')
      const abstracts = JSON.parse(data)
      console.log('📖 Loaded', abstracts.length, 'abstracts from file');
      return abstracts
    }
    console.log('📄 No abstracts file found, returning empty array');
    return []
  } catch (error) {
    console.error('❌ Error loading abstracts:', error)
    return []
  }
}

// Save abstracts to file
async function saveAbstracts(abstracts) {
  try {
    await ensureDataDirectory()
    await writeFile(ABSTRACTS_FILE, JSON.stringify(abstracts, null, 2))
    console.log('💾 Successfully saved', abstracts.length, 'abstracts to file');
    return true
  } catch (error) {
    console.error('❌ Error saving abstracts:', error)
    return false
  }
}

// Generate unique ID
function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9)
}

// BULK UPDATE HANDLER - NEW FEATURE
async function handleBulkUpdate(bulkData) {
  try {
    console.log('🔄 Starting bulk update for', bulkData.length, 'abstracts');
    console.log('📝 Bulk data received:', JSON.stringify(bulkData, null, 2));
    
    // Load current abstracts
    const abstracts = await loadAbstracts()
    let updatedCount = 0;
    const errors = [];
    const successList = [];

    // Process each update
    for (const updateItem of bulkData) {
      try {
        console.log('🔄 Processing update item:', updateItem);
        
        const { id, status, comments } = updateItem;
        
        if (!id) {
          const error = `Missing ID for item: ${JSON.stringify(updateItem)}`;
          console.error('❌', error);
          errors.push(error);
          continue;
        }

        if (!status) {
          const error = `Missing status for abstract ${id}`;
          console.error('❌', error);
          errors.push(error);
          continue;
        }

        // Find abstract by ID
        const abstractIndex = abstracts.findIndex(a => a.id === id);
        
        if (abstractIndex === -1) {
          const error = `Abstract not found: ${id}`;
          console.error('❌', error);
          errors.push(error);
          continue;
        }

        // Store old status for logging
        const oldStatus = abstracts[abstractIndex].status;

        // Update abstract
        abstracts[abstractIndex] = {
          ...abstracts[abstractIndex],
          status,
          comments: comments || null,
          updatedAt: new Date().toISOString()
        };
        
        updatedCount++;
        successList.push({
          id,
          title: abstracts[abstractIndex].title,
          oldStatus,
          newStatus: status
        });
        
        console.log(`✅ Updated abstract ${id} from "${oldStatus}" to "${status}"`);

        // Send status update email (async, don't wait)
        try {
          const statusEmailData = {
            submissionId: abstracts[abstractIndex].submissionId,
            abstractId: abstracts[abstractIndex].id,
            title: abstracts[abstractIndex].title,
            author: abstracts[abstractIndex].author,
            email: abstracts[abstractIndex].email,
            status: status,
            comments: comments,
            reviewDate: new Date().toISOString()
          }

          fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'status_update',
              data: statusEmailData
            })
          }).catch(err => console.error('Status update email failed for', id, ':', err))

        } catch (emailError) {
          console.error('Status email error for', id, ':', emailError)
        }

      } catch (itemError) {
        const error = `Failed to update ${updateItem?.id}: ${itemError.message}`;
        console.error('❌', error);
        errors.push(error);
      }
    }

    // Save all changes at once
    if (updatedCount > 0) {
      const saved = await saveAbstracts(abstracts);
      
      if (!saved) {
        throw new Error('Failed to save abstracts to file');
      }
      
      console.log(`💾 Successfully saved ${updatedCount} updates to file`);
    }

    // Return detailed results
    if (updatedCount === 0) {
      console.log('❌ No abstracts were updated');
      return NextResponse.json(
        { 
          success: false,
          error: 'No abstracts were successfully updated',
          details: errors,
          attempted: bulkData.length,
          updated: 0,
          errors: errors
        },
        { status: 400 }
      );
    }

    console.log(`🎉 Bulk update completed: ${updatedCount}/${bulkData.length} successful`);

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updatedCount} out of ${bulkData.length} abstract(s)`,
      updated: updatedCount,
      total: bulkData.length,
      successList,
      errors: errors.length > 0 ? errors : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Bulk update fatal error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Bulk update failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// SINGLE UPDATE HANDLER
async function handleSingleUpdate(updateData) {
  try {
    console.log('📝 Processing single update:', updateData);
    
    const { id, status, comments } = updateData;
    
    if (!id || !status) {
      return NextResponse.json(
        { error: 'Abstract ID and status are required' },
        { status: 400 }
      );
    }
    
    // Load abstracts
    const abstracts = await loadAbstracts()
    
    // Find and update abstract
    const abstractIndex = abstracts.findIndex(a => a.id === id)
    
    if (abstractIndex === -1) {
      return NextResponse.json(
        { error: 'Abstract not found' },
        { status: 404 }
      );
    }
    
    const oldStatus = abstracts[abstractIndex].status;
    
    // Update abstract
    abstracts[abstractIndex] = {
      ...abstracts[abstractIndex],
      status,
      comments: comments || null,
      updatedAt: new Date().toISOString()
    }
    
    // Save updated abstracts
    const saved = await saveAbstracts(abstracts)
    
    if (!saved) {
      throw new Error('Failed to update abstract')
    }

    console.log(`✅ Single update: ${id} from "${oldStatus}" to "${status}"`);

    // Send status update email (async, don't wait)
    try {
      const statusEmailData = {
        submissionId: abstracts[abstractIndex].submissionId,
        abstractId: abstracts[abstractIndex].id,
        title: abstracts[abstractIndex].title,
        author: abstracts[abstractIndex].author,
        email: abstracts[abstractIndex].email,
        status: status,
        comments: comments,
        reviewDate: new Date().toISOString()
      }

      fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'status_update',
          data: statusEmailData
        })
      }).catch(err => console.error('Status update email failed:', err))

    } catch (emailError) {
      console.error('Status email error:', emailError)
    }
    
    return NextResponse.json({
      success: true,
      message: `Abstract ${status} successfully`,
      abstract: abstracts[abstractIndex]
    })
    
  } catch (error) {
    console.error('❌ Single update error:', error)
    return NextResponse.json(
      { error: 'Failed to update abstract', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Submit new abstract
export async function POST(request) {
  try {
    console.log('📤 New abstract submission received');
    const submissionData = await request.json()
    
    // Validation
    const requiredFields = ['title', 'presenter_name', 'institution_name', 'presentation_type', 'abstract_content']
    const missingFields = requiredFields.filter(field => !submissionData[field])
    
    if (missingFields.length > 0) {
      console.log('❌ Missing required fields:', missingFields);
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          missingFields 
        },
        { status: 400 }
      )
    }

    // Load existing abstracts
    const abstracts = await loadAbstracts()
    
    // Create new abstract record
    const newAbstract = {
      id: generateId(),
      title: submissionData.title,
      author: submissionData.presenter_name,
      email: submissionData.userEmail || submissionData.email || 'not-provided@example.com',
      affiliation: submissionData.institution_name,
      category: submissionData.presentation_type,
      abstract: submissionData.abstract_content,
      coAuthors: submissionData.co_authors || '',
      submissionId: submissionData.submissionId,
      attachedFiles: submissionData.attachedFiles || [],
      submissionDate: submissionData.submissionDate || new Date().toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Enhanced fields for better tracking
      userId: submissionData.userId,
      registrationId: submissionData.registration_number || submissionData.registrationId
    }
    
    // Add to abstracts array
    abstracts.push(newAbstract)
    
    // Save to file
    const saved = await saveAbstracts(abstracts)
    
    if (!saved) {
      throw new Error('Failed to save abstract')
    }
    
    console.log('✅ New abstract submitted:', newAbstract.id, 'by', newAbstract.author);
    
    // Return success response
    const responseData = {
      success: true,
      message: 'Abstract submitted successfully',
      abstractId: newAbstract.id,
      submissionId: newAbstract.submissionId,
      data: {
        id: newAbstract.id,
        title: newAbstract.title,
        author: newAbstract.author,
        status: newAbstract.status,
        submissionDate: newAbstract.submissionDate,
        attachedFiles: newAbstract.attachedFiles.length
      }
    }

    // Send confirmation email to submitter (async, don't wait)
    try {
      const emailData = {
        submissionId: newAbstract.submissionId,
        abstractId: newAbstract.id,
        title: newAbstract.title,
        author: newAbstract.author,
        email: newAbstract.email,
        institution: newAbstract.affiliation,
        attachedFiles: newAbstract.attachedFiles.length,
        submissionDate: newAbstract.submissionDate
      }

      // Send confirmation email
      fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'submission_confirmation',
          data: emailData
        })
      }).catch(err => console.error('Confirmation email failed:', err))

      // Send admin notification email
      fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'admin_notification',
          data: emailData
        })
      }).catch(err => console.error('Admin notification email failed:', err))

    } catch (emailError) {
      console.error('Email sending error:', emailError)
      // Don't fail the submission if email fails
    }
    
    return NextResponse.json(responseData, { status: 201 })
    
  } catch (error) {
    console.error('❌ Abstract submission error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to submit abstract',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// GET - Retrieve all abstracts (for admin)
export async function GET(request) {
  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    
    console.log('📊 GET request - Status filter:', status, 'Limit:', limit);
    
    // Load abstracts
    let abstracts = await loadAbstracts()
    
    // Filter by status if provided
    if (status && status !== 'all') {
      const originalCount = abstracts.length;
      abstracts = abstracts.filter(abstract => abstract.status === status)
      console.log(`🔍 Filtered ${originalCount} abstracts to ${abstracts.length} with status: ${status}`);
    }
    
    // Sort by submission date (newest first)
    abstracts.sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate))
    
    // Limit results
    const originalCount = abstracts.length;
    abstracts = abstracts.slice(0, limit)
    
    if (originalCount > limit) {
      console.log(`📋 Limited results from ${originalCount} to ${limit}`);
    }
    
    // Calculate statistics
    const allAbstracts = await loadAbstracts()
    const stats = {
      total: allAbstracts.length,
      pending: allAbstracts.filter(a => a.status === 'pending').length,
      approved: allAbstracts.filter(a => a.status === 'approved').length,
      rejected: allAbstracts.filter(a => a.status === 'rejected').length,
      under_review: allAbstracts.filter(a => a.status === 'under_review').length,
      final_submitted: allAbstracts.filter(a => a.status === 'final_submitted').length
    }
    
    console.log('📊 Returning', abstracts.length, 'abstracts with stats:', stats);
    
    return NextResponse.json({
      success: true,
      abstracts,
      stats,
      total: abstracts.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error fetching abstracts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch abstracts', details: error.message },
      { status: 500 }
    )
  }
}

// ENHANCED PUT - Handles both single and bulk updates
export async function PUT(request) {
  try {
    const body = await request.json();
    console.log('📥 PUT Request received at:', new Date().toISOString());
    console.log('📄 Request body type:', Array.isArray(body) ? 'Array (bulk)' : 'Object (single)');
    console.log('📝 Request body:', JSON.stringify(body, null, 2));
    
    // Detect bulk vs single update
    if (Array.isArray(body)) {
      console.log('🔄 Processing BULK update for', body.length, 'items');
      return await handleBulkUpdate(body);
    } else if (body.bulk && Array.isArray(body.abstracts)) {
      console.log('🔄 Processing BULK update (nested format) for', body.abstracts.length, 'items');
      return await handleBulkUpdate(body.abstracts);
    } else if (body.bulkUpdate && Array.isArray(body.items)) {
      console.log('🔄 Processing BULK update (items format) for', body.items.length, 'items');
      return await handleBulkUpdate(body.items);
    } else {
      console.log('📝 Processing SINGLE update');
      return await handleSingleUpdate(body);
    }

  } catch (error) {
    console.error('❌ PUT Request Parse Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Invalid request format', 
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
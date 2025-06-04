// src/app/api/abstracts/user/route.js
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

// Path for storing abstracts
const ABSTRACTS_FILE = path.join(process.cwd(), 'data', 'abstracts.json');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Load abstracts from file
async function loadAbstracts() {
  try {
    if (existsSync(ABSTRACTS_FILE)) {
      const data = await readFile(ABSTRACTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error loading abstracts:', error);
    return [];
  }
}

// Extract user from JWT token
function getUserFromToken(authHeader) {
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header');
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Invalid or expired token');
  }
}

// GET - Fetch user's abstracts
export async function GET(request) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    // Verify user token
    const user = getUserFromToken(authHeader);
    console.log('🔍 Fetching abstracts for user:', user.email);

    // Load all abstracts
    const allAbstracts = await loadAbstracts();
    
    // Filter abstracts for this specific user
    const userAbstracts = allAbstracts.filter(abstract => {
      return abstract.email === user.email || 
             abstract.userId === user.id ||
             abstract.author === user.name;
    });

    // Sort by submission date (newest first)
    userAbstracts.sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate));

    // Transform data for frontend
    const transformedAbstracts = userAbstracts.map(abstract => ({
      id: abstract.id,
      title: abstract.title,
      presenter_name: abstract.author,
      co_authors: abstract.coAuthors,
      institution: abstract.affiliation,
      abstract_content: abstract.abstract,
      presentation_type: abstract.category,
      status: abstract.status,
      submission_date: abstract.submissionDate,
      review_date: abstract.updatedAt,
      reviewer_comments: abstract.comments,
      file_url: abstract.attachedFiles && abstract.attachedFiles.length > 0 ? abstract.attachedFiles[0].path : null,
      final_file_url: abstract.finalFileUrl || null,
      created_at: abstract.createdAt,
      updated_at: abstract.updatedAt
    }));

    // Calculate user stats
    const stats = {
      total: userAbstracts.length,
      pending: userAbstracts.filter(a => a.status === 'pending').length,
      approved: userAbstracts.filter(a => a.status === 'approved').length,
      rejected: userAbstracts.filter(a => a.status === 'rejected').length,
      final_submitted: userAbstracts.filter(a => a.status === 'final_submitted').length
    };

    console.log(`📊 User ${user.email} has ${userAbstracts.length} abstracts`);

    return NextResponse.json({
      success: true,
      abstracts: transformedAbstracts,
      stats,
      user: {
        email: user.email,
        name: user.name,
        id: user.id
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user abstracts:', error);
    
    if (error.message.includes('token')) {
      return NextResponse.json(
        { error: 'Invalid or expired authentication token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch abstracts',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// POST - Submit new abstract for user (alternative endpoint)
export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    // Verify user token
    const user = getUserFromToken(authHeader);
    const submissionData = await request.json();

    // Add user context to submission
    const enrichedData = {
      ...submissionData,
      userId: user.id,
      userEmail: user.email,
      submitterName: user.name
    };

    // Forward to main abstracts API
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/abstracts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enrichedData)
    });

    const result = await response.json();

    if (response.ok) {
      return NextResponse.json(result);
    } else {
      throw new Error(result.error || 'Submission failed');
    }

  } catch (error) {
    console.error('❌ User submission error:', error);
    
    if (error.message.includes('token')) {
      return NextResponse.json(
        { error: 'Invalid or expired authentication token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to submit abstract',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// PUT - Update user's abstract status or content
export async function PUT(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    // Verify user token
    const user = getUserFromToken(authHeader);
    const { abstractId, action, ...updateData } = await request.json();

    if (!abstractId || !action) {
      return NextResponse.json(
        { error: 'Abstract ID and action are required' },
        { status: 400 }
      );
    }

    // Load abstracts
    const allAbstracts = await loadAbstracts();
    
    // Find user's abstract
    const abstractIndex = allAbstracts.findIndex(abstract => 
      abstract.id === abstractId && 
      (abstract.email === user.email || abstract.userId === user.id)
    );

    if (abstractIndex === -1) {
      return NextResponse.json(
        { error: 'Abstract not found or access denied' },
        { status: 404 }
      );
    }

    // Handle different actions
    switch (action) {
      case 'edit':
        // Allow editing only pending abstracts
        if (allAbstracts[abstractIndex].status !== 'pending') {
          return NextResponse.json(
            { error: 'Can only edit pending abstracts' },
            { status: 400 }
          );
        }
        
        // Update allowed fields
        allAbstracts[abstractIndex] = {
          ...allAbstracts[abstractIndex],
          title: updateData.title || allAbstracts[abstractIndex].title,
          abstract: updateData.abstract_content || allAbstracts[abstractIndex].abstract,
          coAuthors: updateData.co_authors || allAbstracts[abstractIndex].coAuthors,
          updatedAt: new Date().toISOString()
        };
        break;

      case 'final_upload':
        // Allow final upload only for approved abstracts
        if (allAbstracts[abstractIndex].status !== 'approved') {
          return NextResponse.json(
            { error: 'Can only upload final version for approved abstracts' },
            { status: 400 }
          );
        }
        
        allAbstracts[abstractIndex] = {
          ...allAbstracts[abstractIndex],
          finalFileUrl: updateData.finalFileUrl,
          status: 'final_submitted',
          updatedAt: new Date().toISOString()
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Save updated abstracts (using main API logic)
    const { writeFile } = await import('fs/promises');
    await writeFile(ABSTRACTS_FILE, JSON.stringify(allAbstracts, null, 2));

    console.log(`✅ User ${user.email} updated abstract ${abstractId} - action: ${action}`);

    return NextResponse.json({
      success: true,
      message: `Abstract ${action} successful`,
      abstract: allAbstracts[abstractIndex]
    });

  } catch (error) {
    console.error('❌ Error updating user abstract:', error);
    
    if (error.message.includes('token')) {
      return NextResponse.json(
        { error: 'Invalid or expired authentication token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to update abstract',
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
// src/app/api/admin/abstracts/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getAllAbstracts, getStatistics, testConnection } from '@/lib/database-postgres';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Verify admin token
function verifyAdminToken(request) {
  try {
    const token = request.cookies.get('admin-token')?.value;
    if (!token) {
      return null;
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.role === 'admin' ? decoded : null;
  } catch (error) {
    return null;
  }
}

// GET - Fetch all abstracts for admin from PostgreSQL
export async function GET(request) {
  try {
    // Test database connection
    await testConnection();

    // Verify admin authentication
    const admin = verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    // Get query parameters for filtering
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Get all abstracts from PostgreSQL
    let allAbstracts = await getAllAbstracts();

    // Filter abstracts
    let filteredAbstracts = [...allAbstracts];
    
    if (status && status !== 'all') {
      filteredAbstracts = filteredAbstracts.filter(abstract => abstract.status === status);
    }
    
    if (category && category !== 'all') {
      filteredAbstracts = filteredAbstracts.filter(abstract => abstract.presentation_type === category);
    }

    // Sort by submission date (newest first)
    filteredAbstracts.sort((a, b) => new Date(b.submission_date) - new Date(a.submission_date));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAbstracts = filteredAbstracts.slice(startIndex, endIndex);

    // Get statistics from PostgreSQL
    const dbStats = await getStatistics();
    
    // Convert to expected format
    const stats = {
      total: allAbstracts.length,
      pending: dbStats.find(s => s.status === 'pending')?.count || 0,
      approved: dbStats.find(s => s.status === 'approved')?.count || 0,
      rejected: dbStats.find(s => s.status === 'rejected')?.count || 0,
      filtered: filteredAbstracts.length
    };

    return NextResponse.json({
      success: true,
      abstracts: paginatedAbstracts,
      stats,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredAbstracts.length / limit),
        hasNext: endIndex < filteredAbstracts.length,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching abstracts:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

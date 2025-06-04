// src/app/api/admin/abstracts/status/route.js
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Verify admin token
function verifyAdminToken(request) {
  try {
    const token = request.cookies.get('admin-token')?.value
    if (!token) {
      return null
    }
    
    const decoded = jwt.verify(token, JWT_SECRET)
    return decoded.role === 'admin' ? decoded : null
  } catch (error) {
    return null
  }
}

// POST - Update abstract status
export async function POST(request) {
  try {
    // Verify admin authentication
    const admin = verifyAdminToken(request)
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { id, status, comments } = await request.json()

    // Validation
    if (!id || !status) {
      return NextResponse.json(
        { error: 'Abstract ID and status are required' },
        { status: 400 }
      )
    }

    // Validate status values
    const validStatuses = ['pending', 'approved', 'rejected']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: pending, approved, or rejected' },
        { status: 400 }
      )
    }

    // TODO: Production me database update karo
    // const updatedAbstract = await database.updateAbstractStatus(id, status, comments)
    
    // Mock response for now
    const mockUpdatedAbstract = {
      id,
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: admin.email,
      comments: comments || null
    }

    // TODO: Send email notification to author
    // await sendStatusUpdateEmail(abstractAuthorEmail, status, comments)

    return NextResponse.json({
      success: true,
      message: `Abstract ${status} successfully`,
      abstract: mockUpdatedAbstract,
      notification: `Email notification will be sent to the author`
    })

  } catch (error) {
    console.error('Error updating abstract status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Bulk status update
export async function PUT(request) {
  try {
    // Verify admin authentication
    const admin = verifyAdminToken(request)
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { abstractIds, status, comments } = await request.json()

    // Validation
    if (!abstractIds || !Array.isArray(abstractIds) || abstractIds.length === 0) {
      return NextResponse.json(
        { error: 'Abstract IDs array is required' },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Validate status values
    const validStatuses = ['pending', 'approved', 'rejected']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: pending, approved, or rejected' },
        { status: 400 }
      )
    }

    // TODO: Production me database bulk update karo
    // const updatedAbstracts = await database.bulkUpdateAbstractStatus(abstractIds, status, comments)

    // Mock response for now
    const mockUpdatedAbstracts = abstractIds.map(id => ({
      id,
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: admin.email,
      comments: comments || null
    }))

    // TODO: Send bulk email notifications
    // await sendBulkStatusUpdateEmails(abstractIds, status, comments)

    return NextResponse.json({
      success: true,
      message: `${abstractIds.length} abstracts ${status} successfully`,
      updatedAbstracts: mockUpdatedAbstracts,
      notification: `Email notifications will be sent to all authors`
    })

  } catch (error) {
    console.error('Error bulk updating abstract status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get status history for an abstract
export async function GET(request) {
  try {
    // Verify admin authentication
    const admin = verifyAdminToken(request)
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const abstractId = url.searchParams.get('id')

    if (!abstractId) {
      return NextResponse.json(
        { error: 'Abstract ID is required' },
        { status: 400 }
      )
    }

    // TODO: Production me database se fetch karo
    // const statusHistory = await database.getAbstractStatusHistory(abstractId)

    // Mock status history
    const mockStatusHistory = [
      {
        id: '1',
        abstractId,
        status: 'pending',
        updatedAt: '2025-05-25T10:30:00Z',
        updatedBy: 'system',
        comments: 'Abstract submitted'
      },
      {
        id: '2',
        abstractId,
        status: 'approved',
        updatedAt: '2025-05-26T15:45:00Z',
        updatedBy: admin.email,
        comments: 'Excellent research work. Approved for presentation.'
      }
    ]

    return NextResponse.json({
      success: true,
      abstractId,
      statusHistory: mockStatusHistory
    })

  } catch (error) {
    console.error('Error fetching status history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
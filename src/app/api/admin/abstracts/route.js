// src/app/api/admin/abstracts/route.js
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Temporary mock data (production me database se fetch karo)
const mockAbstracts = [
  {
    id: '1',
    title: 'Machine Learning Applications in Healthcare',
    author: 'Dr. Rahul Sharma',
    email: 'rahul.sharma@gmail.com',
    affiliation: 'AIIMS Delhi',
    category: 'AI & Machine Learning',
    submissionDate: '2025-05-25T10:30:00Z',
    status: 'pending',
    abstract: 'This paper explores the revolutionary applications of machine learning in modern healthcare systems. We discuss predictive analytics for patient care, automated diagnosis systems, and personalized treatment recommendations. Our research demonstrates significant improvements in diagnostic accuracy and treatment outcomes through AI-powered solutions.'
  },
  {
    id: '2',
    title: 'Sustainable Energy Solutions for Smart Cities',
    author: 'Prof. Anita Gupta',
    email: 'anita.gupta@iisc.ac.in',
    affiliation: 'IISc Bangalore',
    category: 'Renewable Energy',
    submissionDate: '2025-05-24T14:20:00Z',
    status: 'approved',
    abstract: 'This study presents innovative approaches to implementing sustainable energy solutions in smart city infrastructure. We analyze solar panel integration, wind energy optimization, and energy storage systems. The research includes case studies from pilot projects in Indian metropolitan cities showing 40% reduction in carbon footprint.'
  },
  {
    id: '3',
    title: 'Blockchain Technology in Supply Chain Management',
    author: 'Mr. Vikash Kumar',
    email: 'vikash.kumar@nit.ac.in',
    affiliation: 'NIT Warangal',
    category: 'Blockchain & Cryptocurrency',
    submissionDate: '2025-05-23T09:15:00Z',
    status: 'rejected',
    abstract: 'We propose a blockchain-based framework for transparent and secure supply chain management. The system ensures product authenticity, reduces counterfeiting, and provides real-time tracking capabilities. Our implementation shows improved trust and efficiency in supply chain operations across multiple industries.'
  },
  {
    id: '4',
    title: 'Quantum Computing Algorithms for Optimization',
    author: 'Dr. Priya Patel',
    email: 'priya.patel@iitb.ac.in',
    affiliation: 'IIT Bombay',
    category: 'Quantum Computing',
    submissionDate: '2025-05-22T16:45:00Z',
    status: 'pending',
    abstract: 'This research introduces novel quantum computing algorithms for solving complex optimization problems. We demonstrate quantum advantage in portfolio optimization, logistics planning, and resource allocation. The algorithms show exponential speedup compared to classical approaches for specific problem instances.'
  },
  {
    id: '5',
    title: 'Cybersecurity Frameworks for IoT Devices',
    author: 'Prof. Amit Singh',
    email: 'amit.singh@tiet.ac.in',
    affiliation: 'Thapar University',
    category: 'Cybersecurity',
    submissionDate: '2025-05-21T11:30:00Z',
    status: 'approved',
    abstract: 'We present comprehensive cybersecurity frameworks specifically designed for Internet of Things (IoT) devices. The framework includes encryption protocols, intrusion detection systems, and secure communication channels. Our solution addresses vulnerabilities in smart home devices, industrial IoT, and healthcare monitoring systems.'
  }
]

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

// GET - Fetch all abstracts for admin
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

    // Get query parameters for filtering
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const category = url.searchParams.get('category')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')

    // Filter abstracts
    let filteredAbstracts = [...mockAbstracts]
    
    if (status && status !== 'all') {
      filteredAbstracts = filteredAbstracts.filter(abstract => abstract.status === status)
    }
    
    if (category && category !== 'all') {
      filteredAbstracts = filteredAbstracts.filter(abstract => abstract.category === category)
    }

    // Sort by submission date (newest first)
    filteredAbstracts.sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate))

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedAbstracts = filteredAbstracts.slice(startIndex, endIndex)

    // Statistics
    const stats = {
      total: mockAbstracts.length,
      pending: mockAbstracts.filter(a => a.status === 'pending').length,
      approved: mockAbstracts.filter(a => a.status === 'approved').length,
      rejected: mockAbstracts.filter(a => a.status === 'rejected').length,
      filtered: filteredAbstracts.length
    }

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
    })

  } catch (error) {
    console.error('Error fetching abstracts:', error)
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
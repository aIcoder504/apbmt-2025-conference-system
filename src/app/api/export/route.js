// src/app/api/export/route.js
import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'

// Path for abstracts data
const ABSTRACTS_FILE = path.join(process.cwd(), 'data', 'abstracts.json')

// Load abstracts data
async function loadAbstracts() {
  try {
    if (existsSync(ABSTRACTS_FILE)) {
      const data = await readFile(ABSTRACTS_FILE, 'utf-8')
      return JSON.parse(data)
    }
    return []
  } catch (error) {
    console.error('Error loading abstracts:', error)
    return []
  }
}

// GET - Export abstracts to Excel
export async function GET(request) {
  try {
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'excel'
    const status = url.searchParams.get('status') || 'all'
    const category = url.searchParams.get('category') || 'all'
    const includeStats = url.searchParams.get('includeStats') !== 'false'

    // Load all abstracts
    const abstracts = await loadAbstracts()
    
    // Apply filters
    let filteredAbstracts = abstracts
    
    if (status !== 'all') {
      filteredAbstracts = filteredAbstracts.filter(a => a.status === status)
    }
    
    if (category !== 'all') {
      filteredAbstracts = filteredAbstracts.filter(a => a.category === category)
    }

    // Calculate statistics
    const stats = {
      total: abstracts.length,
      pending: abstracts.filter(a => a.status === 'pending').length,
      approved: abstracts.filter(a => a.status === 'approved').length,
      rejected: abstracts.filter(a => a.status === 'rejected').length,
      oral: abstracts.filter(a => a.category === 'oral').length,
      poster: abstracts.filter(a => a.category === 'poster').length,
      eposter: abstracts.filter(a => a.category === 'e-poster').length,
      award: abstracts.filter(a => a.category === 'award-paper').length
    }

    if (format === 'json') {
      // Return JSON format
      return NextResponse.json({
        success: true,
        data: filteredAbstracts,
        stats,
        exportDate: new Date().toISOString(),
        filters: { status, category },
        recordCount: filteredAbstracts.length
      })
    }

    // Generate Excel file
    const workbook = XLSX.utils.book_new()
    
    // Prepare data for Excel
    const excelData = filteredAbstracts.map((abstract, index) => ({
      'S.No': index + 1,
      'Abstract ID': abstract.id,
      'Abstract Number': `ABST-${String(index + 1).padStart(3, '0')}`,
      'Submission Date': new Date(abstract.submissionDate).toLocaleDateString('en-IN'),
      'Presenter Name': abstract.author,
      'Email': abstract.email,
      'Abstract Title': abstract.title,
      'Co-Authors': abstract.coAuthors || 'None',
      'Institution': abstract.affiliation,
      'Presentation Type': abstract.category,
      'Status': abstract.status.toUpperCase(),
      'Attached Files': abstract.attachedFiles ? abstract.attachedFiles.length : 0,
      'Review Date': abstract.updatedAt ? new Date(abstract.updatedAt).toLocaleDateString('en-IN') : 'Not reviewed',
      'Abstract Content': abstract.abstract
    }))

    // Create main sheet
    const abstractsSheet = XLSX.utils.json_to_sheet(excelData)
    
    // Set column widths
    abstractsSheet['!cols'] = [
      { wch: 6 }, { wch: 15 }, { wch: 18 }, { wch: 12 },
      { wch: 20 }, { wch: 25 }, { wch: 40 }, { wch: 30 },
      { wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 50 }
    ]
    
    XLSX.utils.book_append_sheet(workbook, abstractsSheet, 'Abstracts')

    // Add statistics sheet if requested
    if (includeStats) {
      const statsData = [
        { Metric: 'Total Submissions', Value: stats.total },
        { Metric: 'Pending Review', Value: stats.pending },
        { Metric: 'Approved', Value: stats.approved },
        { Metric: 'Rejected', Value: stats.rejected },
        { Metric: '', Value: '' },
        { Metric: 'Free Paper Presentations', Value: stats.oral },
        { Metric: 'Poster Presentations', Value: stats.poster },
        { Metric: 'E-Poster Presentations', Value: stats.eposter },
        { Metric: 'Award Paper Presentations', Value: stats.award },
        { Metric: '', Value: '' },
        { Metric: 'Export Date', Value: new Date().toLocaleString('en-IN') },
        { Metric: 'Filters Applied', Value: `Status: ${status}, Category: ${category}` },
        { Metric: 'Records Exported', Value: filteredAbstracts.length }
      ]

      const statsSheet = XLSX.utils.json_to_sheet(statsData)
      statsSheet['!cols'] = [{ wch: 25 }, { wch: 20 }]
      XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistics')
    }

    // Category summary sheet
    const categoryStats = [
      { 
        Category: 'Free Paper Presentation',
        Total: stats.oral,
        Pending: abstracts.filter(a => a.category === 'oral' && a.status === 'pending').length,
        Approved: abstracts.filter(a => a.category === 'oral' && a.status === 'approved').length,
        Rejected: abstracts.filter(a => a.category === 'oral' && a.status === 'rejected').length
      },
      { 
        Category: 'Poster Presentation',
        Total: stats.poster,
        Pending: abstracts.filter(a => a.category === 'poster' && a.status === 'pending').length,
        Approved: abstracts.filter(a => a.category === 'poster' && a.status === 'approved').length,
        Rejected: abstracts.filter(a => a.category === 'poster' && a.status === 'rejected').length
      },
      { 
        Category: 'E-Poster Presentation',
        Total: stats.eposter,
        Pending: abstracts.filter(a => a.category === 'e-poster' && a.status === 'pending').length,
        Approved: abstracts.filter(a => a.category === 'e-poster' && a.status === 'approved').length,
        Rejected: abstracts.filter(a => a.category === 'e-poster' && a.status === 'rejected').length
      },
      { 
        Category: 'Award Paper Presentation',
        Total: stats.award,
        Pending: abstracts.filter(a => a.category === 'award-paper' && a.status === 'pending').length,
        Approved: abstracts.filter(a => a.category === 'award-paper' && a.status === 'approved').length,
        Rejected: abstracts.filter(a => a.category === 'award-paper' && a.status === 'rejected').length
      }
    ]

    const categorySheet = XLSX.utils.json_to_sheet(categoryStats)
    categorySheet['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(workbook, categorySheet, 'Category Summary')

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })
    
    // Create filename
    const timestamp = new Date().toISOString().split('T')[0]
    const filterSuffix = status !== 'all' ? `_${status}` : ''
    const filename = `APBMT_Abstracts_${timestamp}${filterSuffix}.xlsx`

    // Return Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { 
        error: 'Export failed',
        details: error.message 
      },
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
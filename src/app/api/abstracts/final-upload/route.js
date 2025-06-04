// src/app/api/abstracts/final-upload/route.js
// STEP 2A: Final Upload API for Post-Approval Workflow

import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { writeFile, mkdir } from 'fs/promises';

// Initialize database connection
const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'final');

// POST - Handle final file upload
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const abstractId = formData.get('abstractId');
    const userId = formData.get('userId');
    const uploadType = formData.get('uploadType') || 'final_presentation';

    console.log('🔄 Final upload request:', { abstractId, userId, uploadType, fileName: file?.name });

    // Validation
    if (!file || !abstractId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: file, abstractId, or userId'
      }, { status: 400 });
    }

    // Check if abstract exists and is approved
    const checkAbstractStmt = db.prepare(`
      SELECT id, title, presenter_name, status, user_id 
      FROM abstracts 
      WHERE id = ? AND status = 'approved'
    `);
    const abstract = checkAbstractStmt.get(abstractId);

    if (!abstract) {
      return NextResponse.json({
        success: false,
        error: 'Abstract not found or not approved for final upload'
      }, { status: 404 });
    }

    // Verify user owns this abstract
    if (abstract.user_id !== userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized: You can only upload files for your own abstracts'
      }, { status: 403 });
    }

    // Validate file type and size
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Only PDF, PowerPoint, and Word documents are allowed.'
      }, { status: 400 });
    }

    // Check file size (max 10MB for final uploads)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'File size too large. Maximum size allowed is 10MB.'
      }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's okay
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${abstractId}_${uploadType}_${timestamp}_${sanitizedFileName}`;
    const filePath = path.join(uploadsDir, uniqueFileName);
    const publicPath = `/uploads/final/${uniqueFileName}`;

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Update database with final file info
    const updateStmt = db.prepare(`
      UPDATE abstracts 
      SET 
        final_file_url = ?,
        final_file_name = ?,
        final_file_size = ?,
        final_upload_date = ?,
        status = 'final_submitted',
        updated_at = ?
      WHERE id = ?
    `);

    const currentTime = new Date().toISOString();
    const result = updateStmt.run(
      publicPath,
      file.name,
      file.size,
      currentTime,
      currentTime,
      abstractId
    );

    if (result.changes > 0) {
      // Log the upload
      console.log('✅ Final upload successful:', {
        abstractId,
        fileName: file.name,
        size: file.size,
        path: publicPath
      });

      return NextResponse.json({
        success: true,
        message: 'Final file uploaded successfully',
        data: {
          abstractId,
          fileName: file.name,
          fileSize: file.size,
          filePath: publicPath,
          uploadDate: currentTime,
          newStatus: 'final_submitted'
        }
      });
    } else {
      // If database update failed, remove the uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.error('Failed to remove uploaded file after database error:', unlinkError);
      }

      return NextResponse.json({
        success: false,
        error: 'Failed to update database record'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Final upload error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during file upload',
      details: error.message
    }, { status: 500 });
  }
}

// GET - Get final upload status and file info
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const abstractId = searchParams.get('abstractId');
    const userId = searchParams.get('userId');

    if (!abstractId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing abstractId or userId'
      }, { status: 400 });
    }

    const stmt = db.prepare(`
      SELECT 
        id, title, presenter_name, status, 
        final_file_url, final_file_name, final_file_size, final_upload_date,
        user_id
      FROM abstracts 
      WHERE id = ? AND user_id = ?
    `);
    
    const abstract = stmt.get(abstractId, userId);

    if (!abstract) {
      return NextResponse.json({
        success: false,
        error: 'Abstract not found or unauthorized'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        abstractId: abstract.id,
        title: abstract.title,
        presenter: abstract.presenter_name,
        status: abstract.status,
        finalFile: {
          url: abstract.final_file_url,
          name: abstract.final_file_name,
          size: abstract.final_file_size,
          uploadDate: abstract.final_upload_date
        },
        canUpload: abstract.status === 'approved',
        hasUploaded: !!abstract.final_file_url
      }
    });

  } catch (error) {
    console.error('❌ Get final upload status error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get upload status',
      details: error.message
    }, { status: 500 });
  }
}

// DELETE - Remove final uploaded file (if needed for re-upload)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const abstractId = searchParams.get('abstractId');
    const userId = searchParams.get('userId');

    if (!abstractId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing abstractId or userId'
      }, { status: 400 });
    }

    // Get current file info
    const stmt = db.prepare(`
      SELECT final_file_url, user_id, status 
      FROM abstracts 
      WHERE id = ? AND user_id = ?
    `);
    
    const abstract = stmt.get(abstractId, userId);

    if (!abstract) {
      return NextResponse.json({
        success: false,
        error: 'Abstract not found or unauthorized'
      }, { status: 404 });
    }

    if (!abstract.final_file_url) {
      return NextResponse.json({
        success: false,
        error: 'No file to delete'
      }, { status: 400 });
    }

    // Remove file from filesystem
    const fileName = path.basename(abstract.final_file_url);
    const filePath = path.join(uploadsDir, fileName);
    
    try {
      fs.unlinkSync(filePath);
      console.log('🗑️ File deleted:', filePath);
    } catch (fileError) {
      console.error('Warning: Could not delete file from disk:', fileError);
      // Continue with database update even if file deletion fails
    }

    // Update database to remove file reference
    const updateStmt = db.prepare(`
      UPDATE abstracts 
      SET 
        final_file_url = NULL,
        final_file_name = NULL,
        final_file_size = NULL,
        final_upload_date = NULL,
        status = 'approved',
        updated_at = ?
      WHERE id = ?
    `);

    const currentTime = new Date().toISOString();
    const result = updateStmt.run(currentTime, abstractId);

    if (result.changes > 0) {
      return NextResponse.json({
        success: true,
        message: 'Final file removed successfully',
        data: {
          abstractId,
          newStatus: 'approved'
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to update database'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Delete final upload error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete final upload',
      details: error.message
    }, { status: 500 });
  }
}
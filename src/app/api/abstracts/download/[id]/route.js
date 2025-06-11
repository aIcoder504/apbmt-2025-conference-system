// 🔧 CREATE THIS FILE: src/app/api/abstracts/download/[id]/route.js

import { NextResponse } from 'next/server';
import { getAbstractById } from '../../../../../lib/database-postgres.js';
import fs from 'fs';
import path from 'path';

console.log('📥 APBMT Download API loaded at:', new Date().toISOString());

// GET - Download abstract file
export async function GET(request, { params }) {
  try {
    console.log('📥 Download request received for ID:', params.id);
    
    // Get abstract from database
    const abstract = await getAbstractById(params.id);
    
    if (!abstract) {
      console.log('❌ Abstract not found:', params.id);
      return NextResponse.json(
        { error: 'Abstract not found' }, 
        { status: 404 }
      );
    }

    console.log('✅ Abstract found:', {
      id: abstract.id,
      title: abstract.title,
      file_name: abstract.file_name,
      file_path: abstract.file_path
    });

    // Check if file information exists
    if (!abstract.file_path || !abstract.file_name) {
      console.log('❌ No file attached to this abstract');
      return NextResponse.json(
        { error: 'No file attached to this abstract' }, 
        { status: 404 }
      );
    }

    // Determine file path - handle multiple possible locations
    let filePath;
    
    // Option 1: Relative path from project root
    if (abstract.file_path.startsWith('/uploads/')) {
      filePath = path.join(process.cwd(), 'uploads', path.basename(abstract.file_path));
    }
    // Option 2: Absolute path
    else if (path.isAbsolute(abstract.file_path)) {
      filePath = abstract.file_path;
    }
    // Option 3: Public uploads
    else if (abstract.file_path.startsWith('uploads/')) {
      filePath = path.join(process.cwd(), abstract.file_path);
    }
    // Option 4: Default to uploads folder
    else {
      filePath = path.join(process.cwd(), 'uploads', abstract.file_name);
    }

    console.log('📂 Checking file path:', filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log('❌ File not found on server:', filePath);
      
      // Try alternative paths
      const alternativePaths = [
        path.join(process.cwd(), 'public', 'uploads', abstract.file_name),
        path.join(process.cwd(), 'uploads', abstract.file_name),
        path.join(process.cwd(), abstract.file_name),
        path.join(process.cwd(), 'public', abstract.file_name)
      ];
      
      let foundPath = null;
      for (const altPath of alternativePaths) {
        if (fs.existsSync(altPath)) {
          foundPath = altPath;
          console.log('✅ File found at alternative path:', altPath);
          break;
        }
      }
      
      if (!foundPath) {
        console.log('❌ File not found in any location. Tried:', alternativePaths);
        return NextResponse.json(
          { 
            error: 'File not found on server', 
            details: `Abstract has file reference but file is missing`,
            file_name: abstract.file_name,
            expected_path: filePath
          }, 
          { status: 404 }
        );
      }
      
      filePath = foundPath;
    }

    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    const fileStats = fs.statSync(filePath);
    
    console.log('✅ File read successfully:', {
      size: fileStats.size,
      name: abstract.file_name
    });

    // Determine content type
    const ext = path.extname(abstract.file_name).toLowerCase();
    const contentTypeMap = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain'
    };
    
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    
    // Clean filename for download
    const cleanFileName = abstract.file_name.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    console.log('📤 Serving file download:', {
      original_name: abstract.file_name,
      clean_name: cleanFileName,
      content_type: contentType,
      size: fileBuffer.length
    });

    // Return file with proper headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${cleanFileName}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, no-cache',
        'X-Abstract-ID': abstract.id.toString(),
        'X-Original-Filename': abstract.file_name
      }
    });
    
  } catch (error) {
    console.error('❌ Download error:', error);
    
    return NextResponse.json(
      { 
        error: 'Download failed', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

// 🔧 ALTERNATIVE: If PostgreSQL getAbstractById doesn't work, use this SQLite version
/*
// Fallback SQLite version
import Database from 'better-sqlite3';

function getAbstractByIdSQLite(id) {
  try {
    const db = new Database('./database.sqlite');
    const stmt = db.prepare('SELECT * FROM abstracts WHERE id = ?');
    const result = stmt.get(id);
    db.close();
    return result;
  } catch (error) {
    console.error('SQLite query error:', error);
    throw error;
  }
}

// Replace the getAbstractById call with:
// const abstract = getAbstractByIdSQLite(params.id);
*/

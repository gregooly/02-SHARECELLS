import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch inventory data using customer_id and apikey
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customer_id');
    const apiKey = searchParams.get('apikey');
    const sheetId = searchParams.get('sheet_id'); // Optional parameter

    // Validate required parameters
    if (!customerId || !apiKey) {
      return NextResponse.json(
        { 
          error: 'Missing required parameters',
          message: 'Both customer_id and apikey are required'
        }, 
        { status: 400 }
      );
    }

    // Convert customer_id to number
    const customerIdNum = parseInt(customerId);
    if (isNaN(customerIdNum)) {
      return NextResponse.json(
        { 
          error: 'Invalid customer_id',
          message: 'customer_id must be a valid number'
        }, 
        { status: 400 }
      );
    }

    // Convert sheet_id to number if provided
    let sheetIdNum: number | null = null;
    if (sheetId) {
      sheetIdNum = parseInt(sheetId);
      if (isNaN(sheetIdNum)) {
        return NextResponse.json(
          { 
            error: 'Invalid sheet_id',
            message: 'sheet_id must be a valid number'
          }, 
          { status: 400 }
        );
      }
    }

    // Verify API key
    const apiKeyRecord = await prisma.$queryRaw<Array<{ id: number; customer_id: number; api_key: string }>>`
      SELECT * FROM apikey 
      WHERE customer_id = ${customerIdNum} 
      AND api_key = ${apiKey}
      LIMIT 1
    `;

    if (!apiKeyRecord || apiKeyRecord.length === 0) {
      return NextResponse.json(
        { 
          error: 'Authentication failed',
          message: 'Invalid customer_id or apikey'
        }, 
        { status: 401 }
      );
    }

    // Fetch sheets for this customer (admin)
    // If sheet_id is provided, fetch only that specific sheet
    // Otherwise, fetch all sheets
    let sheets;
    
    if (sheetIdNum !== null) {
      // Fetch specific sheet and verify it belongs to this customer
      sheets = await prisma.$queryRaw<Array<{
        id: number;
        sheet_name: string;
        sheet_number: number;
        created_at: string;
      }>>`
        SELECT id, sheet_name, sheet_number, created_at
        FROM sheets 
        WHERE manager_id = ${customerIdNum}
        AND id = ${sheetIdNum}
        LIMIT 1
      `;
      
      // If sheet not found or doesn't belong to this customer
      if (sheets.length === 0) {
        return NextResponse.json(
          { 
            error: 'Sheet not found',
            message: 'The specified sheet_id does not exist or does not belong to this customer'
          }, 
          { status: 404 }
        );
      }
    } else {
      // Fetch all sheets for this customer
      sheets = await prisma.$queryRaw<Array<{
        id: number;
        sheet_name: string;
        sheet_number: number;
        created_at: string;
      }>>`
        SELECT id, sheet_name, sheet_number, created_at
        FROM sheets 
        WHERE manager_id = ${customerIdNum}
        ORDER BY created_at DESC
      `;
    }

    // If no sheets found, return empty data
    if (sheets.length === 0) {
      return NextResponse.json({
        success: true,
        customer_id: customerIdNum,
        total_sheets: 0,
        data: []
      }, { status: 200 });
    }

    // Prepare data for all sheets
    const sheetsData = [];
    
    for (const sheet of sheets) {
      // Get fields for this sheet
      const fields = await prisma.$queryRaw<Array<{
        id: number;
        sheet_id: number;
        cell_title: string;
        sheet_type: number;
      }>>`
        SELECT id, sheet_id, cell_title, sheet_type
        FROM fields 
        WHERE sheet_id = ${sheet.id}
        ORDER BY id ASC
      `;

      // Get all cells for this sheet with username
      const cells = await prisma.$queryRaw<Array<{
        id: number;
        sheet_id: number;
        field_id: number;
        value: string;
        uuid: string;
        user_id: number | null;
        manager_id: number;
        created_at: string;
        username: string | null;
      }>>`
        SELECT c.id, c.sheet_id, c.field_id, c.value, c.uuid, c.user_id, c.manager_id, c.created_at,
               u.username
        FROM cells c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.sheet_id = ${sheet.id}
        ORDER BY COALESCE(c.user_id, 0) ASC, c.id ASC
      `;

      // Group cells by uuid (rows) and user_id
      const rowsMap = new Map();
      
      cells.forEach(cell => {
        const rowKey = `${cell.user_id || 'admin'}_${cell.uuid}`;
        
        if (!rowsMap.has(rowKey)) {
          rowsMap.set(rowKey, {
            uuid: cell.uuid,
            user_id: cell.user_id,
            username: cell.username || 'Admin',
            created_at: cell.created_at,
            cells: {}
          });
        }
        
        const fieldInfo = fields.find(f => f.id === cell.field_id);
        if (fieldInfo) {
          rowsMap.get(rowKey).cells[fieldInfo.cell_title] = cell.value;
        }
      });

      // Convert to array and format with actual field names
      const rows = Array.from(rowsMap.values()).map(row => {
        // Create a flat object with actual field names
        const flatRow: Record<string, any> = {};
        
        // Add all cell values with actual field names as keys
        fields.forEach((field) => {
          flatRow[field.cell_title] = row.cells[field.cell_title] || '';
        });
        
        // Add username and update time at the end
        flatRow['Username'] = row.username;
        flatRow['Updated_At'] = row.created_at;
        
        return flatRow;
      });

      // Add this sheet's data with sheet name and sheet_id
      sheetsData.push({
        sheet_id: sheet.id,
        sheet_name: sheet.sheet_name,
        rows: rows
      });
    }

    // Return success response with data
    return NextResponse.json({    
      data: sheetsData
    }, { status: 200 });

  } catch {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An error occurred while processing your request'
      },
      { status: 500 }
    );
  }
}

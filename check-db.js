const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCells() {
  try {
    console.log('=== Checking cells table ===\n');
    
    // Get all distinct users in cells
    const users = await prisma.$queryRaw`
      SELECT DISTINCT c.user_id, u.username, COUNT(*) as cell_count
      FROM cells c 
      LEFT JOIN users u ON c.user_id = u.id
      GROUP BY c.user_id, u.username
      ORDER BY c.user_id
    `;
    
    console.log('Users with data in cells table:');
    console.table(users);
    
    // Get sheet info
    const sheets = await prisma.$queryRaw`
      SELECT s.id, s.sheet_name, s.manager_id, u.username as manager_name
      FROM sheets s
      LEFT JOIN users u ON s.manager_id = u.id
    `;
    
    console.log('\nSheets:');
    console.table(sheets);
    
    // Get sharesheets info
    const sharesheets = await prisma.$queryRaw`
      SELECT ss.sheet_id, s.sheet_name, ss.user_id, u.username
      FROM sharesheets ss
      LEFT JOIN sheets s ON ss.sheet_id = s.id
      LEFT JOIN users u ON ss.user_id = u.id
    `;
    
    console.log('\nShared sheets:');
    console.table(sharesheets);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCells();

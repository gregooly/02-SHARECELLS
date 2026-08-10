const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUUIDs() {
  try {
    console.log('=== Checking UUIDs in cells table for sheet 59 ===\n');
    
    const cells = await prisma.$queryRaw`
      SELECT c.uuid, c.user_id, u.username, COUNT(*) as cell_count
      FROM cells c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.sheet_id = 59
      GROUP BY c.uuid, c.user_id, u.username
      ORDER BY c.uuid, c.user_id
    `;
    
    console.log('UUIDs grouped by user:');
    console.table(cells);
    
    // Check if same UUID is used by different users
    const uuidCheck = await prisma.$queryRaw`
      SELECT uuid, COUNT(DISTINCT user_id) as user_count, GROUP_CONCAT(DISTINCT COALESCE(user_id, 'NULL')) as users
      FROM cells
      WHERE sheet_id = 59
      GROUP BY uuid
      HAVING user_count > 1
    `;
    
    console.log('\nUUIDs used by multiple users (PROBLEM!):');
    console.table(uuidCheck);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUUIDs();

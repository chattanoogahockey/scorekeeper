import { getAttendanceContainer } from './cosmosClient.js';

async function testAttendanceContainer() {
  try {
    console.log('Testing attendance container...');
    const container = getAttendanceContainer();
    
    // Try to query the container
    const { resources } = await container.items.query('SELECT * FROM c').fetchAll();
    console.log('✅ Attendance container exists and is accessible');
    console.log(`Found ${resources.length} attendance records`);
    
    if (resources.length > 0) {
      console.log('Sample record:', JSON.stringify(resources[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error accessing attendance container:', error.message);
    
    if (error.code === 404) {
      console.log('Container does not exist. You may need to create it in Azure Portal.');
    }
  }
}

testAttendanceContainer();

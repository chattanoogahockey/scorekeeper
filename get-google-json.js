/**
 * GET GOOGLE CLOUD JSON CREDENTIALS
 * This script helps you get the complete JSON credentials
 */

console.log('🔑 GOOGLE CLOUD JSON CREDENTIALS SETUP');
console.log('=====================================\n');

console.log('📋 You need to get your complete Google Cloud service account JSON file.');
console.log('   The one in Azure is truncated (missing most of the private key).\n');

console.log('🔍 Option 1: Find your existing JSON file');
console.log('   - Look for a file like: hockey-announcer-tts-467921-xxxxxxxx.json');
console.log('   - It was downloaded when you created the service account');
console.log('   - Usually in your Downloads folder\n');

console.log('🆕 Option 2: Generate a new JSON file');
console.log('   1. Go to: https://console.cloud.google.com/');
console.log('   2. Select project: hockey-announcer-tts-467921');
console.log('   3. Go to: IAM & Admin > Service Accounts');
console.log('   4. Find: hockey-tts-service@hockey-announcer-tts-467921.iam.gserviceaccount.com');
console.log('   5. Click on the service account');
console.log('   6. Go to "Keys" tab');
console.log('   7. Click "Add Key" > "Create new key"');
console.log('   8. Select "JSON" format');
console.log('   9. Click "Create" - file downloads automatically\n');

console.log('📤 Once you have the JSON file:');
console.log('   1. Open the file in a text editor');
console.log('   2. Copy the ENTIRE content');
console.log('   3. Let me know and I\'ll set it up in Azure\n');

console.log('⚠️  Important: The private_key field should be very long (1500+ characters)');
console.log('   If it\'s short, that\'s the truncation problem we\'re fixing.\n');

// Check if there are any JSON files in the current directory
import { readdirSync } from 'fs';
import { readFileSync } from 'fs';

try {
  const files = readdirSync('.');
  const jsonFiles = files.filter(f => f.endsWith('.json') && f.includes('hockey'));
  
  if (jsonFiles.length > 0) {
    console.log('🔍 Found potential Google Cloud JSON files in current directory:');
    jsonFiles.forEach(file => {
      console.log(`   - ${file}`);
      try {
        const content = readFileSync(file, 'utf8');
        const json = JSON.parse(content);
        if (json.type === 'service_account' && json.project_id && json.private_key) {
          console.log(`     ✅ Valid service account JSON (private key: ${json.private_key.length} chars)`);
          if (json.private_key.length > 1000) {
            console.log(`     🎉 This looks like a complete private key!`);
            console.log(`     📋 Project: ${json.project_id}`);
            console.log(`     📧 Email: ${json.client_email}`);
          } else {
            console.log(`     ⚠️  Private key seems too short (${json.private_key.length} chars)`);
          }
        }
      } catch (e) {
        console.log(`     ❌ Invalid JSON or parsing error`);
      }
    });
  } else {
    console.log('🔍 No JSON files found in current directory');
  }
} catch (e) {
  console.log('🔍 Could not scan directory for JSON files');
}

console.log('\n💬 Ready to proceed? Let me know when you have the complete JSON content!');

/**
 * Azure Environment Diagnostic Script
 * This will help us debug the exact private key format issue
 */

console.log('🔍 AZURE ENVIRONMENT DIAGNOSTICS');
console.log('================================\n');

// Check all Google Cloud environment variables
console.log('1️⃣ Environment Variables Status:');
console.log(`   - GOOGLE_CLOUD_PROJECT_ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID ? '✅ SET' : '❌ MISSING'}`);
console.log(`   - GOOGLE_CLOUD_CLIENT_EMAIL: ${process.env.GOOGLE_CLOUD_CLIENT_EMAIL ? '✅ SET' : '❌ MISSING'}`);
console.log(`   - GOOGLE_CLOUD_PRIVATE_KEY: ${process.env.GOOGLE_CLOUD_PRIVATE_KEY ? '✅ SET' : '❌ MISSING'}`);
console.log(`   - GOOGLE_CLOUD_PRIVATE_KEY_ID: ${process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID ? '✅ SET' : '❌ MISSING'}`);

if (process.env.GOOGLE_CLOUD_PRIVATE_KEY) {
  const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY;
  
  console.log('\n2️⃣ Private Key Raw Analysis:');
  console.log(`   - Total Length: ${privateKey.length} characters`);
  console.log(`   - First 50 chars: "${privateKey.substring(0, 50)}"`);
  console.log(`   - Last 50 chars: "${privateKey.substring(privateKey.length - 50)}"`);
  
  console.log('\n3️⃣ Line Ending Analysis:');
  console.log(`   - Contains \\r\\n: ${privateKey.includes('\r\n')}`);
  console.log(`   - Contains \\n: ${privateKey.includes('\n')}`);
  console.log(`   - Contains \\\\n: ${privateKey.includes('\\n')}`);
  console.log(`   - Contains \\r: ${privateKey.includes('\r')}`);
  
  console.log('\n4️⃣ PEM Structure Analysis:');
  console.log(`   - Has BEGIN header: ${privateKey.includes('-----BEGIN PRIVATE KEY-----')}`);
  console.log(`   - Has END footer: ${privateKey.includes('-----END PRIVATE KEY-----')}`);
  console.log(`   - Header position: ${privateKey.indexOf('-----BEGIN PRIVATE KEY-----')}`);
  console.log(`   - Footer position: ${privateKey.indexOf('-----END PRIVATE KEY-----')}`);
  
  // Count different types of line breaks
  const lines = privateKey.split('\n');
  const windowsLines = privateKey.split('\r\n');
  const escapedLines = privateKey.split('\\n');
  
  console.log('\n5️⃣ Line Count Analysis:');
  console.log(`   - Split by \\n: ${lines.length} lines`);
  console.log(`   - Split by \\r\\n: ${windowsLines.length} lines`);
  console.log(`   - Split by \\\\n: ${escapedLines.length} lines`);
  
  // Check for base64 encoding issues
  console.log('\n6️⃣ Encoding Analysis:');
  const hasOnlyValidPEMChars = /^[A-Za-z0-9+/=\-\s\n\r]+$/.test(privateKey);
  console.log(`   - Contains only valid PEM chars: ${hasOnlyValidPEMChars}`);
  
  // Try to detect if it's URL encoded
  const hasUrlEncoding = privateKey.includes('%') || privateKey.includes('+');
  console.log(`   - Might be URL encoded: ${hasUrlEncoding}`);
  
  // Check for potential JSON escaping
  const hasJsonEscaping = privateKey.includes('\\"') || privateKey.includes('\\\\');
  console.log(`   - Has JSON escaping: ${hasJsonEscaping}`);
  
  console.log('\n7️⃣ Attempted Fixes:');
  
  // Try different decoding strategies
  console.log('   Testing different private key formats...');
  
  // Strategy A: Direct use (current approach)
  let testKeyA = privateKey;
  console.log(`   A) Direct use - Length: ${testKeyA.length}`);
  
  // Strategy B: Replace escaped newlines
  let testKeyB = privateKey.replace(/\\n/g, '\n');
  console.log(`   B) Escaped newlines -> actual newlines - Length: ${testKeyB.length}`);
  
  // Strategy C: URL decode if needed
  let testKeyC = privateKey;
  if (hasUrlEncoding) {
    try {
      testKeyC = decodeURIComponent(privateKey);
      console.log(`   C) URL decoded - Length: ${testKeyC.length}`);
    } catch (e) {
      console.log(`   C) URL decode failed: ${e.message}`);
    }
  }
  
  // Strategy D: JSON unescape
  let testKeyD = privateKey;
  if (hasJsonEscaping) {
    try {
      testKeyD = JSON.parse(`"${privateKey}"`);
      console.log(`   D) JSON unescaped - Length: ${testKeyD.length}`);
    } catch (e) {
      console.log(`   D) JSON unescape failed: ${e.message}`);
    }
  }
  
  // Strategy E: Base64 decode test
  console.log('\n8️⃣ Base64 Analysis:');
  const keyContent = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  try {
    const decoded = Buffer.from(keyContent, 'base64');
    console.log(`   - Base64 decode successful - ${decoded.length} bytes`);
    console.log(`   - First 20 bytes: ${Array.from(decoded.slice(0, 20)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
    
    // Check if this looks like a valid private key (should start with ASN.1 structure)
    const isValidASN1 = decoded[0] === 0x30; // ASN.1 SEQUENCE
    console.log(`   - Appears to be valid ASN.1: ${isValidASN1}`);
    
  } catch (e) {
    console.log(`   - Base64 decode failed: ${e.message}`);
  }
  
} else {
  console.log('\n❌ No private key found in environment variables');
}

console.log('\n9️⃣ Recommendation:');
console.log('   Based on the analysis above, we should try a different approach.');
console.log('   The DECODER error suggests the private key bytes are malformed.');
console.log('   This could be due to:');
console.log('   - Incorrect line endings in Azure environment variable');
console.log('   - Double encoding (URL + JSON escaping)');
console.log('   - Truncated or corrupted key during copy/paste');
console.log('   - Azure App Service encoding the environment variable differently');

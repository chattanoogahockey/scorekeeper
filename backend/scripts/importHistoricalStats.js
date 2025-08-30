#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SERVER_URL = process.env.HOST_URL || 'http://localhost:3001';
const CSV_PATH = process.argv[2] || path.join(process.cwd(), 'data', 'historical_player_stats.csv');
const DRY_RUN = process.argv.includes('--dry');

async function main(){
  if(!fs.existsSync(CSV_PATH)) {
    console.error('CSV file not found:', CSV_PATH);
    process.exit(1);
  }
  const csv = fs.readFileSync(CSV_PATH,'utf8');
  console.log(`Uploading historical stats (${csv.split(/\r?\n/).length-1} rows) to ${SERVER_URL} dryRun=${DRY_RUN}`);
  try {
    const resp = await axios.post(`${SERVER_URL}/api/admin/historical-player-stats/import`, { csv, dryRun: DRY_RUN });
    console.log('Response:', resp.data);
  } catch (e) {
    console.error('Import failed:', e.response?.data || e.message);
    process.exit(1);
  }
}
main();

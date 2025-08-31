#!/usr/bin/env node
// Direct import of historical player stats CSV into Cosmos (bypasses HTTP server)
// Usage: node ./scripts/importHistoricalStatsDirect.js <path-to-csv> [--dry]
// CSV must contain headers: Name,Division,Year,Goals,Assists,PIM,GP,(optional Points,League,Season)

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function getContainer() {
  const mod = await import('../cosmosClient.js');
  return mod.getHistoricalPlayerStatsContainer();
}

function parseCsv(raw) {
  const lines = raw.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines.shift().split(',').map(h => h.trim());
  return lines.map(l => {
    const cols = l.split(',').map(c => c.trim());
    const obj = {}; header.forEach((h,i)=>{ obj[h] = cols[i] ?? ''; });
    return obj;
  });
}

const norm = v => (v ?? '').toString().trim();
const toInt = v => { const n = parseInt(v,10); return isNaN(n) ? 0 : n; };

async function main() {
  const csvPath = process.argv[2];
  const dryRun = process.argv.includes('--dry');
  if (!csvPath) {
    console.error('Provide path to CSV. Example: node scripts/importHistoricalStatsDirect.js ../data/final_historical_data.csv');
    process.exit(1);
  }
  const abs = path.isAbsolute(csvPath) ? csvPath : path.resolve(process.cwd(), csvPath);
  if (!fs.existsSync(abs)) {
    console.error('CSV not found:', abs);
    process.exit(1);
  }
  const raw = fs.readFileSync(abs,'utf8');
  const rows = parseCsv(raw);
  console.log(`Parsed ${rows.length} data rows from ${abs}`);

  const sample = rows[0];
  if (sample && !('Name' in sample && 'Division' in sample && 'Year' in sample)) {
    console.error('CSV missing required headers: Name, Division, Year');
    process.exit(1);
  }

  if (!process.env.COSMOS_DB_URI || !process.env.COSMOS_DB_KEY || !process.env.COSMOS_DB_NAME) {
    console.error('Cosmos env vars missing (COSMOS_DB_URI / COSMOS_DB_KEY / COSMOS_DB_NAME). Aborting.');
    process.exit(1);
  }

  const container = await getContainer();
  let imported = 0;
  for (const r of rows) {
    const playerName = norm(r.Name);
    const division = norm(r.Division) || 'Unknown';
    const year = norm(r.Year) || 'Unknown';
    if (!playerName || !division || !year) continue;
    const goals = toInt(r.Goals);
    const assists = toInt(r.Assists);
    const pim = toInt(r.PIM);
    const gp = toInt(r.GP);
    const points = r.Points ? toInt(r.Points) : goals + assists;
    const id = `${year}-${division}-${playerName.toLowerCase().replace(/\s+/g,'_')}`;
    const doc = {
      id,
      playerName,
      division,
      league: norm(r.League) || null,
      season: norm(r.Season) || null,
      year,
      goals,
      assists,
      pim,
      points,
      gp,
      source: 'historical',
      importedAt: new Date().toISOString()
    };
    if (!dryRun) await container.items.upsert(doc);
    imported++;
    if (imported % 250 === 0) console.log(`Progress: ${imported}/${rows.length}`);
  }
  console.log(`Finished. Imported ${imported} documents${dryRun ? ' (dry-run only, no writes performed)' : ''}.`);
}

main().catch(e => { console.error('Import failed:', e); process.exit(1); });

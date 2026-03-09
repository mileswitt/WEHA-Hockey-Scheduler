import { Router } from 'express';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = resolve(__dirname, '../../Data/anonymized.csv');

const router = Router();

function loadData() {
  const content = readFileSync(csvPath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true });
}

router.get('/options', (req, res) => {
  const data = loadData();
  const leagues = [...new Set(data.map(r => r.League))].sort();
  const divisions = [...new Set(data.map(r => r.Division))].sort();
  res.json({ leagues, divisions });
});

router.get('/players', (req, res) => {
  const { league, division } = req.query;
  const data = loadData();
  let result = data;
  if (league) result = data.filter(r => r.League === league);
  else if (division) result = data.filter(r => r.Division === division);
  res.json(result);
});

export default router;

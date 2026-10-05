import fs from 'node:fs';

async function main() {
  const detailRes = await fetch('https://propifyy.duckdns.org/assets/Detail-DLgua-e4.js');
  const detailTxt = await detailRes.text();

  // Find all matches for `ji`
  const matches = [...detailTxt.matchAll(/\bji\b/g)];
  console.log(`Found ${matches.length} occurrences of ji in Detail-DLgua-e4.js`);
  for (const m of matches) {
    const start = Math.max(0, m.index - 50);
    const end = Math.min(detailTxt.length, m.index + 100);
    const snip = detailTxt.slice(start, end);
    if (snip.includes('=') || snip.includes('function') || snip.includes('async')) {
      console.log('--- occurrence: ---');
      console.log(detailTxt.slice(Math.max(0, m.index - 100), m.index + 300));
    }
  }

  // Also inspect Transactions in index-Cg0ltatH.js
  const idxRes = await fetch('https://propifyy.duckdns.org/assets/index-Cg0ltatH.js');
  const idxTxt = await idxRes.text();
  const tPos = idxTxt.indexOf('Mã giao dịch');
  if (tPos !== -1) {
    console.log('\n--- Transaction Component in index-Cg0ltatH.js ---');
    console.log(idxTxt.slice(Math.max(0, tPos - 800), tPos + 1200));
  }
}

main().catch(console.error);

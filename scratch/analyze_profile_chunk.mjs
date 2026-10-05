import fs from 'node:fs';

async function main() {
  const res = await fetch('https://propifyy.duckdns.org/assets/Profile-BMELtOec.js');
  const txt = await res.text();
  
  // Find where `Y.value` is defined or where transaction table and API call is made
  const p = txt.indexOf('Tìm kiếm theo tên tin đăng');
  console.log('=== Transaction UI template: ===');
  console.log(txt.slice(p, p + 3000));

  // Search for the transaction fetching function or api endpoint (e.g. /transactions, /payments, etc.)
  const apiMatch = txt.match(/["'`]\/api\/v1\/[^"'`]*trans[^"'`]*["'`]|["'`]\/api\/v1\/[^"'`]*payment[^"'`]*["'`]/g);
  console.log('API endpoints matched:', apiMatch);

  // Search for where the transaction table rows are rendered
  const trMatch = txt.indexOf('Không có lịch sử giao dịch nào');
  if (trMatch !== -1) {
    console.log('=== Empty row and table rendering: ===');
    console.log(txt.slice(Math.max(0, trMatch - 1500), trMatch + 1500));
  }
}

main().catch(console.error);

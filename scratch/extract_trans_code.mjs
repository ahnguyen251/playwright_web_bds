async function main() {
  const idxRes = await fetch('https://propifyy.duckdns.org/assets/index-Cg0ltatH.js');
  const txt = await idxRes.text();

  // Find occurrences of 'Mã giao dịch'
  let pos = 0;
  while ((pos = txt.indexOf('Mã giao dịch', pos)) !== -1) {
    console.log(`=== Found at pos ${pos} ===`);
    console.log(txt.slice(Math.max(0, pos - 1000), pos + 2500));
    pos += 12;
  }
}

main().catch(console.error);

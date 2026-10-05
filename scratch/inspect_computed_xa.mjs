async function main() {
  const res = await fetch('https://propifyy.duckdns.org/assets/Profile-BMELtOec.js');
  const txt = await res.text();
  
  const idx = txt.indexOf('let Xa=M(');
  if (idx !== -1) {
    console.log(txt.slice(idx, idx + 500));
  }
}

main().catch(console.error);

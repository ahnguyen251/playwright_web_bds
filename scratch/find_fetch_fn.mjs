async function main() {
  const res = await fetch('https://propifyy.duckdns.org/assets/Profile-BMELtOec.js');
  const txt = await res.text();
  
  // Find `function qa` or `qa=`
  const idx = txt.indexOf('function qa(');
  if (idx !== -1) {
    console.log(txt.slice(idx, idx + 1000));
  } else {
    const idx2 = txt.indexOf('qa=async');
    if (idx2 !== -1) {
      console.log(txt.slice(idx2, idx2 + 1000));
    } else {
      // Find where api call is made
      const m = txt.match(/qa\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/);
      if (m) {
        console.log(txt.slice(m.index, m.index + 1000));
      }
    }
  }
}

main().catch(console.error);

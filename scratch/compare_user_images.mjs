import fs from 'node:fs';
import crypto from 'node:crypto';

const dir = 'C:/Users/buith/.gemini/antigravity-ide/brain/c0c7ed25-ae02-4c7b-b446-d6530e4541b1/.user_uploaded/';
const files = fs.readdirSync(dir);

for (const f of files) {
  const buf = fs.readFileSync(dir + f);
  const hash = crypto.createHash('md5').update(buf).digest('hex');
  console.log(f, buf.length, hash);
}

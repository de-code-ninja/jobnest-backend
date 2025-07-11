import fs from 'fs';

const key = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

// this will escape newlines properly
const escapedKey = key.private_key.replace(/\n/g, '\\n');

console.log(JSON.stringify(escapedKey)); // use this to see exact escaped output


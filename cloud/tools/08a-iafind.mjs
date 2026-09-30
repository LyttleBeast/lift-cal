// 08a-iafind.mjs — IA advancedsearch (archive.org only). Usage: node 08a-iafind.mjs '<lucene query>' [rows]
const [q, rows = '30'] = process.argv.slice(2);
const u = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=title&fl[]=year&fl[]=date&fl[]=contributor&fl[]=imagecount&rows=${rows}&output=json`;
if (!new URL(u).hostname.endsWith('archive.org')) throw new Error('host');
const j = await (await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch' } })).json();
console.log('found', j.response?.numFound);
for (const d of j.response?.docs || []) console.log(`${d.identifier} | ${d.year || d.date} | ${String(d.title).slice(0, 110)} | ${d.contributor || ''} | ${d.imagecount || ''}`);

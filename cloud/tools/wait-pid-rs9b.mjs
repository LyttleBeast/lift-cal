// Blocks until a pid exits or maxSec passes (judge rs9 r1).
const pid = Number(process.argv[2]); const maxSec = Number(process.argv[3] || 580);
const alive = () => { try { process.kill(pid, 0); return true; } catch { return false; } };
const start = Date.now();
const t = setInterval(() => {
  if (!alive()) { console.log('exited'); clearInterval(t); }
  else if ((Date.now() - start) / 1000 > maxSec) { console.log('still running'); clearInterval(t); }
}, 3000);

// Waits for a pid to exit, printing one line when it does (judge rs9 r1).
const pid = Number(process.argv[2]);
const alive = () => { try { process.kill(pid, 0); return true; } catch { return false; } };
const t = setInterval(() => { if (!alive()) { console.log('pid ' + pid + ' exited'); clearInterval(t); } }, 3000);

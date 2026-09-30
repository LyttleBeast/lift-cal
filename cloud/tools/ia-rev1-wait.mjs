// Wait until a pid exits (polls every 5s, up to argv[3] minutes). Prints "done" or "timeout".
const pid = Number(process.argv[2]);
const mins = Number(process.argv[3] || 60);
const alive = () => { try { process.kill(pid, 0); return true; } catch { return false; } };
const end = Date.now() + mins * 60e3;
while (alive() && Date.now() < end) await new Promise(r => setTimeout(r, 5000));
console.log(alive() ? 'timeout' : 'done');

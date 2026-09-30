// rt1-diffscan: list added/removed lines of the engine diff (app, src) that touch
// runtime behaviour — hooks, timers, navigation, animation, haptics, keys, memo,
// handlers — so a reviewer can walk each one. Read-only (git diff via spawn).
import { spawnSync } from 'node:child_process';
const T = '/Users/micahflunker/dev/vibes-night/wt/nat-engine';
const r = spawnSync('git', ['-C', T, 'diff', '--unified=0', '1cb6498..HEAD', '--', 'app', 'src/ui', 'src/state', 'src/pure/coach-view.js', 'src/pure/recap-view.js'], { encoding: 'utf8', maxBuffer: 64 << 20 });
const RE = new RegExp(process.argv[2] || '\\buse[A-Z]\\w*\\(|setTimeout|setInterval|requestAnimationFrame|router\\.|navigation\\.|Animated\\.|withTiming|withRepeat|withSpring|LayoutAnimation|Haptics|haptic|\\bkey=|memo\\(|onPress=|onLayout=|onLongPress|onChange|Keyboard\\.|Font\\.|SplashScreen|StatusBar|AccessibilityInfo|announce|Audio');
let file = '', hunk = '';
for (const line of r.stdout.split('\n')) {
  if (line.startsWith('+++ b/')) { file = line.slice(6); continue; }
  if (line.startsWith('--- ')) continue;
  if (line.startsWith('@@')) { hunk = line.replace(/^@@ [^@]*@@ ?/, '').slice(0, 60); const m = /\+(\d+)/.exec(line); hunk = (m ? m[1] : '?'); continue; }
  if ((line.startsWith('+') || line.startsWith('-')) && RE.test(line) && !/^\s*[+-]\s*(\/\/|\*|\/\*)/.test(line)) console.log(file + ':' + hunk + ' ' + line.slice(0, 200));
}

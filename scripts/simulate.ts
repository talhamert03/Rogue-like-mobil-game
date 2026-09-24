/* Balance simulation: runs many bot games per class and reports outcomes. */
import { newRun } from '../src/engine/run';
import { botPlayRun } from '../src/engine/bot';
import { defaultProfile } from '../src/engine/meta';
import { CLASS_ORDER } from '../src/data/classes';
import type { GameMode } from '../src/engine/runTypes';

const N = Number(process.env.N ?? 20);
const mode = (process.env.MODE ?? 'classic') as GameMode;
const profile = defaultProfile();
const rows: string[] = [];
let errors = 0;
for (const cls of CLASS_ORDER) {
  let wins = 0;
  let acts = 0;
  let floors = 0;
  const deaths: Record<string, number> = {};
  for (let i = 0; i < N; i++) {
    try {
      const run = newRun({ cls, mode, seed: 1000 + i * 7919, hellLevel: 1 }, profile);
      botPlayRun(run, profile);
      if (run.screen === 'victory') wins++;
      acts += run.act;
      floors += run.mode === 'tower' ? run.towerFloor : run.floor;
      if (run.screen === 'defeat') {
        const last = run.fought[run.fought.length - 1];
        deaths[last] = (deaths[last] ?? 0) + 1;
      }
    } catch (e) {
      errors++;
      console.error(cls, i, e);
    }
  }
  const topDeaths = Object.entries(deaths)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${k}:${v}`)
    .join(' ');
  rows.push(`${cls.padEnd(12)} win ${((wins / N) * 100).toFixed(0).padStart(3)}%  avgAct ${(acts / N).toFixed(2)}  avgFloor ${(floors / N).toFixed(1)}  deaths ${topDeaths}`);
}
console.log(rows.join('\n'));
if (errors) {
  console.error(`${errors} errors`);
  process.exit(1);
}

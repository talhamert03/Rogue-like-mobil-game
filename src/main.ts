import './ui/style.css';
import { App } from './ui/app';
import { audio } from './audio/audio';
import * as runApi from './engine/run';

function boot(): void {
  const root = document.getElementById('app');
  if (!root) return;
  const app = new App(root);
  (window as unknown as { __app: App }).__app = app;
  // test/debug hook (used by the automated browser tests)
  (window as unknown as { __dd: unknown }).__dd = runApi;
  app.go('title');
  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  // save when the app is backgrounded (mobile)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      app.save();
      audio.ctx?.suspend().catch(() => undefined);
    } else audio.ctx?.resume().catch(() => undefined);
  });
  window.addEventListener('pagehide', () => app.save());
  if ('serviceWorker' in navigator && location.protocol === 'https:' && import.meta.env.PROD) {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  }
}

boot();

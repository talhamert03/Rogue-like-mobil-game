import './ui/style.css';
import { App } from './ui/app';
import { audio } from './audio/audio';
import * as runApi from './engine/run';
import * as gfx from './gfx/render';
import { storage, KEYS } from './engine/storage';

const ARTIFACT = import.meta.env.VITE_TARGET === 'artifact';

interface HotApi {
  ready?: (start: (data: HotData) => void) => void;
  snapshot?: (fn: () => HotData) => void;
  data?: HotData;
}
interface HotData {
  profile?: string | null;
  run?: string | null;
}

function boot(data: HotData = {}): void {
  const root = document.getElementById('app');
  if (!root) return;
  // restore state handed over by a live page update
  if (data.profile) storage.set(KEYS.profile, data.profile);
  if (data.run) storage.set(KEYS.run, data.run);
  const app = new App(root);
  try {
    hot()?.snapshot?.(() => {
      app.save();
      return { profile: storage.get(KEYS.profile), run: storage.get(KEYS.run) };
    });
  } catch {
    /* not running inside a host that supports live updates */
  }
  (window as unknown as { __app: App }).__app = app;
  // test/debug hook (used by the automated browser tests)
  (window as unknown as { __dd: unknown }).__dd = runApi;
  (window as unknown as { __gfx: unknown }).__gfx = gfx;
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
  void setupNative(app);
  if (!ARTIFACT && 'serviceWorker' in navigator && location.protocol === 'https:' && import.meta.env.PROD) {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  }
}

function hot(): HotApi | undefined {
  return (window as unknown as { claude?: { hot?: HotApi } }).claude?.hot;
}

const h = hot();
if (h?.ready) h.ready(boot);
else boot(h?.data ?? {});

/** Android hardware back button: close dialogs, open the pause menu, or go back to the title. */
async function setupNative(app: App): Promise<void> {
  if (ARTIFACT) return;
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return;
  const { App: NativeApp } = await import('@capacitor/app');
  await NativeApp.addListener('backButton', () => {
    const modal = document.querySelector('.modal-back');
    if (modal) {
      modal.remove();
      return;
    }
    if (document.querySelector('.title-screen')) {
      app.save();
      void NativeApp.minimizeApp();
      return;
    }
    if (app.run && app.root.querySelector('.topbar')) app.pauseMenu();
    else app.go('title');
  });
  await NativeApp.addListener('pause', () => app.save());
}

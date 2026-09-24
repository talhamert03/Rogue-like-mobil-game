export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, unknown> = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'dataset' && typeof v === 'object') Object.assign(el.dataset, v);
    else el.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

let speed = 1;
export function setAnimSpeed(s: number): void {
  speed = s;
}
export function animSpeed(): number {
  return speed;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms / speed));
}

export function anim(el: Element, frames: Keyframe[], ms: number, opts: KeyframeAnimationOptions = {}): Promise<void> {
  if (!('animate' in el)) return Promise.resolve();
  const a = (el as HTMLElement).animate(frames, { duration: ms / speed, easing: 'ease-out', ...opts });
  return a.finished.then(
    () => undefined,
    () => undefined,
  );
}

export function vibrate(ms: number | number[], enabled: boolean): void {
  if (!enabled) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}

/** simple long-press + tap helper for touch and mouse */
export function onPress(el: HTMLElement, tap: (e: PointerEvent) => void, long?: (e: PointerEvent) => void, ms = 420): void {
  let timer: number | undefined;
  let fired = false;
  let sx = 0;
  let sy = 0;
  el.addEventListener('pointerdown', (e) => {
    fired = false;
    sx = e.clientX;
    sy = e.clientY;
    if (long)
      timer = window.setTimeout(() => {
        fired = true;
        long(e);
      }, ms);
  });
  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };
  el.addEventListener('pointermove', (e) => {
    if (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10) cancel();
  });
  el.addEventListener('pointerleave', cancel);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('pointerup', (e) => {
    cancel();
    if (!fired) tap(e);
  });
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (long && !fired) {
      fired = true;
      long(e as PointerEvent);
    }
  });
}

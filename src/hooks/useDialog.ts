'use client';
import { useEffect, useRef } from 'react';

export function useDialog(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = ref.current;
    if (!root) return;
    const controls = () => Array.from(root.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]'))
      .filter((element) => element.tabIndex >= 0 && !element.hasAttribute('disabled') && element.getClientRects().length > 0);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (controls().find((element) => element.tagName === 'INPUT') ?? controls()[0] ?? root).focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0]; const last = items.at(-1);
      if (!first) { event.preventDefault(); root.focus(); }
      else if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    const focus = (event: FocusEvent) => { if (!root.contains(event.target as Node)) (controls()[0] ?? root).focus(); };
    document.addEventListener('keydown', keydown);
    document.addEventListener('focusin', focus);
    return () => { document.removeEventListener('keydown', keydown); document.removeEventListener('focusin', focus); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return ref;
}

"use client";
import { useEffect, useRef } from 'react';
/** Keep keyboard focus inside an open modal and restore its trigger on close. */
export function useDialog<T extends HTMLElement = HTMLDivElement>(open: boolean, onClose: () => void, busy = false) {
  const root = useRef<T>(null);
  const latest = useRef({ onClose, busy });
  latest.current = { onClose, busy };
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(root.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]') || []).filter(el => el.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => focusable()[0]?.focus());
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); if (!latest.current.busy) latest.current.onClose(); }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (!elements.length) { event.preventDefault(); root.current?.focus(); return; }
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !root.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !root.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', key); if (previous?.isConnected) previous.focus(); };
  }, [open]);
  return root;
}

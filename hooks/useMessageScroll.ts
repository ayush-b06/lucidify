"use client";
import { useEffect, useRef } from 'react';
export function useMessageScroll(messages: { id: string; sender: string }[], key: string, sender: string) {
    const ref = useRef<HTMLDivElement>(null);
    const nearBottom = useRef(true);
    const previousKey = useRef('');
    const latestKey = useRef(key); latestKey.current = key;
    const last = messages[messages.length - 1];
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        if (previousKey.current !== key || nearBottom.current || last?.sender === sender) {
            element.scrollTop = element.scrollHeight; nearBottom.current = true;
        }
        previousKey.current = key;
    }, [key, last?.id, last?.sender, sender]);
    return {
        ref,
        onScroll: () => { const element = ref.current; if (element) nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 100; },
        onSent: (sentKey: string) => { if (sentKey === latestKey.current && ref.current) { ref.current.scrollTop = ref.current.scrollHeight; nearBottom.current = true; } },
    };
}

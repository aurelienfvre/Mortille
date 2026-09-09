'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
/** Covers the old scene before switching, then waits for the new scene to render. */
export function useHouseDoorway(setHouse: (inside: boolean) => void) {
 const busy = useRef(false);
 const [target, setTarget] = useState<boolean|null>(null);
 const [stage, setStage] = useState<'closing'|'waiting'|'opening'>('closing');
 const [ready, setReady] = useState(false);
 const request = useCallback((inside: boolean) => {
  if (busy.current) return;
  busy.current = true; setReady(!inside); setStage('closing'); setTarget(inside);
 }, []);
 const cancel = useCallback(() => { busy.current=false; setTarget(null); }, []);
 const rendered = useCallback(() => setReady(true), []);
 useEffect(() => {
  if (target === null) return;
  if (stage === 'closing') {
   const timer = setTimeout(() => { setHouse(target); setStage('waiting'); }, 220);
   return () => clearTimeout(timer);
  }
  if (stage === 'waiting' && ready) {
   const frame = requestAnimationFrame(() => setStage('opening'));
   return () => cancelAnimationFrame(frame);
  }
  if (stage === 'opening') {
   const timer = setTimeout(cancel, 220);
   return () => clearTimeout(timer);
  }
 }, [target, stage, ready, setHouse, cancel]);
 return { active: target !== null, stage, request, cancel, rendered };
}

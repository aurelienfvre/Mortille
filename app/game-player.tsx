'use client';
import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createEngine, type Input, type Snapshot, W, H } from './engine';
import { games } from './catalog';
const Kart = lazy(() => import('./kart'));
const PlatformWorld = lazy(() => import('./platform-world'));
function LegacyGamePlayer({
  index,
  disc=false,
  onExit,
  muted,
  setMuted,
}: {
  index: number;
  disc?: boolean;
  onExit: () => void;
  muted: boolean;
  setMuted: (m: boolean) => void;
}) {
  const game = games[index];
  const canvas = useRef<HTMLCanvasElement>(null);
  const input = useRef<Input>({
    held: new Set(),
    pressed: new Set(),
    pointer: { x: 480, y: 300, active: false },
  });
  const [phase, setPhase] = useState<'ready' | 'play' | 'pause' | 'end'>(
    'ready',
  );
  const phaseRef = useRef(phase);
  const muteRef = useRef(muted);
  const [round, setRound] = useState(0);
  const [status, setStatus] = useState<Snapshot>({
    score: 0,
    health: 3,
    objective: game.goal,
    result: null,
  });
  const [best, setBest] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    phaseRef.current = phase;
    if (phase !== 'play') {
      input.current.held.clear();
      input.current.pressed.clear();
      input.current.pointer.active = false;
    }
  }, [phase]);
  useEffect(() => {
    muteRef.current = muted;
  }, [muted]);
  useEffect(() => {
    try {
      const n = Number(localStorage.getItem('arcad-neo-record-' + game.id));
      setBest(Number.isFinite(n) ? n : 0);
    } catch {}
  }, [game.id]);
  const sound = (frequency = 450) => {
    if (muteRef.current) return;
    try {
      const ctx = audio.current ?? (audio.current = new AudioContext());
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        frequency * 0.5,
        ctx.currentTime + 0.08,
      );
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.11);
    } catch {}
  };
  const report = (s: Snapshot) => {
    setStatus(s);
    if (s.result) {
      phaseRef.current = 'end';
      setPhase('end');
      try {
        const old =
          Number(localStorage.getItem('arcad-neo-record-' + game.id)) || 0;
        if (s.score > old) {
          localStorage.setItem('arcad-neo-record-' + game.id, String(s.score));
          setBest(s.score);
        }
      } catch {}
    }
  };
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k))
        e.preventDefault();
      if (k === 'Escape' || k === 'p') {
        setPhase((p) => (p === 'play' ? 'pause' : p === 'pause' ? 'play' : p));
        return;
      }
      if (
        phaseRef.current === 'ready' &&
        k === 'Enter' &&
        !(e.target instanceof HTMLButtonElement)
      ) {
        setPhase('play');
        return;
      }
      if (phaseRef.current !== 'play') {
        if (k === 'ArrowUp' || k === 'ArrowDown') {
          const buttons = Array.from(
            document.querySelectorAll<HTMLButtonElement>('.game-dialog button'),
          );
          const current = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          buttons[
            (current + (k === 'ArrowDown' ? 1 : -1) + buttons.length) %
              buttons.length
          ]?.focus();
        }
        return;
      }
      if (!input.current.held.has(k)) input.current.pressed.add(k);
      input.current.held.add(k);
    };
    const keyup = (e: KeyboardEvent) =>
      input.current.held.delete(
        e.key.length === 1 ? e.key.toLowerCase() : e.key,
      );
    const blur = () => {
      input.current.held.clear();
      input.current.pressed.clear();
      input.current.pointer.active = false;
      setPhase((p) => (p === 'play' ? 'pause' : p));
    };
    const visibility = () => {
      if (document.hidden) blur();
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
      void audio.current?.close();
      audio.current = null;
    };
  }, []);
  useEffect(() => {
    if (['kart', 'mario', 'strike'].includes(game.id)) return;
    const c = canvas.current?.getContext('2d');
    if (!c) return;
    const engine = createEngine(game.id, sound);
    let raf = 0,
      last = 0,
      display = 0;
    const frame = (ms: number) => {
      const dt = Math.min((ms - last) / 1000 || 0, 1 / 30);
      last = ms;
      if (phaseRef.current === 'play') {
        engine.update(dt, input.current);
        input.current.pressed.clear();
        display += dt;
        const s = engine.snapshot();
        if (display > 0.09 || s.result) {
          report(s);
          display = 0;
        }
      }
      engine.draw(c);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [game.id, round]);
  const touch = (key: string, held: boolean) => {
    if (phaseRef.current !== 'play') return;
    if (held) {
      input.current.pressed.add(key);
      input.current.held.add(key);
    } else input.current.held.delete(key);
  };
  const restart = () => {
    input.current.held.clear();
    input.current.pressed.clear();
    setStatus({ score: 0, health: 3, objective: game.goal, result: null });
    phaseRef.current = 'play';
    setPhase('play');
    setRound((n) => n + 1);
  };
  return (
    <section
      className="game-room"
      role="dialog"
      aria-modal="true"
      aria-label={game.name}
      style={{ '--accent': game.color } as React.CSSProperties}
    >
      <div className="game-toolbar">
        <span>{game.name}</span>
        <Button
          variant="ghost"
          aria-label="Ouvrir le menu pause"
          onClick={() =>
            setPhase((p) =>
              p === 'play' ? 'pause' : p === 'pause' ? 'play' : p,
            )
          }
        >
          <Pause size={17} />
          <span>ÉCHAP</span>
        </Button>
      </div>
      <div className="game-monitor">
        <div className="game-hud">
          <span>
            SCORE <strong>{status.score.toString().padStart(5, '0')}</strong>
          </span>
          <span className="hud-objective">{status.objective || game.goal}</span>
          <span>
            {game.id === 'kart' ? 'ÉNERGIE' : 'VIES'}{' '}
            <strong>{Math.max(0, status.health)}</strong>
          </span>
        </div>
        <div className="game-display">
          {['mario', 'strike'].includes(game.id) ? (
            <Suspense
              fallback={
                <div className="scene-loading">Préparation du quartier…</div>
              }
            >
              <PlatformWorld
                key={round}
                id={game.id}
                input={input}
                phase={phaseRef}
                report={report}
                sound={sound}
              />
            </Suspense>
          ) : game.id === 'kart' ? (
            <Suspense
              fallback={
                <div className="scene-loading">Préparation du kart…</div>
              }
            >
              <Kart
                key={round}
                input={input}
                phase={phaseRef}
                report={report}
                sound={sound}
              />
            </Suspense>
          ) : (
            <canvas
              ref={canvas}
              width={W}
              height={H}
              aria-label={game.goal}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                const r = e.currentTarget.getBoundingClientRect();
                input.current.pointer = {
                  x: ((e.clientX - r.left) / r.width) * W,
                  y: ((e.clientY - r.top) / r.height) * H,
                  active: true,
                };
                if (game.id === 'doctor') touch(' ', true);
              }}
              onPointerMove={(e) => {
                if (input.current.pointer.active) {
                  const r = e.currentTarget.getBoundingClientRect();
                  input.current.pointer.x =
                    ((e.clientX - r.left) / r.width) * W;
                  input.current.pointer.y =
                    ((e.clientY - r.top) / r.height) * H;
                }
              }}
              onPointerUp={() => {
                input.current.pointer.active = false;
                touch(' ', false);
              }}
              onPointerCancel={() => {
                input.current.pointer.active = false;
                touch(' ', false);
              }}
            />
          )}
          {phase !== 'play' && (
            <div className="game-overlay">
              <div className="game-dialog" onPointerMove={(e)=>{const b=(e.target as HTMLElement).closest('button');if(b && document.activeElement!==b)b.focus();}}>
                <div className="menu-status">
                  <span>PLAYER 01</span>
                  <span>{game.name}</span>
                </div>
                <span className="game-eyebrow">
                  {phase === 'end'
                    ? status.result === 'won'
                      ? 'MISSION ACCOMPLIE'
                      : 'FIN DE PARTIE'
                    : phase === 'pause'
                      ? 'PAUSE'
                      : disc?'DISQUE INSÉRÉ':'CARTOUCHE INSÉRÉE'}
                </span>
                <h2>
                  {phase === 'ready'
                    ? game.name
                    : phase === 'pause'
                      ? 'PAUSE'
                      : status.result === 'won'
                        ? 'Bien joué !'
                        : 'Encore une ?'}
                </h2>
                <p>
                  {phase === 'ready'
                    ? game.description
                    : phase === 'pause'
                      ? 'PARTIE SUSPENDUE — CHOISISSEZ UNE ACTION'
                      : `${status.score} points · Record sur cet appareil : ${best}`}
                </p>
                {phase === 'ready' && (
                  <>
                    <p className="goal">{game.goal}</p>
                    <div className="game-instructions">{game.keys}</div>
                  </>
                )}
                <Button
                  className="start-game"
                  autoFocus
                  onClick={() =>
                    phase === 'end' ? restart() : setPhase('play')
                  }
                >
                  {phase === 'end' ? (
                    <RotateCcw size={17} />
                  ) : (
                    <Play size={17} />
                  )}{' '}
                  {phase === 'ready'
                    ? 'Commencer'
                    : phase === 'pause'
                      ? 'Reprendre'
                      : 'Rejouer'}
                </Button>
                {phase === 'pause' && (
                  <>
                    <Button
                      className="exit-game"
                      variant="ghost"
                      onClick={restart}
                    >
                      <RotateCcw size={15} /> Recommencer
                    </Button>
                    <Button
                      className="exit-game"
                      variant="ghost"
                      onClick={() => setMuted(!muted)}
                    >
                      {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}{' '}
                      Son {muted ? 'désactivé' : 'activé'}
                    </Button>
                  </>
                )}
                <Button
                  className="exit-game eject-game"
                  variant="ghost"
                  onClick={onExit}
                >
                  <ArrowLeft size={15} /> {disc?'Éjecter le disque':'Éjecter la cartouche'}
                </Button>
                <div className="menu-controls">
                  ↑ ↓ SÉLECTIONNER <span>ENTRÉE VALIDER</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="monitor-label">
          <span>MORTIZLE · CRT ARCADE SYSTEM</span>
          <span>
            <i /> POWER
          </span>
        </div>
      </div>
      <div className="controls-legend">
        {game.keys}
        <span>Échap : pause</span>
      </div>
      <div className="touch-controls">
        <div className="dpad">
          {[
            ['ArrowUp', <ArrowUp key="u" />],
            ['ArrowLeft', <ArrowLeft key="l" />],
            ['ArrowDown', <ArrowDown key="d" />],
            ['ArrowRight', <ArrowRight key="r" />],
          ].map(([key, icon]) => (
            <button
              key={String(key)}
              aria-label={String(key)}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                touch(String(key), true);
              }}
              onPointerUp={() => touch(String(key), false)}
              onPointerCancel={() => touch(String(key), false)}
            >
              {icon}
            </button>
          ))}
        </div>
        {!['snake', 'pac', 'pong'].includes(game.id) && (
          <button
            className="action-pad"
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              touch(' ', true);
            }}
            onPointerUp={() => touch(' ', false)}
            onPointerCancel={() => touch(' ', false)}
          >
            <Zap size={20} />
            {game.id === 'mario'
              ? 'Sauter'
              : game.id === 'kart'
                ? 'Turbo'
                : game.id === 'tetris'
                  ? 'Chute'
                  : 'Action'}
          </button>
        )}
      </div>
    </section>
  );
}

const Mariomortille = lazy(() => import('./mariomortille/player'));
export default function GamePlayer(props: { index: number; disc?: boolean; onExit: () => void; muted: boolean; setMuted: (m: boolean) => void }) {
  if (games[props.index]?.id === 'mario') return <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#141d2a', color: '#fff4d6', display: 'grid', placeItems: 'center', zIndex: 100 }}>OUVERTURE DU QUARTIER…</div>}><Mariomortille onExit={props.onExit} muted={props.muted} /></Suspense>;
  return <LegacyGamePlayer {...props} />;
}

'use client';
import {STORAGE_DURATION} from './storage-motion';
import { swapDuration } from './cartridge-motion';
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  lazy,
  Suspense,
} from 'react';
import {
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Play,
  X,
  Grid2X2,
  Footprints,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { games } from './catalog';
import { ArcadeAudio } from './audio';
import {
  CONSOLES,
  DEFAULT_CONSOLE,
  getConsole,
  isConsoleId,
  type ConsoleId,
} from './console-catalog';
const Room = lazy(() => import('./immersive'));
const loadPlayer = () => import('./game-player');
const GamePlayer = lazy(loadPlayer);
export default function Home() {
  const [index, setIndex] = useState(0),
    [ready, setReady] = useState(false),
    [muted, setMuted] = useState(false),
    [playing, setPlaying] = useState(false),
    [catalog, setCatalog] = useState(false);
  const [consoleId, setConsoleId] = useState<ConsoleId>(DEFAULT_CONSOLE);
  const [consoleMode, setConsoleMode] = useState(false);
  const [consoleReady, setConsoleReady] = useState(false);
  const [hasEnteredLobby,setHasEnteredLobby]=useState(false);
  const onConsoleReady = useCallback(() => {setConsoleReady(true);setHasEnteredLobby(true);}, []);
  const [consoleStorageReady, setConsoleStorageReady] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [exploring, setExploring] = useState(false);
  const moveInput = useRef({ forward: 0, side: 0 });
  const [launching, setLaunching] = useState(false),
    [warp, setWarp] = useState(false);
  const lock = useRef(false);
  const selectionUntil = useRef(0);
  const audio = useRef<ArcadeAudio | null>(null);
  const game = games[index];
  const consoleLocked = launching || exiting || playing;
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mortizle.console');
      if (isConsoleId(saved)) setConsoleId(saved);
    } catch {}
    setConsoleStorageReady(true);
  }, []);
  useEffect(() => {
    if (!consoleStorageReady) return;
    try {
      localStorage.setItem('mortizle.console', consoleId);
    } catch {}
  }, [consoleId, consoleStorageReady]);
  const changeConsoleMode=(mode:boolean)=>{
    if(consoleLocked||mode===consoleMode||performance.now()<selectionUntil.current)return;
    selectionUntil.current=performance.now()+STORAGE_DURATION*1000+100;
    setConsoleMode(mode);
    if(!muted){try{audio.current?.storageSwitch();}catch{}}
  };
  const selectConsole = (id: string) => {
    if (!isConsoleId(id)) return;
    if (lock.current || consoleLocked || id === consoleId || performance.now()<selectionUntil.current) return;
    const old=CONSOLES.findIndex(c=>c.id===consoleId),next=CONSOLES.findIndex(c=>c.id===id);
    selectionUntil.current=performance.now()+swapDuration(old,next,CONSOLES.length)*1000+70;
    setConsoleReady(false);
    setConsoleId(id);
    if (!muted) { try { audio.current?.switchConsole(consoleId,id); } catch {} }
  };
  const navigateConsole = (direction: number) => {
    const current = CONSOLES.findIndex(item => item.id === consoleId);
    selectConsole(CONSOLES[(current + direction + CONSOLES.length) % CONSOLES.length].id);
  };
  useEffect(() => {
    setReady(true);
    void loadPlayer();
    const engine = new ArcadeAudio();
    audio.current = engine;
    return () => {
      engine.close();
      if (audio.current === engine) audio.current = null;
    };
  }, [ArcadeAudio]);
  useEffect(()=>{
    const update=()=>audio.current?.music(!muted&&!playing&&!document.hidden);
    const unlock=()=>{if(!muted&&!playing)update();};
    if(audio.current?.context)update();
    window.addEventListener('pointerdown',unlock,true);window.addEventListener('keydown',unlock,true);
    const visibility=()=>{if(audio.current?.context)update();};
    document.addEventListener('visibilitychange',visibility);
    return()=>{window.removeEventListener('pointerdown',unlock,true);window.removeEventListener('keydown',unlock,true);document.removeEventListener('visibilitychange',visibility);};
  },[muted,playing]);
  const start = () => {
    if (
      lock.current ||
      playing ||
      !consoleReady ||
      performance.now() < selectionUntil.current
    )
      return;
    if (consoleMode) { changeConsoleMode(false); return; }
    lock.current = true;
    setCatalog(false);
    setExploring(false);
    setLaunching(true);
    if (!muted) {
      try {
        (audio.current ?? (audio.current = new ArcadeAudio())).launch();
      } catch {}
    }
  };
  const select = (n: number) => {
    if (lock.current || playing || performance.now() < selectionUntil.current)
      return;
    if (n === index) return;
    selectionUntil.current =
      performance.now() + swapDuration(index, n) * 1000 + 70;
    setIndex(n);
    if (!muted) {
      try {
        (audio.current ?? (audio.current = new ArcadeAudio())).select();
      } catch {}
    }
  };
  const exit = () => {
    audio.current?.stop();
    setPlaying(false);
    setLaunching(false);
    setWarp(false);
    setExiting(true);
    lock.current = true;
    if (!muted) {
      try {
        (audio.current ?? (audio.current = new ArcadeAudio())).eject();
      } catch {}
    }
  };
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (
        playing ||
        exiting ||
        launching ||
        exploring ||
        e.target instanceof HTMLButtonElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (consoleMode) navigateConsole(1); else select((index + 1) % 9);
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (consoleMode) navigateConsole(-1); else select((index + 8) % 9);
      }
      if (e.key === 'Enter') { e.preventDefault(); if (consoleMode) changeConsoleMode(false); else start(); }
      if (e.key === 'Escape' && performance.now()>=selectionUntil.current) { setCatalog(false); changeConsoleMode(false); }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [
    playing,
    launching,
    exiting,
    consoleMode,
    consoleId,
    index,
    muted,
    exploring,
    consoleReady,
  ]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: any })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    for (const tool of [
      {
        name: 'list_arcade_games',
        description: 'List the nine playable arcade cartridges.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () =>
          games.map((g, i) => ({ id: g.id, title: g.name, index: i })),
      },
      {
        name: 'select_arcade_cartridge',
        description:
          'Select a cartridge in the arcade lobby without starting a game.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', enum: games.map((g) => g.id) } },
          required: ['id'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: async (input: any) => {
          const i = games.findIndex((g) => g.id === input?.id);
          if (i < 0) throw Error('Unknown cartridge');
          if (lock.current) throw Error('Launch in progress');
          setPlaying(false);
          setIndex(i);
          await new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r)),
          );
          return { selected: games[i].id, status: 'selected' };
        },
      },
    ]) {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    }
    return () => lifecycle.abort();
  }, []);
  return (
    <main
      className={`immersive-shell ${launching ? 'is-launching' : ''} ${warp ? 'is-warping' : ''} ${exiting ? 'is-exiting' : ''}`}
      style={{ '--accent': game.color } as React.CSSProperties}
    >
      <h1 className="sr-only">MORTIZLE — Salle d’arcade</h1>
      <div className="full-scene">
        {ready && !playing && (
          <Suspense
            fallback={
              hasEnteredLobby ? <div className="hardware-loading" role="status">PRÉPARATION DU SUPPORT…</div> : <div className="boot-screen">
                <strong>MORTIZLE</strong><span>MISE SOUS TENSION…</span>
              </div>
            }
          >
            <Room
              consoleId={consoleId}
              consoleMode={consoleMode}
              onConsoleModeChange={changeConsoleMode}
              onSelectConsole={selectConsole}
              onReady={onConsoleReady}
              onTimeline={(t, reverse) => {
                audio.current?.tick(t, reverse, muted, consoleId);
              }}
              exiting={exiting}
              onExited={() => {
                setExiting(false);
                lock.current = false;
              }}
              exploring={exploring}
              moveInput={moveInput}
              index={index}
              select={select}
              onPlay={start}
              launching={launching}
              onWarp={() => setWarp(true)}
              onEntered={() => {
                setPlaying(true);
                setWarp(false);
              }}
            />
          </Suspense>
        )}
      </div>
      <div className="warp-flash" />
      <div className="room-shade" />
      <header className="system-corners">
        <span>
          MZ·SYS <i>02.0</i>
        </span>
        <div>
          <span className="power-dot" /> SALLE 3D{' '}
          <span className="system-divider">/</span>
          <Button
            variant="ghost"
            disabled={consoleLocked}
            onClick={() => {
              if(performance.now()<selectionUntil.current)return;
              setCatalog(false);
              setExploring(!exploring);
            }}
          >
            <Footprints size={13} />
            {exploring ? 'AU COMPTOIR' : 'EXPLORER'}
          </Button>
          <Button
            variant="ghost"
            disabled={consoleLocked}
            onClick={() => {
              if(performance.now()<selectionUntil.current)return;
              setCatalog(!catalog);
            }}
          >
            <Grid2X2 size={13} /> JEUX
          </Button>

        </div>
      </header>
      {exploring && (
        <div className="explore-help">
          ZQSD / WASD · Se déplacer <span>Glisser · Regarder autour</span>
          <div className="explore-touch">
            {[
              ['↑', 1, 0],
              ['←', 0, -1],
              ['↓', -1, 0],
              ['→', 0, 1],
            ].map(([label, f, s]) => (
              <button
                key={String(label)}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  moveInput.current = { forward: Number(f), side: Number(s) };
                }}
                onPointerUp={() =>
                  (moveInput.current = { forward: 0, side: 0 })
                }
                onPointerCancel={() =>
                  (moveInput.current = { forward: 0, side: 0 })
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="selected-announcement" aria-live="polite">
        {consoleMode ? `${getConsole(consoleId).name}. Glissez ou utilisez les flèches pour choisir une console. Appuyez sur JEUX ou Entrée pour revenir aux jeux.` : `${game.name} · ${game.genre} · 0${index + 1} / 09`}
      </div>
      <nav className="mobile-console" aria-label={consoleMode ? "Sélection des consoles" : "Sélection des jeux"}>
        <Button
          variant="ghost"
          aria-label={consoleMode ? "Console précédente" : "Cartouche précédente"}
          onClick={() => consoleMode ? navigateConsole(-1) : select((index + 8) % 9)}
        >
          <ChevronLeft />
        </Button>
        <div>
          <span>{consoleMode ? "CONSOLES" : `0${index + 1} / 09`}</span>
          <strong>{consoleMode ? getConsole(consoleId).name : game.name}</strong>
        </div>
        <Button
          variant="ghost"
          aria-label={consoleMode ? "Console suivante" : "Cartouche suivante"}
          onClick={() => consoleMode ? navigateConsole(1) : select((index + 1) % 9)}
        >
          <ChevronRight />
        </Button>
        <Button
          className="mobile-play"
          disabled={!consoleReady || consoleLocked}
          onClick={start}
        >
          <Play size={16} fill="currentColor" /> {consoleMode ? "JEUX" : "INSÉRER"}
        </Button>
      </nav>
      <footer className="room-controls">
        <span>
          <kbd>←</kbd>
          <kbd>→</kbd> {consoleMode ? "CONSOLES" : "NAVIGUER"} <kbd>ENTRÉE</kbd> {consoleMode ? "JEUX" : "INSÉRER"}
        </span>
        <span className="room-caption">
          {getConsole(consoleId).shortName} ·{' '}
          {consoleReady ? 'PRÊTE À JOUER' : 'MISE SOUS TENSION…'}
        </span>
        <Button
          variant="ghost"
          className="room-sound"
          onClick={() => {
            if (!muted) audio.current?.stop();
            setMuted(!muted);
          }}
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />} SON{' '}
          {muted ? 'OFF' : 'ON'}
        </Button>
      </footer>
      {catalog && (
        <section className="cartridge-drawer" aria-label="Choisir un jeu">
          <div className="drawer-heading">
            <h2>LES JEUX</h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Fermer les jeux"
              onClick={() => setCatalog(false)}
            >
              <X size={18} />
            </Button>
          </div>
          <div className="drawer-games">
            {games.map((g, i) => (
              <button
                key={g.id}
                onClick={() => {
                  if(performance.now()<selectionUntil.current)return;
                  if(consoleMode){setIndex(i);changeConsoleMode(false);}else select(i);
                  setCatalog(false);
                }}
                aria-pressed={index === i}
              >
                <span>0{i + 1}</span>
                <strong>{g.name}</strong>
                <small>{g.genre}</small>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        </section>
      )}
      {playing && (
        <Suspense
          fallback={
            <div className="boot-screen">
              <strong>{getConsole(consoleId).format==='disc'?'LECTURE DU DISQUE':'LECTURE DE LA CARTOUCHE'}</strong>
            </div>
          }
        >
          <GamePlayer
            disc={getConsole(consoleId).format==='disc'}
            index={index}
            onExit={exit}
            muted={muted}
            setMuted={setMuted}
          />
        </Suspense>
      )}
    </main>
  );
}

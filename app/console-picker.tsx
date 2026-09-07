'use client';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Check, Gamepad2, X } from 'lucide-react';
import { CONSOLES, getConsole, type ConsoleId } from './console-catalog';

function Hardware({ id }: { id: ConsoleId }) {
  return (
    <svg
      className={`console-picker-art console-picker-art--${id}`}
      viewBox="0 0 160 100"
      aria-hidden="true"
      fill="none"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <ellipse
        cx="80"
        cy="88"
        rx="58"
        ry="5"
        fill="currentColor"
        opacity=".12"
      />
      {id === 'nes' && (
        <>
          <path
            d="M25 38 119 30 138 45 138 79 25 84Z"
            fill="#888daa"
            stroke="#c7d1eb"
          />
          <path d="M25 38 119 30 138 45 43 53Z" fill="#c1c6d6" />
          <path d="M43 53 138 45 138 79 43 86Z" fill="#8d94ab" />
          <path d="M53 58 113 53 113 63 53 68Z" fill="#242b43" />
          <path d="M109 36 126 46 124 70" stroke="#444960" strokeWidth="9" />
          <path d="M54 77 66 76M73 76 84 75" stroke="#e6658c" strokeWidth="4" />
        </>
      )}
      {id === 'n64' && (
        <>
          <path
            d="M24 56Q25 42 49 40L109 39Q133 42 138 58L137 78Q127 86 118 77L44 79Q29 88 23 77Z"
            fill="#272c43"
            stroke="#a3aecb"
          />
          <path d="M37 56Q80 43 125 55L132 69 31 71Z" fill="#49536e" />
          <path
            d="M54 31Q54 27 59 27L98 27Q104 27 104 32L107 51 51 51Z"
            fill="#b3bdd0"
            stroke="#e9f3ff"
          />
          <path d="M62 32H97V44H62Z" fill="#7760be" />
          <path d="M53 53H108" stroke="#0b1128" strokeWidth="5" />
          {[45, 67, 89, 111].map((x) => (
            <circle
              key={x}
              cx={x}
              cy="71"
              r="4"
              fill="#101528"
              stroke="#7e91b3"
            />
          ))}
          <circle cx="126" cy="63" r="2" fill="#7cedb7" />
        </>
      )}
      {id === 'gamecube' && (
        <>
          <path
            d="M42 30 94 22 125 38 125 76 69 87 42 69Z"
            fill="#7765cb"
            stroke="#c0b3ff"
          />
          <path d="M42 30 94 22 125 38 69 49Z" fill="#a392ed" />
          <path d="M69 49 125 38V76L69 87Z" fill="#4b408a" />
          <ellipse
            cx="84"
            cy="35"
            rx="22"
            ry="8"
            fill="#242c48"
            stroke="#c4bcf5"
          />
          <circle cx="84" cy="35" r="3" fill="#bac7e9" />
          {[80, 91, 102, 113].map((x, i) => (
            <circle
              key={x}
              cx={x}
              cy={61 - i * 2}
              r="3.5"
              fill="#131b31"
              stroke="#b0a6dc"
            />
          ))}
          <path d="M106 25Q129 20 132 37" stroke="#5d527f" strokeWidth="5" />
        </>
      )}
      {id === 'gameboy' && (
        <>
          <path
            d="M58 10H101Q108 10 108 18V73Q108 90 95 90H58Q53 90 53 83V17Q53 10 58 10Z"
            fill="#c4c6d5"
            stroke="#eef5ff"
          />
          <path d="M60 20H100V48Q100 53 94 53H60Z" fill="#62637c" />
          <path d="M67 26H94V46H67Z" fill="#92bca0" />
          <path d="M65 60V75M58 67H73" stroke="#252b42" strokeWidth="5" />
          <circle cx="98" cy="61" r="4" fill="#b84778" />
          <circle cx="87" cy="67" r="4" fill="#b84778" />
          <path
            d="M73 81 79 79M83 82 89 80M95 76 101 73"
            stroke="#737c95"
            strokeWidth="2"
          />
        </>
      )}
      {id === 'ps2' && (
        <>
          <path
            d="M28 44 110 32 134 49 48 63Z"
            fill="#404868"
            stroke="#7c8da9"
          />
          <path d="M28 44 48 63V83L28 65Z" fill="#172039" />
          <path d="M48 63 134 49V71L48 84Z" fill="#222c48" stroke="#7282a5" />
          {[0, 5, 10].map((x) => (
            <path
              key={x}
              d={`M50 ${66 + x} 132 ${52 + x}`}
              stroke="#11172d"
              strokeWidth="2"
            />
          ))}
          <path d="M63 62 108 55" stroke="#64b5ff" strokeWidth="2" />
          <path d="M116 59 126 57" stroke="#7792ba" strokeWidth="3" />
          <path d="M69 47 90 44" stroke="#4fdcff" strokeWidth="2" />
        </>
      )}
      {id === 'ps3' && (
        <>
          <path
            d="M29 66Q30 40 53 31L111 32Q130 35 137 58L133 78 43 84Z"
            fill="#222b45"
            stroke="#8e9cb8"
          />
          <path d="M43 77Q50 47 68 37L111 35Q126 39 133 60Z" fill="#4d5873" />
          <path d="M45 78 133 64" stroke="#9cb8d0" strokeWidth="3" />
          <path d="M56 78 115 69" stroke="#0e1328" strokeWidth="3" />
          <circle cx="125" cy="72" r="2" fill="#5affce" />
          <path d="M77 46 101 44" stroke="#c3cfe3" strokeWidth="2" />
        </>
      )}
      {id === 'xbox' && (
        <>
          <path
            d="M25 45 115 34 138 52 135 80 44 88 25 69Z"
            fill="#202f39"
            stroke="#7d9aa9"
          />
          <path d="M28 45 113 36 132 53 47 65Z" fill="#3e4b59" />
          <path
            d="M41 43 116 58M106 38 55 61"
            stroke="#182731"
            strokeWidth="9"
          />
          <ellipse cx="80" cy="49" rx="12" ry="6" fill="#8dd94e" />
          <path d="M56 70 108 65" stroke="#809394" strokeWidth="4" />
          <circle cx="119" cy="70" r="4" fill="#8ddd72" />
          <path d="M58 80 70 79M79 78 91 77" stroke="#080f21" strokeWidth="4" />
        </>
      )}
      {id === 'xbox360' && (
        <>
          <path
            d="M59 12 92 10 108 21Q100 51 108 83L73 91 57 81Q65 44 59 12Z"
            fill="#c0c7d4"
            stroke="#edf9ff"
          />
          <path d="M59 12 92 10 108 21 73 24Z" fill="#ecf2f5" />
          <path
            d="M73 24 108 21Q100 50 108 83L73 91Q80 59 73 24Z"
            fill="#d7dfdf"
          />
          <path d="M84 29 99 28 98 48 84 50Z" fill="#536176" />
          <circle cx="92" cy="66" r="7" stroke="#6dc983" strokeWidth="2" />
          <path d="M92 60V66M83 80 97 77" stroke="#748696" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}

export function ConsolePicker({
  selected,
  ready,
  onSelect,
  onClose,
}: {
  selected: ConsoleId;
  ready: boolean;
  onSelect: (id: ConsoleId) => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDialogElement>(null);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusIndex, setFocusIndex] = useState(() =>
    CONSOLES.findIndex((c) => c.id === selected),
  );
  const initialIndex = useRef(focusIndex);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    cards.current[initialIndex.current]?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close.current();
      }
      if (event.key !== 'Tab') return;
      const focusable = [
        ...(panel.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]):not([tabindex="-1"])',
        ) ?? []),
      ];
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      opener?.focus({ preventScroll: true });
    };
    // The focus session belongs to the opening, not each selected console.
  }, []);
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const columns = window.matchMedia('(max-width: 580px)').matches ? 2 : 4;
    const step = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: columns,
      ArrowUp: -columns,
    }[event.key];
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? CONSOLES.length - 1
          : step === undefined
            ? null
            : (index + step + CONSOLES.length) % CONSOLES.length;
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    setFocusIndex(next);
    cards.current[next]?.focus();
  };
  return (
    <div
      className="console-picker-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <dialog
        open
        ref={panel}
        className="console-picker"
        aria-modal="true"
        aria-labelledby="console-picker-title"
        aria-describedby="console-picker-description"
      >
        <div className="console-picker-rail">
          <span>
            <i /> MORTIZLE / HARDWARE
          </span>
          <span>08 MACHINES</span>
        </div>
        <header className="console-picker-heading">
          <div>
            <p>CHOISIS TA CONSOLE</p>
            <h2 id="console-picker-title">
              À toi de jouer<span>.</span>
            </h2>
          </div>
          <button
            className="console-picker-close"
            onClick={onClose}
            aria-label="Fermer le choix des consoles"
          >
            <X size={20} />
          </button>
        </header>
        <p id="console-picker-description">
          Une autre machine. Tes mêmes jeux Mortizle.
        </p>
        <fieldset
          className="console-picker-grid"
          aria-label="Les consoles disponibles"
        >
          {CONSOLES.map((console, index) => (
            <button
              key={console.id}
              ref={(el) => {
                cards.current[index] = el;
              }}
              className="console-picker-card"
              aria-pressed={selected === console.id}
              tabIndex={focusIndex === index ? 0 : -1}
              onFocus={() => setFocusIndex(index)}
              onKeyDown={(event) => navigate(event, index)}
              onClick={() => onSelect(console.id)}
            >
              <span className="console-picker-card-top">
                <span>0{index + 1}</span>
                {selected === console.id ? (
                  <span className="console-picker-equipped">
                    <Check size={11} /> ÉQUIPÉE
                  </span>
                ) : (
                  <span>{console.format === 'disc' ? 'DISC' : 'CART'}</span>
                )}
              </span>
              <Hardware id={console.id} />
              <strong>{console.name}</strong>
              <small>{console.insertion}</small>
            </button>
          ))}
        </fieldset>
        <footer className="console-picker-footer">
          <div className="console-picker-status" aria-live="polite">
            <Gamepad2 size={22} />
            <span>
              {ready ? 'PRÊTE À JOUER' : 'MISE SOUS TENSION…'}
              <strong>{getConsole(selected).name}</strong>
            </span>
          </div>
          <button className="console-picker-return" onClick={onClose}>
            RETOUR À LA SALLE <span>↵</span>
          </button>
        </footer>
        <div className="console-picker-help">
          <span>
            ← ↑ ↓ → <b>PARCOURIR</b> · ENTRÉE <b>ÉQUIPER</b>
          </span>
          <span>
            ÉCHAP <b>RETOUR</b>
          </span>
        </div>
      </dialog>
    </div>
  );
}

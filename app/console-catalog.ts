export const CONSOLES = [
  {
    id: 'nes',
    name: 'Mortille NES',
    shortName: 'M-NES',
    insertion: 'Cartouche · chargement frontal',
    format: 'cartridge',
  },
  {
    id: 'n64',
    name: 'Mortille 64',
    shortName: 'M-64',
    insertion: 'Cartouche · insertion verticale',
    format: 'cartridge',
  },
  {
    id: 'gamecube',
    name: 'MorilleCube',
    shortName: 'MORILLECUBE',
    insertion: 'Mini-disque · capot supérieur',
    format: 'disc',
  },
  {
    id: 'gameboy',
    name: 'Orteil Boy',
    shortName: 'ORTEIL BOY',
    insertion: 'Cartouche · logement arrière',
    format: 'cartridge',
  },
  {
    id: 'ps2',
    name: 'MorilleStation 2',
    shortName: 'MS2',
    insertion: 'Disque · tiroir motorisé',
    format: 'disc',
  },
  {
    id: 'ps3',
    name: 'MorilleStation 3',
    shortName: 'MS3',
    insertion: 'Disque · fente lumineuse',
    format: 'disc',
  },
  {
    id: 'xbox',
    name: 'Glorille Box',
    shortName: 'GLORILLE BOX',
    insertion: 'Disque · tiroir motorisé',
    format: 'disc',
  },
  {
    id: 'xbox360',
    name: 'Glorille 360',
    shortName: 'GLORILLE 360',
    insertion: 'Disque · fente à entraînement motorisé',
    format: 'disc',
  },
] as const;
export type ConsoleId = (typeof CONSOLES)[number]['id'];
export const DEFAULT_CONSOLE: ConsoleId = 'n64';
export function isConsoleId(value: unknown): value is ConsoleId {
  return (
    typeof value === 'string' && CONSOLES.some((item) => item.id === value)
  );
}
export function getConsole(id: ConsoleId) {
  return CONSOLES.find((item) => item.id === id)!;
}

export { firstLevel } from './first-level';
import { firstLevel } from './first-level';
import { secondLevel } from './second-level';
import { thirdLevel } from './third-level';
import { fourthLevel } from './fourth-level';
import { fifthLevel } from './fifth-level';
export const quartierLevels = [
  { ...firstLevel, title: 'Les jardins du départ' },
  { ...secondLevel, title: 'La rue des braises' },
  { ...thirdLevel, title: 'Au-dessus des antennes' },
  { ...fourthLevel, title: 'Le chantier Cobalt' },
  { ...fifthLevel, title: 'Raphaël, le guetteur des toits' },
];


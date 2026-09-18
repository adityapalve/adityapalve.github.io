import type { VillageData } from '../scripts/village/map';
import { loadExperience } from './experience';
import { paletteColor } from './palette';

/** The village, built from the experience file: one hut per piece of work, side projects in the workshop. */
export function loadVillage(): VillageData {
  const { cases, side } = loadExperience();

  const huts = cases.slice(0, 4).map((item, index) => ({
    id: `hut-${index}`,
    title: item.title,
    label: item.label,
    role: item.role,
    points: item.points,
  }));

  return {
    huts,
    workshop: {
      title: 'Side projects',
      projects: side.map((item) => ({ name: item.name, blurb: item.body[0] ?? '', url: item.url })),
    },
    roofs: huts.map((hut) => paletteColor(hut.title)),
  };
}

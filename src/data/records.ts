import featured from './music.json';

// Prototype selections, not imported listening history. Keep the featured record in music.json.
export const records = [
  { ...featured, label: '#b65e46' },
  {
    title: 'Kind of Blue',
    artist: 'Miles Davis',
    appleMusicUrl: 'https://music.apple.com/gb/album/kind-of-blue/268443092',
    label: '#658c9b',
  },
  {
    title: 'Moon Safari',
    artist: 'Air',
    appleMusicUrl: 'https://music.apple.com/gb/album/moon-safari/697240234',
    label: '#c7a45e',
  },
];

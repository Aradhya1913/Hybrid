export type SceneDef = {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  hotSpots?: any[];
};

const scenes: SceneDef[] = [
  { id: 'spot1', title: 'Road View', url: '/panos/spot1.jpg' },
  { id: 'spot2', title: 'Inside Gate', url: '/panos/spot2.jpg' },
  { id: 'spot2b', title: 'Road Split', url: '/panos/spot2.2.jpg' },
  { id: 'spot3', title: 'Globe', url: '/panos/spot3.jpg' },
  { id: 'spot4', title: 'Playground', url: '/panos/spot4.jpg' },
  { id: 'spot5', title: 'Library', url: '/panos/spot5.jpg' },
  { id: 'spot5_2', title: 'Library alt', url: '/panos/spot5.2.jpg' },
  { id: 'spot6', title: 'Spot 6', url: '/panos/spot6.jpg' },
  { id: 'spot7', title: 'Spot 7', url: '/panos/spot7.jpg' },
  { id: 'spot8', title: 'Spot 8', url: '/panos/spot8.jpg' },
  { id: 'spot9', title: 'Spot 9', url: '/panos/spot9.jpg' },
  { id: 'spot10', title: 'Spot 10', url: '/panos/spot10.jpg' },
  { id: 'spot11', title: 'Spot 11', url: '/panos/spot11.jpg' }
];

export default scenes;

export type SceneDef = {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  hotSpots?: any[];
};

const scenes: SceneDef[] = [
  { 
    id: 'spot1', 
    title: 'Road View', 
    url: '/panos/spot1.jpg',
    hotSpots: [
      { yaw: 175, pitch: -15, targetSceneId: 'spot2', text: 'Gate' },
    ]
  },
  { 
    id: 'spot2', 
    title: 'Inside Gate', 
    url: '/panos/spot2.jpg',
    hotSpots: [
      { yaw: 90, pitch: -25, targetSceneId: 'spot1', text: 'Back' },
      { yaw: 290, pitch: -10, targetSceneId: 'spot3', text: 'Forward' },
      { yaw: 210, pitch: -7, targetSceneId: 'spot2b', text: 'Right' }
    ]
  },
  { 
    id: 'spot2b', 
    title: 'Road Split', 
    url: '/panos/spot2.2.jpg',
    hotSpots: [
      { yaw: 0, pitch: 0, targetSceneId: 'spot2', text: 'Back' },
      { yaw: 45, pitch: 0, targetSceneId: 'spot5', text: 'Library' },
      { yaw: -45, pitch: 0, targetSceneId: 'spot4', text: 'Playground' }
    ]
  },
  { 
    id: 'spot3', 
    title: 'Globe', 
    url: '/panos/spot3.jpg',
    hotSpots: [
      { yaw: 180, pitch: 0, targetSceneId: 'spot1', text: 'Road' },
      { yaw: 90, pitch: 0, targetSceneId: 'spot2', text: 'Gate' },
      { yaw: 0, pitch: 0, targetSceneId: 'spot6', text: 'Building' }
    ]
  },
  { 
    id: 'spot4', 
    title: 'Playground', 
    url: '/panos/spot4.jpg',
    hotSpots: [
      { yaw: 0, pitch: 0, targetSceneId: 'spot1', text: 'Road' },
      { yaw: 90, pitch: 0, targetSceneId: 'spot5', text: 'Library' },
      { yaw: 180, pitch: 0, targetSceneId: 'spot2b', text: 'Road Split' }
    ]
  },
  { 
    id: 'spot5', 
    title: 'Library', 
    url: '/panos/spot5.jpg',
    hotSpots: [
      { yaw: 45, pitch: 0, targetSceneId: 'spot4', text: 'Playground' },
      { yaw: -45, pitch: 0, targetSceneId: 'spot5_2', text: 'Library Alt' },
      { yaw: 180, pitch: 0, targetSceneId: 'spot2b', text: 'Back' }
    ]
  },
  { 
    id: 'spot5_2', 
    title: 'Library alt', 
    url: '/panos/spot5.2.jpg',
    hotSpots: [
      { yaw: 0, pitch: 0, targetSceneId: 'spot5', text: 'Library' },
      { yaw: 90, pitch: 0, targetSceneId: 'spot6', text: 'Building' }
    ]
  },
  { id: 'spot6', title: 'Spot 6', url: '/panos/spot6.jpg' },
  { id: 'spot7', title: 'Spot 7', url: '/panos/spot7.jpg' },
  { id: 'spot8', title: 'Spot 8', url: '/panos/spot8.jpg' },
  { id: 'spot9', title: 'Spot 9', url: '/panos/spot9.jpg' },
  { id: 'spot10', title: 'Spot 10', url: '/panos/spot10.jpg' },
  { id: 'spot11', title: 'Spot 11', url: '/panos/spot11.jpg' }
];

export default scenes;

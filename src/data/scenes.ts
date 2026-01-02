export type SceneDef = {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  initialView?: {
    yaw: number;   // degrees
    pitch: number; // degrees
  };
  hotSpots?: any[];
};

const scenes: SceneDef[] = [
  { 
    id: 'spot1', 
    title: 'Road View', 
    url: '/panos/spot1.jpg',
    // Trial-and-error: tweak these numbers to control the starting direction
    // when this panorama loads in Three.js normal mode.
    initialView: { yaw: 0, pitch: 0 },
    hotSpots: [
      { yaw: 175, pitch: -15, targetSceneId: 'spot2', text: 'Gate' },
    ]
  },
  { 
    id: 'spot2', 
    title: 'Inside Gate', 
    url: '/panos/spot2.jpg',
    initialView: { yaw: 90, pitch: 0 },

    hotSpots: [
      { yaw: 80, pitch: -25, targetSceneId: 'spot1', text: 'Back' },
      { yaw: 285, pitch: -10, targetSceneId: 'spot3', text: 'Forward' },
      { yaw: 210, pitch: -7, targetSceneId: 'spot2b', text: 'Right' }
    ]
  },
  { 
    id: 'spot2b', 
    title: 'Road Split', 
    url: '/panos/spot2.2.jpg',
    initialView: { yaw: 90, pitch: 0 },

    hotSpots: [
      { yaw: 15, pitch: -7, targetSceneId: 'spot2', text: 'Back' },
      { yaw: 175, pitch: -7, targetSceneId: 'spot2.2', text: 'Back' }, // ADD BOYS HOSTEL
      { yaw: 265, pitch: -11, targetSceneId: 'spot9', text: 'CSE' }, 
    ]
  },
  { 
    id: 'spot3', 
    title: 'Globe', 
    url: '/panos/spot3.jpg',
    initialView: { yaw: 90, pitch: 0 },
    hotSpots: [
      { yaw: 15, pitch: -7, targetSceneId: 'spot2', text: 'Road' },
      { yaw: 270, pitch: -4, targetSceneId: 'spot4', text: 'Road' },
    ]
  },
  { 
    id: 'spot4', 
    title: 'TM manjunath corner', 
    url: '/panos/spot4.jpg',
    initialView: { yaw: -90, pitch: 0 },

    hotSpots: [
      { yaw: 40, pitch: -13, targetSceneId: 'spot4b', text: 'Road' },
      { yaw: 140, pitch: -13, targetSceneId: 'spot5b', text: 'Road' },
      { yaw: 140, pitch: -13, targetSceneId: 'spot5b', text: 'Road' },

    ]
  },
  
    { 
    id: 'spot4b', 
    title: 'BMW corner', 
    url: '/panos/spot4.2.jpg',
    initialView: { yaw: 80, pitch: 0 },

    hotSpots: [
      { yaw: 40, pitch: -13, targetSceneId: 'spot4c', text: 'Road' },
 
    ]
  },

      { 
    id: 'spot4c', 
    title: 'Office', 
    url: '/panos/spot4.3.jpg',
    hotSpots: [
      { yaw: -90, pitch: -13, targetSceneId: 'spot5', text: 'Road' },
      { yaw: 90, pitch: -13, targetSceneId: 'spot4b', text: 'Road' },
      { yaw: 0, pitch: -13, targetSceneId: 'spot6', text: 'Road' },


      

    ]
  },

  { 
    id: 'spot5', 
    title: 'Auditorium corner', 
    url: '/panos/spot5.jpg',
    initialView: { yaw: 180, pitch: 0 },

    hotSpots: [
      { yaw: 4, pitch: -10, targetSceneId: 'spot7', text: 'Playground' },
      { yaw: -90, pitch: -10, targetSceneId: 'spot4c', text: 'Playground' },

    ]
  },
  { 
    id: 'spot5b', 
    title: 'Restroom corner', 
    url: '/panos/spot5.2.jpg',
    initialView: { yaw: -40, pitch: 0 },

    hotSpots: [
      { yaw: 94, pitch: -5, targetSceneId: 'spot4', text: 'Building' },
      { yaw: 190, pitch: -10, targetSceneId: 'spot5', text: 'Building' }

      
    ]
  },
  { id: 'spot6', title: 'Admin Lawn', url: '/panos/spot6.jpg' ,
        hotSpots: [
      { yaw: 94, pitch: -5, targetSceneId: 'spot4c', text: 'Building' },

      
    ]
  },
  { id: 'spot7', 
    title: 'Auditorium',
     url: '/panos/spot7.jpg' ,
    initialView: { yaw: 90, pitch: 0 },

     hotSpots: [
      { yaw: 260, pitch: -15, targetSceneId: 'spot9', text: 'Library' },
     ]
  },
  { id: 'spot8', title: 'Spot 8', url: '/panos/spot8.jpg' },
 
  { id: 'spot9', 
    title: 'CSE', 
    url: '/panos/spot9.jpg', 
    hotSpots: [
      { yaw: 90, pitch: -10, targetSceneId: 'spot2b', text: 'Library' },
      { yaw: 60, pitch: 0, targetSceneId: 'spot7', text: 'Library' },
      { yaw: 180, pitch: -10, targetSceneId: 'spot10', text: 'Library' },
      { yaw: 270, pitch: -7, targetSceneId: 'spot11', text: 'Building' }

    ]},

  { id: 'spot10', title: 'Spot 10', url: '/panos/spot10.jpg' 
      ,hotSpots: [
      { yaw: 90, pitch: -10, targetSceneId: 'spot9', text: 'Library' },
      

    ]
  },
  { id: 'spot11', title: 'Spot 11', url: '/panos/spot11.jpg' }
];

export default scenes;

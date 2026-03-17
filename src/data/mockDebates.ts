export type DebateCardItem = {
  id: string;
  title: string;
  host: string;
  hostAvatar: string;
  hostId?: string;
  isLive: boolean;
  viewers: string;
  topic: string;
  isPublic: boolean;
  startedAt?: string;
  scheduledFor?: string;
  image?: string;
};

export type FactCheckItem = {
  claim: string;
  verdict: string;
};

export type RoomMessage = {
  id: string;
  user: string;
  userAvatar: string;
  message: string;
  isJoined?: boolean;
};

export const debates: DebateCardItem[] = [
  {
    id: '1',
    title: 'Is AI a threat to humanity?',
    host: 'TechDebater',
    hostAvatar: 'TD',
    isLive: true,
    viewers: '1,234',
    topic: 'Technology',
    isPublic: true,
    startedAt: '15m ago',
    image:
      'https://images.unsplash.com/photo-1675557570482-df9926f61d86?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: '2',
    title: 'Should social media platforms verify every political clip?',
    host: 'PolicyWatch',
    hostAvatar: 'PW',
    isLive: true,
    viewers: '856',
    topic: 'Politics',
    isPublic: true,
    startedAt: '45m ago',
    image:
      'https://images.unsplash.com/photo-1767327926575-e70fda712917?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: '3',
    title: 'Climate responsibility: individuals or corporations?',
    host: 'EcoWarrior',
    hostAvatar: 'EW',
    isLive: false,
    viewers: '0',
    topic: 'Environment',
    isPublic: true,
    scheduledFor: 'in 2h',
    image:
      'https://images.unsplash.com/photo-1616443586071-cd1f0a65ef5e?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: '4',
    title: 'The future of remote work',
    host: 'WorkCulture',
    hostAvatar: 'WC',
    isLive: true,
    viewers: '432',
    topic: 'Business',
    isPublic: true,
    startedAt: '5m ago',
    image:
      'https://images.unsplash.com/photo-1758630737900-a28682c5aa69?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: '5',
    title: 'Private room: should schools ban phones?',
    host: 'DebateMaster',
    hostAvatar: 'DM',
    isLive: true,
    viewers: '12',
    topic: 'Private',
    isPublic: false,
    startedAt: '20m ago',
  },
];

export const profileData = {
  username: 'debatelover',
  name: 'Alex Johnson',
  bio: 'Passionate debater | Tech enthusiast | Always open to new perspectives',
  avatar: 'AJ',
  followers: '1,234',
  following: '567',
  debates: '45',
};

export const profileDebates: DebateCardItem[] = [
  {
    id: '1',
    title: 'Is AI a threat to humanity?',
    host: 'debatelover',
    hostAvatar: 'AJ',
    isLive: true,
    viewers: '1,234',
    topic: 'Technology',
    isPublic: true,
    startedAt: '15m ago',
    image:
      'https://images.unsplash.com/photo-1675557570482-df9926f61d86?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: '2',
    title: 'The future of remote work',
    host: 'debatelover',
    hostAvatar: 'AJ',
    isLive: false,
    viewers: '0',
    topic: 'Business',
    isPublic: true,
    scheduledFor: 'in 3h',
    image:
      'https://images.unsplash.com/photo-1758630737900-a28682c5aa69?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: '3',
    title: 'Should social media be regulated?',
    host: 'debatelover',
    hostAvatar: 'AJ',
    isLive: false,
    viewers: '856',
    topic: 'Politics',
    isPublic: true,
    scheduledFor: '2d ago',
    image:
      'https://images.unsplash.com/photo-1767327926575-e70fda712917?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: '4',
    title: 'Climate change solutions',
    host: 'debatelover',
    hostAvatar: 'AJ',
    isLive: false,
    viewers: '432',
    topic: 'Environment',
    isPublic: true,
    scheduledFor: '5d ago',
    image:
      'https://images.unsplash.com/photo-1616443586071-cd1f0a65ef5e?auto=format&fit=crop&w=900&q=80',
  },
];

export const likedDebates: DebateCardItem[] = [
  {
    id: '6',
    title: 'Should cities eliminate downtown parking minimums?',
    host: 'Urban Grid',
    hostAvatar: 'UG',
    isLive: true,
    viewers: '3,402',
    topic: 'Policy',
    isPublic: true,
    startedAt: '9m ago',
    image:
      'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: '7',
    title: 'Do creator platforms owe users stronger moderation tools?',
    host: 'Signal Room',
    hostAvatar: 'SR',
    isLive: false,
    viewers: '0',
    topic: 'Media',
    isPublic: true,
    scheduledFor: 'tomorrow',
    image:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
  },
];

export const liveRoom = {
  title: 'Is AI a threat to humanity?',
  topic: 'Technology',
  viewers: '1,234',
  description: 'Live public debate with community voting and a pinned AI fact-check layer.',
  factCheck: {
    claim: 'AI will replace most jobs within five years.',
    verdict: 'Too broad. Evidence varies a lot by industry.',
  },
  messages: [
    {
      id: '1',
      user: 'sarahtech',
      userAvatar: 'ST',
      message: 'joined',
      isJoined: true,
    },
    {
      id: '2',
      user: 'AIEnthusiast',
      userAvatar: 'AE',
      message: 'AI has serious upside if deployment is regulated well.',
    },
    {
      id: '3',
      user: 'mike_debates',
      userAvatar: 'MD',
      message: 'great point!',
    },
    {
      id: '4',
      user: 'civicfacts',
      userAvatar: 'CF',
      message: 'Ask them to define what counts as replacement vs augmentation.',
    },
  ],
  hearts: ['29K', 'Gift', 'Share'],
};

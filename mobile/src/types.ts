export interface Resource {
  id: string;
  name: string;
  author: string;
  link: string;
  image: string;
  year: number | null;
  level: string;
  summary: string;
  track: string;
  trackLabel: string;
  tags: string[];
  timeLabel: string;
}

export interface Track {
  key: string;
  label: string;
  slug: string;
  count: number;
}

export interface PathStep {
  resourceId: string;
  why: string;
}

export interface LearningPath {
  slug: string;
  audience: string;
  title: string;
  blurb: string;
  description: string;
  steps: PathStep[];
}

export interface AppData {
  count: number;
  tracks: Track[];
  resources: Resource[];
  paths: LearningPath[];
}

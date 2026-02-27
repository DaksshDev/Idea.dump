export interface Idea {
  id: number;
  content: string;
  createdAt: string;
}

export interface IdeaGroup {
  id: number;
  name: string;
  createdAt: string;
  ideaIds: number[];
}

export interface IdeaDumpData {
  ideas: Idea[];
  groups: IdeaGroup[];
}

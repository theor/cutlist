export type ProjectSource =
  | { type: 'onshape'; url: string }
  | { type: 'scad'; path: string };

export interface Project {
  id: string;
  name: string;
  source: ProjectSource;
}

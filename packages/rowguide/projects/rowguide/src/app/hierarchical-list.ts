export interface HierarchicalList {
  index: number;
  next: HierarchicalList | null;
  prev: HierarchicalList | null;
  parent: HierarchicalList | null;
  children: Iterable<HierarchicalList>;
}

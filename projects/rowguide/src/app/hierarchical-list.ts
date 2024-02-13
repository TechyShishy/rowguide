export interface HierarchicalList {
  next: HierarchicalList | null;
  prev: HierarchicalList | null;
  parent: HierarchicalList | null;
  children: Iterable<HierarchicalList>;
}

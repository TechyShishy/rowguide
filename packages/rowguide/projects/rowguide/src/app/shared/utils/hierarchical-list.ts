/**
 * HierarchicalList - Navigation Tree Structure Interface
 *
 * Defines a comprehensive navigation interface for hierarchical data structures
 * with bidirectional traversal, parent-child relationships, and iterable children.
 * This interface enables complex navigation patterns for tree-like data structures
 * commonly used in pattern navigation and user interface components.
 *
 * @example
 * ```typescript
 * // Basic tree navigation implementation
 * class RowNavigator implements HierarchicalList {
 *   constructor(
 *     public index: number,
 *     public next: RowNavigator | null = null,
 *     public prev: RowNavigator | null = null,
 *     public parent: RowNavigator | null = null,
 *     public children: RowNavigator[] = []
 *   ) {}
 *
 *   // Navigate to next sibling
 *   navigateNext(): RowNavigator | null {
 *     return this.next;
 *   }
 *
 *   // Navigate to first child
 *   navigateToFirstChild(): RowNavigator | null {
 *     const childIterator = this.children[Symbol.iterator]();
 *     const firstChild = childIterator.next();
 *     return firstChild.done ? null : firstChild.value;
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Pattern row hierarchy with step navigation
 * class PatternRowHierarchy implements HierarchicalList {
 *   constructor(
 *     public index: number,
 *     public rowData: Row,
 *     public next: PatternRowHierarchy | null = null,
 *     public prev: PatternRowHierarchy | null = null,
 *     public parent: PatternRowHierarchy | null = null,
 *     private stepChildren: StepNavigator[] = []
 *   ) {}
 *
 *   get children(): Iterable<HierarchicalList> {
 *     return this.stepChildren;
 *   }
 *
 *   // Navigate to specific step within row
 *   navigateToStep(stepIndex: number): StepNavigator | null {
 *     return this.stepChildren[stepIndex] || null;
 *   }
 *
 *   // Navigate to parent row group
 *   navigateToParent(): PatternRowHierarchy | null {
 *     return this.parent;
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Component integration with keyboard navigation
 * class NavigationComponent {
 *   currentItem: HierarchicalList | null = null;
 *
 *   onArrowDown(): void {
 *     if (this.currentItem?.next) {
 *       this.currentItem = this.currentItem.next;
 *       this.updateView();
 *     }
 *   }
 *
 *   onArrowUp(): void {
 *     if (this.currentItem?.prev) {
 *       this.currentItem = this.currentItem.prev;
 *       this.updateView();
 *     }
 *   }
 *
 *   onArrowRight(): void {
 *     const firstChild = this.getFirstChild(this.currentItem);
 *     if (firstChild) {
 *       this.currentItem = firstChild;
 *       this.updateView();
 *     }
 *   }
 *
 *   onArrowLeft(): void {
 *     if (this.currentItem?.parent) {
 *       this.currentItem = this.currentItem.parent;
 *       this.updateView();
 *     }
 *   }
 *
 *   private getFirstChild(item: HierarchicalList | null): HierarchicalList | null {
 *     if (!item) return null;
 *     const iterator = item.children[Symbol.iterator]();
 *     const first = iterator.next();
 *     return first.done ? null : first.value;
 *   }
 * }
 * ```
 *
 * **Interface Design Principles:**
 *
 * **1. Bidirectional Navigation:**
 * - `next` and `prev` enable horizontal traversal between siblings
 * - Supports forward and backward movement through lists
 * - Enables efficient cursor-style navigation patterns
 *
 * **2. Hierarchical Structure:**
 * - `parent` provides upward traversal to containing elements
 * - `children` enables downward traversal to contained elements
 * - Supports unlimited depth of nesting structures
 *
 * **3. Index-Based Positioning:**
 * - `index` provides absolute positioning within current level
 * - Enables direct access patterns and position tracking
 * - Supports sorting and ordering operations
 *
 * **4. Iterable Children:**
 * - `children` as Iterable supports various collection types
 * - Compatible with for...of loops and spread operators
 * - Enables functional programming patterns with children
 *
 * **Implementation Patterns:**
 *
 * **Tree Traversal Algorithms:**
 * ```typescript
 * // Depth-first search
 * function* depthFirstTraversal(root: HierarchicalList): Generator<HierarchicalList> {
 *   yield root;
 *   for (const child of root.children) {
 *     yield* depthFirstTraversal(child);
 *   }
 * }
 *
 * // Breadth-first search
 * function* breadthFirstTraversal(root: HierarchicalList): Generator<HierarchicalList> {
 *   const queue: HierarchicalList[] = [root];
 *   while (queue.length > 0) {
 *     const current = queue.shift()!;
 *     yield current;
 *     queue.push(...Array.from(current.children));
 *   }
 * }
 * ```
 *
 * **Navigation Path Finding:**
 * ```typescript
 * // Find path from root to target
 * function findPath(root: HierarchicalList, target: HierarchicalList): HierarchicalList[] {
 *   const path: HierarchicalList[] = [];
 *   let current: HierarchicalList | null = target;
 *
 *   while (current && current !== root) {
 *     path.unshift(current);
 *     current = current.parent;
 *   }
 *
 *   if (current === root) {
 *     path.unshift(root);
 *   }
 *
 *   return path;
 * }
 * ```
 *
 * **Use Cases in Rowguide:**
 * - **Pattern Navigation**: Navigate between rows and steps in beading patterns
 * - **UI Components**: Tree-like component hierarchies with keyboard navigation
 * - **Data Structures**: Represent complex nested data with bidirectional links
 * - **State Management**: Track navigation state and position in hierarchies
 *
 * @since 1.0.0
 */
export interface HierarchicalList {
  /**
   * Index Position within Current Hierarchy Level
   *
   * Represents the zero-based index position of this item within its current
   * hierarchy level. Used for absolute positioning, sorting, and direct access
   * patterns within sibling collections.
   *
   * @example
   * ```typescript
   * // Access by index for direct navigation
   * function navigateToIndex(root: HierarchicalList, targetIndex: number): HierarchicalList | null {
   *   for (const child of root.children) {
   *     if (child.index === targetIndex) {
   *       return child;
   *     }
   *   }
   *   return null;
   * }
   * ```
   *
   * **Usage Patterns:**
   * - **Position Tracking**: Track current position in navigation sequences
   * - **Direct Access**: Jump to specific items by index
   * - **Sorting**: Order items within hierarchy levels
   * - **State Persistence**: Save and restore navigation positions
   */
  index: number;

  /**
   * Next Sibling Navigation Link
   *
   * Reference to the next sibling item at the same hierarchy level, enabling
   * forward traversal through sibling collections. Null indicates this is
   * the last item in the current level.
   *
   * @example
   * ```typescript
   * // Navigate forward through siblings
   * function navigateForward(current: HierarchicalList): HierarchicalList | null {
   *   return current.next;
   * }
   *
   * // Navigate to end of sibling list
   * function navigateToEnd(start: HierarchicalList): HierarchicalList {
   *   let current = start;
   *   while (current.next) {
   *     current = current.next;
   *   }
   *   return current;
   * }
   * ```
   *
   * **Navigation Patterns:**
   * - **Sequential Access**: Move through items in order
   * - **Cursor Navigation**: Implement cursor-style movement
   * - **Keyboard Navigation**: Support arrow key navigation
   * - **Loop Detection**: Check for circular references in lists
   */
  next: HierarchicalList | null;

  /**
   * Previous Sibling Navigation Link
   *
   * Reference to the previous sibling item at the same hierarchy level, enabling
   * backward traversal through sibling collections. Null indicates this is
   * the first item in the current level.
   *
   * @example
   * ```typescript
   * // Navigate backward through siblings
   * function navigateBackward(current: HierarchicalList): HierarchicalList | null {
   *   return current.prev;
   * }
   *
   * // Navigate to beginning of sibling list
   * function navigateToStart(end: HierarchicalList): HierarchicalList {
   *   let current = end;
   *   while (current.prev) {
   *     current = current.prev;
   *   }
   *   return current;
   * }
   * ```
   *
   * **Usage Scenarios:**
   * - **Undo Navigation**: Return to previous positions
   * - **Bidirectional Navigation**: Support back/forward movement
   * - **History Tracking**: Maintain navigation history
   * - **Validation**: Ensure proper linking in data structures
   */
  prev: HierarchicalList | null;

  /**
   * Parent Hierarchy Navigation Link
   *
   * Reference to the parent item containing this item, enabling upward traversal
   * in the hierarchy. Null indicates this is a root-level item with no parent.
   * Essential for breadcrumb navigation and hierarchy traversal.
   *
   * @example
   * ```typescript
   * // Navigate up hierarchy levels
   * function navigateToRoot(current: HierarchicalList): HierarchicalList {
   *   let root = current;
   *   while (root.parent) {
   *     root = root.parent;
   *   }
   *   return root;
   * }
   *
   * // Generate breadcrumb path
   * function generateBreadcrumbs(current: HierarchicalList): HierarchicalList[] {
   *   const breadcrumbs: HierarchicalList[] = [];
   *   let item: HierarchicalList | null = current;
   *
   *   while (item) {
   *     breadcrumbs.unshift(item);
   *     item = item.parent;
   *   }
   *
   *   return breadcrumbs;
   * }
   * ```
   *
   * **Hierarchy Operations:**
   * - **Upward Navigation**: Move to containing elements
   * - **Root Finding**: Locate top-level ancestors
   * - **Path Generation**: Create navigation breadcrumbs
   * - **Scope Resolution**: Determine containment relationships
   */
  parent: HierarchicalList | null;

  /**
   * Child Elements Iterable Collection
   *
   * Iterable collection of child items contained within this hierarchy item.
   * Supports various collection types and enables functional programming
   * patterns for child manipulation and traversal.
   *
   * @example
   * ```typescript
   * // Iterate through all children
   * function processAllChildren(parent: HierarchicalList): void {
   *   for (const child of parent.children) {
   *     console.log(`Processing child at index ${child.index}`);
   *     processAllChildren(child); // Recursive processing
   *   }
   * }
   *
   * // Find specific child by criteria
   * function findChild(parent: HierarchicalList, predicate: (item: HierarchicalList) => boolean): HierarchicalList | null {
   *   for (const child of parent.children) {
   *     if (predicate(child)) {
   *       return child;
   *     }
   *   }
   *   return null;
   * }
   *
   * // Convert to array for advanced operations
   * function getChildrenArray(parent: HierarchicalList): HierarchicalList[] {
   *   return Array.from(parent.children);
   * }
   * ```
   *
   * **Collection Patterns:**
   * - **Iteration**: for...of loops and Iterator protocol
   * - **Functional Operations**: map, filter, reduce with Array.from()
   * - **Child Management**: Add, remove, and reorder children
   * - **Recursive Operations**: Apply operations to entire subtrees
   */
  children: Iterable<HierarchicalList>;
}

export interface Printable {
  /**
   * Returns a human-readable tabbed string representation of the object as a tree.
   *
   * @param tab String to use for indentation.
   */
  toString(tab?: string): string;
}

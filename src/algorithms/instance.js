/**
 * Represents a single instance of searchPath.
 * A path that is in the queue to eventually be found.
 */
 class Instance {
  constructor() {
    this.pointsToAvoid = {};
    this.startX;
    this.callback;
    this.startY;
    this.endX;
    this.endY;
    this.nodeHash = {};
    this.openList;
    this.nextLevel;
    this.checkedLevels; // levels to visualize search
  }
};

export default Instance;
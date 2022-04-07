/**
 * Represents a single instance of searchPath.
 * A path that is in the queue to eventually be found.
 */
import Node from "./node";

 class Instance {
  pointsToAvoid;
  startX;
  callback;
  startY;
  endX:number;
  endY:number;
  nodeHash;
  openList:Node[];
  nextLevel;
  checkedLevels;
  isDoneCalculating:boolean;
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
    this.isDoneCalculating = false;
  }
};

export default Instance;
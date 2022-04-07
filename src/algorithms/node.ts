/**
* A simple Node that represents a single tile on the grid.
* @param {Object} parent The parent node.
* @param {Number} x The x position on the grid.
* @param {Number} y The y position on the grid.
* @param {Number} costSoFar How far this node is in moves*cost from the start.
**/
class Node {
  parent:Node|null;
  x:number;
  y:number;
  costSoFar:number; // store lowest cost
  list:0|1|undefined; // open/close/unvisited state
  constructor(parent:Node|null, x:number, y:number, costSoFar:number) {
    this.parent = parent; // use to back track the path
    this.x = x;
    this.y = y;
    this.costSoFar = costSoFar; // store lowest cost
  }
};


export default Node;
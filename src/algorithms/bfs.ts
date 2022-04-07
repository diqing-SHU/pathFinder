/**
*   Utilizing BFS for finding path
*   Class structure is inspired by EasyStarJS
**/
import Instance from './instance';
import Node from './node';

// Constants
const CLOSED_LIST = 0;
const OPEN_LIST = 1;
const STRAIGHT_COST = 1.0;

// Helpers
// Helper to generate node from coordinate

const coordinateToNode = (instance: Instance, x: number, y: number, parent: Node|null, cost: number): Node => {
  // set up if we dont have in hashmap
  if (instance.nodeHash[y] !== undefined) {
    if (instance.nodeHash[y][x] !== undefined) {
        return instance.nodeHash[y][x];
    }
  } else {
      instance.nodeHash[y] = {};
  }
  // actual calculations
  let costSoFar = 0;
  if (parent !== null) {
    costSoFar = parent.costSoFar + cost;
  }
  const node = new Node(parent,x,y,costSoFar);
  instance.nodeHash[y][x] = node;
  return node;
};

// Helper to check if tile is walkable
const isTileWalkable = (collisionGrid:number[][], acceptableTiles:number[], x:number, y:number, sourceNode:Node) => {
  for (var i = 0; i < acceptableTiles.length; i++) {
      if (collisionGrid[y][x] === acceptableTiles[i]) {
          return true;
      }
  }
  return false;
};

class BFS {
  collisionGrid:number[][];
  costMap:{[index: number]: number};
  acceptableTiles:number[];
  instances:{[index: number]: Instance};
  instanceQueue:number[];
  iterationsPerCalculation:number;
  nextInstanceId:number;
  isAcceptable:boolean;
  syncEnabled:boolean;
  isDoneCalculating:boolean;

  constructor() {
    this.collisionGrid;
    this.costMap = {};
    this.acceptableTiles;
    this.instances = {};
    this.instanceQueue = [];
    this.iterationsPerCalculation = Number.MAX_VALUE;
    this.nextInstanceId = 1;
    this.isAcceptable= true;
    this.syncEnabled = false;
  }

   /**
  * Sets the collision grid that algorithm uses.
  *
  * @param {Array} grid The collision grid that this BFS instance will read from.
  * This should be a 2D Array of Numbers.
  **/
  setGrid(grid:number[][]){
    this.collisionGrid = grid;
    // Add to cost map if we dont have
    for (var y = 0; y < this.collisionGrid.length; y++) {
        for (var x = 0; x < this.collisionGrid[0].length; x++) {
            if (!this.costMap[this.collisionGrid[y][x]]) {
              this.costMap[this.collisionGrid[y][x]] = 1
            }
        }
    }
  }

  /**
  * Sets the Acceptable Tiles that can be walked on.
  *
  * @param {Array|Number} tiles An array of numbers that represent
  * which tiles in your grid should be considered
  * acceptable, or "walkable".
  **/
  setAcceptableTiles(tiles:(number[]|number)){
    if (tiles instanceof Array) {
      // Array
      this.acceptableTiles = tiles;
    // } else if (!isNaN(parseFloat(tiles)) && isFinite(tiles)) {
    } else {
      // Number
      this.acceptableTiles = [tiles];
    }
  }

  /**
  * Sets the tile cost for a particular tile type.
  *
  * @param {Number} tileType the tileType.
  * @param {Number} cost the cost.
  **/
  setTileCost(tileType, cost) {
    this.costMap[tileType] = cost;
  };

  /**
  * Gets the tile cost for a particular tile type.
  *
  * @param {Number} x the x index.
  * @param {Number} y the y index.
  **/
  getTileCost(x, y) {
    return this.costMap[this.collisionGrid[y][x]]
  };

  /**
  * Sets the tile cost for a particular tile type.
  *
  * @param {Number} instance the search instance.
  * @param {Number} searchNode the node we are coming from.
  * @param {Number} x the x offset.
  * @param {Number} y the y offset.
  * @param {Number} cost the cost so far.
  **/
  checkAdjacentNode = (instance, searchNode, x, y, cost) => {
    const adjacentCoordinateX = searchNode.x+x;
    const adjacentCoordinateY = searchNode.y+y;

    if ((instance.pointsToAvoid[adjacentCoordinateY] === undefined ||
      instance.pointsToAvoid[adjacentCoordinateY][adjacentCoordinateX] === undefined) &&
        isTileWalkable(this.collisionGrid, this.acceptableTiles, adjacentCoordinateX, adjacentCoordinateY, searchNode)) {
        const node = coordinateToNode(instance, adjacentCoordinateX, adjacentCoordinateY, searchNode, cost);

        if (node.list === undefined) {
            node.list = OPEN_LIST;
            instance.nextLevel.push(node);
            instance.checkedLevels[instance.checkedLevels.length-1].push({x: adjacentCoordinateX, y: adjacentCoordinateY});
        } else if (searchNode.costSoFar + cost < node.costSoFar) {
            // const index = instance.nextLevel.indexOf(node);
            node.costSoFar = searchNode.costSoFar + cost;
            node.parent = searchNode;
            // instance.nextLevel[index] = node;
        }
    }
};

  /**
  * Find a path.
  *
  * @param {Number} startX The X position of the starting point.
  * @param {Number} startY The Y position of the starting point.
  * @param {Number} endX The X position of the ending point.
  * @param {Number} endY The Y position of the ending point.
  * @param {Function} callback A function that is called when your path
  * is found, or no path is found.
  * @return {Number} A numeric, non-zero value which identifies the created instance. This value can be passed to cancelPath to cancel the path calculation.
  *
  **/
  findPath(startX, startY, endX, endY, callback){
    // Wraps the callback for sync vs async logic
    var callbackWrapper = (result) => {
      if (this.syncEnabled) {
        callback(result);
      } else {
        setTimeout(function() {
          callback(result);
        });
      }
    }
    // No acceptable tiles were set
    if (this.acceptableTiles === undefined) {
      throw new Error("You can't set a path without first calling setAcceptableTiles().");
    }
    // No grid was set
    if (this.collisionGrid === undefined) {
      throw new Error("You can't set a path without first calling setGrid().");
    }

    // Start or endpoint outside of scope.
    if (startX < 0 || startY < 0 || endX < 0 || endY < 0 ||
      startX > this.collisionGrid[0].length-1 || startY > this.collisionGrid.length-1 ||
      endX > this.collisionGrid[0].length-1 || endY > this.collisionGrid.length-1) {
        throw new Error("Your start or end point is outside the scope of your grid.");
    }

    // Start and end are the same tile.
    if (startX===endX && startY===endY) {
        callbackWrapper({path:[], checked:[]});
        return;
    }

    if (this.isAcceptable === false) {
      callbackWrapper(null);
      return;
    }
  
    // Create the instance to do search
    const instance = new Instance();
    instance.openList = [];
    instance.nextLevel = [];
    instance.checkedLevels = [[{x: startX, y: startY}],[]];
    instance.isDoneCalculating = false;
    instance.nodeHash = {};
    instance.startX = startX;
    instance.startY = startY;
    instance.endX = endX;
    instance.endY = endY;
    instance.callback = callbackWrapper;

    // set starting node
    instance.openList.push(coordinateToNode(instance, instance.startX,
        instance.startY, null, 0));

    // prepare and record this instance
    const instanceId = this.nextInstanceId ++;
    this.instances[instanceId] = instance;
    this.instanceQueue.push(instanceId);
    return instanceId;
  }

  /**
  * This method steps through the BFS Algorithm in an attempt to
  * find your path(s). It will search 4 tiles for every calculation.
  **/
  calculate(){
    if (this.instanceQueue.length === 0 || this.collisionGrid === undefined || this.acceptableTiles === undefined) {
      return;
    }


    for (let iterationsSoFar = 0; iterationsSoFar < this.iterationsPerCalculation; iterationsSoFar++) {
      if (this.instanceQueue.length === 0) {
          return;
      }

      if (this.syncEnabled) {
          // If this is a sync instance, we want to make sure that it calculates synchronously.
          iterationsSoFar = 0;
      }

      const instanceId = this.instanceQueue[0];
      const instance = this.instances[instanceId];
      if (typeof instance == 'undefined') {
          // This instance was cancelled
          this.instanceQueue.shift();
          continue;
      }
      // iterative DFS
      // fill next level if we have
      if (instance.openList.length==0){
        instance.openList = instance.nextLevel;
        instance.nextLevel = [];
        // prepare new level for checkedLevels
        instance.checkedLevels.push([]);
      }
      // Couldn't find a path.
      if (instance.openList.length === 0) {
        instance.callback(null);
        delete this.instances[instanceId];
        this.instanceQueue.shift();
        continue;
      }

      const searchNode = instance.openList.pop();

      
      // No more node to search
      if (!searchNode) {
        return;
      }
      
      // Handles the case where we have found the destination
      if (instance.endX === searchNode.x && instance.endY === searchNode.y) {
        console.log(instance)
        // creating path
        // TODO: fix type
        const path:any[] = [];
        path.push({x: searchNode.x, y: searchNode.y});
        let parent = searchNode.parent;
        while (parent!=null) {
            path.push({x: parent.x, y:parent.y});
            parent = parent.parent;
        }
        path.reverse();
        const ip = path;
        // callback path along with checked levels
        instance.callback({path:ip, checked:instance.checkedLevels});
        delete this.instances[instanceId];
        this.instanceQueue.shift();
        continue;
      }
      searchNode.list = CLOSED_LIST;
      // try 4 directions
      if (searchNode.y > 0) {
        this.checkAdjacentNode(instance, searchNode,
            0, -1, STRAIGHT_COST * this.getTileCost(searchNode.x, searchNode.y-1));
      }
      if (searchNode.x < this.collisionGrid[0].length-1) {
        this.checkAdjacentNode(instance, searchNode,
              1, 0, STRAIGHT_COST * this.getTileCost(searchNode.x+1, searchNode.y));
      }
      if (searchNode.y < this.collisionGrid.length-1) {
        this.checkAdjacentNode(instance, searchNode,
              0, 1, STRAIGHT_COST * this.getTileCost(searchNode.x, searchNode.y+1));
      }
      if (searchNode.x > 0) {
        this.checkAdjacentNode(instance, searchNode,
              -1, 0, STRAIGHT_COST * this.getTileCost(searchNode.x-1, searchNode.y));
      }
    }
  }
}

export default BFS;
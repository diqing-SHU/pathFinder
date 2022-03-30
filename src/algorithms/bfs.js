/**
*   Utilizing BFS for finding path
*   github.com/prettymuchbryce/EasyStarJS
*   Licensed under the MIT license.
*
*   Implementation By Bryce Neal (@prettymuchbryce)
**/
import Instance from './instance';
import Node from './node';

// enum
const directionMap = {
  TOP: 'TOP',
  TOP_RIGHT: 'TOP_RIGHT',
  RIGHT: 'RIGHT',
  BOTTOM_RIGHT: 'BOTTOM_RIGHT',
  BOTTOM: 'BOTTOM',
  BOTTOM_LEFT: 'BOTTOM_LEFT',
  LEFT: 'LEFT',
  TOP_LEFT: 'TOP_LEFT',
}
// Helper to getDistance between two points
const getDistance = (x1,y1,x2,y2) => {
  // Manhattan distance
  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);
  return (dx + dy);
  // Octile distance if we need it
  // const dx = Math.abs(x1 - x2);
  // const dy = Math.abs(y1 - y2);
  // if (dx < dy) {
  //   return DIAGONAL_COST * dx + dy;
  // } else {
  //   return DIAGONAL_COST * dy + dx;
  // }
};

// Helper to generate node from coordinate
const coordinateToNode = (instance, x, y, parent, cost) => {
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

// Helpers
/**
 * -1, -1 | 0, -1  | 1, -1
 * -1,  0 | SOURCE | 1,  0
 * -1,  1 | 0,  1  | 1,  1
 */
const calculateDirection = function (diffX, diffY) {
  if (diffX === 0 && diffY === -1) return directionMap.TOP
  else if (diffX === 1 && diffY === -1) return directionMap.TOP_RIGHT
  else if (diffX === 1 && diffY === 0) return directionMap.RIGHT
  else if (diffX === 1 && diffY === 1) return directionMap.BOTTOM_RIGHT
  else if (diffX === 0 && diffY === 1) return directionMap.BOTTOM
  else if (diffX === -1 && diffY === 1) return directionMap.BOTTOM_LEFT
  else if (diffX === -1 && diffY === 0) return directionMap.LEFT
  else if (diffX === -1 && diffY === -1) return directionMap.TOP_LEFT
  throw new Error('These differences are not valid: ' + diffX + ', ' + diffY)
};

// Helper to check if tile is walkable
const isTileWalkable = function(collisionGrid, acceptableTiles, x, y, sourceNode) {
  // const direction = calculateDirection(sourceNode.x - x, sourceNode.y - y)
  // const directionIncluded = function () {
  //     for (var i = 0; i < directionalCondition.length; i++) {
  //         if (directionalCondition[i] === direction) return true
  //     }
  //     return false
  // }
  // if (!directionIncluded()) return false
  for (var i = 0; i < acceptableTiles.length; i++) {
      if (collisionGrid[y][x] === acceptableTiles[i]) {
          return true;
      }
  }

  return false;
};

const CLOSED_LIST = 0;
const OPEN_LIST = 1;
const STRAIGHT_COST = 1.0;

class BFS {
  collisionGrid;
  costMap;
  acceptableTiles;
  instances;
  instanceQueue;
  iterationsPerCalculation;
  nextInstanceId;
  isAcceptable;
  syncEnabled;

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
  * Sets the collision grid that EasyStar uses.
  *
  * @param {Array} grid The collision grid that this EasyStar instance will read from.
  * This should be a 2D Array of Numbers.
  **/
  setGrid(grid){
    this.collisionGrid = grid;
    // Add to cost map if we dont have
    for (var y = 0; y < this.collisionGrid.length; y++) {
        for (var x = 0; x < this.collisionGrid[0].length; x++) {
            if (!this.costMap[this.collisionGrid[y][x]]) {
              this.costMap[this.collisionGrid[y][x]] = 1
            }
        }
    }
    console.log(this.costMap)
  }

  /**
  * Sets the collision grid that EasyStar uses.
  *
  * @param {Array|Number} tiles An array of numbers that represent
  * which tiles in your grid should be considered
  * acceptable, or "walkable".
  **/
  setAcceptableTiles(tiles){
    if (tiles instanceof Array) {
      // Array
      this.acceptableTiles = tiles;
    } else if (!isNaN(parseFloat(tiles)) && isFinite(tiles)) {
      // Number
      this.acceptableTiles = [tiles];
    }
  }

  /**
  * Sets the tile cost for a particular tile type.
  *
  * @param {Number} The tile type to set the cost for.
  * @param {Number} The multiplicative cost associated with the given tile.
  **/
  setTileCost(tileType, cost) {
    this.costMap[tileType] = cost;
  };

  /**
  * Gets the tile cost for a particular tile type.
  *
  * @param {Number} The tile type to set the cost for.
  * @param {Number} The multiplicative cost associated with the given tile.
  **/
  getTileCost(x, y) {
    return this.costMap[this.collisionGrid[y][x]]
  };

  /**
  * checkAdjacentNode
  *
  * 
  **/
  checkAdjacentNode = function(instance, searchNode, x, y, cost) {
    var adjacentCoordinateX = searchNode.x+x;
    var adjacentCoordinateY = searchNode.y+y;

    if ((instance.pointsToAvoid[adjacentCoordinateY] === undefined ||
      instance.pointsToAvoid[adjacentCoordinateY][adjacentCoordinateX] === undefined) &&
        isTileWalkable(this.collisionGrid, this.acceptableTiles, adjacentCoordinateX, adjacentCoordinateY, searchNode)) {
        const node = coordinateToNode(instance, adjacentCoordinateX, adjacentCoordinateY, searchNode, cost);

        if (node.list === undefined) {
            node.list = OPEN_LIST;
            instance.nextLevel.push(node);
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
    var callbackWrapper = function(result) {
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
        callbackWrapper([]);
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
    instance.isDoneCalculating = false;
    instance.nodeHash = {};
    instance.startX = startX;
    instance.startY = startY;
    instance.endX = endX;
    instance.endY = endY;
    instance.callback = callbackWrapper;

    // set starting node
    instance.openList.push(coordinateToNode(instance, instance.startX,
        instance.startY, null));

    // prepare and record this instance
    const instanceId = this.nextInstanceId ++;
    this.instances[instanceId] = instance;
    this.instanceQueue.push(instanceId);
    return instanceId;
  }

  /**
  * This method steps through the A* Algorithm in an attempt to
  * find your path(s). It will search 4-8 tiles (depending on diagonals) for every calculation.
  * You can change the number of calculations done in a call by using
  * easystar.setIteratonsPerCalculation().
  **/
  calculate(){
    if (this.instanceQueue.length === 0 || this.collisionGrid === undefined || this.acceptableTiles === undefined) {
      return;
    }


    for (this.iterationsSoFar = 0; this.iterationsSoFar < this.iterationsPerCalculation; this.iterationsSoFar++) {
      if (this.instanceQueue.length === 0) {
          return;
      }

      if (this.syncEnabled) {
          // If this is a sync instance, we want to make sure that it calculates synchronously.
          this.iterationsSoFar = 0;
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
      }
      // Couldn't find a path.
      if (instance.openList.length === 0) {
        instance.callback(null);
        delete this.instances[instanceId];
        this.instanceQueue.shift();
        continue;
      }

      const searchNode = instance.openList.pop();
      
      // Handles the case where we have found the destination
      if (instance.endX === searchNode.x && instance.endY === searchNode.y) {
        // creating path
        const path = [];
        path.push({x: searchNode.x, y: searchNode.y});
        let parent = searchNode.parent;
        while (parent!=null) {
            path.push({x: parent.x, y:parent.y});
            parent = parent.parent;
        }
        path.reverse();
        const ip = path;
        instance.callback(ip);
        delete this.instances[instanceId];
        this.instanceQueue.shift();
        continue;
      }
      searchNode.list = CLOSED_LIST;
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
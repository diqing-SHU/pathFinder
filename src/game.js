
import tileset from './assets/gridtiles.png';
import map from './assets/map.json';
import phaserguy from './assets/phaserguy.png';
import BFS from './algorithms/bfs';

class thisScene extends Phaser.Scene {
  constructor() {
    super({ key: 'thisScene' });
  }

  init(){
    // bindings
    // Game.camera => this.gameCam
    // Game.map => this.gameMap
    // Game.player  => this.gamePlayer
    // Game.marker  => this.gameMarker
    // Game.finder  => this.gameFinder

    // Initializing the pathfinder
    this.gameFinder = new BFS();
    this.gameCam = null;
    this.gamePlayer = null;
    this.gameMap = null;
    this.gameMarker = null;
  }

  preload(){
    this.load.image('tileset', tileset);
    this.load.tilemapTiledJSON('map', map);
    this.load.image('phaserguy', phaserguy);
  }

  create(){
    // tweens to move character along path
    const moveCharacter = (path) => {
      if (!this.gameMap||!this.gamePlayer) {
        return
      }
      // Sets up a list of tweens, one for each tile to walk, that will be chained by the timeline
      let tweens = [];
      // skip starting index to animate
      for(var i = 1; i < path.length; i++){
          tweens.push({
              targets: this.gamePlayer,
              x: {value: path[i].x*this.gameMap.tileWidth, duration: 200},
              y: {value: path[i].y*this.gameMap.tileHeight, duration: 200}
          });
      }
  
      this.tweens.timeline({
          tweens: tweens
      });
    };

    // visualize search
    const visualizeSearch = (checkedList, path) => {
      if (!this.gameMap) {
        return
      }
      const drawLevelTimer = (level, interval, color) => setTimeout(() => {
        level.forEach(location => {
          console.log(location);
          this.visited.lineStyle(3, color, 1);
          this.visited.strokeRect(location.x*this.gameMap.tileWidth+3, location.y*this.gameMap.tileHeight+3, this.gameMap.tileWidth-6, this.gameMap.tileHeight-6);
        })
      }, interval);
      // Set a fake timeout to get the highest timeout id
      const highestTimeoutId = setTimeout(";");
      // clear existing timers
      for (let i = 0 ; i < highestTimeoutId ; i++) {
          clearTimeout(i); 
      }
      // clear existing tweens
      this.tweens.killAll()
      // clear existing visited
      this.visited.clear();
      // set timers to visualize
      let interval = 0;
      for(var i = 0; i < checkedList.length; i++){
        drawLevelTimer(checkedList[i], interval, 0xFFBF00)
        interval+=100;
      }
      for(var i = 0; i < path.length; i++){
        drawLevelTimer([path[i]], interval, 0x0096FF)
        interval+=50;
      }
      setTimeout(() => moveCharacter(path), interval);
    };

    const handleClick = (pointer) => {
      if (!this.gameCam || !this.gameFinder) {
        return
      }
      const x = this.gameCam.scrollX + pointer.x;
      const y = this.gameCam.scrollY + pointer.y;
      const toX = Math.floor(x/32);
      const toY = Math.floor(y/32);
      const fromX = Math.floor(this.gamePlayer.x/32);
      const fromY = Math.floor(this.gamePlayer.y/32);
      console.log('going from ('+fromX+','+fromY+') to ('+toX+','+toY+')');
  
      this.gameFinder.findPath(fromX, fromY, toX, toY, function( result ) {
          if (result === null) {
              console.warn("Path was not found.");
          } else {
              console.log(result);
              visualizeSearch(result.checked, result.path);
              // NOTE: if we dont need to show the checks
              // we can just move character now
              // moveCharacter(result.path)
          }
      });
      this.gameFinder.calculate(); // call calculate to generate path
    };
    // setup cam
    this.gameCam = this.cameras.main;
    // this.gameCam.setBounds(0, 0, 20*32, 20*32);
    this.gameCam.removeBounds();
    
    // setup player
    const phaserGuy = this.add.image(32,32,'phaserguy');
    phaserGuy.setDepth(1);
    phaserGuy.setOrigin(0,0.5);
    // this.gameCam.startFollow(phaserGuy);
    this.gamePlayer = phaserGuy;

    // Display map
    this.gameMap = this.make.tilemap({ key: 'map'});
    // The first parameter is the name of the tileset in Tiled and the second parameter is the key
    // of the tileset image used when loading the file in preload.
    const tiles = this.gameMap.addTilesetImage('tiles', 'tileset');
    this.gameMap.createStaticLayer(0, tiles, 0,0);

    // Marker that will follow the mouse
    this.gameMarker = this.add.graphics();
    this.gameMarker.lineStyle(3, 0xffffff, 1);
    this.gameMarker.strokeRect(0, 0, this.gameMap.tileWidth, this.gameMap.tileHeight);

    // visited
    this.visited = this.add.graphics();

    // ### Pathfinding stuff ###

    // We create the 2D array representing all the tiles of our map
    const grid = [];
    for(let y = 0; y < this.gameMap.height; y++){
        let col = [];
        for(var x = 0; x < this.gameMap.width; x++){
            // In each cell we store the ID of the tile, which corresponds
            // to its index in the tileset of the map ("ID" field in Tiled)
            col.push(this.getTileID(x,y));
        }
        grid.push(col);
    }
    this.gameFinder.setGrid(grid);

    const tileset = this.gameMap.tilesets[0];
    const properties = tileset.tileProperties;
    let acceptableTiles = [];

    // We need to list all the tile IDs that can be walked on. Let's iterate over all of them
    // and see what properties have been entered in Tiled.
    for(let i = tileset.firstgid-1; i < tiles.total; i++){ // firstgid and total are fields from Tiled that indicate the range of IDs that the tiles can take in that tileset
        if(!properties.hasOwnProperty(i)) {
            // If there is no property indicated at all, it means it's a walkable tile
            acceptableTiles.push(i+1);
            continue;
        }
        if(!properties[i].collide) acceptableTiles.push(i+1);
        if(properties[i].cost) this.gameFinder.setTileCost(i+1, properties[i].cost); // If there is a cost attached to the tile, let's register it
    }
    this.gameFinder.setAcceptableTiles(acceptableTiles);
    
    // Handles the clicks on the map to make the character move
    this.input.on('pointerup', handleClick);
  };

  update(){
    if (!this.gameMap) {
      return;
    }
    const worldPoint = this.input.activePointer.positionToCamera(this.cameras.main);

    // Rounds down to nearest tile
    const pointerTileX = this.gameMap.worldToTileX(worldPoint.x);
    const pointerTileY = this.gameMap.worldToTileY(worldPoint.y);
    this.gameMarker.x = this.gameMap.tileToWorldX(pointerTileX);
    this.gameMarker.y = this.gameMap.tileToWorldY(pointerTileY);
    this.gameMarker.setVisible(!this.checkCollision(pointerTileX,pointerTileY,this.gameMap));
  };


  checkCollision(x,y){
    if (!this.gameMap || !this.gameMap.getTileAt(x, y)) {
      console.log('!this.gameMap || !this.gameMap.getTileAt(x, y)');
      console.log(this.gameMap);
      console.log(this.gameMap.getTileAt(x, y));
      return false;
    }
    var tile = this.gameMap.getTileAt(x, y);
    return tile.properties.collide == true;
  };

  getTileID(x,y){
    if (!this.gameMap) {
      console.log('!this.gameMap');
      console.log(this.gameMap);
      return -1;
    }
    var tile = this.gameMap.getTileAt(x, y);
    return tile.index;
  };

  

}
export default thisScene;





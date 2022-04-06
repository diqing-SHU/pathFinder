// TODO: update with TS
// @ts-ignore
import BFS from './algorithms/bfs';
// @ts-ignore
import { TextButton } from './gameObj/textButton';
import { Vector } from 'matter';

type GameGridType = number[][];
type GameCostMapType = [number, number | undefined][];
type CustomTileProperties = {
  [index: number]: {
    collide: boolean | undefined;
    cost: number | undefined
  };
}

class GameScene extends Phaser.Scene {
  // TODO: fix typing of any
  gameFinder: any;
  gameCam: Phaser.Cameras.Scene2D.Camera | undefined;
  gamePlayer: Phaser.GameObjects.Image | undefined;
  gameMap: Phaser.Tilemaps.Tilemap | undefined;
  gameMarker: Phaser.GameObjects.Graphics | undefined;
  currAlgo: string | undefined;
  gameGrid: GameGridType | undefined;
  gameAcceptableTiles: number[] | undefined;
  gameCostMap: GameCostMapType | undefined;
  visited: Phaser.GameObjects.Graphics;
  selectedText: Phaser.GameObjects.Text | undefined;

  constructor() {
    super({ key: 'mainScene' });
  }

  preload(){
    this.load.image('tileset', './assets/gridtiles.png');
    this.load.tilemapTiledJSON('map', './assets/map.json');
    this.load.image('phaserguy', './assets/phaserguy.png');
  }

  create(){
    // tweens to move character along path
    const moveCharacter = (path: any[]) => {
      if (!this.gameMap||!this.gamePlayer) {
        return
      }
      // Sets up a list of tweens, one for each tile to walk, that will be chained by the timeline
      let tweens:object[] = [];
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
    const visualizeSearch = (checkedList: any[], path: any[]) => {
      if (!this.gameMap) {
        return
      }
      const drawLevelTimer = (level: any[], interval: number | undefined, color: number) => setTimeout(() => {
        level.forEach(location => {
          if (!this.gameMap) {
            console.log("!this.gameMap")
            return
          }
          this.visited.lineStyle(3, color, 1);
          this.visited.strokeRect(location.x*this.gameMap.tileWidth+3, location.y*this.gameMap.tileHeight+3, this.gameMap.tileWidth-6, this.gameMap.tileHeight-6);
          console.log(color)
          console.log(location.x*this.gameMap.tileWidth+3, location.y*this.gameMap.tileHeight+3, this.gameMap.tileWidth-6, this.gameMap.tileHeight-6)
        })
      }, interval);

      // clear curr animation first
      this.clearCurrAnimation()

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

    // handle on click event
    const handleClick = (pointer: { x: number; y: number; }) => {
      if (!this.gameCam || !this.gameFinder || !this.gamePlayer) {
        return
      }
      const x = this.gameCam.scrollX + pointer.x;
      const y = this.gameCam.scrollY + pointer.y;
      const toX = Math.floor(x/32);
      const toY = Math.floor(y/32);
      const fromX = Math.floor(this.gamePlayer.x/32);
      const fromY = Math.floor(this.gamePlayer.y/32);
      if (!this.gameMap ||  toX >= this.gameMap.height || toY >= this.gameMap.width) {
        return
      }
      console.log('going from ('+fromX+','+fromY+') to ('+toX+','+toY+')');
      this.gameFinder.findPath(fromX, fromY, toX, toY, function( result: { checked: any[]; path: any[]; } | null ) {
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
    this.gameCam.setBounds(0, 0, 20*32+200, 20*32+200);
    
    // setup player
    const phaserGuy = this.add.image(32,32,'phaserguy');
    phaserGuy.setDepth(2);
    phaserGuy.setOrigin(0,0.5);
    // this.gameCam.startFollow(phaserGuy);
    this.gamePlayer = phaserGuy;

    // visited
    this.visited = this.add.graphics();
    this.visited.setDepth(1);

    // Display map
    this.gameMap = this.make.tilemap({ key: 'map'});
    // The first parameter is the name of the tileset in Tiled and the second parameter is the key
    // of the tileset image used when loading the file in preload.
    const tiles = this.gameMap.addTilesetImage('tiles', 'tileset');
    this.gameMap.createLayer(0, tiles, 0,0);

    // Marker that will follow the mouse
    this.gameMarker = this.add.graphics();
    this.gameMarker.lineStyle(3, 0xffffff, 1);
    this.gameMarker.strokeRect(0, 0, this.gameMap.tileWidth, this.gameMap.tileHeight);

    

    // prepare Pathfinding stuff
    // We create the 2D array representing all the tiles of our map
    const grid:GameGridType = [];
    for(let y = 0; y < this.gameMap.height; y++){
        const col:number[] = [];
        for(var x = 0; x < this.gameMap.width; x++){
            // In each cell we store the ID of the tile, which corresponds
            // to its index in the tileset of the map ("ID" field in Tiled)
            col.push(this.getTileID(x,y));
        }
        grid.push(col);
    }
    this.gameGrid = grid
    const tileset = this.gameMap.tilesets[0];
    
    const properties = tileset.tileProperties as CustomTileProperties;
    const acceptableTiles:number[] = [];
    const costMap:[number, number | undefined][] = [];

    // We need to list all the tile IDs that can be walked on. Let's iterate over all of them
    // and see what properties have been entered in Tiled.
    for(let i = tileset.firstgid-1; i < tiles.total; i++){ // firstgid and total are fields from Tiled that indicate the range of IDs that the tiles can take in that tileset
        if(!properties.hasOwnProperty(i)) {
            // If there is no property indicated at all, it means it's a walkable tile
            acceptableTiles.push(i+1);
            continue;
        }
        if(!properties[i].collide) acceptableTiles.push(i+1);
        if(properties[i].cost) costMap.push([i+1, properties[i].cost]);
    }
    this.gameCostMap = costMap
    this.gameAcceptableTiles = acceptableTiles

    // algo buttons
    this.selectedText = this.add.text(20*32, 200, '');
    const BFSButton = new TextButton(this, 20*32, 100, 'BFS', { fill: '#0f0'}, () => this.switchAlgo('BFS'));
    const DFSButton = new TextButton(this, 20*32, 150, 'DFS', { fill: '#0f0'}, () => this.switchAlgo('DFS'));
    this.add.existing(BFSButton);
    this.add.existing(DFSButton);
    // switch to default algo
    this.switchAlgo('BFS');

    // Handles the clicks on the map to make the character move
    this.input.on('pointerup', handleClick);
  };

  switchAlgo(algoName: string) {
    if (algoName == this.currAlgo || !this.selectedText || !this.gameCostMap){
      return
    }
    // clear curr animation first
    this.clearCurrAnimation()
    // switch algo
    this.currAlgo = algoName
    this.selectedText.setText(`Selected ${this.currAlgo}.`);
    // initialize algo
    this.gameFinder = new BFS();
    // fill base info
    this.gameFinder.setGrid(this.gameGrid);
    this.gameFinder.setAcceptableTiles(this.gameAcceptableTiles);
    this.gameCostMap.forEach(([id, cost]) => {
      this.gameFinder.setTileCost(id, cost);
    });
  }

  clearCurrAnimation() {
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
  }

  update(){
    if (!this.gameMap || !this.gameMarker) {
      return;
    }
    const worldPoint = this.input.activePointer.positionToCamera(this.cameras.main) as Vector;

    // Rounds down to nearest tile
    const pointerTileX = this.gameMap.worldToTileX(worldPoint.x);
    const pointerTileY = this.gameMap.worldToTileY(worldPoint.y);
    if (pointerTileX >= this.gameMap.height || pointerTileY >= this.gameMap.width) {
      return;
    }
    // display marker
    this.gameMarker.x = this.gameMap.tileToWorldX(pointerTileX);
    this.gameMarker.y = this.gameMap.tileToWorldY(pointerTileY);
    this.gameMarker.setVisible(!this.checkCollision(pointerTileX,pointerTileY));
  };


  checkCollision(x: number,y: number){
    if (!this.gameMap || y >= this.gameMap.height || x >= this.gameMap.width) {
      console.log('!this.gameMap || y >= this.gameMap.height || x >= this.gameMap.width');
      return false;
    }
    const tile = this.gameMap.getTileAt(x, y);
    return tile.properties.collide == true;
  };

  getTileID(x: number,y: number){
    if (!this.gameMap) {
      console.log('!this.gameMap');
      console.log(this.gameMap);
      return -1;
    }
    const tile = this.gameMap.getTileAt(x, y);
    return tile.index;
  };

  

}
export default GameScene;





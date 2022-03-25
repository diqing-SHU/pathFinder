import Phaser from 'phaser';
import GameScene from './game';
// import MainScene from './scenes/mainScene';
// import MainMenuScene from './scenes/mainMenuScene';
// import GameOverScene from './scenes/gameOverScene';
// import LeaderboardScene from './scenes/leaderboardScene';
// import InstructionsScene from './scenes/instructionsScene';
const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight - 5,
  parent: 'game',
  scene: [
    GameScene,
    // MainMenuScene,
    // MainScene,
    // InstructionsScene,
    // GameOverScene,
    // LeaderboardScene,
  ],
};
const game = new Phaser.Game(config); // eslint-disable-line no-unused-vars
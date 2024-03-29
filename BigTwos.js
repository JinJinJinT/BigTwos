const Player = require("./Player.js");
const Card = require("./Card.js");

// MAYBE ADD AN addPlayer(pid) method.

/**
 * The game manager for a game of BigTwos. Keeps track of the game data
 * and behavior for the API.
 * @public
 */
module.exports = class BigTwos {
  /**
   * The list of players.
   * @type {Player}
   * @private
   */
  #players;

  /**
   * Size of the game.
   * @type {number}
   * @private
   */
  #size;

  /**
   * Cards currently on the board
   * @type {Set<number>}
   * @private
   */
  #boardHand;

  /**
   * The number of consecutive passes
   * @type {number}
   * @private
   */
  #numPasses;

  /**
   * Initiates the gamedata for a new game of BigTwos given a list of player id's.
   * Will evenly distrubute cards to each player.
   * @param {Array.<number>} pids A list of player id's to play a game of BigTwos
   */
  constructor(pids) {
    this.#players = new Player(pids[pids.length - 1]);
    let backPointer = this.#players;

    for (let i = pids.length - 2; i >= 0; i--) {
      this.#players = new Player(pids[i], this.#players);
    }
    backPointer.next = this.#players; // circular LL

    this.#size = pids.length;

    let masterDeck = this.#initDeck();

    // distribute an even amount of cards to each player
    let cardsLeft = this.#size == 2 ? 42 : masterDeck.length;
    let pointer = this.#players;
    let firstPlayerPointer; // player with 3 of diamonds goes first
    while (cardsLeft >= this.#size) {
      for (let i = 0; i < this.#size; i++) {
        if (masterDeck[cardsLeft - 1] == 39) firstPlayerPointer = pointer;
        pointer.addCard(masterDeck[cardsLeft - 1]);
        pointer = pointer.next;
        cardsLeft--;
      }
      // if (firstPlayerPointer)
      //   console.log(`first player is: ${firstPlayerPointer.pid}`);
      this.#players = firstPlayerPointer;
    }
  }

  /**
   * @returns The pid of the current player
   */
  get currentPlayer() {
    return this.#players.pid;
  }

  /* OLD boardHand COMMENT, saving in case we need to do numerical to Card
    conversion again */
  /** Converts the boardHand cards from their numerical representation to a
   *  Card object representation containing a suit and rank and returns it.
   */

  /** Returns the set of cards on the board in their numerical representation.
   * @returns {Set<number> | null} The cards currently on the board or null if no
   * cards have been placed yet.
   */
  boardHand() {
    if (!this.#boardHand || !this.#boardHand.size) return null;

    console.log(`BOARDHAND: ${[...this.#boardHand]}`);
    // /** @type {Card[]} */
    // let convertedCards = this.#boardHand.split(",").map(card => new Card(card));
    return this.#boardHand;
  }

  /**
   * Given a pid, returns the deck of cards of the player with that id.
   * @param {number} pid The pid of the players deck to find.
   * @returns {Set<number> | null} Returns null if the pid does not exist. If it does exist, returns a
   * Set<number> that represents their deck of cards.
   */
  playerCards(pid) {
    let pointer = this.#players;
    for (let i = 0; i < this.#size; i++) {
      if (pointer.pid === pid) return pointer.cards;
      pointer = pointer.next;
    }
    return null;
  }

  /**
   * Makes a move for the game, updates game data, and moves to the next player.
   * If the player passes, it will skip their turn. If the pid given does
   * not match the pid of the current player or if any other error occurs, it will
   * return false. It will return true after a successful turn was made.
   * @param {number} pid The pid of the function caller trying to make a move.
   * @param {Set<number>} cards The cards the player is trying to put down as their move
   * @param {boolean} pass If true, will skip the current players turn. False by default.
   * @returns {boolean} True if move was valid, false otherwise.
   */
  makeMove(pid, cards, pass) {
    // TODO: Update player id code to be int not float. Also make it gaussian
    if (pid != Math.trunc(this.#players.pid) || this.gameOver()) return false;

    if (!pass) {
      this.#numPasses = 0;
      console.log("BT got cards: " + [...cards]);
      // remove all placed cards from current players cards
      cards.forEach(placedCard => {
        this.#players.cards.delete(placedCard);
        console.log(`Removed ${placedCard} from ${pid}'s cards`);
        console.log([...this.#players.cards]);
      });

      console.log(`Setting boardHand to cards: ${[...cards]}`);
      this.#boardHand = cards;
    } else {
      console.log("BT is passing because pass is " + pass);
      this.#numPasses++;
      this.#players = this.#players.next;
      if (this.#numPasses == this.#size - 1) {
        // the current player won this hand so we reset the board.
        this.#boardHand.clear();
        this.#numPasses = 0;
      }
    }

    if (!this.gameOver() && !pass) {
      this.#players = this.#players.next;
    }
    console.log("Returning true");
    return true;
  }

  /**
   * Returns whether the game is over or not. Only checks the current player.
   * @returns Whether the game is over or not.
   */
  gameOver() {
    return this.#players.cards.size === 0;
  }

  /**
   * Initializes and returns a regular, shuffled array of numbers representing a
   * shuffled deck of 54 playing cards.
   * @returns {Array.<number>} A regular, shuffled array of numbers representing a
   * shuffled deck of 54 playing cards.
   */
  #initDeck() {
    let deck = Array.from(Array(52).keys());
    return this.#shuffle(deck);
  }

  /**
   * Performs the Fisher-Yates Shuffle on an array of numbers.
   * Source: https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
   * In addition, it gurantees for the 3 of diamonds (card #39) to exist in the first
   * 42 cards.
   * @param {Array.<number>} array an array of numbers to shufle
   * @returns A shuffled version of the passed in array
   */
  #shuffle(array) {
    let currentIndex = array.length,
      randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex]
      ];
    }

    // check if 3 of diamonds (card #39) is in the last 42 cards
    let threeOfDiamondsIndex = array.find(item => item == 39);

    // is it in any position besides the last 42?
    if (array.length > 42 && threeOfDiamondsIndex < array.length - 42) {
      // generate random value between [array.length-42,array.length)
      let newThreeOfDiamondsIndex =
        array.length - Math.floor(Math.random() * 42) - 1;

      // swap it with the old value
      [array[threeOfDiamondsIndex], array[newThreeOfDiamondsIndex]] = [
        array[newThreeOfDiamondsIndex],
        array[threeOfDiamondsIndex]
      ];
    }

    return array;
  }

  toString() {
    if (!this.#players || !this.#size) {
      return "undefined game";
    }
    let result = "";
    let pointer = this.#players;
    for (let i = 0; i < this.#size; i++) {
      result += `[${pointer.toString()}] ->\n`;
      pointer = pointer.next;
    }
    return result;
  }
};

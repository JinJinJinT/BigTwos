("use strict");
import { handTypes } from "./constants.js";
import { makeRequest, makePostRequest } from "./apiFunctions.js";

(function () {
  window.addEventListener("load", init);

  let selected = new Set();
  /** Stores divs for the hand
   * @type {HTMLDivElement[]}
   */
  let handCardList = [];

  /** Stores divs for the board
   * @type {HTMLDivElement[]}
   */
  let boardCardList = [];

  /** The numerical form of the current board's cards
   * @type {number[]}
   */
  let currentBoardCards = [];

  /** The max number of slots needed for the player's hand
   * @type {number}
   */
  let maxHandSize = 26;

  /** Stores the css card object for this player
   * @type {card[]}
   */
  let cssCards = [];

  /**
   * Stores the slot ID's of the currently considered css card objects
   * Slots [0,maxHandSize) are for the hand. Slots [maxHandSize,maxHandSize + 5)
   * are for the board.
   * @type {Set<number>}
   */
  let activeSlots;

  /**
   * Cards to use when playerJustMoved is true. The cards this player moved
   * to the board for their turn.
   * @type {card[]}
   */
  let playerPlacedCards = [];

  /**
   * Whether this player just made a move or not.
   * If they did then this changes the behavior of updateBoard.
   * @type {boolean}
   */
  let playerJustMoved;

  /** A string representing the type of hand on the board.
   *  @type {string} */
  let boardHand;

  let boardHighSuit = -1; // since lowest suit is 0
  /** Score of the current board's hand (boardCardList)
   * @type {number}
   */
  let boardScore = 0;

  /** Whether it's the current players turn or not
   * @type {boolean}
   */
  let playerCanChoose = false; // need to disable card selection when this is false

  /** This player's ID
   * @type {number}
   */
  let PID;

  // Global variables for determining player hand score and type
  let currentHand;
  let currentScore;
  let currentSuit; // currently selected cards

  async function init() {
    // TODO:
    // Reset at end of game rather than just restarting nodemon.

    /**@type {Deck} */
    let deck;

    try {
      deck = await initDeck();
      // setInterval(async () => {
      //   // When not your turn, check for board updates
      //   if (!playerCanChoose) {
      //     /** @type {number[]} */
      //     let newBoard = await didBoardUpdate();
      //     console.log(`did board update: ${newBoard}`);
      //     if (newBoard) updateBoard(newBoard);
      //   }
      // }, 1000);
    } catch (err) {
      console.error("initDeck fail:", err);
      // refresh page
      window.location.reload();
    }

    PID = await makeRequest("/myPID");
    if (deck) {
      deck.flip();
      for (let i = 0; i < deck.cards.length; i++) {
        // create a copy of each card
        cssCards.push(deck.cards[i]);
      }
      maxHandSize = cssCards.length;
      cssCards.sort(sort);
      populateHand();

      // update card locations when window size changes
      window.addEventListener("resize", () => updateCardLocation(cssCards));
      let button = document.getElementById("move");
      button.addEventListener("click", makeMove);
      button.disabled = true;

      setInterval(async () => {
        /** @type {number[]} */
        let newBoard = await didBoardUpdate();
        console.log(`did board update: ${newBoard}`);
        if (newBoard && !playerJustMoved) updateBoard(newBoard);

        let currentPlayer = await makeRequest("/currentPlayer");
        console.log(`current player is ${currentPlayer}`);
        playerCanChoose = currentPlayer == PID;
        console.log(`playerCanChoose is ${playerCanChoose}`);
        // console.log(`Current player is: ${currentPlayer}`);
      }, 1000);
    }
  }

  async function initDeck() {
    try {
      /**@type {number[]} */
      let cards = await makeRequest("/currentHand");
      console.log("successfull initDeck");
      return Deck(cards);
    } catch (err) {
      console.log("initDeck failed, throwing error");
      throw err;
    }
  }

  /**
   * Checks if the board updated from another player making a move.
   * @returns {number[] | null} Returns the updated board in its numerical form
   * if the board changed. Otherwise returns null.
   */
  async function didBoardUpdate() {
    /** @type {number[]} */
    let board = await makeRequest("/currentBoard");
    console.log(`CURRENT BOARD: ${JSON.stringify(board)}`);
    console.log(`Boards type: ${typeof board}`);
    // console.log(`CURRENT BOARD-nojson: ${board}`);
    // console.log(`CURRENT BOARD-nojson: ${board[2]}`);
    // console.log(`CURRENT BOARD-unwrapped: ${[...board]}`);
    // console.log(`type of board: ${typeof board}`);

    // compare the fetched board to the currently stored board.
    // Sometimes board is a string and we only want to consider its object form
    let boardChanged =
      board &&
      typeof board == "object" &&
      currentBoardCards.toString() != board.toString();
    if (boardChanged) {
      console.log(
        `Checked if ${board.toString()} != ${currentBoardCards.toString()}`
      );
      return board;
    }
    return null;
  }

  /**
   * Populates the player's hand with their cards.
   */
  async function populateHand() {
    activeSlots = new Set();
    cssCards.forEach((card, i) => {
      // create a card slot and assign it to cardList ([] of divs)
      let container = document.createElement("div");
      container.classList.add("card-slot");
      card.slot = i;
      handCardList[i] = container;

      // add slot id to set of slots
      activeSlots.add(i);

      // append the card slot to the hand
      document.querySelector(".interact").appendChild(container);
    });

    // move each card to its appropriate hand div
    for (let cardCount = 0; cardCount < cssCards.length; cardCount++) {
      let container = handCardList[cardCount];
      let bounds = container.getBoundingClientRect();
      cssCards[cardCount].animateTo({
        delay: 50 * cardCount, // delay for smooth moving as distance increases
        duration: 500,
        ease: "quartOut",

        x: bounds.x,
        y: bounds.y
      });
      cssCards[cardCount].mount(container); // append card as child to the div
      container.firstElementChild.addEventListener("click", select);
      container.firstElementChild.slot = cardCount;
    }
    // not sure what this was
    // setTimeout(updateCardLocation, 100, cssCards);
  }

  /** Handles logic for when a card is clicked */
  function select() {
    if (selected.size < 5) {
      this.classList.toggle("selected");
      if (this.classList.contains("selected")) {
        selected.add(this.parentElement);
        // add the card-slot to an object
      } else {
        selected.delete(this.parentElement);
        // remove the card-slot from an object
      }
    } else if (this.classList.contains("selected")) {
      this.classList.toggle("selected");
      selected.delete(this.parentElement);
      // remove the card-slot from an object
    }

    console.log("board:", boardHand, boardScore, boardHighSuit);

    updateGameValues(selected);
  }

  /**
   * Updates the game's values such as the type of hand on the board, the score of
   * the current hand, etc.
   * @param {Set<HTMLDivElement>} hand
   */
  function updateGameValues(hand) {
    let isPoker;
    [currentHand, currentScore, currentSuit, isPoker] = checkValidHand(hand);
    console.log(
      "checkValidHand(): ",
      currentHand,
      currentScore,
      currentSuit,
      isPoker
    );

    let handIsHigher =
      (boardHand === undefined || isPoker || currentHand == boardHand) &&
      (currentScore > boardScore ||
        (currentScore == boardScore && currentSuit > boardHighSuit));
    console.log("handIsHigher:", handIsHigher);

    let allowMove =
      playerCanChoose &&
      selected.size != 0 &&
      currentHand !== undefined &&
      currentHand != "invalid" &&
      handIsHigher;
    console.log("allowMove:", allowMove);
    // disable move button if either the hand is invalid or it's not their turn
    document.getElementById("move").disabled = !allowMove || !playerCanChoose;
  }

  /**
   * Updates the board to the passed in cards.
   * It's guranteed that the board changed
   * @param {number[]} cards - an array of cards in their numerical representation
   */
  function updateBoard(cards) {
    currentBoardCards = [];
    if (cards) {
      console.log(`Updating currentBoardCards to ${cards}`);
      cards.forEach(item => currentBoardCards.push(item));
      console.log(`CurrentBoardCards is now ${currentBoardCards}`);
    } else {
      console.log(`CurrentBoardCards is now ${currentBoardCards}`);
    }

    // TODO:
    // IMPLEMENT updateBoard TO REFLECT THE boardCardList

    // WHEN playerJustMoved IS TRUE, USE THE CURRENTLY SELECTED CARDS.

    // clear board
    let parent = document.querySelector("#table > .cards");
    parent.innerHTML = "";

    // clear boardCardList
    boardCardList = [];

    // clear anything from index maxHandize ~ maxHandSize + 5 in cssCards
    cssCards = cssCards.slice(0, maxHandSize);

    // clear active board indexes
    for (let i = maxHandSize; i < maxHandSize + 5; i++) activeSlots.delete(i);
    console.log(`clearing board slots in activeSlots`);

    if (playerJustMoved) {
      console.log(
        `Entered playerJustMoved and playerPlacedCards is:\n${playerPlacedCards}`
      );
      playerPlacedCards.forEach((card, index) => {
        let oldSlot = parseInt(card.slot);
        // delete old slot
        activeSlots.delete(oldSlot);
        console.log(`Deleted active slot ${oldSlot} if it existed`);

        // delete old div from hand
        handCardList[oldSlot] = null;
        console.log(
          `set slot #${oldSlot} to null in handCardList:\n${handCardList}`
        );

        // update its slot
        let newSlot = maxHandSize + index;
        card.slot = newSlot;
        console.log(
          `Updated the cards slot to maxHandSize(${maxHandSize}) + index(${index}) = ${newSlot}`
        );

        // add the new slot to the active slots and change its csscard
        activeSlots.add(newSlot);
        cssCards.push(cssCards[oldSlot]);
        cssCards[oldSlot] = null;

        // index++;

        /** get parent div
         * @type {HTMLDivElement}
         */
        let parentDiv = card.parentElement;
        console.log(`Got the old parent div which was\n${parentDiv}`);

        // make new div and append to board and boardCardList
        let newDiv = document.createElement("div");
        newDiv.classList.add("card-slot");
        parent.appendChild(newDiv);
        boardCardList.push(newDiv);
        console.log(
          `created and appended the new Div and added it to boardCardList`
        );

        // mount to new div
        newDiv.appendChild(card);
        console.log(`Appended the card to new div`);

        // delete old parent div
        parentDiv.remove();
        console.log(`Deleted the old parent div`);
      });
      playerJustMoved = false;
    } else {
      // create the cards
      let cardsToDeck = new Deck(cards);
      cardsToDeck.flip();
      cardsToDeck = cardsToDeck.cards;

      cardsToDeck.forEach((card, index) => {
        // create the divs
        let newDiv = document.createElement("div");
        newDiv.classList.add("card-slot");

        // append to boardCardList
        boardCardList.push(newDiv);

        // mount to the div
        card.mount(newDiv);

        // update card slot
        card.slot = maxHandSize + index;
        newDiv.firstElementChild.slot = card.slot;

        // append to board
        parent.appendChild(newDiv);

        // push to cssCards at proper index by checking its length first. Avoid IndexOOB
        // if (cssCards.length < maxHandSize + index) {
        cssCards.push(card);
        // } else {
        // cssCards[maxHandSize + index] = card;
        // }
        activeSlots.add(maxHandSize + index);
      });
    }

    // cssCards[maxHandCount] = newly generated card
    // newGenCard.slot = maxHandCount + index where index (0~cards.length)
    //boardHandList[index] = a new div

    // clear all divs.

    // MAKE MOVE IS UPDATE THE SLOTS AND DELETE THE DIVS THEY WERE ON THEN UPDATE BOARD
    console.log(`Updated board: activeSlots are: ${[...activeSlots]}`);
    // WHEN OTHER PLAYER MOVES WE GENERATE NEW CARDS
    updateCardLocation();

    let hand = new Set();
    // let children = parent.children();
    // for (let i = 0; i < children.length; i++) hand.add(child);
    [...parent.childNodes].forEach(child => hand.add(child));
    console.log(`handSet: ${hand}`);
    updateGameValues(hand);
    console.log(`Setting board=${currentHand} ${currentScore} ${currentSuit}`);
    [boardHand, boardScore, boardHighSuit] = [
      currentHand,
      currentScore,
      currentSuit
    ];
    document.getElementById("type").textContent = "Type: " + boardHand;
  }

  /** Moves each card on the board to its attached div on the board */
  function updateCardLocation() {
    // change to iterate over set of acceptable cards
    activeSlots.forEach(slot => {
      console.log(`Updating slot #:${slot}`);
      let bounds;
      if (slot < maxHandSize)
        bounds = handCardList[slot].getBoundingClientRect();
      else bounds = boardCardList[slot - maxHandSize].getBoundingClientRect();

      cssCards[slot].animateTo({
        delay: 0, // no reason to delay I think
        duration: 400,
        ease: "quartOut",

        x: bounds.x,
        y: bounds.y
      });
    });
  }

  async function makeMove() {
    // console.log(`Setting board=${currentHand} ${currentScore} ${currentSuit}`);
    // [boardHand, boardScore, boardHighSuit] = [
    //   currentHand,
    //   currentScore,
    //   currentSuit
    // ];

    // document.getElementById("type").textContent = "Type: " + boardHand;

    /** @type {number[]} A numerical representation of each newly placed card*/
    let placedCards = [];
    currentBoardCards = [];
    playerPlacedCards = [];

    [...selected].sort(sortDiv).forEach(slot => {
      // parent.appendChild(slot);
      let card = slot.firstElementChild;
      playerPlacedCards.push(card);
      let classes = card.classList;
      let rank = parseInt(classes[2].substring(4));
      let suit = classes[1];
      console.log("Rank is " + rank + " and suit is " + suit + ".");
      let multiplier =
        suit == "spades" ? 0 : suit == "hearts" ? 1 : suit == "clubs" ? 2 : 3;

      console.log("Multiplier is " + multiplier + ".");
      let code = multiplier * 13 + rank - 1;
      placedCards.push(parseInt(code));
      currentBoardCards.push(parseInt(code));
      console.log(`Pushing ${code}. PlacedCards: ${placedCards}`);
      // clear and unselect
      select.call(slot.firstElementChild);
      slot.firstElementChild.removeEventListener("click", select);
    });
    playerJustMoved = true;
    // updateCardLocation();
    // send cards to endpoint
    // create formdata object
    let formData = new FormData();
    formData.append("pid", PID);
    formData.append("cards", placedCards); // this is the bug
    formData.append("pass", false);
    let response = await makePostRequest("/makeMove", formData);
    console.log("move response: ", response);
    updateBoard(placedCards);
  }

  // TODO:
  // Isolate Poker hands and other hands
  /**
   *
   * @param {Set<HTMLDivElement>} hand The set of cards we are checking validity of.
   * @returns {[string,number,number,boolean]} The [hand name, hand score, hand's
   * highest suit, whether hand is a poker hand or not]
   */
  function checkValidHand(hand) {
    let code;
    let name, multiplier, highCard, highSuit;

    // flags for Straight, Flush, and Royal
    let [S, F, R] = [true, true, true];

    // set to find cards in a full house and detect duplicates ranks; stores the card ranks currently selected
    let findFH = new Set();

    // set to track what suits are selected
    let suits = new Set(["diamonds", "clubs", "hearts", "spades"]);

    // set to track which royal cards are selected
    let royals = new Set([1, 13, 12, 11]); // A, K, Q, J (i think)

    // status flags for determining if there's a straight
    let [flag1, flag2, flag3, flag4, flag10, flag11, flag12, flag13] = [
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false
    ];
    let max = 13;
    let min = 1;
    let isConsecutive = true;

    // loop to set flags for determining the current selected hand
    for (let item of hand) {
      let child = item.firstElementChild;
      let [card, suit, rank] = child.classList;
      rank = parseInt(rank.replace("rank", ""));

      // update the current highest card (by number)
      if (
        highCard === undefined ||
        rank == 2 ||
        (highCard != 2 && rank == 1) ||
        highCard < rank
      ) {
        highCard = rank;
      }

      let suitValue =
        suit == "diamonds" ? 0 : suit == "clubs" ? 1 : suit == "hearts" ? 2 : 3;
      if (highSuit === undefined || suitValue > highSuit) {
        highSuit = suitValue;
      }

      // all ranks need to fall within the range which narrows as we go on.
      if (rank < min || rank > max) isConsecutive = false;

      // narrow the range to 5
      // compare possible straight lowerbound and upperbound to current possible range
      if (max - min > 4) {
        let lowerBound = rank - 4;
        let upperBound = rank + 4;
        if (lowerBound > min) {
          min = lowerBound;
        }
        if (upperBound < max) {
          max = upperBound;
        }
      }

      // set straight flags
      if (rank == 1) flag1 = true;
      if (rank == 2) flag2 = true;
      if (rank == 3) flag3 = true;
      if (rank == 4) flag4 = true;
      if (rank == 10) flag10 = true;
      if (rank == 11) flag11 = true;
      if (rank == 12) flag12 = true;
      if (rank == 13) flag13 = true;

      // update the sets
      findFH.add(rank);
      royals.delete(rank);
      suits.delete(suit);
    }

    let isPoker = false;
    // assign multiplier and name
    if (hand.size < 5) {
      if (findFH.size == 1) {
        [name, multiplier] = handTypes[hand.size];
        if (hand.size == 4) isPoker = true;
      }
    } else {
      isPoker = true;
      // console.log("size = 5")
      if (findFH.size == 2) {
        code = 3;
      } else {
        /* Determine if it was a Straight
         * casesWith13: if theres a 13 and it includes a 3 or 4 it's invalid.
         *              Also handles all edge cases that include a 13.
         * If casesWith13 is true, we do not need to check if it's consecutive.
         * Otherwise, we need to check if it was consecutive.
         */
        let casesWith13 =
          flag13 &&
          !flag3 &&
          !flag4 &&
          flag1 &&
          flag11 &&
          flag12 &&
          (flag10 || flag2);
        S = casesWith13 || isConsecutive;

        // if (prevRank == 3 || prevRank == 4) [S, F] = [false, false]; what was this lol?
        F = F && suits.size === 3;
        R = royals.size === 0;
        if (!F && !S) {
          code = 0;
        } else if (!F && S) {
          code = 1;
        } else if (F && !S) {
          code = 2;
        } else if (!R) {
          code = 4;
        } else {
          code = 5;
        }
      }
      [name, multiplier] = handTypes[5][code];
      // console.log("length 5 code:",name, " multiplier:",multiplier)
    }

    let score =
      highCard < 3 ? (highCard + 13) * multiplier : (highCard - 2) * multiplier;
    return [name, score, highSuit, isPoker];
  }

  function sort(a, b) {
    let sub = a.rank - b.rank;
    if (a.rank == 2) return 1;
    if (b.rank == 2) return -1;
    if (a.rank == 1) return 1;
    if (b.rank == 1) return -1;
    return sub; // maybe sort by suit later
  }

  // get child
  // get classlist[2].charAt(classlist[2].length-1)
  // compare
  function sortDiv(a, b) {
    let childA = a.firstElementChild;
    let childB = b.firstElementChild;

    let aRank = childA.classList[2].replace("rank", "");
    let bRank = childB.classList[2].replace("rank", "");
    if (aRank == 2) return 1;
    if (bRank == 2) return -1;
    if (aRank == 1) return 1;
    if (bRank == 1) return -1;
    return aRank - bRank;
  }
})();

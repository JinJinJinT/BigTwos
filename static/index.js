("use strict");
import { handTypes } from "./constants.js";
import { makeRequest, makePostRequest } from "./apiFunctions.js";

(function () {
  window.addEventListener("load", init);

  let selected = new Set();
  /** @type {HTMLDivElement[]} */
  let cardList = {};
  let p1Cards = [];
  let currentBoardCards = [];
  /** A string representing the type of hand on the board.
   *  @type {string} */
  let boardHand;
  let boardHighSuit = -1; // since lowest suit is 0
  let boardScore = 0;
  let playerCanChoose = false; // need to disable card selection when this is false
  let PID;

  let currentHand;
  let currentScore;
  let currentSuit; // currently selected cards
  // WE CAN JUST, when configuring api:
  // States: Init (getting turn assigned), Turn, Waiting for turn
  // Eventually things like shuffling and dealing will be
  // controlled by status signals from the API

  async function init() {
    // TODO:
    // Welcome message
    // start game screen
    // gameplay api

    // TODO:
    // create a start-game loading screen after login that displays all logged in players

    // V1:
    // Log in with 2 browsers to test
    /* BUGS:
     * Need to restart game for newly joined players since BigTwos object isn't updated to the db.
     * Solution: 1. startGame adds you to the BigTwos game
     *           2. login->ready screen->once all ready: add all to BigTwos and startGame.


     * If players join already with cookies, they get verified despite
     * not being in the db and get stuck in an empty game screen.
     * Solution: Add a check that a user to any route (in auth) MUST also match db token.
     */
    /**@type {Deck} */
    let deck;
    try {
      deck = await initDeck();
      setInterval(async () => {
        // When not your turn, check for board updates
        if (!playerCanChoose) {
          /** @type {number[]} */
          let board = await makeRequest("/currentBoard");
          // board.forEach(thing => console.log(thing));
          console.log(`CURRENT BOARD: ${JSON.stringify(board)}`);
          // console.log(`CURRENT BOARD-nojson: ${board}`);
          // console.log(`CURRENT BOARD-nojson: ${board[2]}`);
          // console.log(`CURRENT BOARD-unwrapped: ${[...board]}`);
          // console.log(`type of board: ${typeof board}`);
          console.log(typeof board);
          if (
            board &&
            typeof board == "object" &&
            board.toString() != currentBoardCards.toString()
          ) {
            console.log(
              `Checked if ${board.toString()} != ${currentBoardCards.toString()}`
            );
            console.log(`Updating currentBoardCards to ${board}`);
            currentBoardCards = [];
            board.forEach(item => currentBoardCards.push(item));
            console.log(`CurrentBoardCards is now ${currentBoardCards}`);
            updateBoard(board);
            /**
             * TODO:
             * Find a way to update only the cards on the board.
             * Currently:
             * It just sorts selected cards and appends them to the board as children.
             * Next:
             * Every second when not your turn, check if the board has changed.
             * If it has, create the cards and append them to the board.
             *
             * ALSO: Update the board hand. Just call the methods for cards on the board
             * ALSO update score
             *
             */
          }
        }
      }, 1000);
    } catch (err) {
      console.error("initDeck fail:", err);
      // refresh page
      window.location.reload();
    }
    PID = await makeRequest("/myPID");
    if (deck) {
      deck.flip();
      // deck.shuffle();
      // deck.cards[0].enableDragging();
      // deck.cards[1].enableDragging();

      // let container = document.createElement("div");
      // deck.cards[1].mount(container);
      // container.classList.add("card-slot");
      // document.querySelector(".interact").appendChild(container);

      for (let i = 0; i < deck.cards.length; i++) {
        //   deck.cards[i].enableDragging();
        //   deck.cards[i + 1].enableDragging();
        p1Cards.push(deck.cards[i]);
        //   p2Cards.push(deck.cards[i + 1]);
      }
      p1Cards.sort(sort);
      populateHand(p1Cards);

      window.addEventListener("resize", () => updateCardLocation(p1Cards));
      let button = document.getElementById("move");
      button.addEventListener("click", makeMove);
      button.disabled = true;
      setInterval(async () => {
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
      // init the game
      // THIS ASSUMES BOTH PLAYERS ARE ALREADY LOGGED IN
      // let text = await makeRequest("/startGame");
      // console.log(text);

      /**@type {number[]} */
      let cards = await makeRequest("/currentHand");
      console.log("successfull initDeck");
      return Deck(cards);
    } catch (err) {
      console.log("initDeck failed, throwing error");
      throw err;
    }
  }

  async function populateHand(p1Cards) {
    p1Cards.forEach((card, i) => {
      // select all cards aready placed in the hand (not table)
      // let cards = document.querySelectorAll(".interact .card-slot");
      // for each card already placed except the last one
      // get its position and animate it to that position
      // for (let i = 1; i < cards.length; i++) {
      //   let bounds = cards[i - 1].getBoundingClientRect();
      //   p1Cards[i - 1].animateTo({
      //     delay: 1000 + i * 2, // wait 1 second + i * 2 ms
      //     duration: 500,
      //     ease: "quartOut",

      //     x: bounds.x,
      //     y: bounds.y
      //   });
      // }

      // create a card slot and assign it to cardList ([] of divs)
      let container = document.createElement("div");
      container.classList.add("card-slot");
      card.slot = i;
      cardList[i] = container;

      // append the card slot to the hand
      document.querySelector(".interact").appendChild(container);
      // get the position of the card slot after appending
      // let bounds = container.getBoundingClientRect();
      // mount the container to the card
      // card.mount(container);
      // animate the card to the position of the container (not 100% necessary, investingating...)
      // card.animateTo({
      //   delay: 1000 + i * 2, // wait 1 second + i * 2 ms
      //   duration: 500,
      //   ease: "quartOut",

      //   x: bounds.x,
      //   y: bounds.y
      // });
      // container.firstElementChild.addEventListener("click", select);
      // cards.push(card);
    });
    let cardCount = 0;
    for (; cardCount < p1Cards.length; cardCount++) {
      // storeTimer = setTimeout(() => {
      console.log(cardCount);
      let container = cardList[cardCount];
      let bounds = container.getBoundingClientRect();
      p1Cards[cardCount].animateTo({
        delay: 50 * cardCount,
        duration: 500,
        ease: "quartOut",

        x: bounds.x,
        y: bounds.y
      });
      p1Cards[cardCount].mount(container);
      container.firstElementChild.addEventListener("click", select);
      // }, cardCount * 100);
    }
    // let cardTimer = setInterval(() => {
    //   if (cardCount < p1Cards.length) {
    //     console.log(cardCount);
    //     let container = cardList[cardCount];
    //     let bounds = container.getBoundingClientRect();
    //     p1Cards[cardCount].animateTo({
    //       delay: 100 * cardCount,
    //       duration: 500,
    //       ease: "quartOut",

    //       x: bounds.x,
    //       y: bounds.y
    //     });
    //     p1Cards[cardCount].mount(container);
    //     container.firstElementChild.addEventListener("click", select);
    //     cardCount++;
    //   } else {
    //     clearInterval(cardTimer);
    //   }
    // }, 100);
    // p1Cards.forEach((card, i) => {
    //   let container = cardList[i];
    //   let bounds = container.getBoundingClientRect();
    //   card.animateTo({
    //     delay: 1000 + i * 100, // wait 1 second + i * 2 ms
    //     duration: 500,
    //     ease: "quartOut",

    //     x: bounds.x,
    //     y: bounds.y
    //   });
    //   card.mount(container);
    //   container.firstElementChild.addEventListener("click", select);
    // });
    setTimeout(updateCardLocation, 100, p1Cards);
    // let i = 0;
    // let cards = document.querySelectorAll(".card-slot");
    // cards[i].click();
    // let timerId = setInterval(function () {
    //   if (i === cards.length) {
    //     clearInterval(timerId);
    //   } else {
    //     i++;
    //     cards[i - 1].click();
    //     cards[i].click();
    //   }
    // }, 500);
  }

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
    let isPoker;
    [currentHand, currentScore, currentSuit, isPoker] = checkValidHand();
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
    document.getElementById("move").disabled = !allowMove || !playerCanChoose;
    // updateBoard(undefined);
  }

  /** Resets the board with up to 5 cards passed through parameters
   * @param {number[]} cards - an array of cards in their numerical representation
   */
  function updateBoard(cards) {
    // select the board
    let board = document.querySelector("#table > .cards");
    // create the new cards
    let newBoardDeck = new Deck(cards);
    newBoardDeck.flip();
    newBoardDeck = newBoardDeck.cards;
    console.log(board);
    console.log(board.children);
    console.log(newBoardDeck);

    // TODO:
    // CHANGE TO ALWAYS HAVE 5 POSITIONS ON THE BOARD???
    // ORRRR,
    // WRITE A FUNCTION THAT MOVES A CARD TO A POSITION
    // ON THE BOARD?

    // TODO:
    // We need to handle .slots because cards move as size changes.
    // 1. If newCards length <= board.children.length
    //    - Replace each card-slot child and update the cards .slot attribute to be
    //      the same as the old cards .slot attribute.
    //    - If newCards length != board.children.length
    //      then remove all board.children where i >= newCards.length
    // 2. If newCards length > board.children.length
    //    - Same as 1. Replace each card slot until i == board.children.length
    //    - Create new card-slots and append them to cardList as well as to the board.

    // Create a card-slot for each newBoardDeck item. Also mount them together
    console.log(`The length of new board is: ${newBoardDeck.length}`);
    if (newBoardDeck.length < board.children.length) {
      console.log(`Changing ${newBoardDeck.length} cards`);
      for (let i = 0; i < newBoardDeck.length; i++) {
        let cardSlot = board.children[i];
        let slotID = cardSlot.firstElementChild.slot;
        newBoardDeck[i].slot = slotID;
        p1Cards[slotID] = newBoardDeck[i];
        cardSlot.firstElementChild.remove();
        newBoardDeck[i].mount(cardSlot);
      }
      // replace each card slot child
      // if (newBoardDeck.length != board.children.length) {
      // remove all board.children where i >= newCards.length
      console.log(
        `Deleting cards in positions ${newBoardDeck.length} ~ ${
          board.children.length - 1
        }`
      );
      for (let i = newBoardDeck.length; i < board.children.length; i++) {
        /* May need to update cardList or p1Cards*/
        board.children[newBoardDeck.length].remove();
      }
      // }
    } else {
      for (let i = 0; i < board.children.length; i++) {
        let cardSlot = board.children[i];
        let slotID = cardSlot.firstElementChild.slot;
        newBoardDeck[i].slot = slotID;
        p1Cards[slotID] = newBoardDeck[i];
        cardSlot.firstElementChild.remove();
        newBoardDeck[i].mount(cardSlot);
      }
      for (let i = board.children.length; i < newBoardDeck.length; i++) {
        let newSlot = document.createElement("div");
        newSlot.classList.add("card-slot");
        let slotID = p1Cards.length;
        newBoardDeck[i].slot = slotID;
        p1Cards.push(newBoardDeck[i]);
        cardList[slotID] = newSlot;
        // newBoardDeck[i].slot =
        newBoardDeck[i].mount(newSlot);
        board.appendChild(newSlot);
      }
    }
    updateCardLocation(p1Cards);

    // for (let newCard of newBoardDeck) {
    //   // create div cardslot
    //   let newSlot = document.createElement("div");
    //   newSlot.classList.add("card-slot");
    // }

    // board.innerHTML = "";

    // replace all old ones
    // board.replaceChildren(newBoardDeck);
    // let newCardIndex = 0;
    // let oldCardIndex = 0;
    // while (oldCardIndex < board.children.length && newCardIndex < newBoardDeck.length) {
    //   board.children[oldCardIndex].replaceChild(newBoardDeck[newCardIndex]);
    //   oldCardIndex++;
    //   newCardIndex++;
    // }

    // append new cards
    // while (newCardIndex < newBoardDeck.length) {
    //   board.children[newBoardDeck].repla
    // }

    // clear old cards

    // let childCard = board.children[position];
    // Should already be sorted I think
    // board.appendChild(newBoardDeck[position])
    // childCard.replaceWith(newBoardDeck[position]);
    // let card = cards[position];
    // childCard.classList[1] = card["suit"].toLowerCase();
    // childCard.classList[2] = "rank" + card["rank"].toLowerCase();
    // console.log(
    //   `Replacing ${JSON.stringify(childCard)} with ${JSON.stringify(card)}`
    // );
    // childCard.classList.contains("");
    // }
    // while (position < board.children.length) {
    //   let childCard = board.children[position];
    //   childCard.remove();
    // }

    // for (let i = 0; i < cards.length; i++) {
    //   let childCard = board.children[i];
    //   let card = cards[i];
    //   console.log(childCard.firstElementChild);
    // }
  }

  function updateCardLocation(p1Cards) {
    for (let i = 0; i < p1Cards.length; i++) {
      let slot = p1Cards[i].slot;
      let bounds = cardList[slot].getBoundingClientRect();
      p1Cards[i].animateTo({
        delay: 1000 + i * 2, // wait 1 second + i * 2 ms
        duration: 400,
        ease: "quartOut",

        x: bounds.x,
        y: bounds.y
      });
    }
  }

  async function makeMove() {
    console.log(`Setting board=${currentHand} ${currentScore} ${currentSuit}`);
    [boardHand, boardScore, boardHighSuit] = [
      currentHand,
      currentScore,
      currentSuit
    ];

    document.getElementById("type").textContent = "Type: " + boardHand;

    let parent = document.querySelector("#table > .cards");

    // clear board
    parent.innerHTML = "";
    /** @type {number[]} A numerical representation of each newly placed card*/
    let placedCards = [];
    currentBoardCards = [];
    [...selected].sort(sortDiv).forEach(slot => {
      parent.appendChild(slot);
      let card = slot.firstElementChild;
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
    updateCardLocation(p1Cards);
    // send cards to endpoint
    // create formdata object
    let formData = new FormData();
    formData.append("pid", PID);
    formData.append("cards", placedCards); // this is the bug
    formData.append("pass", false);
    let response = await makePostRequest("/makeMove", formData);
    console.log("move response: ", response);
  }

  // TODO:
  // Isolate Poker hands and other hands
  function checkValidHand() {
    let code;
    let handSize = selected.size;
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
    for (let item of selected) {
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
    if (selected.size < 5) {
      if (findFH.size == 1) {
        [name, multiplier] = handTypes[selected.size];
        if (selected.size == 4) isPoker = true;
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
    return name !== undefined && name != "invalid";
    // Can only move if it is your turn.
    // Can select cards whenever
    // can only move if undefined or if pattern is higher
    let newScore = highCard * multiplier;
    if (name != "invalid") {
      if (currentType == undefined) {
        // add checking and functionality for when the type shouldn't change later
        cardScore = newScore;
        currentType = name;
        currentSuit = highSuit;
      } else if (currentType == name) {
        if (cardScore == newScore && currentSuit > highSuit) {
          console.log("false");
          return false;
        }
        if (cardScore > newScore) {
          cardScore = newScore;
        }
      }
      console.log("true:", cardScore, newScore, currentType, currentSuit);
      return true;
    }
    // console.log(R,S,F)
    // console.log(royals)
    // console.log(name);
    // console.log(currentType);
    // console.log(highCard);
    // console.log(multiplier);
    // console.log(newScore);
    console.log([currentType, cardScore]);
    return false;
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

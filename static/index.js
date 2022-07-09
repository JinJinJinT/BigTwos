("use strict");
import { handTypes } from "./constants.js";

(function () {
  window.addEventListener("load", init);

  let selected = new Set();
  let cardList = {};
  let p1Cards = [];
  let p2Cards = [];
  let boardHand;
  let boardHighSuit = -1; // since lowest suit is 0
  let boardScore = 0;
  let playerCanChoose = true; // need to disable card selection when this is false

  let currentHand;
  let currentScore;
  let currentSuit; // currently selected cards
  // WE CAN JUST, when configuring api:
  // States: Init (getting turn assigned), Turn, Waiting for turn
  // Eventually things like shuffling and dealing will be
  // controlled by status signals from the API

  async function init() {
    // 0-12 is A-K. index % 13 is the card
    let cards = [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      38, 39
    ];
    // let cards = Array.from(Array(39).keys())
    // create Deck
    let deck = Deck(cards);

    //let card = deck.cards[0];
    // deck.mount(container);
    deck.flip();
    // deck.shuffle();
    // deck.cards[0].enableDragging();
    // deck.cards[1].enableDragging();

    // let container = document.createElement("div");
    // deck.cards[1].mount(container);
    // container.classList.add("card-slot");
    // document.querySelector(".interact").appendChild(container);

    // player 1
    for (let i = 0; i < deck.cards.length; i++) {
      //   deck.cards[i].enableDragging();
      //   deck.cards[i + 1].enableDragging();
      p1Cards.push(deck.cards[i]);
      //   p2Cards.push(deck.cards[i + 1]);
    }
    p1Cards.sort(sort); //MAKE SURE TO PUT THIS BACK

    console.log(p1Cards);

    populateHand(p1Cards);

    window.addEventListener("resize", () => updateCardLocation(p1Cards));
    let button = document.getElementById("move");
    button.addEventListener("click", makeMove);
    button.disabled = true;
  }

  async function populateHand(p1Cards) {
    p1Cards.forEach((card, i) => {
      let cards = document.querySelectorAll(".interact .card-slot");
      for (let i = 1; i < cards.length; i++) {
        let bounds = cards[i - 1].getBoundingClientRect();
        p1Cards[i - 1].animateTo({
          delay: 1000 + i * 2, // wait 1 second + i * 2 ms
          duration: 500,
          ease: "quartOut",

          x: bounds.x,
          y: bounds.y
        });
      }
      let container = document.createElement("div");
      container.classList.add("card-slot");
      card.slot = i;
      cardList[i] = container;

      document.querySelector(".interact").appendChild(container);
      let bounds = container.getBoundingClientRect();
      card.mount(container);
      card.animateTo({
        delay: 1000 + i * 2, // wait 1 second + i * 2 ms
        duration: 500,
        ease: "quartOut",

        x: bounds.x,
        y: bounds.y
      });
      container.firstElementChild.addEventListener("click", select);
      //   cards.push(card);
    });
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
    document.getElementById("move").disabled = !allowMove;
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

  function makeMove() {
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

    [...selected].sort(sortDiv).forEach(slot => {
      parent.appendChild(slot);
      // clear and unselect
      select.call(slot.firstElementChild);
      slot.firstElementChild.removeEventListener("click", select);
    });
    updateCardLocation(p1Cards);
  }

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

  /**
   * A helper function that makes a POST request given a FormData object with the appropriate
   * parameters.
   * @param {url} url - the url to make the request to
   * @param {FormData} formData A form data object containing the parameters for the request.
   * @returns {object|string} A JSON object or plaintext containing the response from the endpoint.
   */
  async function makePostRequest(url, formData) {
    const requestOptions = {
      method: "POST",
      body: formData,
      redirect: "follow"
    };

    const response = await makeRequest(url, requestOptions);
    return response;
  }

  /**
   * Makes a request to the bigtwos depending on the passed in endpoint and
   * returns the response.
   * @param {string} url The endpoint to make the request to.
   * @param {object} requestOptions An optional parameter which is an empty object
   * by default (for GET requests). Should contain the parameters and options for
   * any POST requests made.
   * @return {(object|string)} A JSON object or a plaintext string depending on the
   * format of the response.
   */
  async function makeRequest(url, requestOptions = {}) {
    try {
      let response = await fetch(url, requestOptions);
      await statusCheck(response);
      let data = await response.text();
      return isValidJSON(data);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Helper function to return the response's result text if successful, otherwise
   * returns the rejected Promise result with an error status and corresponding text
   * @param {object} res - response to check for success/error
   * @return {object} - valid response if response was successful, otherwise rejected
   *                    Promise result
   */
  async function statusCheck(res) {
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res;
  }

  /**
   * Checks whether the passed in string is a valid JSON string.
   * @param {string} data The string to check.
   * @return {(object|string)} The parsed JSON object if the string is valid JSON,
   * or the original string if not.
   */
  function isValidJSON(data) {
    let json;
    try {
      json = JSON.parse(data);
    } catch (e) {
      return data;
    }
    return json;
  }
})();

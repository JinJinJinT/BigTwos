("use strict");
import { handTypes } from "./constants.js";

(function () {
  window.addEventListener("load", init);

  let selected = new Set();
  let cardList = {};
  let p1Cards = [];
  let p2Cards = [];
  let currentType;
  let cardScore = 0;
  let playerCanChoose = true;

  async function init() {
    // create Deck
    let deck = Deck(false);

    //let card = deck.cards[0];
    // deck.mount(container);
    deck.flip();
    deck.shuffle();
    // deck.cards[0].enableDragging();
    // deck.cards[1].enableDragging();

    // let container = document.createElement("div");
    // deck.cards[1].mount(container);
    // container.classList.add("card-slot");
    // document.querySelector(".interact").appendChild(container);

    // player 1
    for (let i = 0; i < 40; i += 2) {
      //   deck.cards[i].enableDragging();
      //   deck.cards[i + 1].enableDragging();
      p1Cards.push(deck.cards[i]);
      //   p2Cards.push(deck.cards[i + 1]);
    }
    p1Cards.sort(sort);

    console.log(p1Cards);

    populateHand(p1Cards);

    window.addEventListener("resize", () => updateCardLocation(p1Cards));
    let button = document.getElementById("move");
    button.addEventListener("click", makeMove);
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

    console.log(checkValidHand());
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
    if (playerCanChoose) {
      let code;
      let handSize = selected.size;
      let name, multiplier, highCard;

      let [S, F, R] = [true, true, true];
      let findFH = new Set();
      let suits = new Set(["diamonds", "clubs", "hearts", "spades"]);
      let royals = new Set([1, 13, 12, 11]);
      let prevRank;
      for (let item of selected) {
        let child = item.firstElementChild;
        let [card, suit, rank] = child.classList;
        rank = rank.replace("rank", "");
        findFH.add(rank);
        if (highCard === undefined) {
          highCard = rank;
        } else if (
          rank == 2 ||
          (highCard != 2 && rank == 1) ||
          highCard < rank
        ) {
          highCard = rank;
        }

        if (prevRank === undefined) {
          if (rank == 12 || rank == 11) {
            [S, F] = [false, false];
            prevRank = 0;
          } else {
            prevRank = rank;
          }
        } else if (
          prevRank != 0 &&
          rank != prevRank + 1 &&
          prevRank - rank != 12
        ) {
          S = false;
        }
        royals.delete(rank);
        suits.delete(suit);
      }
      if (selected.size < 5) {
        if (findFH.size == 1) {
          [name, multiplier] = handTypes[selected.size];
        }
      } else {
        if (findFH.size == 2) {
          code = 3;
        } else {
          if (prevRank == 3 || prevRank == 4) [S, F] = [false, false];
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
      }

      let newScore = highCard * multiplier;
      if (currentType === undefined && name != "invalid") {
        cardScore = newScore;
        currentType = name;
      } else if (currentType == name && cardScore > newScore) {
        cardScore = newScore;
      }
      return [name, multiplier];
    }
    return null;
  }

  function sort(a, b) {
    let sub = a.rank - b.rank;
    if (a.rank == 2) return 1;
    if (b.rank == 2) return -1;
    if (a.rank == 1) return 1;
    if (b.rank == 1) return -1;
    return sub;
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

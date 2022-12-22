const SUIT_MATCH = {
  0: "Spades",
  1: "Hearts",
  2: "Clubs",
  3: "Diamonds"
};

/**
 * A single card for a game of BigTwos
 * @public
 */
module.exports = class Card {
  /**
   * The suit of the card.
   * @type {string}
   */
  suit;

  /**
   * The rank of the card.
   * @type {number}
   */
  rank;

  /**
   * Constructs an instance of a Card in a game of Big Twos given a cardID.
   * It will convert the cardID to a suit and rank using the following formula:
   * "0-12 is A-K. The first 13 cards are Spades, then Hearts, then Clubs, the Diamonds."
   * Ex: 33 is 8 of Hearts since (33 + 1) % 13 = 8
   * @param {number} cardID The card's numerical value.
   */
  constructor(cardID) {
    // This was taken from the deck.js _card(i) function
    this.suit = SUIT_MATCH[(cardID / 13) | 0];
    this.rank = (cardID % 13) + 1;
    console.log(
      `CARD: created card of suit ${this.suit} and rank ${this.rank}`
    );
  }
};

/**
 * A single card for a game of BigTwos
 * @public
 */
module.exports = class Card {
    /**
     * Constructs an instance of a Card in a game of Big Twos
     * @param {String} value The card's value
     * @param {String} suit The card's suit
     */
    constructor(value, suit) {

        /**
         * The card's value
         * @type {String}
         * @public
         */
        this.value = value;

        /**
         * The card's suit
         * @type {String}
         * @public
         */
        this.suit = suit;
    }
}
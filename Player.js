/**
 * A single player in a game of BigTwos which is also linked to the next player.
 * @public
 */
module.exports = class Player {
    /**
     * Constructs a player given a PlayerID to use in a game of BigTwos
     * @param {number} pid The player ID of the player being constructed.
     * @param {Player} next The next player in the game sequence.
     */
    constructor(pid, next=null) {

        /**
         * The unique player ID of the player.
         * @type {number}
         * @public
         */
        this.pid = pid;

        /**
         * The set of Cards for that players deck.
         * 0-12 is A-K. First 13 cards are Spades, then Hearts, then Clubs, the Diamonds.
         * Ex: 33 is 8 of Hearts since (33 + 1) % 13 = 8
         * @type {Set<number>}
         * @public
         */
        this.cards = new Set();

        /**
         * The next player in the game sequence.
         * @type {Player}
         * @public
         */
        this.next = next;
    }

   /** Add a single card to the cards Set
     * @param {number} card The card to add
     */
    addCard(card) {
        this.cards.add(card);
    }

    /**
     * Will remove all the cards in the passed in list from the Players deck of cards.
     * @param {Array.<number>} cardsToRemove A list of cards to remove from the Players deck
     */
    removeCards(cardsToRemove) {
        cardsToRemove.forEach(card => this.cards.remove(card));
    }

    toString() {
        return `PID: ${this.pid} Cards: ${[...this.cards]}`
    }
}
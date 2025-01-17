function clamp(number, min, max) {
  return Math.max(min, Math.min(number, max));
}

export class Table extends HTMLElement {

  /**
  * Arranges decks in a circular or elliptical layout.
  * @param {Array} decks - The decks to arrange.
  * @param {Object} options - Layout options (x, y, radius, a, b, etc.).
  * @returns {Array} - Positions of the decks.
  */
  static roundLayout(decks, { x = 0,
                              y = 0,
                              radius = 1, // circle
                              a = radius, // ellipse parameter
                              b = a,      // ellipse parameter
                              skipIndex = -1,
                              initialAngle = 0.0,
                              finalAngle = 2 * Math.PI,
                              percent = 1.0 } = {}) {
     const positions = []
     const angleStep = (finalAngle - initialAngle) / decks.length * percent
     decks.forEach((deck, index) => {
       const angle = initialAngle + index * angleStep
       const newX = x + a * Math.cos(angle)
       const newY = y + b * Math.sin(angle)

       if (index === skipIndex) {
         positions.unshift({ deck, x: newX, y: newY, angle })
       } else {
         positions.push({ deck, x: newX, y: newY, angle })
       }
     })
     return positions
  }

  constructor(selector) {
    super();
    // Get the table element by selector
    this.id = selector;
    // Find and bind the DOM element
    const element = document.querySelector(selector);

    if (!element) {
      throw new Error(`No element found with selector "${selector}"`);
    }

    element.replaceWith(this);

    if (window.getComputedStyle(this).position === 'static') {
      this.style.position = 'relative';
    }
    // Array to hold all decks/containers
    this.decks = [];
    this.prevWidth = this.width
    this.prevHeight = this.height

    // TODO Rescale and render all registered decks on resize
    window.addEventListener('resize', () => {
      this.decks.forEach(deck => {
        deck.forEach(card => {
            const s = this.prevWidth / this.width
            card.style.top *= s
            card.style.left *= s
            card.style.scale = s
        })
      })

      this.prevHeight = this.height
      this.prevWidth = this.width
    });

  }

  get width () { return this.getWidth() }
  get height () { return this.getHeight() }
  get center () { return this.getCenter() }
  get bounding () { return this.getBoundingBox() }

  // Getters
  getWidth = () => {
    return this.scrollWidth;
  }

  getHeight = () => {
    return this.scrollHeight;
  }

  getCenter = () => {
    return {
      x: Math.round(this.getWidth() / 2),
      y: Math.round(this.getHeight() / 2),
    };
  }

  getBoundingBox = () => {
    return {
      top: this.getHeight(),
      bottom: 0,
      left: 0,
      right: this.getWidth(),
    };
  }
}

/**
 * Represents a card in a card deck.
 * @class
 * @extends HTMLElement
 */
export class Card extends HTMLElement {
  /**
   * Creates a new card instance.
   * @param {string} suit - The suit of the card (e.g., hearts, spades).
   * @param {string|number} rank - The rank of the card (e.g., 2, 10, K).
   * @param {Object} owner - The parent deck or table managing the card.
   */
  constructor (suit, rank, owner) {
    super()

    this.owner = owner
    this.suit = suit
    this.rank = rank
    this.rankIndex = owner.ranks.indexOf(this.rank)
    this.suitIndex = owner.suitsAndJokers.indexOf(this.suit)
    this.shortName = suit + rank
    this.name = suit.toUpperCase() + rank
    this._faceUp = false

    // Create the card element with initial styling
    this.classList.add('card')

    // Set the card's initial style directly
    Object.assign(this.style, {
      width: `${this.owner.cardWidth}px`,
      height: `${this.owner.cardHeight}px`,
      backgroundImage: `url(${this.owner.cardsUrl})`,
      position: 'absolute',
      top: "0%",
      left: "0%",
      scale: '1.0',
      cursor: 'pointer',
      userSelect: 'none',
      userDrag: 'none'
    })

    // Append the card to the table (parent element)
    this.owner.appendChild(this)

    this.showCard()
    this.setzIndex(1)
  }

  /**
   * Converts the card to its string representation.
   * @returns {string} - The card's name (e.g., "H10" for 10 of hearts).
   */
  toString () {
    return this.name
  }
  /**
   * Moves the card to a specified position with animation.
   * @param {number} x - The X-coordinate to move the card to.
   * @param {number} y - The Y-coordinate to move the card to.
   * @param {Object} [options] - Movement options.
   * @param {number} [options.speed=this.owner.animationSpeed] - The animation speed in milliseconds.
   * @returns {Promise<void>} - Resolves after the movement animation completes.
   */
  moveTo (x, y, { speed = this.owner.animationSpeed } = {}) {
    return new Promise((resolve) => {
      // Apply CSS transition for smooth movement
      this.style.transition = `top ${speed}ms, left ${speed}ms`
      this.style.left = x - (this.owner.cardWidth  / 2)
      this.style.top  = y - (this.owner.cardHeight / 2)
      // Callback after animation
      setTimeout(() => {
          this.style.transition = ''
          resolve()
      }, speed)
    })
  }
  /**
   * Rotates the card to a specified angle with animation.
   * @param {number} angle - The angle in degrees to rotate the card.
   * @param {Object} [origin] - Rotation origin.
   * @param {Object} [origin.x='center'] - Rotation x origin.
   * @param {Object} [origin.y='center'] - Rotation y origin.
   * @param {Object} [options] - Rotation options.
   * @param {number} [options.speed=this.owner.animationSpeed] - The animation speed in milliseconds.
   * @returns {Promise<void>} - Resolves after the rotation animation completes.
   */
  rotate (angle, origin = { x: 'center', y: 'center' }, { speed = this.owner.animationSpeed } = {}) {
    return new Promise((resolve) => {
      this.style.transition = `transform ${speed}ms`
      this.style["transform-origin"] = `${origin.x} ${origin.y}`
      this.style.transform = `rotate(${angle}deg)`
      // Callback after animation
      setTimeout(() => {
          this.style.transition = ''
          resolve()
      }, speed)
    })
  }
  /**
   * Displays the card face-up, showing its suit and rank.
   * @returns {Card} - The current card instance for method chaining.
   */
  showCard () {
    const offset = this.owner.offsets[this.suitIndex]
    const xpos = - (this.rankIndex + 1) * this.owner.cardWidth
    const ypos = - offset * this.owner.cardHeight
    this.style.backgroundPosition = `${xpos}px ${ypos}px`
    this._faceUp = true
    return this
  }
  /**
   * Hides the card, showing its back instead of its face.
   * @returns {Card} - The current card instance for method chaining.
   */
  hideCard () {
    const y = this.owner.cardback === 'red'
          ? +0 * this.owner.cardHeight
          : -1 * this.owner.cardHeight
    this.style.backgroundPosition = `0px ${y}px`
    this._faceUp = false
    return this
  }
  /**
   * Sets the z-index of the card, controlling its stack order.
   * @param {number} zIndex - The z-index to set.
   * @returns {Card} - The current card instance for method chaining.
   */
  setzIndex(zIndex) {
    this.style.zIndex = zIndex
    return this
  }

  get faceUp() {
    return this._faceUp;
  }

  set faceUp(option) {
    this._faceUp = !!option;
    (this._faceUp)
       ? this.showCard()
       : this.hideCard()
  }
}
/**
 * Represents a deck of cards.
 * @class
 * @extends Array
 */
export class Deck extends Array {
  /**
   * Overrides the species to allow Array methods to return Deck instances.
   * @type {ArrayConstructor}
   */
  static get [Symbol.species]() {
      return Array;
  }
  /**
   * Creates a new deck instance.
   * @param {Object} owner - The owner or parent of the deck (e.g., game or table).
   * @param {Object} [options] - Options for deck initialization.
   * @param {Object} [options.center] - Center position of the deck.
   * @param {number} [options.x=center.x] - X-coordinate of the deck.
   * @param {number} [options.y=center.y] - Y-coordinate of the deck.
   * @param {boolean} [options.faceUp=false] - Whether the deck is face-up.
   * @param {string} [options.type='pile'] - Type of the deck (e.g., hand, column, pile).
   * @param {string} [options.seenFrom='south'] - Perspective from which the deck is viewed.
   * @param {string} [options.label=''] - Label for the deck.
   * @param {string} [options.sticky='bottom'] - Sticky position of the deck label.
   */
  constructor (owner, {
      center = owner.getCenter(),
      x = center.x,
      y = center.y,
      faceUp = false,
      type = 'pile',
      seenFrom = 'south',
      label = '',
      sticky = undefined,
      ...options
  } = {}) {
    super()
    this.owner = owner
    this.x = x
    this.y = y
    this.type = type
    this._faceUp = faceUp
    this.seenFrom = seenFrom
    this.zIndexCounter = 1
    this.events = {}

    this.changePerspective(seenFrom)

    const stickyness = (sticky === undefined) ? undefined : _ => sticky
    this.label = new DeckLabel(this, { text: label, stickyness, ...options } )

    this.owner.decks.push(this);
  }

  // Convenience methods for common events
  click(func, context) {
    this.on('click', func, context);
  }

  mousedown(func, context) {
    this.on('mousedown', func, context);
  }

  mouseup(func, context) {
    this.on('mouseup', func, context);
  }
  /**
   * Attaches an event handler to the deck.
   * @param {string} eventName - The name of the event (e.g., 'click', 'mousedown', 'mouseup').
   * @param {Function} func - The function to call on the event.
   * @param {Object} [context] - The context to bind the function to.
   */
  on(eventName, func, context) {
    this.events[eventName] = context ? func.bind(context) : func;
  }
  /**
   * Dispatches an event.
   * @param {string} eventName - The name of the event to dispatch.
   * @param {...any} args - Arguments to pass to the event handler.
   */
  trigger(eventName, ...args) {
    if (typeof this.events[eventName] === 'function') {
      this.events[eventName](...args);
    }
  }
  /**
   * Changes the perspective of the deck.
   * @param {string} newPerspective - The new perspective (e.g., 'northEast').
   */
  changePerspective(newPerspective) {
    this.seenFrom = newPerspective
    this.directions = CardsJS.perspective?.[newPerspective]
    this.padding = CardsJS.padding?.[this.type](this.directions)
  }
  /**
   * Sorts the cards in the deck.
   * @param {Object} [options] - Sorting options.
   * @param {Function|string} [options.compare=CardsJS.compareByRank] - Comparison function or sorting type ('suit', 'rank', etc.).
   * @param {boolean} [options.descending=false] - Whether to sort in descending order.
   * @returns {Deck} - The sorted deck.
   */
  sort(compare = CardsJS.compareByRank, { descending = false } = {} ) {

    // Factory function for ascending or descending comparison
    const order = (compareFn) =>
      descending
        ? (a, b) => compareFn(b, a) // Reverse order for descending
        : (a, b) => compareFn(a, b); // Default order

    let comparator

    // Choose the appropriate comparator
    switch (compare) {
      case 'suit':
        comparator = order(CardsJS.compareBySuit)
        break
      case 'rank':
        comparator = order(CardsJS.compareByRank)
        break
      case 'suit-then-rank':
        comparator = order(CardsJS.compareBySuitThenRank)
        break
      case 'rank-then-suit':
        comparator = order(CardsJS.compareByRankThenSuit)
        break
      default:
        if (typeof compare !== 'function') throw new Error(`Invalid option ${compare}`)
        comparator = order(compare)
    }
    super.sort(comparator);
    this.render()
    return this
  }
  /**
   * Adds a single card to the deck.
   * @param {Card} card - The card to add.
   * @returns {Deck} - The deck instance for method chaining.
   */
  addCard (card, options) {
    return this.addCards([card], options)
  }
  /**
   * Adds multiple cards to the deck.
   * @param {Card[]} cards - Array of cards to add.
   * @returns {Deck} - The deck instance for method chaining.
   */
  addCards (cards, options) {
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]
      if (card.container) {
        card.container.removeCard(card)
      }
      this.push(card)
      card.container = this
    }
    this.render(options)
    return this
  }
  /**
   * Removes a card from the deck.
   * @param {Card} card - The card to remove.
   * @returns {boolean} - True if the card was removed, false otherwise.
   */
  removeCard (card) {
    for (let i = 0; i < this.length; i++) {
      if (this[i] === card) {
        this.splice(i, 1)
        return true
      }
    }
    return false
  }
  /**
   * Gets the top card of the deck.
   * @returns {Card} - The top card of the deck.
   */
  topCard () {
    return this[this.length - 1]
  }
  /**
   * Converts the deck to its string representation.
   * @returns {string} - A string representing the deck.
   */
  toString () {
    return `[Deck ${this.map(({shortName}) => shortName).join(" ")}]`
  }
  /**
   * Renders the deck visually, positioning cards and updating styles.
   * @param {Object} [options] - Rendering options.
   * @param {number} [options.speed] - Animation speed in milliseconds.
   * @param {boolean} [options.force=false] - Whether to force a render.
   * @param {boolean} [options.immediate=false] - Whether to render immediately.
   * @returns {Promise<void>} - Resolves after rendering is complete.
   */
  render ({ speed, zindex = true, force = false, immediate = force } = {}) {
    return new Promise((resolve) => {
      // Render cards
      this.zIndexCounter = this.length
      for (let i = 0; i < this.length; i++) {
        const card = this[i]
        if (zindex) card.setzIndex(i+1)
        card.target = this.cardPosition(i)
        const top = parseInt(card.style.top)
        const left = parseInt(card.style.left)
        if (top !== card.target.top || left !== card.target.left || force ) {
          if (!immediate) {
            card.style.transition = `top ${speed}ms, left ${speed}ms`
          }
          card.style.top = `${card.target.top/this.owner.height*100}%`
          card.style.left = `${card.target.left/this.owner.width*100}%`
        }
      }

      // Handle face-up/face-down flipping
      const me = this
      const flip = () => {
        for (let i = 0; i < me.length; i++) {
          const card = me[i]
          if (me._faceUp) {
            card.showCard()
          } else {
            card.hideCard()
          }
        }

      }
      if (immediate) {
        flip()
      } else {
        setTimeout(flip, speed / 2)
      }

      // Update the label
      this.label.render({ speed })

      if (force) {
        resolve()
        return
      }

      // Callback after animation
      setTimeout(resolve, speed)
    })
  }

  get faceUp() {
    return this._faceUp;
  }

  set faceUp(option) {
    this._faceUp = !!option;
    this.render();
  }

  /**
   * Calculates the position of a card in the deck.
   * @param {number} cardIndex - The index of the card in the deck.
   * @returns {Object} - The position of the card with top, left, bottom, right, centerX, and centerY.
   */
  cardPosition (cardIndex) {
    const { cardWidth,  cardHeight } = this.owner
    const { horizontal, vertical   } = this.padding
    const middle = this.length / 2

    let left   = this.x - cardWidth  / 2
    let right  = this.x + cardWidth  / 2
    let top    = this.y - cardHeight / 2
    let bottom = this.y + cardHeight / 2

    switch(this.type) {
      case 'hand':
        left    += (cardIndex - middle) * horizontal
        right   += (cardIndex - middle) * horizontal
        break
      case 'column':
        top    += cardIndex * vertical
        bottom += cardIndex * vertical
        break
      case 'pile':
        top    += cardIndex * vertical
        bottom += cardIndex * vertical
        left   += cardIndex * horizontal
        right  += cardIndex * horizontal
        break
    }

    let centerX = left + cardWidth / 2
    let centerY = top + cardHeight / 2
    return { top, left, bottom, right, centerX, centerY }
  }
  /**
   * Deals a specified number of cards to multiple hands.
   * @param {number} count - Number of cards to deal to each hand.
   * @param {Deck[]} hands - Array of hands to deal cards to.
   * @param {number} speed - Animation speed in milliseconds.
   * @returns {Promise<void>} - Resolves after all cards are dealt.
   */
  deal(count, hands, speed) {
    return new Promise((resolve) => {
      const totalCount = count * hands.length;
      let i = 0;

      const dealOne = () => {
        if (this.length === 0 || i === totalCount) {
          // Resolve the promise when all cards are dealt and the origin is rendered
          this.render({ speed }).then(resolve)
          return;
        }

        // Deal the top card to the next hand
        const hand = hands[i % hands.length];
        const card = this.topCard()
        hand.addCard(card);

        const getHighest = (a,b) => a.zIndexCounter > b.zIndexCounter ? a : b;
        const highest = getHighest(this,hand)

        card.setzIndex(++highest.zIndexCounter)

        // Render the hand and recursively deal the next card
        hand.render({ speed, zindex: false }).then(() => {
            card.setzIndex(++hand.zIndexCounter)
            dealOne()
        })

        i++;
      };

      // Start the dealing process
      dealOne();
    });
  }
  /**
   * Shuffles the deck.
   * @param {Object} [options] - Options for rendering after shuffling.
   * @returns {Deck} - The deck instance for method chaining.
   */
  shuffle (options) {
    CardsJS.shuffle(this)
    this.render(options)
    return this
  }
}
/**
 * Represents a label for a deck of cards.
 * @class
 * @extends HTMLDivElement
 */
class DeckLabel extends HTMLDivElement {

  static placementSuggestion = (thing, area) => {
      if (thing.x >= area.right)  return 'left'
      if (thing.x <= area.left)   return 'right'
      if (thing.y >= area.bottom) return 'top'
      if (thing.y <= area.top)    return 'bottom'
      return // do nothing
  }
  /**
   * Creates a new DeckLabel instance.
   * @param {Object} owner - The deck this label belongs to.
   * @param {Object} [options] - Options for initializing the label.
   * @param {string} [options.text=''] - The text content of the label.
   * @param {string} [options.sticky='bottom'] - The alignment of the label relative to the deck ('top', 'bottom', 'left', 'right').
   * @param {boolean} [options.visible=true] - Whether the label is initially visible.
   */
  constructor(owner, {
      text = '',
      stickyness = () => ( DeckLabel.placementSuggestion(this, owner.owner.playableArea) ),
      visibility = () => ( this.owner.length > 0 && this.innerText !== '')
  } = {}) {
    super()
    this.owner = owner
    this.innerText = text
    this.stickyness = stickyness
    this.visibility = visibility
    this.classList.add('label');
    this.x = owner.x
    this.y = owner.y

    // Set initial style
    Object.assign(this.style, {
      position: 'absolute',
      userSelect: 'none',
      userDrag: 'none',
      fontSize: '14px',
      textAlign: 'center',
      color: 'white',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: '4px',
      borderRadius: '4px',
      "text-wrap": 'nowrap',
      zIndex: 99999,
    });

    if (!this.visible || text === '') this.style.display = 'none'
    this.owner.owner.appendChild(this);
  }

  get sticky() {
    return this.stickyness()
  }

  set sticky(what) {
    this.stickyness = (what === 'function') ? what : () => what
  }

  get visible() {
    return this.visibility()
  }

  set visible(what) {
    this.visibility = (what === 'function') ? what : () => what
    this.render()
  }

  get text() {
    return this.innerText
  }

  set text(newText) {
    if (newText === this.innerText) return
    this.innerText = newText
    this.render()
  }

  /**
    * Updates the label's position, text, and visibility.
    * @param {Object} [options] - Options for updating the label.
    * @param {string|null} [options.text=null] - The new text for the label (if any).
    * @param {string|null} [options.sticky=null] - The new alignment for the label ('top', 'bottom', 'left', 'right').
    * @param {boolean} [options.visible=true] - Whether the label should be visible.
    * @param {number} [options.speed=this.owner.animationSpeed] - The animation speed for the label's position transition.
    * @param {number} [options.posX=this.x] - The X-coordinate for the label's position.
    * @param {number} [options.posY=this.y] - The Y-coordinate for the label's position.
    * @param {number} [options.paddingX=10] - Horizontal padding around the label.
    * @param {number} [options.paddingY=10] - Vertical padding around the label.
    */
  render({
    speed = this.owner.animationSpeed,
    posX = this.x,
    posY = this.y,
    paddingX = 10,
    paddingY = 10
  } = {}) {

    this.style.display = (!this.visible) ? 'none' : 'block'
    if (!this.visible) return

    // Get label dimensions
    const labelWidth = this.offsetWidth;
    const labelHeight = this.offsetHeight;
    const cards = this.owner.length

    // Get card positions
    const firstCard = this.owner.cardPosition(0);
    const midCard = this.owner.cardPosition(Math.floor(cards / 2));
    const lastCard = this.owner.cardPosition(cards - 1);

    // Update position based on this.sticky alignment
    switch (this.sticky) {
      case 'top':
        posY = (this.owner.directions.Y > 0) ? firstCard.top : lastCard.top;
        posY -= labelHeight + paddingY;
        posX = midCard.centerX - labelWidth / 2;
        break;

      case 'bottom':
        posY = (this.owner.directions.Y > 0) ? lastCard.bottom : firstCard.bottom;
        posY += paddingY;
        posX = midCard.centerX - labelWidth / 2;
        break;

      case 'left':
        posX = (this.owner.directions.X > 0) ? firstCard.left : lastCard.left;
        posX -= labelWidth + paddingX;
        posY = midCard.centerY - labelHeight / 2;
        break;

      case 'right':
        posX = (this.owner.directions.X > 0) ? lastCard.right : firstCard.right;
        posX += paddingX;
        posY = midCard.centerY - labelHeight / 2;
        break;

      case 'center':
        // Center label on the deck as a fallback
        posX -= labelWidth / 2
        posY -= labelHeight / 2;
        break
      default:
        // do nothing
    }

    // Position the label
    this.x = posX;
    this.y = posY;

    // Apply the calculated label position with a smooth transition
    Object.assign(this.style, {
      transitionProperty: 'top, left',
      transitionDuration: `${speed}ms, ${speed}ms`,
      left: `${this.x/this.owner.owner.width*100}%`,
      top: `${this.y/this.owner.owner.height*100}%`,
    });
  }
}
/**
 * CardsJS is a class that handles various card game types and their operations.
 * It supports different game configurations like 'standard', 'euchre', 'pinochle', etc.
 * It also provides utilities for shuffling cards, comparing ranks and suits, and generating ranks and suits.
 * @class
 */
export class CardsJS extends Table {
  static STANDARD = 'standard'
  static EUCHRE   = 'euchre'
  static PINOCHLE = 'pinochle'
  static NUMBERS  = 'numbers'
  static FIGURES  = 'figures'
  /**
   * Fisher-Yates shuffle to randomize the order of cards in a deck.
   * @param {Array} deck - The deck of cards to shuffle.
   * @returns {Array} The shuffled deck.
   */
  static shuffle (deck) {
    // Fisher yates shuffle
    let i = deck.length
    if (i === 0) return
    while (--i) {
      const j = Math.floor(Math.random() * (i + 1))
      const tempi = deck[i]
      const tempj = deck[j]
      deck[i] = tempj
      deck[j] = tempi
    }
    return deck
  }
  /**
   * Comparator function to compare cards by their rank.
   * @param {Card} cardA - The first card.
   * @param {Card} cardB - The second card.
   * @returns {number} The result of the comparison.
   */
  static compareByRank(cardA, cardB) {
    return cardA.rankIndex - cardB.rankIndex;
  }
 /**
   * Comparator function to compare cards by their suit.
   * @param {Card} cardA - The first card.
   * @param {Card} cardB - The second card.
   * @returns {number} The result of the comparison.
   */
  static compareBySuit(cardA, cardB) {
    return cardA.suitIndex - cardB.suitIndex
  }

  /**
   * Comparator function to compare cards first by suit, then by rank.
   * @param {Card} cardA - The first card.
   * @param {Card} cardB - The second card.
   * @returns {number} The result of the comparison.
   */
  static compareBySuitThenRank(cardA, cardB) {
    if (cardA.suit !== cardB.suit) {
       return CardsJS.compareBySuit(cardA, cardB)
    }
    return CardsJS.compareByRank(cardA, cardB)
  }
  /**
   * Comparator function to compare cards first by rank, then by suit.
   * @param {Card} cardA - The first card.
   * @param {Card} cardB - The second card.
   * @returns {number} The result of the comparison.
   */
  static compareByRankThenSuit(cardA, cardB) {
    if (cardA.rank !== cardB.rank) {
       return CardsJS.compareByRank(cardA, cardB)
    }
    return CardsJS.compareBySuit(cardA, cardB)
  }
  /**
   * Adjust the order of the ranks to treat aces as high.
   * @param {Array} defaultOrder - The default rank order.
   * @returns {Array} The new rank order with aces treated as high.
   */
  static acesHigh(defaultOrder) {
    // [1, 2, 3, ..., 13] -> [14, 2, 3, ..., 13]
    defaultOrder.shift()
    const max = Math.max(...defaultOrder)
    defaultOrder.unshift(max + 1)
    return defaultOrder
  }
  /**
   * Generate an array of ranks from 1 to the specified number.
   * @param {number} [ranks=13] - The number of ranks to generate.
   * @returns {Array} The array of ranks.
   */
  static generateRanks(ranks = 13) {
     // The default ranks: [1, 2, 3, ..., # ranks]
     return [...Array(ranks+1).keys()].slice(1)
  }
  /**
   * Generate an array of suit indexes.
   * @param {number} [suits=4] - The number of suits to generate.
   * @returns {Array} The array of suit indexes.
   */
  static generateSuits(suits = 4) {
     // The default ranks: [1, 2, 3, ..., # ranks]
     return [...Array(suits).keys()]
  }
  /**
   * A mapping of different perspectives for viewing a deck.
   * @type {Object}
   */
  static perspective = {
    southEast: { X: -1, Y: -1 },
    southWest: { X: +1, Y: -1 },
    northEast: { X: -1, Y: +1 },
    northWest: { X: +1, Y: +1 },
    south:     { X: +0, Y: -1 },
    north:     { X: +0, Y: +1 },
    east:      { X: -1, Y:  0 },
    west:      { X: +1, Y:  0 },
    bottom:    { X: +0, Y: -1 }, // alias for south
    top:       { X: +0, Y: +1 }, // alias for north
    left:      { X: -1, Y:  0 }, // alias for east
    right:     { X: +1, Y:  0 }, // alias for right
    above:     { X:  0, Y:  0 }
  }
  /**
   * Padding configuration for different types of decks.
   * @type {Object}
   */
  static padding = {
    pile:   ({ X, Y }) => ({ horizontal: +1 * X, vertical:   +1 * Y }),
    column: ({ X, Y }) => ({ vertical: 24.5 * ( Y || -X ), horizontal: 0 }),
    hand:   ({ X, Y }) => ({ horizontal: 18 * ( X || -Y ), vertical:   0 }),
  }
  /**
   * Initializes a new CardsJS instance with the provided options.
   * @param {Object} [proxy={}] - Optional proxy object to override default settings.
   * @param {Object} [options={}] - Custom options for the CardsJS instance.
   */
  constructor (proxy = {}, options = {
      cardWidth: 69,
      cardHeight: 94,
      animationSpeed: 500,
      suits: ['♣', '♦', '♥', '♠'],
      ranks: ['A', 2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K'],
      jokers: ['RJ', 'BJ'],
      suitsOrder: suits => suits,
      ranksOrder: ranks => ranks,
      filter: () => true,
      copies: 1,
      cardback: 'red',
      cardsUrl: 'svg/cards.svg',
      table: 'cards-js',
      ...(proxy || {})
    }) {

    super(options.table)
    Object.assign(this, options)

    this.suitsAndJokers = [...this.suits, ...this.jokers]
    this.offsets = [ ...this.suits.map((_,i) => i), 2, 3 ]

    switch (this.type) {
      case CardsJS.STANDARD:
        break
      case CardsJS.EUCHRE:
        this.ranksOrder = CardsJS.acesHigh
        this.filter = (rank,index) => index >= 9 - 1 && ndex <= 9 + 5 - 1
      case CardsJS.PINOCHLE:
        this.copies = 2
        break
      case CardsJS.NUMBERS:
        this.filter = (rank,index) => index >= 1 - 1 && index <= 10 - 1
        break
      case CardsJS.FIGURES:
        this.filter = (rank,index) => index >= 10 - 1 && index <= 13 - 1
        this.blackJoker = true
        this.redJoker = true
        break
    }

    // filter unused cards, if specified
    this.ranks = this.ranks.filter(this.filter)
    // ranks the ranks order, if specified
    this.ranks = this.ranksOrder(this.ranks)
    // ranks the suits order
    this.suits = this.suitsOrder(this.suits)

    this.length = this.copies * this.ranks.length * this.suits.length

    this.all = [] // All the cards created.

    for (let _ = 0; _ < this.copies; ++_) {
      this.ranks.forEach((rank,index) => {
        this.suits.forEach(suit => {
          this.all.push(new Card(suit, rank, this))
        })
      })
    }

    if (this.blackJoker) this.all.push(new Card('BJ', 0, this))
    if (this.redJoker)   this.all.push(new Card('RJ', 0, this))

    // Add event listeners to all card elements
    this.all.forEach(card => {
      const addEvent = (name) => {
        card.addEventListener(name, (ev) => {
          const targetCard = ev.target;
          if (targetCard && targetCard.container) {
            targetCard.container.trigger(name, targetCard, ev)
          }
        })
      }
      // Add listeners for specified events
      ['click',
       'mouseover',
       'mousemove',
       'mousedown',
       'mouseup',
       'mouseenter',
       'mouseleave',
       'mouseout'
      ].forEach(addEvent)
    })

    this.Deck = (options = {}) => new Deck(this, options)
    this.Card = (options = {}) => new Card(...options, this)
  }
  /**
   * Gets the playable area for the deck.
   * @returns {Object} The coordinates of the playable area.
   */
  get playableArea () {
    return {
      top: this.cardHeight / 2,
      bottom: this.getHeight() - this.cardHeight / 2,
      left: this.cardWidth / 2,
      right: this.getWidth() - this.cardWidth / 2,
    };
  }
}



customElements.define('cards-js-deck-label', DeckLabel, { extends: 'div' });
customElements.define('cards-js-card', Card);
customElements.define('cards-js-table', Table);
customElements.define('cards-js', CardsJS);

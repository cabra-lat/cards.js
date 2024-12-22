export class CardsJS {
  static STANDARD = 'standard'
  static EUCHRE   = 'euchre'
  static PINOCHLE = 'pinochle'
  static NUMBERS  = 'numbers'
  static FIGURES  = 'figures'
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
  }
  static compareByRank(cardA, cardB) {
    return cardA.rank - cardB.rank;
  }

  static compareBySuit(cardA, cardB) {
    return cardA.suitIndex - cardB.suitIndex
  }

  // Static comparator for descending rank
  static compareBySuitThenRank(cardA, cardB) {
    if (cardA.suit !== cardB.suit) {
       return CardsJS.compareBySuit(cardA, cardB)
    }
    return CardsJS.compareByRank(cardA, cardB)
  }

  // Static comparator for descending rank
  static compareByRankThenSuit(cardA, cardB) {
    if (cardA.rank !== cardB.rank) {
       return CardsJS.compareByRank(cardA, cardB)
    }
    return CardsJS.compareBySuit(cardA, cardB)
  }

  static roundLayout(decks, x, y, { radius = 1, // circle
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

   static acesHigh(defaultOrder) {
     // [1, 2, 3, ..., 13] -> [14, 2, 3, ..., 13]
     defaultOrder.shift()
     const max = Math.max(...defaultOrder)
     defaultOrder.unshift(max + 1)
     return defaultOrder
   }

   static generateRanks(ranks = 13) {
      // The default ranks: [1, 2, 3, ..., # ranks]
      return [...Array(ranks+1).keys()].slice(1)
   }

   static generateSuits(suits = 4) {
      // The default ranks: [1, 2, 3, ..., # ranks]
      return [...Array(suits).keys()]
   }

   static perspective = {
     southEast: { X: -1, Y: -1 },
     southWest: { X: +1, Y: -1 },
     northEast: { X: -1, Y: +1 },
     northWest: { X: +1, Y: +1 },
     south:     { X: +0, Y: -1 },
     north:     { X: +0, Y: +1 },
     east:      { X: -1, Y:  0 },
     west:      { X: +1, Y:  0 },
     above:     { X:  0, Y:  0 }
   }

   static padding = {
     column: ({ X, Y }) => ({ horizontal:  0 * X, vertical: 24.5 * Y }),
     pile:   ({ X, Y }) => ({ horizontal: +1 * X, vertical:   +1 * Y }),
     hand:   ({ X, Y }) => ({ horizontal: 18 * X, vertical:    0 * Y }),
   }

   constructor ( options = {} ) {
    // The global options
    const defaults = {
      cardWidth: 69,
      cardHeight: 94,
      animationSpeed: 500,
      suits: ['s', 'd', 'c', 'h'],
      ranks: CardsJS.generateRanks(13),
      jokers: ['rj', 'bj'],
      suitsOrder: suits => suits,
      ranksOrder: ranks => ranks,
      filter: () => true,
      copies: 1,
      cardback: 'red',
      cardsUrl: 'img/cards.png',
    }

    Object.assign(defaults, options)
    Object.assign(this, defaults)

    this.suitsAndJokers = [...this.suits, ...this.jokers]
    this.offsets = [ ...this.suits.map((_,i) => i), 2, 3 ]

    switch (this.type) {
      case CardsJS.STANDARD:
        break
      case CardsJS.EUCHRE:
        this.ranksOrder = CardsJS.acesHigh
        this.filter = rank => rank >= 9 && rank <= 9 + 5
      case CardsJS.PINOCHLE:
        this.copies = 2
        break
      case CardsJS.NUMBERS:
        this.filter = rank => rank >= 1 && rank <= 10
        break
      case CardsJS.FIGURES:
        this.filter = rank => rank >= 10 && rank <= 13
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

    this.table = document.querySelector(this.table); // Get the table element

    // Check if the table's position is 'static' and change it to 'relative' if necessary
    if (window.getComputedStyle(this.table).position === 'static') {
      this.table.style.position = 'relative'
    }

    this.table.width  = this.table.offsetWidth
    this.table.height = this.table.offsetHeight
    this.center = {
      x: Math.round(this.table.width  / 2),
      y: Math.round(this.table.height / 2)
    }
    this.table.bottom = 0
    this.table.top    = this.table.height
    this.table.left   = 0
    this.table.right  = this.table.width

    this.all = [] // All the cards created.

    for (let _ = 0; _ < this.copies; ++_) {
      this.ranks.forEach((rank,index) => {
        this.suits.forEach(suit => {
          this.all.push(new Card(suit, rank, this))
        })
      })
    }

    if (this.blackJoker) this.all.push(new Card('bj', 0, this))
    if (this.redJoker)   this.all.push(new Card('rj', 0, this))

    // Add event listeners to all card elements
    document.querySelectorAll('.card').forEach(cardElement => {
    // Attach the mouseEvent function to each card element's click event
      cardElement.addEventListener('click', (ev) => {
        const card = ev.target.card;
        if (card && card.container) {
          const handler = card.container._click;
          if (handler && typeof handler.func === 'function') {
            handler.func.call(handler.context || window, card, ev);
          }
        }
      })
    })
    return {
      all: this.all,
      Deck: (options = {}) => new Deck(this, options),
      ...this
    }
  }
}

export class Card {
  constructor (suit, rank, owner) {
    this.owner = owner
    this.shortName = suit + rank
    this.suit = suit
    this.rank = rank
    this.rankIndex = owner.ranks.indexOf(this.rank)
    this.suitIndex = owner.suitsAndJokers.indexOf(this.suit)
    this.name = suit.toUpperCase() + rank
    this.faceUp = false

    // Create the card element with initial styling
    this.element = document.createElement('div')
    this.element.classList.add('card')

    // Set the card's initial style directly
    Object.assign(this.element.style, {
      width: `${this.owner.cardWidth}px`,
      height: `${this.owner.cardHeight}px`,
      backgroundImage: `url(${this.owner.cardsUrl})`,
      position: 'absolute',
      cursor: 'pointer',
      userSelect: 'none',
      userDrag: 'none'
    })

    this.element.card = this
    // Append the card to the table (parent element)
    this.owner.table.appendChild(this.element)

    this.showCard()
    this.setzIndex(1)
  }

  toString () {
    return this.name
  }

  moveTo (x, y, { speed = this.owner.animationSpeed, callback = () => {} } = {}) {
    // Apply CSS transition for smooth movement
    this.element.style.transition = `top ${speed}ms, left ${speed}ms`
    this.element.style.left = x - (this.owner.cardWidth  / 2)
    this.element.style.top  = y - (this.owner.cardHeight / 2)
    setTimeout(() => { calllback(); this.element.style.transition = '' }, speed)
    return this
  }

  rotate (angle, { speed = this.owner.animationSpeed, callback = () => {} } = {}) {
    this.element.style.transition = `transform ${speed}ms`
    this.element.style.transform = `rotate(${angle}deg)`
    setTimeout(() => { callback(); this.element.style.transition = '' }, speed)
    return this
  }

  showCard () {
    const offset = this.owner.offsets[this.suitIndex]
    const xpos = - (this.rankIndex + 1) * this.owner.cardWidth
    const ypos = - offset * this.owner.cardHeight
    this.element.style.backgroundPosition = `${xpos}px ${ypos}px`
    return this
  }

  hideCard () {
    const y = this.owner.cardback === 'red' 
          ? +0 * this.owner.cardHeight 
          : -1 * this.owner.cardHeight
    this.element.style.backgroundPosition = `0px ${y}px`
    return this
  }

  setzIndex(zIndex) {
    this.element.style.zIndex = zIndex
    return this
  }
}

class Container extends Array {
  static get [Symbol.species]() {
      return Array;
  }
  constructor (owner, {
      x = owner.center.x,
      y = owner.center.y,
      faceUp = false,
      type = 'pile',
      seenFrom = 'south',
      label = '',
      sticky = 'bottom'
  } = {}) {
    super()
    this.owner = owner
    this.x = x
    this.y = y
    this.type = type
    this.faceUp = faceUp
    this.seenFrom = seenFrom
    this.zIndexCounter = 1

    this.directions = CardsJS.perspective?.[this.seenFrom]
    this.padding = CardsJS.padding?.[this.type](this.directions)
    switch(typeof label) {
      case 'string':
        this.setLabel(label, { sticky } )
        break
      case 'object':
        this.label = label
        break
    }
  }

  // Sort the cards in the deck
  sort({ compare = CardsJS.compareBySuit, descending = false } = {}) {
    // Factory function for ascending or descending comparison
    const comparator = (compareFn) =>
      descending
        ? (a, b) => compareFn(b, a) // Reverse order for descending
        : (a, b) => compareFn(a, b); // Default order

    // Choose the appropriate comparator
    switch (compare) {
      case 'suit':
        return super.sort(comparator(CardsJS.compareBySuit));
      case 'rank':
        return super.sort(comparator(CardsJS.compareByRank));
      case 'suit-then-rank':
        return super.sort(comparator(CardsJS.compareBySuitThenRank));
      case 'rank-then-suit':
        return super.sort(comparator(CardsJS.compareByRankThenSuit));
      default:
        return super.sort(comparator(compare));
    }
  }

  addCard (card) {
    this.addCards([card])
    return this;
  }

  addCards (cards) {
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]
      if (card.container) {
        card.container.removeCard(card)
      }
      this.push(card)
      card.container = this
    }
    return this
  }

  removeCard (card) {
    for (let i = 0; i < this.length; i++) {
      if (this[i] === card) {
        this.splice(i, 1)
        return true
      }
    }
    return false
  }

  // Update label text
  setLabel (text = '', { sticky = 'bottom', visible = true } = {}) {
    this.label = this.label || {}
    this.label.text = text || this.label.text
    this.label.sticky = sticky 
    this.label.visible = visible
    this.updateLabel()
    return this
  }

  topCard () {
    return this[this.length - 1]
  }

  toString () {
    return `[Container ${this.map(({shortName}) => shortName).join(" ")}]`
  }

  click (func, context) {
    this._click = {
      func: func,
      context: context
    }
  }

  mousedown (func, context) {
    this._mousedown = {
      func: func,
      context: context
    }
  }

  mouseup (func, context) {
    this._mouseup = {
      func: func,
      context: context
    }
  }

  render ({ speed, immediate = false, callback = () => {} } = {}) {
    this.calcPosition()
    // Render cards
    for (let i = 0; i < this.length; i++) {
      const card = this[i]
      this.zIndexCounter++
      card.setzIndex(this.zIndexCounter)
      const top = parseInt(card.element.style.top)
      const left = parseInt(card.element.style.left)
      if (top !== card.targetTop || left !== card.targetLeft) {
        if (!immediate) {
          card.element.style.transition = `top ${speed}ms, left ${speed}ms`
        }
        card.element.style.top = `${card.targetTop}px`
        card.element.style.left = `${card.targetLeft}px`
      }
    }

    // Handle face-up/face-down flipping
    const me = this
    const flip = () => {
      for (let i = 0; i < me.length; i++) {
        if (me.faceUp) {
          me[i].showCard()
        } else {
          me[i].hideCard()
        }
      }
    }
    if (immediate) {
      flip()
    } else {
      setTimeout(flip, speed / 2)
    }

    // Update the label
    this.updateLabel({ speed })

    // Callback after animation
    if (callback) {
      setTimeout(callback, speed)
    }
  }

  cardPosition (cardIndex) {
    const { width,      height     } = this.owner.center
    const { cardWidth,  cardHeight } = this.owner
    const { horizontal, vertical   } = this.padding
    const middle = this.length / 2

    let left   = this.x - cardWidth  / 2
    let right  = this.x + cardWidth  / 2
    let top    = this.y - cardHeight / 2
    let bottom = this.y + cardHeight / 2

    switch(this.type) {
      case 'hand':
        left    += - (cardIndex - middle) * horizontal
        right   += + (cardIndex - middle) * horizontal
        break
      case 'column':
        top    += + cardIndex * vertical
        bottom += - cardIndex * vertical 
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

  // Add a method to update the label
  updateLabel({
    speed = this.owner.animationSpeed,
    posX = this.x,
    posY = this.y,
    paddingX = 10,
    paddingY = 10
  } = {}) {

    if (!this.label.text) return;
  
    if (!this.label.element) {
      // Create the label this.label.element with initial styling
      this.label.element = document.createElement('div');
      this.label.element.classList.add('label');
  
      // Set initial style
      Object.assign(this.label.element.style, {
        position: 'absolute',
        userSelect: 'none',
        userDrag: 'none',
        fontSize: '14px',
        textAlign: 'center',
        color: 'white',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '4px',
        borderRadius: '4px',
        zIndex: 99999,
      });
  
      this.label.element.innerText = this.label.text;
      this.owner.table.appendChild(this.label.element);
    }

    if (!this.label.visible)
      this.label.element.style.display = 'none'
  
    // Get label dimensions
    const labelWidth = this.label.element.offsetWidth;
    const labelHeight = this.label.element.offsetHeight;
  
    // Get card positions
    const firstCard = this.cardPosition(0);
    const midCard = this.cardPosition(Math.floor(this.length / 2));
    const lastCard = this.cardPosition(this.length - 1);
  
    // Update position based on this.label.sticky alignment
    switch (this.label.sticky) {
      case 'top':
        posY = (this.directions.Y > 0) ? firstCard.top : lastCard.top;
        posY -= labelHeight + paddingY;
        posX = midCard.centerX - labelWidth / 2;
        break;
  
      case 'bottom':
        posY = (this.directions.Y > 0) ? lastCard.bottom : firstCard.bottom;
        posY += paddingY;
        posX = midCard.centerX - labelWidth / 2;
        break;
  
      case 'left':
        posX = (this.directions.X > 0) ? firstCard.left : lastCard.left;
        posX -= labelWidth + paddingX;
        posY = midCard.centerY - labelHeight / 2;
        break;
  
      case 'right':
        posX = (this.directions.X > 0) ? lastCard.right : firstCard.right;
        posX += paddingX;
        posY = midCard.centerY - labelHeight / 2;
        break;
  
      default:
        // Center label on the deck as a fallback
        posX -= labelWidth / 2;
        posY -= labelHeight / 2;
    }
  
    // Position the label
    this.label.x = posX;
    this.label.y = posY;
  
    // Apply the calculated label position with a smooth transition
    Object.assign(this.label.element.style, {
      transitionProperty: 'top, left',
      transitionDuration: `${speed}ms, ${speed}ms`,
      left: `${this.label.x}px`,
      top: `${this.label.y}px`,
    });
  }
}

class Deck extends Container {
  constructor (owner, options) {
    super(owner, options)
  }

  sort (options) {
    super.sort(options)
    this.render(options)
    return this
  }

  shuffle (options) {
    CardsJS.shuffle(this)
    this.render(options)
    return this
  }

  deal (count, hands, speed, callback) {
    const me = this
    let i = 0
    const totalCount = count * hands.length

    const dealOne = () => {
      if (me.length === 0 || i === totalCount) {
        if (callback) {
          callback()
        }
        return
      }
      hands[i % hands.length].addCard(me.topCard())
      hands[i % hands.length].render({
        callback: dealOne,
        speed: speed,
      })
      i++
    }
    dealOne()
    return this;
  }

  calcPosition () {
    for (let i = 0; i < this.length; i++) {
      const pos = this.cardPosition(i)
      this[i].targetLeft = pos.left
      this[i].targetTop  = pos.top
    }
  }

  toString () {
    return super.toString().replace('Container','Deck')
  }
}

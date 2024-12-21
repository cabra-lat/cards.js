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
  static circularLayout(decks, x, y, a, b = a, skipIndex = -1, initialAngle = 0.0, finalAngle = 2 * Math.PI, percent = 1.0) {
     const positions = []
     const angleStep = (finalAngle - initialAngle) / decks.length * percent
     decks.forEach((deck, index) => {
       const angle = initialAngle + index * angleStep
       const newX = x + a * Math.cos(angle)
       const newY = y + b * Math.sin(angle)

       if (index === skipIndex) {
         positions.unshift({ deck, x: newX, y: newY })
       } else {
         positions.push({ deck, x: newX, y: newY })
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

   static paddingPresets = {
     pile:   { vertical: 1,            horizontal:  1 },
     column: { vertical: 18 * 94 / 69, horizontal:  0 },
     hand:   { vertical: 0,            horizontal: 18 },
     deck:   { vertical: 0,            horizontal:  0 }
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
      loop: 1,
      cardback: 'red',
      cardsUrl: 'img/cards.png',
    }

    Object.assign(defaults, options)
    Object.assign(this, defaults)

    this.suitsAndJokers = [...this.suits, ...this.jokers]
    this.offsets = [ ...this.suits.map((_,i) => i), 2, 3 ]
    this.zIndexCounter = 1

    switch (this.type) {
      case CardsJS.STANDARD:
        break
      case CardsJS.EUCHRE:
        this.ranksOrder = CardsJS.acesHigh
        this.filter = rank => rank >= 9 && rank <= 9 + 5
      case CardsJS.PINOCHLE:
        this.loop = 2
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

    this.length = this.loop * this.ranks.length * this.suits.length

    this.table = document.querySelector(this.table); // Get the table element

    // Check if the table's position is 'static' and change it to 'relative' if necessary
    if (window.getComputedStyle(this.table).position === 'static') {
      this.table.style.position = 'relative'
    }

    this.center = {
      x: this.table.offsetWidth / 2,
      y: this.table.offsetHeight / 2
    }

    this.all = [] // All the cards created.

    for (let _ = 0; _ < this.loop; ++_) {
      this.ranks.forEach((rank,index) => {
        this.suits.forEach(suit => {
          this.all.push(new Card(suit, rank, this))
        })
      })
    }

    if (this.blackJoker) this.all.push(new Card('bj', 0, this))
    if (this.redJoker) this.all.push(new Card('rj', 0, this))

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
      Deck: (options = {}) => new Deck({ ...options, owner: this }),
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
    this.el = document.createElement('div')
    this.el.classList.add('card')

    // Set the card's initial style directly
    Object.assign(this.el.style, {
      width: `${this.owner.cardWidth}px`,
      height: `${this.owner.cardHeight}px`,
      backgroundImage: `url(${this.owner.cardsUrl})`,
      position: 'absolute',
      cursor: 'pointer',
      userSelect: 'none',
      userDrag: 'none'
    })

    this.el.card = this
    // Append the card to the table (parent element)
    this.owner.table.appendChild(this.el)

    // Call showCard and moveToFront methods
    this.showCard()
    this.moveToFront()
  }

  toString () {
    return this.name
  }

  moveTo (x, y, speed = this.owner.animationSpeed, callback = () => {}) {
    // Apply CSS transition for smooth movement
    this.el.style.transition = `top ${speed}ms, left ${speed}ms`
    this.el.style.top = y - (this.owner.cardHeight / 2)
    this.el.style.left = x - (this.owner.cardWidth / 2)
    setTimeout(() => { callback(); this.el.style.transition = ''}, speed)
    return this
  }

  rotate (angle, speed = this.owner.animationSpeed, callback = () => {}) {
    this.el.style.transition = `transform ${speed}ms`
    this.el.style.transform = `rotate(${angle}deg)`
    setTimeout(() => { callback(); this.el.style.transition = ''}, speed)
    return this
  }

  showCard () {
    const offset = this.owner.offsets[this.suitIndex]
    const xpos = - (this.rankIndex + 1) * this.owner.cardWidth
    const ypos = - offset * this.owner.cardHeight
    this.el.style.backgroundPosition = `${xpos}px ${ypos}px`
    return this
  }

  hideCard () {
    const y = this.owner.cardback === 'red' ? 0 * this.owner.cardHeight : -1 * this.owner.cardHeight
    this.el.style.backgroundPosition = `0px ${y}px`
    return this
  }

  moveToFront () {
    this.el.style.zIndex = this.owner.zIndexCounter++
    return this
  }
}

class Container extends Array {
  static get [Symbol.species]() { return Array; }
  constructor ( options = {} ) {
    super()
    this.owner = options.owner
    this.x = options.x || this.owner.center.x
    this.y = options.y || this.owner.center.y
    this.faceUp = options.faceUp
    this.padding = CardsJS.paddingPresets?.[options.type]
                 || options.padding
                 || CardsJS.paddingPresets.pile
    this.label = {
      text: options.label?.text || options.label || '',
      sticky: options.label?.sticky || options.sticky || 'bottom',
      el: null
    }
  }

  // Sort the cards in the deck
  sort(compare = CardsJS.compareBySuit, descending = false) {
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
  setLabel (options) {
    this.label.text = options.text
    this.updateLabel(options.sticky)
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

  render (options = {}) {
    const { speed } = options
    this.calcPosition()
    // Render cards
    for (let i = 0; i < this.length; i++) {
      const card = this[i]
      this.zIndexCounter++
      card.moveToFront()
      const top = parseInt(card.el.style.top)
      const left = parseInt(card.el.style.left)
      if (top !== card.targetTop || left !== card.targetLeft) {
        if (!options.immediate) {
          card.el.style.transition = `top ${speed}ms, left ${speed}ms`
        }
        card.el.style.top = `${card.targetTop}px`
        card.el.style.left = `${card.targetLeft}px`
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
    if (options.immediate) {
      flip()
    } else {
      setTimeout(flip, speed / 2)
    }

    // Update the label
    this.updateLabel(speed)

    // Callback after animation
    if (options.callback) {
      setTimeout(options.callback, speed)
    }
  }

  // Add a method to update the label
  updateLabel (speed = this.owner.animationSpeed,
               posX = this.x,
               posY = this.y,
               padding = 18,
               sticky = this.label.sticky ) {
    if (!this.label.text) return

    if (!this.label.el) {
      // Create the card element with initial styling
      this.label.el = document.createElement('div')
      this.label.el.classList.add('label')

      // Set the card's initial style directly
      Object.assign(this.label.el.style, {
        position: 'absolute',
        userSelect: 'none',
        userDrag: 'none',
        fontSize: '14px',
        textAlign: 'center',
        color: 'white',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '4px',
        borderRadius: '4px',
        zIndex: 99999
      })

      this.label.el.innerHTML = this.label.text
      // Append the card to the table (parent element)
      this.owner.table.appendChild(this.label.el)
    }


    let padX = 0
    let padY = 0
    let padV = this.padding.vertical
    let padH = this.padding.horizontal
    let H = this.owner.cardHeight
    let W = this.owner.cardWidth
    let cards = this.length

    switch(sticky) {
    case 'top':
      padY = (padV) ? (- padV * cards - padding) : (- H / 2 - padding)
      break
    case 'bottom':
      padY = (padV) ? (+ padV * cards + padding) : (+ H / 2 + padding)
      break
    case 'left':
      padY = (padH) ? (- padH * cards - padding) : (- W / 2 - padding)
      break
    case 'right':
      padY = (padH) ? (+ padH * cards + padding) : (+ W / 2 + padding)
      break
    }

    // Position the label
    const labelX = posX + padX
    const labelY = posY + padY

    // Position the label element based on calculated dimensions
    Object.assign(this.label.el.style, {
      transitionProperty: 'top, left',
      transitionDuration: `${speed}ms, ${speed}ms`,
      left: `${labelX - this.label.el.offsetWidth / 2}px`,
      top: `${labelY - this.label.el.offsetHeight / 2}px`,
    })
  }
}

class Deck extends Container {
  constructor (options) {
    super(options)
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
    const width = this.owner.cardWidth + (this.length - 1) * this.padding.horizontal
    const height = this.owner.cardHeight + (this.length - 1) * this.padding.vertical
    const top = Math.round(this.y - height / 2)
    const left = Math.round(this.x - width / 2)
    for (let i = 0; i < this.length; i++) {
      this[i].targetTop = top + i * this.padding.vertical
      this[i].targetLeft = left + i * this.padding.horizontal
    }
  }

  toString () {
    return super.toString().replace('Container','Deck')
  }
}

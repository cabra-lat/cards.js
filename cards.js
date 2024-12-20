(() => {
  function calcLayout (deck, a, b = a, skipIndex = -1, initialAngle = 0.0, finalAngle = 2 * Math.PI, percent = 1.0) {
    const positions = []
    const angleStep = (finalAngle - initialAngle) / cards.length * percent
    deck.forEach((card, index) => {
      const angle = initialAngle + index * angleStep
      const x = cards.x + a * Math.cos(angle)
      const y = cards.y + b * Math.sin(angle)

      if (index === skipIndex) {
        positions.unshift({ card, x, y })
      } else {
        positions.push({ card, x, y })
      }
    })
    return positions
  }
})

class CardsJS {
  static STANDARD = 0
  static EUCHRE   = 1
  static PINOCHLE = 2
  static NUMBERS  = 3
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
  constructor ( options = {} ) {
    // The global options
    this.defaults = {
      cardWidth: 69,
      cardHeight: 94,
      paddingPresets: {
          pile:   { vertical: 1,            horizontal:  1 },
          column: { vertical: 18 * 94 / 69, horizontal:  0 },
          hand:   { vertical: 0,            horizontal: 18 },
          deck:   { vertical: 0,            horizontal:  0 }
      },
      animationSpeed: 500,
      suits: ['s', 'd', 'c', 'h'],
      table: 'body',
      cardback: 'red',
      acesHigh: false,
      cardsUrl: 'img/cards.png',
      blackJoker: false,
      redJoker: false,
      type: CardsJS.STANDARD,
      loop: 1
    }
    Object.assign(this, this.defaults)
    Object.assign(this, options)

    this.zIndexCounter = 1
    this.start = 1
    this.end = this.start + 12

    switch (this.type) {
      case CardsJS.STANDARD:
        this.acesHigh = false
        this.start = this.acesHigh ? 2 : 1
        this.end = this.start + 12
        break
      case CardsJS.EUCHRE:
        this.start = 9
        this.end = this.start + 5
        break
      case CardsJS.PINOCHLE:
        this.start = 9
        this.end = this.start + 5
        this.loop = 2
        break
      case CardsJS.NUMBERS:
        this.start = 1
        this.end = this.start + 9
    }
    this.length = this.loop * (this.end - this.start)

    this.table = document.querySelector(this.table); // Get the table element

    // Check if the table's position is 'static' and change it to 'relative' if necessary
    if (window.getComputedStyle(this.table).position === 'static') {
      this.table.style.position = 'relative'
    }

    this.all = [] // All the cards created.

    for (let l = 0; l < this.loop; l++) {
      for (let i = this.start; i <= this.end; i++) {
        this.suits.forEach(suit => {
          this.all.push(new Card(suit, i, this))
        })
      }
    }
    if (this.blackJoker) {
      this.all.push(new Card('bj', 0, this))
    }
    if (this.redJoker) {
      this.all.push(new Card('rj', 0, this))
    }

    CardsJS.shuffle(this.all)


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
      ...this.defaults,
      ...options
    }
  }
}

class Card {
  constructor (suit, rank, owner) {
    this.owner = owner
    this.shortName = suit + rank
    this.suit = suit
    this.rank = rank
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
  }

  rotate (angle, speed = this.owner.animationSpeed, callback = () => {}) {
    this.el.style.transition = `transform ${speed}ms`
    this.el.style.transform = `rotate(${angle}deg)`
    setTimeout(() => { callback(); this.el.style.transition = ''}, speed)
  }

  showCard () {
    const f = obj => Object.fromEntries(Object.entries(obj).map(a => a.reverse()))
    const offsets = { ...f(this.owner.suits), rj: 2, bj: 3 }
    // Aces high must work as well.
    const rank = (this.rank === 14) ? 1 : this.rank
    const xpos = -rank * this.owner.cardWidth
    const ypos = -offsets[this.suit] * this.owner.cardHeight
    this.el.style.backgroundPosition = `${xpos}px ${ypos}px`
  }

  hideCard () {
    const y = this.owner.cardback === 'red' ? 0 * this.owner.cardHeight : -1 * this.owner.cardHeight
    this.el.style.backgroundPosition = `0px ${y}px`
  }

  moveToFront () {
    this.el.style.zIndex = this.owner.zIndexCounter++
  }
}

class Container extends Array {
  static get [Symbol.species]() { return Array; }
  constructor ( options = {} ) {
    super()
    this.owner = options.owner
    this.x = options.x || this.owner.table.offsetWidth / 2
    this.y = options.y || this.owner.table.offsetHeight / 2
    this.faceUp = options.faceUp
    this.padding = (options.padding)
          ? this.owner.paddingPresets[options.padding] || options.padding
          : this.owner.paddingPresets.pile
    this.label = {
      text: options.label?.text || options.label || '',
      sticky: options.label?.sticky || 'bottom',
      el: null
    }
  }

  addCard (card) {
    this.addCards([card])
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
  setLabel (text) {
    this.label.text = text
    if (this.label.el) {
      this.label.el.innerText = text
      this.updateLabel()
    }
  }

  topCard () {
    return this[this.length - 1]
  }

  toString () {
    return 'Container'
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
    let V = this.owner.cardWidth
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
}

export { CardsJS };

cards.js
========

Javascript library for card games (fork of the abandoned [card.js](https://github.com/einaregilsson/cards.js)).

## Creating a Deck

To create a new deck, you can use the Deck() method provided by cards.js.
Here's how to initialize a deck and add all the cards to it:

```javascript
let cards = new CardsJS();
let deck = cards.Deck();
deck.addCards(cards.all);
```

## Creating a hand

A hand in this library is essentially a deck with a label and position defined.
Here's how to create a hand and deal cards to it:

```javascript
let yours = cards.Deck({
  type: 'hand',                // Type: 'hand' indicates it will be rendered as a hand
  label: 'Your Hand',          // Label for the hand
  y: cards.playableArea.bottom // Position at the bottom of the playable area
});
deck.deal(3, [yours]);  // Deal 3 cards to 'Your Hand'
```

## Dealing Cards
By default, cards are faced down. To reveal the cards, you can set faceUp to true:

```javascript
yours.faceUp = true;  // Make cards face-up
deck.deal(7, [yours]);  // Deal 7 more cards
```

## Creating Another Hand

To create a second hand and deal cards to it, you can follow this example:

```javascript
let theirs = cards.Deck({
  type: 'hand',
  label: 'Other Hand',
  y: cards.playableArea.top  // Position at the top of the playable area
});
deck.deal(5, [theirs]);  // Deal 5 cards to 'Other Hand'
```

## Mouse Events - Binding

You can bind events to hands and cards.
For example, show the name of the card when hovering over it:

```javascript
yours.on('mouseenter',
   card => yours.label.text = `This is ${card}`);
theirs.on('mouseenter',
   card => theirs.label.text = 'Other Hand');
deck.on('mouseenter',
   card => deck.label.text = 'Main Deck');
```

## Mouse Events - Leaving

Now to hide the labels when not hovering:

```javascript
theirs.on('mouseleave',
  card => theirs.label.text = '')
deck.on('mouseleave',
  card => deck.label.text = '')
yours.on('mouseleave',
  card => yours.label.text = '')

deck.label.sticky = 'bottom'
```

## Mouse Events - Triggering

To trigger the events programatically:

```javascript
theirs.trigger('mouseleave')
deck.trigger('mouseleave')
yours.trigger('mouseleave')
```

## Shuffling and Returning Cards to Deck

```javascript
yours
.deal(-1, [ deck ])
.then(_ => theirs.deal(-1, [ deck ]) )
.then(_ => deck.shuffle() )
.then(_ => deck.deal(5, [ yours, theirs ]) )
```

## Sorting the Cards

You can sort a hand by suit, rank, or both:

```javascript
yours.shuffle().sort() // by default: suit
```

## Sorting the Cards by Rank 

Here is your hand sorted by rank:

```javascript
yours.shuffle().sort('rank')
```

## Sorting the Cards by Rank, then Suit 

Here is your hand sorted by rank, then suit:

```javascript
yours.shuffle().sort('rank-then-suit')
```

## And finally by Suit, then Rank 

Here is your hand sorted by suit, then rank:

```javascript
yours.shuffle().sort('suit-then-rank')
```

## Creating a Game 

Now let's define some rules and create a game:

```javascript
// Define a function to check if a card can be played
let canPlay = (card, top) => {
  return card.suitIndex === top?.suitIndex ||
         card.rankIndex === top?.rankIndex;
};
```

## Creating a Game
### Setting Up a Discard Pile

You can set up a discard pile where cards are placed after they are played:

```javascript
deck.x -= 50;
deck.render();

let pile = cards.Deck({
  label: 'discard',
  sticky: 'top',
  faceUp: true
});

pile.x += 50;
pile.addCard(deck.topCard());
pile.render();

let canDiscard = card => canPlay(card, pile.topCard())
```

## Creating a Game
### Binding Click Events

Here’s how to bind click events to allow players to interact with the deck and hand:

```javascript
// Handle mouse enter event to show playable cards
yours.on('mouseenter', card => {
  canDiscard(card)
    ? yours.label.text = `You can play ${card}`
    : yours.label.text = `This is ${card}`;
});

// Handle deck click to draw cards
let gameOver = false;
deck.click(card => {
  if (gameOver) return;
  const ableToPlay = yours.filter(canDiscard).pop();
  if (!ableToPlay && card === deck.topCard()) {
    deck.deal(1, [yours]);
    return;
  }
  deck.label.text = 'Able to play \n No more draws!';
});
```

## Creating a Game
### Winning and Losing Conditions

Check for win or loss conditions when clicking cards:

```javascript
yours.click((card) => {
  const playable = yours.filter(canDiscard)
  if (playable.includes(card)) {
    pile.addCard(card)
    yours.label.text = `Played ${card}.`
    const gameWon = yours.length === 0
    const gameLost = !playable && deck.length === 0
    if (gameWon)  alert('You Won!')
    if (gameLost) alert('You Lost!')
    gameOver = gameWon || gameLost
    return
  }
  yours.label.text = `Can't play ${card}!`
})
```

## Creating a Game
### You can now play!

Click on discard pile to end the game.

```javascript
this.disableNext() // meta code

pile.click( _ => {
    if (!gameOver) return
    yours
    .deal(-1, [ deck ])
    .then(_ => theirs.deal(-1, [ deck ]) )
    .then(_ => pile.deal(-1, [ deck ]) )
    .then(_ => deck.x += 50 )
    .then(_ => this.enableNext() ) // meta code
})
```

## Setting Up a Round Table

Set up a table with multiple players arranged in a circular layout:

```javascript
const r = 150;  // radius of the layout
const center = cards.getCenter()
let names = ['You', 'Alice', 'Bob', 'Charlie'];
let position = ['left', 'top', 'right', 'bottom'];
let perspective = ['east', 'south', 'west', 'north'];
let layout = CardsJS.roundLayout(names, {
  ...center, radius: r
});

// Arrange players in the layout
let players = layout.map(
  (pos, i) => cards.Deck({
    ...pos,
    faceUp: i === 0,
    label: names[i],
    sticky: position[i],
    seenFrom: perspective[i]
  })
);

// Deal cards to all players
deck.deal(-1, players)
```

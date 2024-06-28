const SUITS = ['R', 'Y', 'G', 'B'];
const RANKS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'S', 'R', 'D'];
const WILDS = ['W', 'WD'];
const SKIP = RANKS[10];
const REVERSE = RANKS[11];
const DRAW = RANKS[12];

function genCards() {
  const arr = [];

  for (let i=0; i<SUITS.length; i+=1) {
    for (let j=0; j<RANKS.length; j+=1) {
      const card = `${ SUITS[i] }${ RANKS[j] }`;

      arr.push(card);
    }
  }

  const ranks = RANKS.slice(1);

  for (let i=0; i<SUITS.length; i+=1) {
    for (let j=0; j<ranks.length; j+=1) {
      const card = `${ SUITS[i] }${ ranks[j] }`;

      arr.push(card);
    }
  }

  WILDS.forEach((wild) => {
    for (let i=0; i<4; i+=1) arr.push(wild);
  });

  return arr;
}

function shuffle(cards) {
  const arr = cards || genCards();
  const n = arr.length;

  for (let i = n - 1; i > 0; i -= 1) {
    const rand = Math.floor(Math.random() * (i + 1));

    [arr[i], arr[rand]] = [arr[rand], arr[i]];
  }

  return arr;
}

function sortBySuit(cards=[]) {
  return Object.entries(cards.reduce((acc, curr) => ({
    ...acc,
    [curr[0]]: acc[curr[0]] ? [...acc[curr[0]], curr] : [curr],
  }), {}))
  .sort(([suitA], [suitB]) => SUITS.findIndex(suit => suit === suitA) - SUITS.findIndex(suit => suit === suitB))
  .map(([_, arr]) => arr.sort((a, b) => RANKS.findIndex(rank => rank === a[0]) - RANKS.findIndex(rank => rank === b[0])))
  .flat()
};

function isCompliant(compared, comparator, {
  currentColor=null,
  onlyAllowDraw=false,
}={}) {
  const selectDrawCard = comparator && comparator[1] === 'D';
  const checkSelectedDrawCard = onlyAllowDraw ? selectDrawCard : true;
  const isAllowColor = legal(currentColor, comparator);
  const isAllowCard = legal(compared, comparator);

  return comparator
    && checkSelectedDrawCard
    && (isAllowColor || isAllowCard);
}

function legal(compared=null, comparator=null) {
  if (!compared || !comparator) return false;

  const [comparedSuit, comparedRank] = compared;
  const [comparatorSuit, comparatorRank] = comparator;
  const comparatorIsWild = isWild(comparator);
  const comparedIsDraw = comparedRank === RANKS[12];

  if (comparedIsDraw) {
    return comparatorRank === RANKS[12];
  }

  if (comparedSuit === comparatorSuit || comparatorIsWild) return true;

  return comparedRank ? comparedRank === comparatorRank : false;
}

function isWild(card) {
  return card && card[0] === WILDS[0];
}

function score(cards) {
  return cards * -1;
}

export {
  sortBySuit,
  shuffle,
  isCompliant,
  legal,
  score,
  SUITS,
  RANKS,
  WILDS,
  SKIP,
  REVERSE,
  DRAW,
};

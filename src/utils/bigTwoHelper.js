const SUITS = ['C', 'D', 'H', 'S'];
const RANKS = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];
const TYPE_ORDER = ['straight flush', 'bomb'];

function shuffle() {
  const arr = [];

  for (let i=0; i<SUITS.length; i+=1) {
    for (let j=0; j<RANKS.length; j+=1) {
      const card = `${ RANKS[j] }${ SUITS[i] }`;

      arr.push(card);
    }
  }

  const n = arr.length;

  for (let i = n - 1; i > 0; i -= 1) {
    const rand = Math.floor(Math.random() * (i + 1));

    [arr[i], arr[rand]] = [arr[rand], arr[i]];
  }

  return arr;
}

function sortByRank(cards=[]) {
  return Object.entries(cards.reduce((acc, curr) => ({
    ...acc,
    [curr[0]]: acc[curr[0]] ? [...acc[curr[0]], curr] : [curr],
  }), {}))
  .sort(([rankA], [rankB]) => RANKS.findIndex(rank => rank === rankA) - RANKS.findIndex(rank => rank === rankB))
  .map(([_, arr]) => arr.sort((a, b) => SUITS.findIndex(suit => suit === a[1]) - SUITS.findIndex(suit => suit === b[1])))
  .flat()
};

function sortBySuit(cards=[]) {
  return Object.entries(cards.reduce((acc, curr) => ({
    ...acc,
    [curr[1]]: acc[curr[1]] ? [...acc[curr[1]], curr] : [curr],
  }), {}))
  .sort(([suitA], [suitB]) => SUITS.findIndex(suit => suit === suitA) - SUITS.findIndex(suit => suit === suitB))
  .map(([_, arr]) => arr.sort((a, b) => RANKS.findIndex(rank => rank === a[0]) - RANKS.findIndex(rank => rank === b[0])))
  .flat()
};

function isFlush(cards=[]) {
  return cards.length === 5
    && cards.every((card, i) => i === 0 || card[1] === cards[i - 1][1]);
}

function analyzeIsSingle(cards=[]) {
  if (cards.length === 1) {
    const card = cards[0];
    const maxRank = RANKS.findIndex((r) => r === card[0]);
    const maxSuit = SUITS.findIndex((s) => s === card[1]);

    return {
      type: 'single',
      maxRank,
      maxSuit,
    };
  }
}

function analyzeIsPair(cards=[]) {
  if (cards.length === 2
    && cards[0][0] === cards[1][0]
    && cards[0][1] !== cards[1][1]
  ) {
    const sorted = sortByRank(cards);
    const card = sorted[1];
    const maxRank = RANKS.findIndex((r) => r === card[0]);
    const maxSuit = SUITS.findIndex((s) => s === card[1]);

    return {
      type: 'pair',
      maxRank,
      maxSuit,
    };
  }
}

function analyzeIsBombORFullHouse(cards=[]) {
  if (cards.length !== 5) return;

  const groups = Object.values(cards.reduce((acc, curr) => ({
    ...acc,
    [curr[0]]: acc[curr[0]] ? [...acc[curr[0]], curr] : [curr],
  }), {}));

  if (groups.length !== 2) return;  // 3+2 or 4+1

  let type = 'full house';
  let card;

  const fourOfKind = groups.find((entry) => entry.length === 4);

  if (fourOfKind) {
    type = 'bomb';
    card = fourOfKind.sort((a, b) => SUITS.findIndex(suit => suit === a[1]) - SUITS.findIndex(suit => suit === b[1])).pop();
  } else {
    const trips = groups.find((entry) => entry.length === 3);
    card = trips.sort((a, b) => SUITS.findIndex(suit => suit === a[1]) - SUITS.findIndex(suit => suit === b[1])).pop();
  }

  const maxRank = RANKS.findIndex((r) => r === card[0]);
  const maxSuit = SUITS.findIndex((s) => s === card[1]);

  return { type, maxRank, maxSuit };
}

function analyzeIsStraight(cards=[]) {
  const type = isFlush(cards) ? 'straight flush' : 'straight';

  if (cards.length !== 5) return;

  let codes = cards.map((card) => RANKS.findIndex((rank) => rank === card[0])).sort((a, b) => a - b);

  const isContain2And3 = codes.includes(0) && codes.includes(12);

  if (isContain2And3) {
    codes = codes.map((code) => (code > 3) ? code - 13 : code).sort((a, b) => a - b);
  }

  const isConsecutive = codes.every((num, i) => i === 0 || num === codes[i - 1] + 1);
  const isJ2 = codes[0] === 8 && codes[4] === 12;

  if (!isConsecutive || isJ2) return;

  if (isContain2And3) {
    if (codes[0] === -2) {  // A5
      const card = cards.find((card) => card[0] === '5');
      const maxRank = RANKS.findIndex((r) => r === card[0]);
      const maxSuit = SUITS.findIndex((s) => s === card[1]);

      return { type, maxRank, maxSuit };
    } else if (codes[0] === -1) { //26
      const card = cards.find((card) => card[0] === '2');
      const maxRank = RANKS.findIndex((r) => r === card[0]);
      const maxSuit = SUITS.findIndex((s) => s === card[1]);

      return { type, maxRank, maxSuit };
    }
    // Q3 && K4 return
  } else { // others
    const card = sortByRank(cards).pop();
    const maxRank = RANKS.findIndex((r) => r === card[0]);
    const maxSuit = SUITS.findIndex((s) => s === card[1]);

    return { type, maxRank, maxSuit };
  }
}

function analyze(cards=[]) {
  return [analyzeIsSingle, analyzeIsPair, analyzeIsStraight, analyzeIsBombORFullHouse]
    .reduce((acc, fn) => acc ? acc : fn(cards), undefined);
}

function compare(compared=[], comparator=[]) {
  if (!comparator || !comparator.length) return false;

  const comparatorInfo = analyze(comparator);

  if (!comparatorInfo) return false;
  if (!compared || !compared.length) return true;

  const comparedInfo = analyze(compared);

  const comparedTypeIndex = TYPE_ORDER.findIndex((type) => comparedInfo.type === type);
  const comparatorTypeIndex = TYPE_ORDER.findIndex((type) => comparatorInfo.type === type);

  if (comparedTypeIndex === -1 && comparatorTypeIndex === -1) {
    return comparedInfo.type === comparatorInfo.type
      && (comparedInfo.maxRank < comparatorInfo.maxRank
          || (comparedInfo.maxRank === comparatorInfo.maxRank && comparedInfo.maxSuit < comparatorInfo.maxSuit));
  } else if (comparedInfo.type === comparatorInfo.type) {
    return comparedInfo.maxRank < comparatorInfo.maxRank
      || (comparedInfo.maxRank === comparatorInfo.maxRank && comparedInfo.maxSuit < comparatorInfo.maxSuit);
  }

  return comparedTypeIndex < comparatorTypeIndex;
}

function score(cards=[]) {
  if (!cards || !cards.length) return 0;

  let score = cards.length;

  cards
    .filter(card => card[0] === RANKS[12])
    .forEach(() => score *= 2);

  return score * -1;
}

export {
  sortByRank,
  sortBySuit,
  shuffle,
  compare,
  analyze,
  score,
  SUITS,
  RANKS,
};

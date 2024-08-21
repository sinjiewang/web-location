import { NeuralNetwork } from 'brain.js';
import {
  EMPTY,
  SINGLE,
  PAIR,
  FULL_HOUSE,
  STRAIGHT,
  STRAIGHT_FLUSH,
  BOMB,
  analyze,
  compare,
  findPairs,
  findStraights,
  findFullHouses,
} from '@/utils/bigTwoHelper.js'

function cardToValue(card) {
  const valueMap = {
    '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
  };
  const suitMap = {
    'C': 1, 'D': 2, 'H': 3, 'S': 4
  };
  return valueMap[card[0]] * 10 + suitMap[card[1]];
}

function cardsToValues(cards) {
  return cards.map(card => cardToValue(card));
}

function valueToCard(value) {
  const valueMap = {
    3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: 'T',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2',
  };
  const suitMap = {
    1: 'C', 2: 'D', 3: 'H', 4: 'S'
  };

  const cardValue = Math.floor(value / 10);
  const cardSuit = value % 10;

  return valueMap[cardValue] + suitMap[cardSuit];
}

class BigTwoAgent {
  constructor() {
    this.strategyData = [];
    this.net = null;
  }

  async init() {
    const json = await this.fetchModelBase();

    this.net = new NeuralNetwork();
    this.net.fromJSON(json);
  }

  clear() {
    this.strategyData = [];
  }

  async fetchModelBase(url='/model/bigTwo.json') {
    return fetch(url).then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
      }
      return response.json();
    });
  }

  train(data={}) {
    const { players=[], played=[]/*, discarded=[]*/, onHands=[], play=[] } = data;
    const init = play.includes('3C');
    const trainingData = {
      input: {
        init,
        players,
        played: [...played],
        onHands,
      },
      output: play,
    };

    this.strategyData.push(trainingData);

    console.log(trainingData)
  }

  run({ played=[], onHands=[], individual=false, isLast=false }={}) {
    console.log(`played: `, played)
    const THRESHOLD = 0.01;
    const dynamicThreshold = THRESHOLD * onHands.length / 13;
    const FIRST_CARD = '3C';
    const init = onHands.includes(FIRST_CARD);
    const input = {
      init: init ? 1 : 0,
      ...cardsToValues(played).reduce((acc, val) => ({ ...acc, ['played_' + val]: 1 }), {}),
      ...cardsToValues(onHands).reduce((acc, val) => ({ ...acc, ['onHands_' + val]: 1 }), {})
    };
    const output = this.net.run(input);
    const { type } = analyze(played);

    let suggests = Object.keys(output)
      .filter((key) => output[key] > dynamicThreshold)
      .filter((key) => onHands.includes(valueToCard(Number(key))))
      .sort((a, b) => output[a] > output[b] ? -1 : 1)
      .map((key) => valueToCard(Number(key)));
    let singleSuggests = suggests.filter((card) => compare(played, [card]));
    let pairSuggests = findPairs(suggests);
    let straightSuggests = findStraights(suggests);
    let fullHouseSuggests = findFullHouses(suggests);

    switch(type) {
      case SINGLE:
        singleSuggests = singleSuggests.filter(card =>
          individual ||
          (!pairSuggests.flat().includes(card)
            && !straightSuggests.flat().includes(card)
            && !fullHouseSuggests.flat().includes(card))
        );

        return singleSuggests.slice(0, 1);
      case PAIR:
        pairSuggests = findPairs(suggests.filter(card =>
          individual ||
          (!straightSuggests.flat().includes(card)
            && !fullHouseSuggests.flat().includes(card))
        ))
        .filter((pair) => compare(played, pair))
        .shift();

        return pairSuggests || [];
      case STRAIGHT:
        straightSuggests = straightSuggests.filter((straight) => compare(played, straight)).shift();

        return straightSuggests || [];
      case FULL_HOUSE:
        fullHouseSuggests = fullHouseSuggests.filter((fullHouse) => compare(played, fullHouse)).shift();

        return fullHouseSuggests || [];
      case EMPTY:
        if (init) {
          singleSuggests = singleSuggests.filter(card => card === FIRST_CARD);
          pairSuggests = pairSuggests.filter(cards => cards.includes(FIRST_CARD));
          straightSuggests = straightSuggests.filter(cards => cards.includes(FIRST_CARD));
          fullHouseSuggests = fullHouseSuggests.filter(cards => cards.includes(FIRST_CARD));
        }

        if (straightSuggests.length || fullHouseSuggests.length) {
          suggests = [ ...straightSuggests, ...fullHouseSuggests ].map((combination) => {
            const { maxRank, maxSuit } = analyze(combination);

            return {
              value: cardToValue(maxRank + maxSuit),
              combination,
            }
          })
          .sort((a, b) => a.value > b.value ? -1 : 1)
          .shift().combination;
        } else {
          const single = singleSuggests.slice(0, 1);
          const pair = pairSuggests.shift() || [];
          const suggest = [...single, ...pair]
            .sort((a, b) => suggests.indexOf(a) > suggests.indexOf(b) ? 1 : -1)
            .shift();

          if (isLast && pair.length) {
            suggests = pair;
          } else {
            suggests = pair.includes(suggest) ? pair : single;
          }
        }

        if (!suggests.length) {
          suggests = onHands.slice(0, 1);
        }

        return suggests || [];
      case STRAIGHT_FLUSH:
      case BOMB:
        return [];
    }
  }
}

export default BigTwoAgent;

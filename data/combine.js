'use strict';

let _ = require('lodash');

let oldAttacks = require('./attacks2.json');
let newAttacks = require('./attacks3.json');

let oldAttacksByAttackName = _.keyBy(oldAttacks, 'name');

_.each(newAttacks, attack => {
  let oldAttack = oldAttacksByAttackName[attack.name.replace(/ \(.+\)/, '')];
  if (oldAttack) {
    attack.bars = oldAttack.bars;
  }
  else {
    console.log('could not match attack: ' + attack.name);
  }
});

console.log(JSON.stringify(newAttacks));
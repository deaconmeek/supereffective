'use strict';

const _ = require('lodash');

const attackDb = require('./attacks2.json');
const pokemonDb = require('./pokemon2.json');
const typeDb = require('./types2.json');

let attackByName = _.keyBy(attackDb, o => o.name),
  pokemonById = _.keyBy(pokemonDb, 'id'),
  typeByName = _.keyBy(typeDb, o => o.name);

_.each(typeByName, (type) => {
  type.resistantTo = type.resistantTo;
  type.succeptableTo = type.succeptableTo;
  type.bonusDamageTo = _.map(_.filter(typeByName, o => _.includes(o.succeptableTo, type.name)), 'name');
  type.reducedDamageTo = _.map(_.filter(typeByName, o => _.includes(o.resistantTo, type.name)), 'name');
});


// let spearow = pokemonById[21];
// console.log('types: ' + spearow.types);
// console.log('flying succeptableTo: ' + typeByName['Flying'].succeptableTo);
// console.log('flying w')
// console.log('normal succeptableTo: ' + typeByName['Normal'].succeptableTo);

// process.exit(0);

// _.each(pokemonDb, (pokemon) => {
//   let newTypes = [];
//   _.each(targetPokemon.types, (type) => {
//     newTypes.push(typeByName[type].name);
//   });
//   targetPokemon.types = newTypes;
// });
// console.log(JSON.stringify(pokemonDb,null,2));
// process.exit(0);

// _.each(attackDb, (attack) => {
//   attack.type = typeByName[attack.type].name;
// });
// console.log(JSON.stringify(attackDb,null,2));
// process.exit(0);

// let allTypes = _.uniq(_.flatten(_.map(pokemonDb, 'types')));
// _.each(allTypes, (type) => {
//   console.log(typeByName[type.toLowerCase()]);
// });


let targetPokemonId = process.argv[2];
let debug = process.argv[3] && process.argv[3] === '-d';

let targetPokemon = pokemonById[targetPokemonId],
 targetPokemonTypes = _.map(targetPokemon.types, o => typeByName[o].name);

console.log('----------------');
console.log('Name: ' + targetPokemon.name);
console.log('Type: ' + targetPokemon.types.join(', '));
console.log('Resistant to: ' + _.uniq(_.flatten(_.map(targetPokemon.types, o => _.union(typeByName[o].bonusDamageTo, typeByName[o].resistantTo)))).sort().join(', '));
console.log('Succeptable to: ' + _.uniq(_.flatten(_.map(targetPokemon.types, o => _.union(typeByName[o].reducedDamageTo, typeByName[o].succeptableTo)))).sort().join(', '));
console.log('----------------');
// console.log(JSON.stringify(typeByName, null, 2));


// Assign ratings for each pokemon type to determine their effectiveness against the target pokemon
let rankingByTypeName = {};
_.each(typeByName, (type, name) => {

  let bonusDamageToTarget = _.intersection(type.bonusDamageTo, targetPokemonTypes),
    reducedDamageToTarget = _.intersection(type.reducedDamageTo, targetPokemonTypes),
    resistantToTarget = _.intersection(type.resistantTo, targetPokemonTypes),
    succeptableToTarget = _.intersection(type.succeptableTo, targetPokemonTypes);

  rankingByTypeName[name] = 1 *
    Math.pow(1.25, bonusDamageToTarget.length) *
    Math.pow(0.80, reducedDamageToTarget.length) *
    Math.pow(1.25, resistantToTarget.length) *
    Math.pow(0.80, succeptableToTarget.length);
  rankingByTypeName[name] = rankingByTypeName[name].toFixed(2);

  // console.log('\ntype: ' + name + '. ranking: ' + rankingByTypeName[name]);
});

let typeRankings = _.uniq(_.values(rankingByTypeName)).sort().reverse();

console.log('\nTypes to use for attacking:\n');
_.each(typeRankings, (ranking) => {
  if (parseFloat(ranking) === 1) return true;
  let typesOfRanking = _.reduce(rankingByTypeName, (r,v,k) => (v === ranking) ? _.union(r,[k]) : r, []);
  console.log(ranking   + ' multiplier against ' + targetPokemon.name + ' for: ' + typesOfRanking.join(', '));
});



// When fighting another pokemon, you want to know 3 things:
// 1) When attacking, which attack types are they weak against?
//    Find pokemon/attackType combinations that exploit these weaknesses
//    Attack types that match the pokemon type will do 25% extra damage
// 2) When attacking, which attack types are they strong against?
//    Avoid pokemon/attackType combinations that have this weakness
// 3) When defending, which attack types are they able to use?
//    Avoid pokemon base types which have weaknesses against these attacks
//    Remember that if the attack type matches the attacker base type
//    then the attack will do 25% extra damamge (STAB)


// Assign ratings for each pokemon/attack-type combination to determine their effectiveness against the target pokemon
let ignorePokemonAttackTypes = false;

function getSubKey(subPokemon) {
  return subPokemon.name + '_' + subPokemon.attackType;
}

let subPokemonBySubKey = {};
_.each(pokemonDb, (pokemon) => {
  if (ignorePokemonAttackTypes) {
    _.each(pokemon.types, (type) => {
      let subPokemon = {
          name: pokemon.name,
          maxCP: pokemon.maxCP,
          types: pokemon.types,
          attackType: type,
          attackNames: 'n/a'
        },
        subKey = getSubKey(subPokemon);
      subPokemonBySubKey[subKey] = subPokemon;
    });
  }
  else {
    let attacks = _.union(pokemon.quickAttacks, pokemon.specialAttacks),
      attacksByAttackType = _.groupBy(attacks, o => attackByName[o].type);
    _.each(_.keys(attacksByAttackType), (attackType) => {
      let subPokemon = {
          name: pokemon.name,
          maxCP: pokemon.maxCP,
          types: pokemon.types,
          attackType: attackType,
          attackNames: attacksByAttackType[attackType]
        },
        subKey = getSubKey(subPokemon);
      subPokemonBySubKey[subKey] = subPokemon;
    });
  }
});


// Assign ratings for each subPokemon to determine their effectiveness against the target pokemon
_.each(subPokemonBySubKey, (subPokemon, subKey) => {

  let attackType = typeByName[subPokemon.attackType],
    bonusDamageToTarget = _.intersection(attackType.bonusDamageTo, targetPokemonTypes),
    reducedDamageToTarget = _.intersection(attackType.reducedDamageTo, targetPokemonTypes);

  // This formula assumes that the target pokemon will attack with his base types (for calculating defense multipliers)
  // This also means that the target pokemon will get a STAB bonus on all attacks
  let defenseTypes = _.map(subPokemon.types, o => typeByName[o]),
    resistantToTarget = _.chain(defenseTypes).map('resistantTo').flatten().uniq().intersection(targetPokemonTypes).value(),
    succeptableToTarget = _.chain(defenseTypes).map('succeptableTo').flatten().uniq().intersection(targetPokemonTypes).value();

  let stabBonus = _.includes(subPokemon.types, attackType.name) ? 1.25 : 1,
    opponentStabBonus = 1.25;

  subPokemon.ranking = 1 * stabBonus / opponentStabBonus *
    Math.pow(1.25, bonusDamageToTarget.length) *
    Math.pow(0.80, reducedDamageToTarget.length) *
    Math.pow(1.25, resistantToTarget.length) *
    Math.pow(0.80, succeptableToTarget.length);
  subPokemon.ranking = subPokemon.ranking.toFixed(2);

  if (debug) {
    console.log('\nsubKey: ' + subKey + '. ranking: ' + subPokemon.ranking);
    console.log('attackType.name: ' + attackType.name);
    console.log('subPokemon.types: ' + subPokemon.types);
    console.log('stabBonus: ' + stabBonus);
    console.log('bonusDamageToTarget: ' + bonusDamageToTarget);
    console.log('reducedDamageToTarget: ' + reducedDamageToTarget);
    console.log('resistantToTarget: ' + resistantToTarget);
    console.log('succeptableToTarget: ' + succeptableToTarget);
  }
});


let subPokemonRankings = _.uniq(_.map(subPokemonBySubKey, 'ranking')).sort().reverse();

console.log('\n\nPokemons to use for attacking:');
_.each(subPokemonRankings, (ranking) => {
  if (parseFloat(ranking) <= 1) return true;
  let subPokemonsOfRanking = _.filter(subPokemonBySubKey, o => o.ranking === ranking),
    subPokemonsOfRankingBySortKey = _.groupBy(subPokemonsOfRanking, o => _.padStart(o.maxCP, 5, '0') + '|' + o.name);
  console.log('\n' + ranking   + ' multiplier against ' + targetPokemon.name + ' for: ');
  _.each(_.keys(subPokemonsOfRankingBySortKey).sort().reverse(), (sortKey) => {
    let subPokemons = subPokemonsOfRankingBySortKey[sortKey];
    console.log(_.first(subPokemons).name + ' (Attacks: ' + _.map(subPokemons, 'attackType').join(', ') + ')');
  });
});


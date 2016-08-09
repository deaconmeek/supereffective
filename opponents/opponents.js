/* globals _ */

'use strict';

angular.module('pokemonFight.opponents', ['ngRoute'])

.controller('OpponentsCtrl', ['$scope', '$routeParams', '$http', function($scope, $routeParams, $http) {
  $http.get('../data/pokemon2.json').success(function(data) {
    $scope.pokemons = data;
    $http.get('../data/attacks3.json').success(function(data) {
      $scope.attacks = data;
      $http.get('../data/types2.json').success(function(data) {
        $scope.types = data;
        go();
        _.each($scope.rankedPokemon, o => (o.displayName = _.padStart(o.id, 3, '0') + ': ' + o.name));

        $scope.target.displayName = _.padStart($scope.target.id, 3, '0') + ': ' + $scope.target.name;
        $scope.target.displayTypes = $scope.target.types.join(', ');
        $scope.target.displayStrengths = $scope.target.resistantTo.join(', ');
        $scope.target.displayWeaknesses = $scope.target.succeptableTo.join(', ');
      });
    });
  });

  console.log = function(string) {
    $scope.result = $scope.result || "";
    $scope.result += string + "\n";
  };

  function go() {

    const attackDb = $scope.attacks;
    const pokemonDb = $scope.pokemons;
    const typeDb = $scope.types;

    let attackByName = _.keyBy(attackDb, o => o.name),
      pokemonById = _.keyBy(pokemonDb, 'id'),
      typeByName = _.keyBy(typeDb, o => o.name);

    _.each(typeByName, (type) => {
      type.resistantTo = type.resistantTo;
      type.succeptableTo = type.succeptableTo;
      type.bonusDamageTo = _.map(_.filter(typeByName, o => _.includes(o.succeptableTo, type.name)), 'name');
      type.reducedDamageTo = _.map(_.filter(typeByName, o => _.includes(o.resistantTo, type.name)), 'name');
    });

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


    let targetPokemonId = $routeParams.pokemonId;

    let targetPokemon = pokemonById[targetPokemonId],
     targetPokemonTypes = _.map(targetPokemon.types, o => typeByName[o].name);

    // let targetResistantTo = _.uniq(_.flatten(_.map(targetPokemon.types, o => _.union(typeByName[o].bonusDamageTo, typeByName[o].resistantTo)))).sort(),
    //   targetSucceptableTo = _.uniq(_.flatten(_.map(targetPokemon.types, o => _.union(typeByName[o].reducedDamageTo, typeByName[o].succeptableTo)))).sort();

    let targetResistantTo = _.uniq(_.flatten(_.map(targetPokemon.types, o => typeByName[o].resistantTo))).sort(),
      targetSucceptableTo = _.uniq(_.flatten(_.map(targetPokemon.types, o => typeByName[o].succeptableTo))).sort();

    targetPokemon.resistantTo = _.difference(targetResistantTo, targetSucceptableTo);
    targetPokemon.succeptableTo = _.difference(targetSucceptableTo, targetResistantTo);

    $scope.target = targetPokemon;

    console.log('----------------');
    console.log('Name: ' + targetPokemon.name);
    console.log('Type: ' + targetPokemon.types.join(', '));
    console.log('Resistant to: ' + targetPokemon.resistantTo.join(', '));
    console.log('Succeptable to: ' + targetPokemon.succeptableTo.join(', '));
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


    // Assign ratings for each pokemon/attack-type combination to determine their effectiveness against the target pokemon
    let rankedPokemon = _.cloneDeep(pokemonDb);
    _.each(rankedPokemon, (pokemon) => {

      // This formula assumes that the target pokemon will attack with his base types (for calculating defense multipliers)
      let defenseTypes = _.map(pokemon.types, o => typeByName[o]),
        resistantToTarget = _.chain(defenseTypes).map('resistantTo').flatten().uniq().intersection(targetPokemonTypes).value(),
        succeptableToTarget = _.chain(defenseTypes).map('succeptableTo').flatten().uniq().intersection(targetPokemonTypes).value();

      pokemon.defenceRanking = // pokemon.defense * pokemon.hitPoints *
        Math.pow(1.25, resistantToTarget.length) *
        Math.pow(0.80, succeptableToTarget.length);

      // console.log('pokemon: ' + pokemon.name);
      // console.log('pokemon.types: ' + pokemon.types);
      // console.log('resistantToTarget: ' + resistantToTarget);
      // console.log('succeptableToTarget: ' + succeptableToTarget);
      // console.log('pokemon.defenceRanking: ' + pokemon.defenceRanking);

      let attacks = _.map(_.union(pokemon.quickAttacks, pokemon.specialAttacks), o => attackByName[o]);
      _.each(attacks, (attack) => {

        let attackType = typeByName[attack.type],
          bonusDamageToTarget = _.intersection(attackType.bonusDamageTo, targetPokemonTypes),
          reducedDamageToTarget = _.intersection(attackType.reducedDamageTo, targetPokemonTypes);
        let stabBonus = _.includes(pokemon.types, attackType.name) ? 1.25 : 1;

        attack.attackRanking = attack.dps * stabBonus * //pokemon.attack *
          Math.pow(1.25, bonusDamageToTarget.length) *
          Math.pow(0.80, reducedDamageToTarget.length);

        // console.log('attack.name: ' + attack.name);
        // console.log('stabBonus: ' + stabBonus);
        // console.log('bonusDamageToTarget: ' + bonusDamageToTarget);
        // console.log('reducedDamageToTarget: ' + reducedDamageToTarget);
        // console.log('pokemon.attack.attackRanking: ' + attack.attackRanking);
      });
      pokemon.attacks = attacks;
    });

    rankedPokemon = _.sortBy(rankedPokemon, (pokemon) => {
      return _.max(_.map(_.filter(pokemon.attacks, o => o.attackType === 'quick'), o => o.attackRanking * pokemon.attack * pokemon.defenceRanking));
    }).reverse();

    console.log('\n\nRESULTS:');
    _.each(rankedPokemon, (pokemon) => {
      console.log('\npokemon: ' + pokemon.name);

      let attacksByAttackType = _.groupBy(pokemon.attacks, 'attackType'),
        quickAttacks = _.sortBy(attacksByAttackType.quick, 'attackRanking').reverse(),
        specialAttacks = _.sortBy(attacksByAttackType.special, 'attackRanking').reverse();

      console.log('quick attacks:');
      _.each(quickAttacks, (attack) => {
        console.log(attack.name + ': ' + attack.attackRanking);
      });
      console.log('special attacks:');
      _.each(specialAttacks, (attack) => {
        console.log(attack.name + ': ' + attack.attackRanking);
      });
      pokemon.quickAttacks = quickAttacks;
      pokemon.specialAttacks = specialAttacks;
    });
    $scope.rankedPokemon = rankedPokemon;


    // let subPokemonRankings = _.uniq(_.map(subPokemonBySubKey, 'ranking')).sort().reverse();
    // let subPokemonsByRanking = {};

    // console.log('\n\nPokemons to use for attacking:');
    // _.each(subPokemonRankings, (ranking) => {
    //   if (parseFloat(ranking) <= 1) return true;

    //   subPokemonsByRanking[ranking] = subPokemonsByRanking[ranking] || [];

    //   let subPokemonsOfRanking = _.filter(subPokemonBySubKey, o => o.ranking === ranking),
    //     subPokemonsOfRankingBySortKey = _.groupBy(subPokemonsOfRanking, o => _.padStart(o.ability, 10, '0') + '|' + o.name);
    //   console.log('\n' + ranking   + ' multiplier against ' + targetPokemon.name + ' for: ');
    //   _.each(_.keys(subPokemonsOfRankingBySortKey).sort().reverse(), (sortKey) => {
    //     let subPokemons = subPokemonsOfRankingBySortKey[sortKey];
    //     console.log(_.first(subPokemons).name + ' (Attacks: ' + _.map(subPokemons, 'attackType').join(', ') + ')');
    //     subPokemonsByRanking[ranking].push(_.extend(_.first(subPokemons), {attackTypes: _.map(subPokemons, 'attackType').join(', ')}));
    //   });
    // });
    // $scope.subPokemonsByRanking = subPokemonsByRanking;

  }


}]);

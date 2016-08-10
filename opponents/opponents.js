/* globals _ */

'use strict';

angular.module('pokemonFight.opponents', ['ngRoute'])

.controller('OpponentsCtrl', function($scope, $routeParams, $http) {
  $http.get('../data/pokemon2.json').success(function(data) {
    $scope.pokemons = data;
    $http.get('../data/attacks3.json').success(function(data) {
      $scope.attacks = data;
      $http.get('../data/types2.json').success(function(data) {
        $scope.types = augmentTypes(data);

        $scope.target = fetchTarget($routeParams.pokemonId, $scope.pokemons, $scope.types);
        $scope.opponents = fetchOpponents($scope.target, $scope.pokemons, $scope.attacks, $scope.types);
        $scope.getDisplayName = getDisplayName;
      });
    });
  });

  function getDisplayName(pokemon) {
    return _.padStart(pokemon.id, 3, '0') + ': ' + pokemon.name;
  }

  console.log = function(string) {
    $scope.result = $scope.result || "";
    $scope.result += string + "\n";
  };

  function augmentTypes(types) {
    _.each(types, (type) => {
      type.resistantTo = type.resistantTo;
      type.succeptableTo = type.succeptableTo;
      type.bonusDamageTo = _.map(_.filter(types, o => _.includes(o.succeptableTo, type.name)), 'name');
      type.reducedDamageTo = _.map(_.filter(types, o => _.includes(o.resistantTo, type.name)), 'name');
    });
    return types;
  }

  function fetchTarget(targetPokemonId, pokemons, types) {
    let pokemonById = _.keyBy(pokemons, 'id'),
      typeByName = _.keyBy(types, o => o.name);


    let targetPokemon = pokemonById[targetPokemonId];

    targetPokemon.resistantTo = _.uniq(_.flatten(_.map(targetPokemon.types, o => typeByName[o].resistantTo))).sort();
    targetPokemon.succeptableTo = _.uniq(_.flatten(_.map(targetPokemon.types, o => typeByName[o].succeptableTo))).sort();
    targetPokemon.bonusDamageTo = _.uniq(_.flatten(_.map(targetPokemon.types, o => typeByName[o].bonusDamageTo))).sort();
    targetPokemon.reducedDamageTo = _.uniq(_.flatten(_.map(targetPokemon.types, o => typeByName[o].reducedDamageTo))).sort();

    console.log('----------------');
    console.log('Name: ' + targetPokemon.name);
    console.log('Type: ' + targetPokemon.types.join(', '));
    console.log('Resistant to: ' + targetPokemon.resistantTo.join(', '));
    console.log('Succeptable to: ' + targetPokemon.succeptableTo.join(', '));
    console.log('----------------');

    return targetPokemon;
  }

  function fetchOpponents(targetPokemon, pokemons, attacks, types) {

    let attackByName = _.keyBy(attacks, 'name'),
      pokemonById = _.keyBy(pokemons, 'id'),
      typeByName = _.keyBy(types, 'name');

    let targetPokemonTypes = _.map(targetPokemon.types, o => typeByName[o].name);

    // Assign ratings for each pokemon/attack-type combination to determine their effectiveness against the target pokemon
    let opponents = _.cloneDeep(pokemons);
    _.each(opponents, (opponent) => {

      // This formula assumes that the target pokemon will attack with his base types (for calculating defense multipliers)
      let opponentTypes = _.map(opponent.types, o => typeByName[o]);

      opponent.resistantToTarget = _.chain(opponentTypes).map('resistantTo').flatten().uniq().intersection(targetPokemonTypes).value();
      opponent.succeptableToTarget = _.chain(opponentTypes).map('succeptableTo').flatten().uniq().intersection(targetPokemonTypes).value();
      opponent.bonusDamageToTarget = _.chain(opponentTypes).map('succeptableTo').flatten().uniq().intersection(targetPokemonTypes).value();
      opponent.reducedDamageToTarget = _.chain(opponentTypes).map('succeptableTo').flatten().uniq().intersection(targetPokemonTypes).value();

      opponent.defenseMultiplier =
        Math.pow(1.25, opponent.resistantToTarget.length) *
        Math.pow(0.80, opponent.succeptableToTarget.length);

      let opponentAttacks = _.cloneDeep(_.map(_.union(opponent.quickAttacks, opponent.specialAttacks), o => attackByName[o]));
      _.each(opponentAttacks, (attack) => {

        attack.value2 = JSON.stringify(attack.name);
        let attackType = typeByName[attack.type],
          bonusDamageToTarget = _.intersection(attackType.bonusDamageTo, targetPokemonTypes),
          reducedDamageToTarget = _.intersection(attackType.reducedDamageTo, targetPokemonTypes);

        attack.attackMultiplier =
          Math.pow(1.25, bonusDamageToTarget.length) *
          Math.pow(0.80, reducedDamageToTarget.length);

        attack.stabBonus = _.includes(opponent.types, attackType.name) ? 1.25 : 1;

        // dmg = CPMx / CPMy * (B.Ax + I.Ax) / (B.Dy + I.Dy) * Power * EffectivenessBonuses * STAB
        attack.value = opponent.attack / targetPokemon.defense *
          attack.dps * opponent.defenseMultiplier *
          attack.attackMultiplier * attack.stabBonus;
      });

      let attacksByAttackType = _.groupBy(opponentAttacks, 'attackType');
      opponent.quickAttacks = _.sortBy(attacksByAttackType.quick, 'value').reverse();
      opponent.specialAttacks = _.sortBy(attacksByAttackType.special, 'value').reverse();
    });

    opponents = _.sortBy(opponents, (opponent) => {
      return _.max(_.map(opponent.quickAttacks, 'value'));
    }).reverse();

    return(opponents);
  }
});

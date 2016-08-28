/* globals _ */

'use strict';

angular.module('pokemonFight.opponents', ['ngRoute'])

.controller('OpponentsCtrl', function($scope, $routeParams, $http) {
  $http.get('api/pokemon.json').success(function(data) {
    $scope.pokemons = data;
    $http.get('api/types.json').success(function(data) {
      $scope.types = augmentTypes(data);

      $scope.target = fetchTarget($routeParams.pokemonId, $scope.pokemons, $scope.types);

      $http.get('api/attacks.json').success(function(data) {
        $scope.attacks = data;

        $scope.getFullStars = getFullStars;
        $scope.getHalfStars = getHalfStars;
        $scope.getPositiveMultiplierCount = getPositiveMultiplierCount;
        $scope.getNegativeMultiplierCount = getNegativeMultiplierCount;
        $scope.toggleOpponent = toggleOpponent;
        $scope.showAllPokemon = showAllPokemon;
        $scope.showMyPokemon = showMyPokemon;

        initOpponents();
      });
    });
  });

  function initOpponents() {

    $scope.opponents = augmentOpponents(fetchOpponents($scope.target, $scope.pokemons, $scope.attacks, $scope.types));
    $scope.target.displayName = _.padStart($scope.target.id, 3, '0') + ': ' + $scope.target.name;
    _.each($scope.opponents, opponent => {
      opponent.displayName = _.padStart(opponent.id, 3, '0') + ': ' + opponent.name;
      opponent.collapsedView = true;
    });

    $scope.showAllPokemonMode = false;
    showMyPokemon();
  }

  function showAllPokemon() {
    _.each($scope.opponents, (opponent) => {
      opponent.notAvailable = false;
    });
    $scope.showAllPokemonMode = true;
  }

  function showMyPokemon() {
    let myPokemons = JSON.parse(localStorage.myPokemons);
    _.each($scope.opponents, (opponent) => {
      let quickAttackName = opponent.primaryAttack.name;
      opponent.notAvailable = !myPokemons[opponent.id][quickAttackName];
      _.each(opponent.specialAttacks, (attack) => {
        attack.notAvailable = !myPokemons[opponent.id][attack.name];
      });
    });
    $scope.showAllPokemonMode = false;
  }

  function getFullStars(attack) {
    return _.range(0, Math.floor((attack.value + 10) / 20));
  }
  function getHalfStars(attack) {
    return _.range(0, Math.round((((attack.value + 10) / 20) % 1)));
  }
  function getPositiveMultiplierCount(pokemon, attack) {
    return Math.max(0, Math.log(pokemon.defenseMultiplier * attack.attackMultiplier * attack.stabBonus) / Math.log(1.25));
  }
  function getNegativeMultiplierCount(pokemon, attack) {
    return Math.max(0, Math.round(-1 * Math.log(pokemon.defenseMultiplier * attack.attackMultiplier * attack.stabBonus) / Math.log(1.25)));
  }
  function toggleOpponent(opponent) {
    let isCollapsed = opponent.collapsedView;
    opponent.collapsedView = !isCollapsed;
  }

  function augmentTypes(types) {
    _.each(types, (type) => {
      type.resistantTo = type.resistantTo;
      type.succeptableTo = type.succeptableTo;
      type.bonusDamageTo = _.map(_.filter(types, o => _.includes(o.succeptableTo, type.name)), 'name');
      type.reducedDamageTo = _.map(_.filter(types, o => _.includes(o.resistantTo, type.name)), 'name');
    });
    return types;
  }

  function augmentOpponents(opponents) {
    _.each(opponents, (opponent) => {
      opponent.limit = 1;
      opponent.collapsedView = true;
    });
    return opponents;
  }

  function fetchTarget(targetPokemonId, pokemons, types) {
    let pokemonById = _.keyBy(pokemons, 'id'),
      typeByName = _.keyBy(types, o => o.name);


    let targetPokemon = pokemonById[targetPokemonId];
    targetPokemon.displayName = _.padStart(targetPokemon.id, 3, '0') + ': ' + targetPokemon.name;

    let resistantTo = _.uniq(_.flatten(_.map(targetPokemon.types, o => typeByName[o].resistantTo))).sort();
    let succeptableTo = _.uniq(_.flatten(_.map(targetPokemon.types, o => typeByName[o].succeptableTo))).sort();
    let bonusDamageTo = _.uniq(_.flatten(_.map(targetPokemon.types, o => typeByName[o].bonusDamageTo))).sort();
    let reducedDamageTo = _.uniq(_.flatten(_.map(targetPokemon.types, o => typeByName[o].reducedDamageTo))).sort();
    targetPokemon.resistantTo = _.difference(resistantTo, succeptableTo);
    targetPokemon.succeptableTo = _.difference(succeptableTo, resistantTo);
    targetPokemon.bonusDamageTo = _.difference(bonusDamageTo, reducedDamageTo);
    targetPokemon.reducedDamageTo = _.difference(reducedDamageTo, bonusDamageTo);

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

      // This formula assumes that the target pokemon will attack with all their attack types (for calculating defense multipliers)
      let opponentTypes = _.map(opponent.types, o => typeByName[o]),
        targetAttackTypes = _.uniq(_.map(_.map(_.union(targetPokemon.quickAttacks, targetPokemon.specialAttacks), o => attackByName[o]), 'attackType'));

      opponent.resistantToTarget = _.chain(opponentTypes).map('resistantTo').flatten().uniq().intersection(targetAttackTypes).value();
      opponent.succeptableToTarget = _.chain(opponentTypes).map('succeptableTo').flatten().uniq().intersection(targetAttackTypes).value();
      opponent.bonusDamageToTarget = _.chain(opponentTypes).map('succeptableTo').flatten().uniq().intersection(targetAttackTypes).value();
      opponent.reducedDamageToTarget = _.chain(opponentTypes).map('succeptableTo').flatten().uniq().intersection(targetAttackTypes).value();

      opponent.defenseMultiplier =
        Math.pow(1.25, opponent.resistantToTarget.length) *
        Math.pow(0.80, opponent.succeptableToTarget.length);

      let opponentAttacks = _.cloneDeep(_.map(_.union(opponent.quickAttacks, opponent.specialAttacks), o => attackByName[o]));
      _.each(opponentAttacks, (attack) => {

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

    let subOpponents = [];
    _.each(opponents, (opponent) => {
      _.each(opponent.quickAttacks, (quickAttack) => {
        let subOpponent = _.cloneDeep(opponent);
        subOpponent.primaryAttack = quickAttack;
        subOpponents.push(subOpponent);
      });
    });

    // opponents = _.sortBy(opponents, (opponent) => {
    //   return _.max(_.map(opponent.quickAttacks, 'value'));
    // }).reverse();

    // return(opponents);
    subOpponents = _.sortBy(subOpponents, o => o.primaryAttack.value).reverse();
    return(subOpponents);
  }
});

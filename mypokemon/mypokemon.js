'use strict';

angular.module('pokemonFight.mypokemon', ['ngRoute'])

.controller('MyPokemonCtrl', ['$scope', '$http', function ($scope, $http) {
  $http.get('api/attacks.json').success(function(attacks) {
    let attacksByName = _.keyBy(attacks, 'name');
    $http.get('api/pokemon.json').success(function(pokemons) {

      $scope.pokemons = pokemons;
      $scope.myPokemons = _getMyPokemons();

      $scope.pokemonsById = {};
      _.each(pokemons, pokemon => {
        pokemon.displayName = _.padStart(pokemon.id, 3, '0') + ': ' + pokemon.name;
        pokemon.quickAttacks = _.map(pokemon.quickAttacks, o => attacksByName[o]);
        pokemon.specialAttacks = _.map(pokemon.specialAttacks, o => attacksByName[o]);
        $scope.pokemonsById[pokemon.id] = pokemon;
        checkAvailability(pokemon.id);
      });
      $scope.bulkSet = bulkSet;
      $scope.isDisabled = isDisabled;
      $scope.toggle = toggle;
      $scope.query = '';

      $scope.$watch('myPokemons', function (nv) {
        console.log('saving to local storage..');
        localStorage.myPokemons = JSON.stringify(nv);
      }, true);
    });
  });

  function checkAvailability(pokemonId) {
    $scope.pokemonsById[pokemonId].isAvailable = !isDisabled(pokemonId);
  }
  function isDisabled(pokemonId) {
    let pokemon = _getMyPokemon(pokemonId);
    return !_.some(pokemon);
  }
  function toggle(pokemonId) {
    if (isDisabled(pokemonId)) {
      bulkSet([pokemonId], true);
    }
    else {
      bulkSet([pokemonId], false);
    }
  }

  function bulkSet(pokemonId, newValue) {
    console.log('bulk setting to: ' + newValue + ' for pokemonId: ' + pokemonId);
    let myPokemons = _getMyPokemons(),
      pokemonIdsToUpdate = pokemonId ? [pokemonId] : _.keys(myPokemons);
    _.each(pokemonIdsToUpdate, (pokemonId) => {
      _.each(myPokemons[pokemonId], (available, attackName) => {
        myPokemons[pokemonId][attackName] = newValue;
      });
      checkAvailability(pokemonId);
    });
    _setMyPokemons(myPokemons);
  }

  function _getMyPokemon(pokemonId) {
    return _getMyPokemons()[pokemonId];
  }

  function _getMyPokemons() {
    if ($scope.myPokemons) {
      return $scope.myPokemons;
    }
    else {
      return _initMyPokemons();
    }
  }

  function _initMyPokemons() {
    let myPokemons;
    try {
      myPokemons = localStorage.myPokemons ? JSON.parse(localStorage.myPokemons) : {};
    }
    catch (e) {
      console.log('Error parsing localstorage: ' + e);
      myPokemons = {};
    }

    if (_.isEmpty(myPokemons) || _.size(myPokemons) !== _.size($scope.pokemons)) {
      myPokemons = {};
      _.each($scope.pokemons, (pokemon) => {
        myPokemons[pokemon.id] = {};
        _.each(pokemon.quickAttacks, o => myPokemons[pokemon.id][o.name] = false);
        _.each(pokemon.specialAttacks, o => myPokemons[pokemon.id][o.name] = false);
      });
      console.log('Initialising myPokemons..');
      $scope.myPokemons = myPokemons;
    }
    return myPokemons;
  }

  function _setMyPokemons(myPokemons) {
    $scope.myPokemons = myPokemons;
  }
}]);

'use strict';

angular.module('pokemonFight.target', ['ngRoute'])

.controller('TargetCtrl', ['$scope', '$http', function ($scope, $http) {
  $http.get('../data/pokemon2.json').success(function(data) {
    $scope.pokemons = data;
  });
}]);
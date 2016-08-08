'use strict';

angular.module('pokemonFight.target', ['ngRoute'])

.controller('TargetCtrl', ['$scope', '$http', function ($scope, $http) {
  $http.get('../data/pokemon2.json').success(function(data) {
    _.each(data, o => (o.displayName = _.padStart(o.id, 3, '0') + ': ' + o.name));
    $scope.pokemons = data;
  });
}]);
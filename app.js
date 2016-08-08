'use strict';

// Declare app level module which depends on views, and components
angular.module('pokemonFight', [
  'ngRoute',
  'pokemonFight.target',
  'pokemonFight.opponents'
]).
config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
  $locationProvider.hashPrefix('!');
  $routeProvider.
  when("/target", {templateUrl: "target/target.html", controller: "TargetCtrl"}).
  when("/opponents/:pokemonId", {templateUrl: "opponents/opponents.html", controller: "OpponentsCtrl"}).
  otherwise({redirectTo: '/target'});
}]);

'use strict';

// Declare app level module which depends on views, and components
angular.module('pokemonFight', [
  'ngRoute',
  'pokemonFight.target',
  'pokemonFight.view2'
]).
config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
  $locationProvider.hashPrefix('!');
  $routeProvider.
  when("/target", {templateUrl: "target/target.html", controller: "TargetCtrl"}).
  when("/view2/:pokemonId", {templateUrl: "view2/view2.html", controller: "View2Ctrl"}).
  otherwise({redirectTo: '/target'});
}]);

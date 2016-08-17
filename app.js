'use strict';

// Declare app level module which depends on views, and components
angular.module('pokemonFight', [
  'ngRoute',
  'pokemonFight.target',
  'pokemonFight.opponents',
  'pokemonFight.mypokemon'
]).
config(function($locationProvider, $routeProvider) {

  $routeProvider.
  when("/api/pokemon", {templateUrl: "api/pokemon.json"}).
  when("/api/attacks", {templateUrl: "api/attacks.json"}).
  when("/api/types", {templateUrl: "api/types.json"}).
  when("/target", {templateUrl: "target/target.html", controller: "TargetCtrl"}).
  when("/opponents/:pokemonId", {templateUrl: "opponents/opponents.html", controller: "OpponentsCtrl"}).
  when("/mypokemon", {templateUrl: "mypokemon/mypokemon.html", controller: "MyPokemonCtrl"}).
  otherwise({redirectTo: '/target'});
});

angular.module('api', ['djangoRESTResources'])
	.factory('Place', function(djResource) {
		return djResource('/api/place/:id/', {id:'@id'});
	});


var app = angular.module(
	'application', ['api', 'ngRoute', 'ngResource', 'google-maps'],
	function($routeProvider, $resourceProvider, $httpProvider, $locationProvider) {

		$resourceProvider.defaults.stripTrailingSlashes = false;

		$locationProvider.html5Mode(true).hashPrefix('!');
		$httpProvider.defaults.xsrfCookieName = 'csrftoken';
		$httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';

		$routeProvider
			.when('/', {
				templateUrl: '/static/templates/index.html',
				controller: 'index',
				reloadOnSearch: false,

			})
			.when('/:id/:name', {
				templateUrl: '/static/templates/details.html',
				controller: 'details'
			})
			.when('/add', {
				templateUrl: '/static/templates/add.html',
				controller: 'add',
				reloadOnSearch: false,
			});

	})

app.factory('$config', ['$location', '$rootScope', '$route',
						function($location, $rootScope, $route) {

	var config = {
		map: {
			center: {
				latitude: parseFloat($location.search().latitude ||  51.919438),
				longitude: parseFloat($location.search().longitude || 19.145136),
			},
			zoom: parseInt($location.search().z || 4),
			events: {}
		},
		location: null,
	}

	return config;

}]);


app.controller('search', ['$scope', '$http', '$location', 'Place', '$config', '$routeParams', '$route', 
  function ($scope, $http, $location, Place, $config, $routeParams, $route) {
	  angular.element('.angular-google-map-container, #list .list-group, #details, #add').height(
		  angular.element(window).outerHeight(true) -
		  angular.element('footer').outerHeight(true) -
		  angular.element('#search').outerHeight(true)
	  );

	  $scope.search = function() {
	  	  $scope.disabled = true;
	  	  $scope.details = false;

	  	  var geocoder = new google.maps.Geocoder();
	  	  geocoder.geocode({'address': $scope.location}, function(results, status) {

	  		  if (results.length > 0) {
	  			  var location = results[0].geometry.location;

				  $location
					  .path("/")
					  .search('x', location.lng().toFixed(6))
					  .search('y', location.lat().toFixed(6))
					  .search('z', 14);
	  		  }

	  		  $scope.disabled = false;
	  		  $scope.$apply();
	  	  });
	  }

  }])

app.controller('index', ['$scope', '$http', '$location', 'Place', '$config', '$routeParams', '$rootScope',
  function ($scope, $http, $location, Place, $config, $routeParams, $rootScope) {

	  angular.element('.angular-google-map-container, #list .list-group, #details, #add').height(
		  angular.element(window).outerHeight(true) -
		  angular.element('footer').outerHeight(true) -
		  angular.element('#search').outerHeight(true)
	  );

	  $rootScope.map_center = {latitude: 0, longitude: 0};
	  $rootScope.map_zoom = 14;

	  $scope.map = {
		  center: $rootScope.map_center,
		  zoom: $rootScope.map_zoom,
		  events: {}
	  }

	  $scope.items = [];
	  $scope.details = false;
	  $scope.current_location = null;

	  $scope.show_details = function(item) {
		  $scope.details = item;
		  $scope.map.center = item.location;
	  }

	  var setup_map = function() {
		  var search = $location.search();
		  if ('x' in search &&
			  'y' in search &&
			  'z' in search) {

			  $scope.map.center.latitude = parseFloat(search.y);
	  		  $scope.map.center.longitude = parseFloat(search.x);
	  		  $scope.map.zoom = parseInt(search.z);
		  } else {

			  navigator.geolocation.getCurrentPosition(function(position) {
				  angular.copy(position.coords, $scope.current_location);

				  $scope.map.center.latitude = position.coords.latitude;
	  			  $scope.map.center.longitude = position.coords.longitude;
				  $scope.map.zoom = 14;

			  });
		  }
	  }

	  $scope.$on('$routeUpdate', function(next, current) {
		  setup_map();
	  });

	  setup_map();

	  $scope.map.events.dragstart = function(map) {
		  $scope.details = false;
	  }

	  $scope.map.events.idle = function(map) {

		  $location
		  	  .path("/")
		  	  .search('x', map.getCenter().lng().toFixed(6))
		  	  .search('y', map.getCenter().lat().toFixed(6))
		  	  .search('z', map.getZoom());

	  	  var search = {
	  	  	  lat0: map.getBounds().getSouthWest().lat(),
	  	  	  lng0: map.getBounds().getSouthWest().lng(),
	  	  	  lat1: map.getBounds().getNorthEast().lat(),
	  	  	  lng1: map.getBounds().getNorthEast().lng(),
	  	  }

		  $http({method: 'GET', url: '/api/search?' + decodeURIComponent($.param(search))})
	  		  .success(function(items, status, headers, config) {

	  			  $scope.items = items;

				  angular.forEach($scope.items, function(item, i) {
	  				  item.icon = '/static/img/map1-a.png';
	  				  item.click = function() {
						  var el = angular.element('#item-' + this.model.id)[0];
						  var elp = el.parentNode;

						  if (el.getBoundingClientRect().bottom > elp.getBoundingClientRect().bottom ||
							  el.getBoundingClientRect().top < elp.getBoundingClientRect().top) {
							  el.scrollIntoView();
						  }

	  					  $scope.details = this.model;
	  					  this.map.panTo(
	  						  new google.maps.LatLng(
	  							  this.coords.latitude,
	  							  this.coords.longitude
	  						  )
	  					  );
	  					  $scope.$apply();
	  			  	  }
	  			  });

			  });
	  }
}]);

app.controller('add', ['$scope', '$http', '$location', 'Place', '$config', '$rootScope',
  function ($scope, $http, $location, Place, $config, $rootScope) {

	  $scope.map = {
		  center: $rootScope.map_center || {latitude: 0, longitude: 0},
		  zoom: $rootScope.map_zoom || 13,
		  events: {}
	  }

	  angular.element('.angular-google-map-container, #list .list-group, #details, #add').height(
		  angular.element(window).outerHeight(true) -
		  angular.element('footer').outerHeight(true) -
		  angular.element('#search').outerHeight(true)
	  );

	  $scope.place = {
		  location: $scope.map.center
	  }

	  $scope.submit = function() {
		  Place.save($scope.place, function() {}, function(response) {
			  $scope.error = response.data;
		  })
	  }

}]);

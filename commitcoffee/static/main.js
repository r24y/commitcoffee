function distance(lat1, lon1, lat2, lon2, unit) {
	var radlat1 = Math.PI * lat1/180
	var radlat2 = Math.PI * lat2/180
	var radlon1 = Math.PI * lon1/180
	var radlon2 = Math.PI * lon2/180
	var theta = lon1-lon2
	var radtheta = Math.PI * theta/180
	var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
	dist = Math.acos(dist)
	dist = dist * 180/Math.PI
	dist = dist * 60 * 1.1515
	if (unit=="K") { dist = dist * 1.609344 }
	if (unit=="N") { dist = dist * 0.8684 }
	return dist
}

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
				controller: 'add'
			});

	});

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

	navigator.geolocation.getCurrentPosition(function(position) {
		config.location = {
			latitude: position.coords.latitude,
			longitude: position.coords.longitude
		}

		if ($location.search().latitude == undefined &&
			$location.search().longitude == undefined) {

			$location
				.path("/")
				.search('x', position.coords.longitude.toFixed(3))
				.search('y', position.coords.latitude.toFixed(3))
				.search('z', 14);
		}
	});

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
					  .search('x', location.lng().toFixed(3))
					  .search('y', location.lat().toFixed(3))
					  .search('z', 14);
	  		  }

	  		  $scope.disabled = false;
	  		  $scope.$apply();
	  	  });
	  }
}])

app.controller('index', ['$scope', '$http', '$location', 'Place', '$config', '$routeParams',
  function ($scope, $http, $location, Place, $config, $routeParams) {
	  $scope.map = $config.map;
	  $scope.items = [];
	  $scope.details = false;

	  $scope.show_details = function(item) {
		  $scope.details = item;

		  $config.map.center = item.location;
		  if ($config.map.zoom < 14) {
			  $config.map.zoom = 14;
		  }
	  }

	  var setup_map = function() {
		  var search = $location.search();
		  if ('x' in search &&
			  'y' in search &&
			  'z' in search) {

			  $scope.map.center.latitude = parseFloat(search.y);
	  		  $scope.map.center.longitude = parseFloat(search.x);
	  		  $scope.map.zoom = parseInt(search.z);
		  }
	  }

	  $scope.$on('$routeUpdate', function(next, current) {
		  setup_map();
	  });

	  setup_map();

	  $config.map.events.dragstart = function(map) {
		  google.maps.event.trigger(map, 'resize');
		  $scope.details = false;
	  }
	  $config.map.events.idle = function(map) {

		  google.maps.event.trigger(map, 'resize');

	  	  var search = {
	  	  	  lat0: map.getBounds().getSouthWest().lat(),
	  	  	  lng0: map.getBounds().getSouthWest().lng(),
	  	  	  lat1: map.getBounds().getNorthEast().lat(),
	  	  	  lng1: map.getBounds().getNorthEast().lng(),
	  	  }

		  $http({method: 'GET', url: '/api/search?' + decodeURIComponent($.param(search))})
	  		  .success(function(items, status, headers, config) {

	  			  if ($config.location) {
	  				  angular.forEach(items, function(item) {
	  			  		  item.distance = distance(
	  						  item.location.latitude,
	  						  item.location.longitude,
	  						  $config.location.latitude,
	  						  $config.location.longitude
	  					  ).toFixed(2);
	  				  })
	  			  	  $scope.items = _.sortBy(items, ['distance']);
	  			  } else {
	  				  $scope.items = items;
	  			  }

				  angular.forEach($scope.items, function(item, i) {
	  				  item.icon = '/static/img/map1-a.png';
	  				  item.click = function() {
	  					  $scope.details = this.model;

	  					  this.model.active = true;
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

app.controller('add', ['$scope', '$http', '$location', 'Place', '$config',
  function ($scope, $http, $location, Place, $config) {
	  $scope.map = $config.map;
	  $scope.map.events.idle = function(map) {
		  google.maps.event.trigger(map, 'resize');
	  };

	  $scope.place = {
		  location: $scope.map.center
	  }

	  $scope.submit = function() {
		  Place.save($scope.place, function() {}, function(response) {
			  $scope.error = response.data;
		  })
	  }

}]);

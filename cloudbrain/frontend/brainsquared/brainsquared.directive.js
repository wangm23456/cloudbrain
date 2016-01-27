(function () {
  'use strict';

  angular.module('cloudbrain.brainsquared')
    .directive('brainsquared', ['$document', '$rootScope', '$interval', 'apiService', 'Minion', 'Banana', 'CollisionDetector', 'Box', 'Accuracy', 'AnalysisModule',
      function($document, $rootScope, $interval, apiService, Minion, Banana, CollisionDetector, Box, Accuracy, AnalysisModule){

      var link = function(scope, element, attrs){
        $document.on('keypress', function(e) {
          switch(e.which) {
            case 97:
              scope.minion.step(-0.3);
              Accuracy.step(-0.3);
              break;
            case 108:
              scope.minion.step(0.3);
              Accuracy.step(0.3);
              break;
          }
        });

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera( 100, window.innerWidth/window.innerHeight, 0.1, 1000 );
        var renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.setClearColor( 0x000000, 0);
        renderer.autoClear = false;
        element[0].appendChild( renderer.domElement );

        var generateNewBanana = function () {
          scene.remove( scope.banana.sprite );
          scope.banana = new Banana(scope.bananaPosition);
          scope.banana.sprite.scale.set( 2, 2, 1 );
          scene.add( scope.banana.sprite );
          scope.minionBananaCollision = new CollisionDetector(scope.minion, scope.banana);
        };

        scope.minion = {};
        scope.banana = {};
        scope.bananaPosition = 'left';
        scope.score = 0;
        scope.missed = 0;
        scope.target = '';
        scope.accuracy = {};

        scope.minion = new Minion();
        scene.add( scope.minion.sprite );

        var texture = THREE.ImageUtils.loadTexture( '../images/wide-grass.png' );
        var backgroundMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(3, 0.2, 0),
            new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true
            }));

        backgroundMesh.material.depthTest = false;
        backgroundMesh.material.depthWrite = false;

        // Create your background scene
        var backgroundScene = new THREE.Scene();
        var backgroundCamera = new THREE.Camera();
        backgroundScene.position.setY(-2.5);
        // backgroundCamera.position.setY(1.5);
        backgroundCamera.position.set(0,0.46,0);
        backgroundScene.add(backgroundCamera);
        backgroundScene.add(backgroundMesh);

        scope.$watch('minionBananaCollision.hasCollided()', function (newValue, oldValue) {
          if(newValue) {
            console.log('Collision detected!');
            scope.bananaPosition = scope.bananaPosition == 'left' ? 'right' : 'left';
            generateNewBanana();
            scope.score += 1;
            scope.minion.jump();
          }
        }, true);

        scope.$watch('banana.sprite.position.y', function (newValue, oldValue) {
          if(newValue <= -2) {
            scope.missed += 1;
            generateNewBanana();
          }
        });

        scope.$on('accuracyUpdated', function (event, data) {
          scope.accuracy = data;
        });

        camera.position.z = 3;

        var render = function () {
          requestAnimationFrame(render);
          renderer.clear();
          renderer.render(scene, camera);
          renderer.clearDepth();
          // renderer.render(backgroundScene , backgroundCamera );
        };

        // var minionBox = new Box();
        // var bananaBox = new Box();
        // scene.add( minionBox.sprite );
        // scene.add( bananaBox.sprite );
        //
        // generateNewBanana();
        // minionBox.sprite.position.copy(minion.sprite.position);
        // minionBox.sprite.position.setX(minion.sprite.position.x + minion.offset.x + minion.bound.x);
        //
        // bananaBox.sprite.position.copy(scope.banana.sprite.position);
        // bananaBox.sprite.position.setX(scope.banana.sprite.position.x + scope.banana.offset.x + scope.banana.bound.x);
        // bananaBox.sprite.position.setY(-1);

        render();

        scope.startAll = function () {
          scope.motorImageryModule = new AnalysisModule('motor_imagery', 'openbci');
          scope.motorImageryModule.create().then(function () {
            scope.minion.start();
            generateNewBanana();
            scope.movement = $interval(function(){
              if(scope.banana) { scope.banana.drop(); }
              var target = scope.minionBananaCollision.target();
              scope.motorImageryModule.tag(target);
              scope.accuracy = Accuracy.get();
              Accuracy.setTarget(target);
            }, 50);
          });
        };

        scope.resetAll = function () {
          scope.minion.stop();
          scope.minion.reset();
          scope.banana.reset();
          Accuracy.reset();
          scope.score = 0;
          scope.missing = 0;
          $interval.cancel(scope.movement);
        };

        scope.togglePlay = function () {
          scope.connected === true ? scope.resetAll() : scope.startAll();
          scope.connected = !scope.connected;
        };

      };

      return {
        replace: true,
        restrict: 'E',
        scope: {},
        link: link,
        templateUrl: 'brainsquared/brainsquared-index.html'
      };

    }]);

})();
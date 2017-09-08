/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
/* !Config */
/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

var plugin = angular.module('api-for-kirby', []);

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
/* !API Factory */
/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

//Let's save this outside so we can inspect it

var api = {};

//Welcome to our factory
plugin.factory('api', function($http, $rootScope, $q, guide){
  api.loading = {};
  api.loaded = {};
  api.promises = [];
  //The load function
  api.load = function(currentpath){
    //Clean up.
    currentpath = (currentpath.indexOf('/') === 0) ? currentpath.replace('/','') : currentpath;
    //if the url has not been added to the loading
    if(!(currentpath in api.loading) && !api.loaded.full){
      //Let's add a universal listener for the url
      api.loading[currentpath] = $q.defer();
      //The actual get.
      $http.get('api.json?path='+currentpath+'&structure='+(api.loaded.pages ? 1 : 0)).then(function(response) {
        api.loaded = (!api.loaded.pages) ? response.data : api.loaded;
        storedpage = guide.resolve(api.loaded.pages, currentpath);
        loadedpage = (typeof response.data.pages !== 'object') ? response.data.page : guide.resolve(response.data.pages, currentpath);
        if(loadedpage) Object.assign(storedpage, loadedpage);
        api.loading[currentpath].resolve(api.loaded);
        api.resolve(api.loaded);
      });
    } else if(api.loaded.full) {
      api.loading[currentpath] = $q.defer();
      api.loading[currentpath].resolve(api.loaded);
      api.resolve(api.loaded);
    }
    //Return a promise
    return api.loading[currentpath].promise;
  }

  //Wait for someone else to load the content.
  api.wait = function(){
    var promise = $q.defer();
    api.promises.push(promise);
    if(Object.keys(api.loaded).length){
      for (first in api.loaded) break;
      api.resolve(api.loaded);
    }
    return promise.promise;
  }

  //Tell the waiting parties to get their data
  api.resolve = function(data){
    api.promises.forEach(function(promise) {
      promise.resolve(data)
    });
  }

  //
  api.full = function(){
    var promise = $q.defer();
    if(!api.loaded.full && !api.loading.full){
      api.loading.full = true;
      $http.get('api.json?full=true').then(function(response){
        promise.resolve(response.data);
        api.loaded = response.data;
        api.loaded.full = true;
      });
    }
    return promise.promise;
  }


  //Tell the waiting parties to get their data
  api.extend = function(pages){
    if(pages){
      if(Object.keys(pages).length){
        Object.keys(pages).map(function(key) {
          if(!pages[key].extended){
            api.load(pages[key].uri).then(function(data){
              if(pages[key].children){
                api.extend(pages[key].children);
              }
            });
          } else {
            if(pages[key].children){
              api.extend(pages[key].children);
            }
          }
        });
      }
    }
  }

  //Return object
  return api
});

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
/* !Guide for navigating objects */
/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

plugin.factory('guide', function(){
    var guide = {};
    guide.resolve = function(object, currentpath) {
        //If path is the root there's nothing to resolve
        if(currentpath == '/') return object;
        //Remove the slash from the beginning if it exists
        currentpath = (currentpath.indexOf('/') === 0) ? currentpath.replace('/','') : currentpath;
        //Split path to array
        var parts = currentpath.split('/');
        //The magic while loop which switfts out url parts while going deeper to our objects(or children objects)
        while( parts.length && (object = ('children' in object) ? object.children[parts.shift()] : object[parts.shift()]));
        //Return object
        return object;
    }
    return guide;
});

//Welcome to our factory
export default class api {

  constructor($http, $rootScope, $q){

  var api = {};
  api.loading = {};
  api.loaded = {};
  api.language = 'en';
  api.promises = [];
  api.querystring = '';

  /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
  /* !IE Polyfill */
  /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

  if (typeof Object.assign != 'function') {
    Object.assign = function(target) {
      'use strict';
      if (target == null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }

      target = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var source = arguments[index];
        if (source != null) {
          for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }
      }
      return target;
    };
  }

  //The load function
  api.load = function(currentpath, site){
    //Clean up the path.
    currentpath = (currentpath.indexOf('/') === 0 && currentpath != '/') ? currentpath.replace('/','') : currentpath;
    //if the url has not been added to the loading
    if(api.loaded.full) {
     api.loading[currentpath] = $q.defer();
     api.loading[currentpath].resolve(api.loaded);
     api.resolve(api.loaded);
    } else if(!(currentpath in api.loading)){
      //Let's add a universal listener for the url
      api.loading[currentpath] = $q.defer();
      //The query string
      api.querystring = 'api.json?path='+currentpath;
      api.querystring = api.querystring+'&structure='+(api.loaded.pages ? 1 : 0);
      api.querystring = api.querystring+'&language='+api.language;
      //The actual get.
      $http.get(api.querystring).then(function(response) {
        //Check if API is loaded once already
        if(api.loaded.pages) {
          let storedpage = api.guide.resolve(api.loaded.pages, currentpath);
          //console.info('Stored:', storedpage.children);
          let loadedpage = (typeof response.data.pages !== 'object') ? response.data.page : api.guide.resolve(response.data.pages, currentpath);
          if(typeof loadedpage == 'object' && typeof storedpage == 'object'){
            Object.assign(storedpage, loadedpage);
          }
          if(typeof storedpage.children == 'object'){
            loadedpage.children = storedpage.children;
          }

        } else {
          api.loaded = response.data;
          let storedpage = api.guide.resolve(response.data.pages, currentpath);
          //console.log('No stored pages', storedpage, currentpath);
          let loadedpage = (typeof response.data.pages !== 'object') ? response.data.page : api.guide.resolve(response.data.pages, currentpath);
          //console.log('Loaded:', loadedpage, currentpath);
          if(typeof loadedpage == 'object' && typeof storedpage == 'object'){
            Object.assign(storedpage, loadedpage);
          }
        }
        api.loading[currentpath].resolve(api.loaded);
        api.resolve(api.loaded);
      });
    }
    //console.timeEnd('Load');
    //Return a promise
    return api.loading[currentpath].promise;
  }

  //Wait for someone else to load the content.
  api.wait = function(){
    var promise = $q.defer();
    api.promises.push(promise);
    if(Object.keys(api.loaded).length){
      for (let first in api.loaded) break;
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
  };


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
  };

  api.guide = {};
  api.guide.resolve = function(object, currentpath, site) {
      //console.time('Resolve');
      if(typeof object != 'undefined'){
        //If path is the root there's nothing to resolve
        currentpath = ((currentpath == '/' || currentpath == undefined) && site) ? site.homepage : currentpath;
        console.log('currentpath', currentpath, site);
        //Remove the slash from the beginning if it exists
        currentpath = (currentpath.indexOf('/') === 0) ? currentpath.replace('/','') : currentpath;
        //Split path to array
        var parts = currentpath.split('/');
        //console.log('parts', parts);
        //The magic while loop which switfts out url parts while going deeper to our objects(or children objects)
        while(parts.length){
          if(typeof object.children === 'object'){
            //console.log('has children:', parts[0], object, parts);
            object = object.children[parts.shift()];
            //console.info('Result:', object);
          } else if( typeof object.children === 'undefined' ) {
            //console.log('no children:', parts[0], object, parts);
            object = object[parts.shift()];
          } else {
            console.error('Something went wrong.');
          }
        }
        //console.timeEnd('Resolve');
        //Return object
        return object;
      }
  }


  //Tell the waiting parties to get their data
  api.setLanguage = function(language){
    api.language = language;
  };

  //Return object
  return api
}}

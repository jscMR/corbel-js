//@exclude
'use strict';
//@endexclude
(function() {

  /**
   * A base object to inherit from for make corbel-js requests with custom behavior.
   * @exports Services
   * @namespace
   * @extends corbel.Object
   * @memberof corbel
   */
  var Services = corbel.Services = corbel.Object.inherit({ //instance props

    /**
     * Creates a new Services
     * @memberof corbel.Services.prototype
     * @param  {string}                         id String with the asset id or `all` key
     * @return {corbel.Services}
     */
    constructor: function(driver) {
      this.driver = driver;
    },

    /**
     * Execute the actual ajax request.
     * Retries request with refresh token when credentials are needed.
     * Refreshes the client when a force update is detected.
     * Returns a server error (corbel.Services._FORCE_UPDATE_STATUS_CODE - unsupported_version) when force update max retries are reached
     *
     * @memberof corbel.Services.prototype
     * @param  {Promise} dfd     The deferred object to resolve when the ajax request is completed.
     * @param  {object} args    The request arguments.
     */
    request: function(args) {

      var params = this._buildParams(args);

      var that = this;
      return this._doRequest(params).catch(function(response) {
        var tokenObject = that.driver.config.get(corbel.Iam.IAM_TOKEN, {});
        if (response.status === corbel.Services._UNAUTHORIZED_STATUS_CODE && tokenObject.refreshToken) {
          return that._refreshHandler().then(function() {
            return that._doRequest(that._buildParams(args));
          }).catch(function() {
            return Promise.reject(response);
          });
        } else {
          console.log('corbeljs:services:no_refresh', response.status, !!tokenObject);
          return Promise.reject(response);
        }
      });

    },

    /**
     * Internal request method.
     * Has force update behavior
     * @param  {object} params
     * @return {Promise}
     */
    _doRequest: function(params) {
      var that = this;
      return corbel.request.send(params).then(function(response) {

        that.driver.config.set(corbel.Services._FORCE_UPDATE_STATUS, 0);

        return Promise.resolve(response);

      }).catch(function(response) {

        // Force update
        if (response.status === corbel.Services._FORCE_UPDATE_STATUS_CODE &&
          response.textStatus === corbel.Services._FORCE_UPDATE_TEXT) {

          var retries = that.driver.config.get(corbel.Services._FORCE_UPDATE_STATUS, 0);
          if (retries < corbel.Services._FORCE_UPDATE_MAX_RETRIES) {
            retries++;
            that.driver.config.set(corbel.Services._FORCE_UPDATE_STATUS, retries);

            corbel.utils.reload(); //TODO nodejs
            // in node return rejected promise
            return Promise.reject(response);
          } else {
            return Promise.reject(response);
          }
        } else {
          return Promise.reject(response);
        }

      });
    },

    /**
     * Default token refresh handler
     * @return {Promise}
     */
    _refreshHandler: function() {
      console.log('corbeljs:services:refresh');
      return this.driver.iam.token().refresh(this.driver.config.get(corbel.Iam.IAM_TOKEN, {}).refreshToken, this.driver.config.get(corbel.Iam.IAM_TOKEN_SCOPES));
    },

    /**
     * Add Authorization header with default tokenObject
     * @param {object} params request builded params
     */
    _addAuthorization: function(params) {
      // @todo: support to oauth token and custom handlers
      var accessToken = this.driver.config.get(corbel.Iam.IAM_TOKEN, {}).accessToken;

      // Use access access token if exists
      if (accessToken) {
        params.headers.Authorization = 'Bearer ' + accessToken;
      }
      return params;
    },

    /**
     * Returns a valid corbel.request parameters with default values
     * and authorization params if needed.
     * By default, all request are json (dataType/contentType)
     * with object serialization support
     * 
     * @memberof corbel.Services.prototype
     * @param  {object} args
     * @return {object}
     */
    _buildParams: function(args) {

      // Default values
      var defaults = {
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        dataFilter: corbel.Services.addEmptyJson,
        headers: {
          Accept: 'application/json'
        },
        method: corbel.request.method.GET
      };
      var params = corbel.utils.defaults(args, defaults);

      if (!params.url) {
        throw new Error('You must define an url');
      }

      if (params.query) {
        params.url += '?' + encodeURIComponent(params.query);
      }

      if (params.noRedirect) {
        params.headers['No-Redirect'] = true;
      }

      if (params.Accept) {
        params.headers.Accept = params.Accept;
        params.dataType = undefined; // Accept & dataType are incompatibles
      }

      // set correct accept & contentType in case of blob
      // @todo: remove contentType+accept same-type constraint
      if (params.dataType === 'blob') {
        if (corbel.Config.isBrowser) {
          params.headers.Accept = params.data.type;
          params.contentType = params.data.type;
          params.dataType = undefined; // Accept & dataType are incompatibles
        }
      }

      params = this._addAuthorization(params);

      return corbel.utils.pick(params, ['url', 'dataType', 'contentType', 'method', 'headers', 'data', 'dataFilter', 'responseType']);
    },

    /**
     * @memberof corbel.Services.prototype
     * @return {string}
     */
    _buildUri: function() {

      var uri = '';
      if (this.urlBase.slice(-1) !== '/') {
        uri += '/';
      }

      Array.prototype.slice.call(arguments).forEach(function(argument) {
        if (argument) {
          uri += argument + '/';
        }
      });

      // remove last '/'
      uri = uri.slice(0, -1);

      return this.urlBase + uri;
    }

  }, {

    /**
     * _FORCE_UPDATE_TEXT constant
     * @constant
     * @memberof corbel.Services
     * @type {string}
     * @default
     */
    _FORCE_UPDATE_TEXT: 'unsupported_version',

    /**
     * _FORCE_UPDATE_MAX_RETRIES constant
     * @constant
     * @memberof corbel.Services
     * @type {number}
     * @default
     */
    _FORCE_UPDATE_MAX_RETRIES: 3,

    /**
     * _FORCE_UPDATE_STATUS constant
     * @constant
     * @memberof corbel.Services
     * @type {string}
     * @default
     */
    _FORCE_UPDATE_STATUS: 'fu_r',

    /**
     * _FORCE_UPDATE_STATUS_CODE constant
     * @constant
     * @memberof corbel.Services
     * @type {number}
     * @default
     */
    _FORCE_UPDATE_STATUS_CODE: 403,

    /**
     * _UNAUTHORIZED_STATUS_CODE constant
     * @constant
     * @memberof corbel.Services
     * @type {number}
     * @default
     */
    _UNAUTHORIZED_STATUS_CODE: 401,

    /**
     * Extract a id from the location header of a requestXHR
     * @memberof corbel.Services
     * @param  {Promise} res response from a requestXHR
     * @return {String}  id from the Location
     */
    getLocationId: function(responseObject) {
      responseObject = responseObject || {};
      var location;

      if (responseObject.xhr) {
        location = responseObject.xhr.getResponseHeader('location');
      } else if (responseObject.response && responseObject.response.headers.location) {
        location = responseObject.response.headers.location;
      }
      return location ? location.substr(location.lastIndexOf('/') + 1) : undefined;
    },

    /**
     * @memberof corbel.Services
     * @param {mixed} response
     * @param {string} type
     * @return {midex}
     */
    addEmptyJson: function(response, type) {
      if (!response && type === 'json') {
        response = '{}';
      }
      return response;
    }
  });

  return Services;

})();

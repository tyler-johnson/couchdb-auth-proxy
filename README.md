# couchdb-auth-proxy

[![npm](https://img.shields.io/npm/v/couchdb-auth-proxy.svg)](https://www.npmjs.com/package/couchdb-auth-proxy) [![David](https://img.shields.io/david/tyler-johnson/couchdb-auth-proxy.svg)](https://david-dm.org/tyler-johnson/couchdb-auth-proxy) [![Build Status](https://travis-ci.org/tyler-johnson/couchdb-auth-proxy.svg?branch=master)](https://travis-ci.org/tyler-johnson/couchdb-auth-proxy)

An HTTP reverse proxy server for easy CouchDB proxy authentication.

## Install

Install from NPM

```bash
npm install couchdb-auth-proxy -S
```

And import into your project

```js
import couchdbProxy from "couchdb-auth-proxy";
```

```js
const couchdbProxy = require("couchdb-auth-proxy");
```

## Usage

To begin, ensure proxy authentication is enabled on your CouchDB server. This is as simple as adding `{couch_httpd_auth, proxy_authentication_handler}` to the list of active authentication handlers in your configuration. Your `local.ini` file should have a line that looks something like this:

```ini
[httpd]
authentication_handlers = {couch_httpd_oauth, oauth_authentication_handler}, {couch_httpd_auth, cookie_authentication_handler}, {couch_httpd_auth, proxy_authentication_handler}, {couch_httpd_auth, default_authentication_handler}
```

This library returns an Express/Connect middleware function. It accepts two arguments: a user context method and some options.

```js
const app = express();

app.use(couchdbProxy(function(req) {
  // admin party!
  return {
    name: null,
    roles: [ "_admin" ]
  };
}));
```

In CouchDB, users are represented with a user context object. These are simply objects with `name` and `roles` fields. Usually this information comes from a document in the `_users` database, however we can also generate it from other means.

This library allows you to complete asynchronous authentication lookup, return a promise or pass `next` as the third argument. If you do use the `next()` callback, you absolutely must call it, or the request will never complete.

```js
app.use(couchdbProxy(function(req, res, next) {
  const token = req.get("Authorization");

  validateToken(token, function(err, user) {
    if (err) return next(err);

    return {
      name: user.name,
      roles: []
    };
  });
}));
```

## API

#### `couchdbProxy( userCtxFn [, options ] ) → Middleware`

- `userCtxFn` (Function, *required*) - Method called on every request, with the request `req` and response `res` as arguments. This method should return a plain object with `name` and `roles` fields, representing the authenticated user. To run an async task, return a promise or pass a third argument `next` for a callback.
- `options` (Object) - Options to configure the proxy.
  - `options.target` (String) - The URL of the CouchDB server to proxy to. This server must have [proxy authentication enabled](http://docs.couchdb.org/en/1.6.1/api/server/authn.html#proxy-authentication).
  - `options.secret` (String) - The [CouchDB secret](http://docs.couchdb.org/en/1.6.1/config/auth.html#couch_httpd_auth/secret) used to sign proxy tokens and cookies. This is very much an optional parameter and in general there is very little reason to use a secret. This is only absolutely required if `couch_httpd_auth/proxy_use_secret` is enabled on CouchDB.
  - `options.via` (String) - The name of the proxy to add to the `Via` header. This is so consumers of the HTTP API can tell that the request was directed through a proxy. This is optional and the `Via` header will be excluded when not provided.
  - `options.headerFields` (Object) - A map of custom header fields to use for the proxy. This should match what is declared in CouchDB `couch_httpd_auth` configuration, under `x_auth_roles`, `x_auth_token`, and `x_auth_username`. This is the default map:
    ```json
    {
      "username": "X-Auth-CouchDB-UserName",
      "roles": "X-Auth-CouchDB-Roles",
      "token": "X-Auth-CouchDB-Token"
    }
    ```

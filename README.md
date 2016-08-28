# couchdb-auth-proxy

[![npm](https://img.shields.io/npm/v/couchdb-auth-proxy.svg)](https://www.npmjs.com/package/couchdb-auth-proxy) [![David](https://img.shields.io/david/tyler-johnson/couchdb-auth-proxy.svg)](https://david-dm.org/tyler-johnson/couchdb-auth-proxy) [![Build Status](https://travis-ci.org/tyler-johnson/couchdb-auth-proxy.svg?branch=master)](https://travis-ci.org/tyler-johnson/couchdb-auth-proxy)

A Node.js HTTP reverse proxy library for quick and dirty CouchDB proxy authentication.

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

> Note: Ensure proxy authentication is enabled on your CouchDB server. This is as simple as adding `{couch_httpd_auth, proxy_authentication_handler}` to the list of active authentication handlers in your configuration. See the [CouchDB Docs](http://docs.couchdb.org/en/1.6.1/api/server/authn.html#proxy-authentication) for more info.

This library generates an HTTP server request function from two arguments: a user context method and some options. This method will work with Express/Connect apps as well as the plain Node.js HTTP server.

Here is an example proxy that authenticates every request as a super admin:

```js
const server = http.createServer(couchdbProxy(function(req) {
  // admin party!
  return {
    name: null,
    roles: [ "_admin" ]
  };
}));
```

In CouchDB, users are represented with a user context object. These are objects with `name` and `roles` fields. Usually this information comes from a document in the `_users` database, however we can also generate it from other means.

Your proxy can complete asynchronous tasks, great for authenticating against other databases or services. You can return a promise, or provide a third argument for a callback.

```js
const server = http.createServer(couchdbProxy(function(req, res, next) {
  const token = req.get("Authorization");

  db.authenticateToken(token, (err, user) => {
    if (err) return next(err);

    next(null, {
      name: user.name,
      roles: []
    });
  });
}));
```

## API

#### `couchdbProxy( userCtxFn [, options ] ) → Middleware`

- `userCtxFn` (Function, *required*) - Method called on every request, with the request `req` and response `res` as arguments. This method should return a plain object with `name` and `roles` fields, representing the authenticated user. To run an async task, return a promise or pass a third argument `next` for a callback.
- `options` (Object) - Options to configure the proxy.
  - `options.target` (String) - The URL of the CouchDB server to proxy to. This server must have [proxy authentication enabled](http://docs.couchdb.org/en/1.6.1/api/server/authn.html#proxy-authentication). Defaults to `http://localhost:5984`.
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
  - `options.info` (Object) - Some JSON serializable value that will be injected into the CouchDB's root info document response.

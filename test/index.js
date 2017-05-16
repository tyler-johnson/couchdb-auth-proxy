import {test} from "./utils";
import couchdbProxy from "../src/index";
import request from "supertest";

test("attaches proxy headers", async function(t, couchdb, target) {
  t.plan(4);

  couchdb.use(function(req, res) {
    t.equals(req.get("X-Auth-CouchDB-UserName"), "test", "proxied correct user name");
    t.equals(req.get("X-Auth-CouchDB-Roles"), "testrole1,testrole2", "proxied correct roles");
    t.notOk(req.get("X-Auth-CouchDB-Token"), "did not proxy a token");
    res.json({ foo: "bar" });
  });

  const proxy = couchdbProxy(function() {
    return {
      name: "test",
      roles: [ "testrole1", "testrole2" ]
    };
  }, {
    target
  });

  const {body} = await request(proxy).get("/").expect(200);
  t.equals(body.foo, "bar", "has original json content");
});

test("signs request with secret", async function(t, couchdb, target) {
  t.plan(3);
  const secret = "mysupersecret";
  const token = couchdbProxy.sign("test", secret);

  couchdb.use(function(req, res) {
    t.equals(req.get("X-Auth-CouchDB-Token"), token, "proxied signed token");
    res.json({ foo: "bar" });
  });

  const proxy = couchdbProxy(function() {
    return {
      name: "test",
      roles: [ "testrole1", "testrole2" ]
    };
  }, {
    target, secret
  });

  t.ok(token, "created a token");

  const {body} = await request(proxy).get("/").expect(200);
  t.equals(body.foo, "bar", "has original json content");
});

test("injects proxy info into root response", async function(t, couchdb, target) {
  t.plan(2);

  couchdb.get("/", (req, res) => {
    res.json({ foo: "bar" });
  });

  const proxy = couchdbProxy(function() {
    return {
      name: "test",
      roles: [ "testrole1", "testrole2" ]
    };
  }, {
    target,
    info: { hello: "world" }
  });

  const {body} = await request(proxy).get("/").expect(200);
  t.equals(body.foo, "bar", "has original json content");
  t.deepEquals(body.proxy, { hello: "world" }, "has custom info contents");
});

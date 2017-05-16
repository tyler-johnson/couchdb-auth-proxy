import tape from "tape";
import tapePromise from "tape-promise";
import http from "http";
import express from "express";

const tapeTest = tapePromise(tape);

export async function startServer(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, () => {
      server.removeListener("error", reject);
      resolve();
    });
  });

  return "http://127.0.0.1:" + server.address().port;
}

export function test(name, fn) {
  return tapeTest(name, async function(t) {
    const couchdb = express();
    const couchdbServer = http.createServer(couchdb);

    try {
      const couchdbUrl = await startServer(couchdbServer);
      await fn.call(this, t, couchdb, couchdbUrl);
    } finally {
      couchdbServer.close();
    }
  });
}

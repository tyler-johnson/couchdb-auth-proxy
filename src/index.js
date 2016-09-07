import {createHmac} from "crypto";
import {name,version} from "../package.json";
import {parse} from "url";
import httpProxy from "http-proxy";
import transformerProxy from "transformer-proxy";

export default function(fn, opts={}) {
	if (typeof fn === "object") [opts,fn] = [fn,opts];

	let {
		via,
		secret,
		target="http://localhost:5984",
		headerFields = {},
		info = { name, version }
	} = opts;

	headerFields = Object.assign({
		username: "X-Auth-CouchDB-UserName",
		roles: "X-Auth-CouchDB-Roles",
		token: "X-Auth-CouchDB-Token"
	}, headerFields);

	const injectProxyInfo = info ? transformerProxy(function(data) {
		if (Buffer.isBuffer(data)) data = data.toString("utf-8");

		try {
			const body = JSON.parse(data);
			body.proxy = info;
			return JSON.stringify(body);
		} catch(e) {
			return data;
		}
	}) : null;

	const proxy = httpProxy.createProxyServer({ target });

	return async function(req, res, next) {
		try {
			// hijack the root response and inject proxy information
			if (injectProxyInfo && parse(req.url).pathname === "/") {
				await confusedAsync(injectProxyInfo, null, [req, res]);
			}

			// inject couchdb proxy headers into request
			const ctx = await confusedAsync(fn, null, [ req, res ]);
			if (ctx != null) {
				const name = typeof ctx.name === "string" ? ctx.name : "";
				req.headers[headerFields.username] = name;
				req.headers[headerFields.roles] = Array.isArray(ctx.roles) ? ctx.roles.join(",") : "";
				if (secret) req.headers[headerFields.token] = signRequest(name, secret);
			}

			// attach Via header on response
			// do this last in case there was an error
			if (via) {
				const writeHead = res.writeHead;
				res.writeHead = function(code, headers) {
					const existing = res.getHeader("Via");
					const viaheader = `${existing ? existing + ", " : ""}${req.httpVersion} ${via} (${name}/${version})`;
					res.setHeader("Via", viaheader);
					if (headers) headers["Via"] = viaheader;

					return writeHead.apply(res, arguments);
				};
			}

			proxy.web(req, res);
		} catch(e) {
			if (next) next(e);
			else throw e;
		}
	};
}

// couchdb proxy signed token
function signRequest(user, secret) {
	return createHmac("sha1", secret).update(user).digest("hex");
}

// for methods that we don't know if they are callback or promise async
function confusedAsync(fn, ctx, args=[]) {
	if (fn.length > args.length) {
		return new Promise(function(resolve, reject) {
			fn.apply(ctx, args.concat(function(err, r) {
				if (err) reject(err);
				else resolve(r);
			}));
		});
	} else {
		return Promise.resolve(fn.apply(ctx, args));
	}
}

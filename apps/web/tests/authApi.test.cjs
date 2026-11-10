const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");
const vm = require("node:vm");

// Run from any directory: node --test apps/web/tests/authApi.test.cjs
const projectRoot = path.resolve(__dirname, "..");
const compiledDirectory = mkdtempSync(path.join(tmpdir(), "gutv-auth-tests-"));
after(() => rmSync(compiledDirectory, { recursive: true, force: true }));
execFileSync(
  path.join(projectRoot, "node_modules/.bin/tsc"),
  [
    "--ignoreConfig",
    "--target",
    "ES2022",
    "--module",
    "commonjs",
    "--lib",
    "ES2022,DOM",
    "--types",
    "node",
    "--skipLibCheck",
    "--outDir",
    compiledDirectory,
    "src/lib/api.ts",
    "src/lib/authApi.ts",
  ],
  { cwd: projectRoot, stdio: "pipe" },
);
const source = readFileSync(path.join(compiledDirectory, "authApi.js"), "utf8");
const apiSource = readFileSync(path.join(compiledDirectory, "api.js"), "utf8");

class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

const nextTurn = () => new Promise((resolve) => setImmediate(resolve));
const jwt = (name, secondsLeft = 900) =>
  `header.${Buffer.from(
    JSON.stringify({
      sub: "1",
      exp: Math.floor(Date.now() / 1000) + secondsLeft,
    }),
  ).toString("base64url")}.${name}`;
const refreshed = (name, secondsLeft) => ({
  refreshToken: { accessToken: jwt(name, secondsLeft) },
});
const rejected = () => new ApiError(200, "Недействительный refresh token");
const unauthorized = () =>
  new ApiError(
    200,
    "The current user is not authorized to access this resource.",
    [{ extensions: { code: "AUTH_NOT_AUTHORIZED" } }],
  );
const isRefresh = (query) => query.includes("mutation RefreshToken");
const tokenName = (token) => token?.split(".")[2] ?? null;

// Tabs share localStorage and Web Locks, as tabs of one browser do; each has its own memory.
function environment({ withLocks = true, signedIn = true } = {}) {
  const values = new Map([["auth_session_id", "session-old"]]);
  if (signedIn) values.set("auth_signed_in", "1");
  const localStorage = {
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
  const lockTails = new Map();
  const locks = {
    request(name, callback) {
      const previous = lockTails.get(name) ?? Promise.resolve();
      const result = previous.then(callback);
      lockTails.set(
        name,
        result.catch(() => {}),
      );
      return result;
    },
  };
  let nextId = 0;
  const redirects = [];
  function tab(graphqlRequest) {
    const module = { exports: {} };
    const context = vm.createContext({
      module,
      exports: module.exports,
      require: () => ({ ApiError, graphqlRequest }),
      localStorage,
      navigator: withLocks ? { locks } : {},
      crypto: { getRandomValues: (bytes) => bytes.fill(++nextId) },
      setTimeout,
      atob,
      window: { location: { assign: (url) => redirects.push(url) } },
    });
    vm.runInContext(source, context, { filename: "authApi.js" });
    return module.exports;
  }
  return { localStorage, values, redirects, tab };
}

// Records every call; refreshes answer from `refreshes`, data requests from `data`.
function server({ refreshes = [], data = [] } = {}) {
  const calls = [];
  const request = (query, variables, options) => {
    calls.push({ query, variables, token: options?.token ?? null });
    const queue = isRefresh(query) ? refreshes : data;
    const next = queue.length > 0 ? queue.shift() : { ok: true };
    if (typeof next === "function") return next();
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  };
  return {
    request,
    calls,
    refreshCalls: () => calls.filter((call) => isRefresh(call.query)),
    dataCalls: () => calls.filter((call) => !isRefresh(call.query)),
  };
}

test("login keeps both tokens out of localStorage and the page", async () => {
  const env = environment({ signedIn: false });
  const api = server({
    data: [{ login: { accessToken: jwt("access-login") } }, { me: { id: 1 } }],
  });
  const tab = env.tab(api.request);

  await tab.authApi.login("person", "password");

  assert.doesNotMatch(api.calls[0].query, /refreshToken/);
  assert.deepEqual([...env.values.keys()].sort(), [
    "auth_session_id",
    "auth_signed_in",
  ]);
  assert.notEqual(env.values.get("auth_session_id"), "session-old");
  // The access token lives in this tab's memory and is used directly.
  await tab.authenticatedGraphqlRequest("query Me { me { id } }");
  assert.equal(tokenName(api.calls[1].token), "access-login");
  assert.equal(api.refreshCalls().length, 0);
});

test("registration signs the new account in with one session", async () => {
  const env = environment({ signedIn: false });
  const api = server({
    data: [{ register: { accessToken: jwt("access-new-account") } }, {}],
  });
  const tab = env.tab(api.request);

  await tab.authApi.register({
    login: "newcomer",
    password: "password",
    name: "New Person",
    joinYear: 2026,
  });

  assert.match(
    api.calls[0].query,
    /register\(input: \$input\) \{ accessToken \}/,
  );
  assert.equal(env.values.get("auth_signed_in"), "1");
  await tab.authenticatedGraphqlRequest("query Me { me { id } }");
  assert.equal(tokenName(api.calls[1].token), "access-new-account");
});

test("a reloaded tab gets its access token from the cookie once and then reuses it", async () => {
  const env = environment();
  const api = server({ refreshes: [refreshed("access-cookie")] });
  const tab = env.tab(api.request);

  await Promise.all([
    tab.authenticatedGraphqlRequest("query A { a }"),
    tab.authenticatedGraphqlRequest("query B { b }"),
  ]);
  await tab.authenticatedGraphqlRequest("query C { c }");

  const [refresh] = api.refreshCalls();
  assert.equal(api.refreshCalls().length, 1);
  // The cookie carries the refresh token: no argument, and only the access token comes back.
  assert.equal(refresh.variables, undefined);
  assert.match(refresh.query, /refreshToken \{ accessToken \}/);
  assert.deepEqual(
    api.dataCalls().map((call) => tokenName(call.token)),
    ["access-cookie", "access-cookie", "access-cookie"],
  );
  assert.equal(env.values.has("access_token"), false);
});

test("anonymous visitors never send refresh requests", async () => {
  const env = environment({ signedIn: false });
  const api = server();
  const tab = env.tab(api.request);

  assert.equal(await tab.authApi.getAccessToken(), null);
  await tab.authenticatedGraphqlRequest("query Public { equipment }");

  assert.equal(api.refreshCalls().length, 0);
  assert.equal(api.dataCalls()[0].token, null);
});

test("an anonymous request to a protected field leads to the login page", async () => {
  const env = environment({ signedIn: false });
  const api = server({ data: [unauthorized()] });
  const tab = env.tab(api.request);

  await assert.rejects(
    tab.authenticatedGraphqlRequest("query Mine { myCart { id } }"),
    { status: 401 },
  );
  assert.deepEqual(env.redirects, ["/login"]);
  assert.equal(api.refreshCalls().length, 0);
});

test("two tabs refresh one after another, so each sends the newest cookie", async () => {
  const env = environment();
  const firstResponse = deferred();
  let active = 0;
  let maxActive = 0;
  const refreshes = [];
  const request = (name) => (query) => {
    if (!isRefresh(query)) return Promise.resolve({});
    refreshes.push(name);
    active++;
    maxActive = Math.max(maxActive, active);
    const response =
      name === "first"
        ? firstResponse.promise
        : Promise.resolve(refreshed("access-second"));
    return response.finally(() => active--);
  };
  const first = env.tab(request("first")).authApi.getAccessToken();
  const second = env.tab(request("second")).authApi.getAccessToken();
  await nextTurn();

  assert.deepEqual(refreshes, ["first"]);
  firstResponse.resolve(refreshed("access-first"));
  assert.deepEqual((await Promise.all([first, second])).map(tokenName), [
    "access-first",
    "access-second",
  ]);
  assert.equal(maxActive, 1);
});

test("concurrent unauthorized requests of one tab share one refresh", async () => {
  const env = environment();
  const api = server({
    refreshes: [refreshed("access-one"), refreshed("access-two")],
    data: [{}, unauthorized(), unauthorized()],
  });
  const tab = env.tab(api.request);
  await tab.authenticatedGraphqlRequest("query Warmup { a }");

  await Promise.all([
    tab.authenticatedGraphqlRequest("mutation One { one }"),
    tab.authenticatedGraphqlRequest("mutation Two { two }"),
  ]);

  assert.equal(api.refreshCalls().length, 2);
  assert.deepEqual(
    api
      .dataCalls()
      .slice(3)
      .map((call) => tokenName(call.token)),
    ["access-two", "access-two"],
  );
});

test("a token close to expiry is refreshed before it is used", async () => {
  const env = environment();
  const api = server({
    refreshes: [refreshed("access-expiring", 10), refreshed("access-fresh")],
  });
  const tab = env.tab(api.request);

  await tab.authenticatedGraphqlRequest("query A { a }");
  await tab.authenticatedGraphqlRequest("query B { b }");

  assert.equal(api.refreshCalls().length, 2);
  assert.equal(tokenName(api.dataCalls()[1].token), "access-fresh");
});

test("tokens saved by the previous version move to the cookie and leave localStorage", async () => {
  const env = environment({ signedIn: false });
  env.values.set("access_token", jwt("legacy-access"));
  env.values.set("refresh_token", "legacy-refresh");
  const api = server({ refreshes: [refreshed("access-migrated")] });
  const tab = env.tab(api.request);

  assert.equal(tab.readSession().signedIn, true);
  assert.equal(
    tokenName(await tab.authApi.getAccessToken()),
    "access-migrated",
  );

  const [refresh] = api.refreshCalls();
  assert.deepEqual(
    { ...refresh.variables },
    { refreshToken: "legacy-refresh" },
  );
  // Even this call does not ask for the rotated refresh token in the response body.
  assert.doesNotMatch(refresh.query, /\{ accessToken refreshToken/);
  assert.equal(env.values.has("access_token"), false);
  assert.equal(env.values.has("refresh_token"), false);
  assert.equal(env.values.get("auth_signed_in"), "1");
});

test("a stale saved token falls back to the cookie, and a saved 'null' means no session", async () => {
  const env = environment({ signedIn: false });
  env.values.set("refresh_token", "null");
  assert.equal(env.tab(server().request).readSession().signedIn, false);

  env.values.set("refresh_token", "stale-refresh");
  const api = server({ refreshes: [rejected(), refreshed("access-cookie")] });
  const tab = env.tab(api.request);

  assert.equal(tokenName(await tab.authApi.getAccessToken()), "access-cookie");
  assert.deepEqual(
    api.refreshCalls().map((call) => call.variables && { ...call.variables }),
    [{ refreshToken: "stale-refresh" }, undefined],
  );
  assert.equal(env.values.has("refresh_token"), false);
});

test("a rejected session is forgotten and the page goes to login", async () => {
  const env = environment();
  const api = server({ refreshes: [rejected()] });
  const tab = env.tab(api.request);

  await assert.rejects(tab.authenticatedGraphqlRequest("query A { a }"), {
    message: "Недействительный refresh token",
  });

  assert.equal(env.values.has("auth_signed_in"), false);
  // No new login happened, so the session id stays.
  assert.equal(env.values.get("auth_session_id"), "session-old");
  assert.deepEqual(env.redirects, ["/login"]);
  assert.equal(api.dataCalls().length, 0);
  assert.equal(await tab.authApi.getAccessToken(), null);
});

test("getAccessToken reports a rejected session as signed out without redirecting", async () => {
  const env = environment();
  const tab = env.tab(server({ refreshes: [rejected()] }).request);

  assert.equal(await tab.authApi.getAccessToken(), null);
  assert.equal(tab.readSession().signedIn, false);
  assert.deepEqual(env.redirects, []);
});

test("a temporary refresh failure keeps the session", async () => {
  const env = environment();
  const tab = env.tab(
    server({ refreshes: [new TypeError("offline")] }).request,
  );

  await assert.rejects(tab.authApi.getAccessToken(), TypeError);

  assert.equal(env.values.get("auth_signed_in"), "1");
  assert.deepEqual(env.redirects, []);
});

test("without locks, a refresh that lost the race to another tab is retried once", async () => {
  const env = environment({ withLocks: false });
  const api = server({
    refreshes: [rejected(), refreshed("access-after-retry")],
  });
  const tab = env.tab(api.request);

  assert.equal(
    tokenName(await tab.authApi.getAccessToken()),
    "access-after-retry",
  );
  assert.equal(api.refreshCalls().length, 2);
  assert.equal(env.values.get("auth_signed_in"), "1");
});

test("without locks, a session rejected twice is forgotten", async () => {
  const env = environment({ withLocks: false });
  const api = server({ refreshes: [rejected(), rejected()] });

  assert.equal(await env.tab(api.request).authApi.getAccessToken(), null);
  assert.equal(api.refreshCalls().length, 2);
  assert.equal(env.values.has("auth_signed_in"), false);
});

test("a login in another tab replaces this tab's token on its next request", async () => {
  const env = environment();
  const firstTab = env.tab(
    server({
      refreshes: [
        refreshed("access-old-account"),
        refreshed("access-new-account"),
      ],
    }).request,
  );
  await firstTab.authApi.getAccessToken();
  await env
    .tab(
      server({ data: [{ login: { accessToken: jwt("access-other-tab") } }] })
        .request,
    )
    .authApi.login("other", "password");

  // The cookie now belongs to the new login; this tab must not keep the old account's token.
  assert.equal(
    tokenName(await firstTab.authApi.getAccessToken()),
    "access-new-account",
  );
});

test("a login response cannot resurrect a session logged out while it was pending", async () => {
  const env = environment({ signedIn: false });
  const response = deferred();
  const tab = env.tab(() => response.promise);

  const pending = tab.authApi.login("person", "password");
  env.tab(server().request).authApi.clearSession();
  response.resolve({ login: { accessToken: jwt("too-late") } });

  await assert.rejects(pending, { name: "SessionChangedError" });
  assert.equal(env.values.has("auth_signed_in"), false);
});

test("a request answered after a login in another tab is not delivered to the new account", async () => {
  const env = environment();
  const response = deferred();
  const tab = env.tab((query) =>
    isRefresh(query)
      ? Promise.resolve(refreshed("access-old"))
      : response.promise,
  );

  const pending = tab.authenticatedGraphqlRequest(
    "query Mine { myCart { id } }",
  );
  await nextTurn();
  await env
    .tab(
      server({ data: [{ login: { accessToken: jwt("access-other") } }] })
        .request,
    )
    .authApi.login("other", "password");
  response.resolve({ myCart: { id: 1 } });

  await assert.rejects(pending, { name: "SessionChangedError" });
});

for (const outcome of ["success", "rejection"]) {
  test(`a refresh ${outcome} that arrives after a logout cannot restore the session or redirect`, async () => {
    const env = environment();
    const response = deferred();
    const tab = env.tab(() => response.promise);

    const pending = tab.authApi.getAccessToken();
    await nextTurn();
    env.tab(server().request).authApi.clearSession();
    if (outcome === "success") response.resolve(refreshed("too-late"));
    else response.reject(rejected());

    await assert.rejects(pending, { name: "SessionChangedError" });
    assert.equal(env.values.has("auth_signed_in"), false);
    assert.deepEqual(env.redirects, []);
    assert.equal(await tab.authApi.getAccessToken(), null);
  });

  test(`a refresh ${outcome} that arrives after another login cannot touch the new account`, async () => {
    const env = environment();
    const response = deferred();
    const tab = env.tab(() => response.promise);

    const pending = tab.authApi.getAccessToken();
    await nextTurn();
    await env
      .tab(
        server({ data: [{ login: { accessToken: jwt("access-other") } }] })
          .request,
      )
      .authApi.login("other", "password");
    const newSession = env.values.get("auth_session_id");
    if (outcome === "success") response.resolve(refreshed("too-late"));
    else response.reject(rejected());

    await assert.rejects(pending, { name: "SessionChangedError" });
    assert.equal(env.values.get("auth_signed_in"), "1");
    assert.equal(env.values.get("auth_session_id"), newSession);
    assert.deepEqual(env.redirects, []);
  });
}

for (const failure of ["network", "server"]) {
  test(`a late ${failure} error after another login belongs to the old session`, async () => {
    const env = environment();
    const response = deferred();
    const tab = env.tab((query) =>
      isRefresh(query)
        ? Promise.resolve(refreshed("access-old"))
        : response.promise,
    );

    const pending = tab.authenticatedGraphqlRequest(
      "query Mine { myCart { id } }",
    );
    await nextTurn();
    await env
      .tab(
        server({ data: [{ login: { accessToken: jwt("access-other") } }] })
          .request,
      )
      .authApi.login("other", "password");
    response.reject(
      failure === "network"
        ? new TypeError("offline")
        : new ApiError(500, "Server error"),
    );

    await assert.rejects(pending, { name: "SessionChangedError" });
    assert.equal(env.values.get("auth_signed_in"), "1");
  });
}

test("a late logout success cannot clear a newer login", async () => {
  const env = environment();
  const response = deferred();
  const tab = env.tab((query) =>
    isRefresh(query) ? Promise.resolve(refreshed("access")) : response.promise,
  );

  const pending = tab.authApi.logout();
  await nextTurn();
  await env
    .tab(
      server({ data: [{ login: { accessToken: jwt("access-other") } }] })
        .request,
    )
    .authApi.login("other", "password");
  const newSession = env.values.get("auth_session_id");
  response.resolve({ logout: true });

  await assert.rejects(pending, { name: "SessionChangedError" });
  assert.equal(env.values.get("auth_signed_in"), "1");
  assert.equal(env.values.get("auth_session_id"), newSession);
});

test("logout revokes the server session before clearing this browser", async () => {
  const env = environment();
  const response = deferred();
  const queries = [];
  const tab = env.tab((query) => {
    queries.push(query);
    if (isRefresh(query)) return Promise.resolve(refreshed("access"));
    return response.promise;
  });

  const pending = tab.authApi.logout();
  await nextTurn();
  assert.equal(env.values.get("auth_signed_in"), "1");
  response.resolve({ logout: true });
  await pending;

  assert.match(queries.at(-1), /mutation Logout \{ logout \}/);
  assert.equal(env.values.has("auth_signed_in"), false);
  assert.notEqual(env.values.get("auth_session_id"), "session-old");
  assert.equal(await tab.authApi.getAccessToken(), null);
});

test("logout-all uses its own mutation and duplicate clicks share one request", async () => {
  const env = environment();
  const api = server({ refreshes: [refreshed("access")] });
  const tab = env.tab(api.request);

  await Promise.all([tab.authApi.logoutAll(), tab.authApi.logoutAll()]);

  assert.deepEqual(
    api.dataCalls().map((call) => call.query),
    ["mutation LogoutAll { logoutAll }"],
  );
  assert.equal(env.values.has("auth_signed_in"), false);
});

test("a temporary logout failure keeps the session so the user can try again", async () => {
  const env = environment();
  const api = server({
    refreshes: [refreshed("access")],
    data: [new TypeError("offline")],
  });

  await assert.rejects(env.tab(api.request).authApi.logout(), TypeError);
  assert.equal(env.values.get("auth_signed_in"), "1");
});

test("GraphQL requests send cookies so the API can set and read the refresh cookie", async () => {
  const requests = [];
  const module = { exports: {} };
  vm.runInNewContext(apiSource, {
    module,
    exports: module.exports,
    process: { env: { NEXT_PUBLIC_API_URL: "https://api.example.test" } },
    URL,
    JSON,
    fetch: async (url, init) => {
      requests.push({ url, init });
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { ok: true } }),
      };
    },
  });

  await module.exports.graphqlRequest("query { ok }", undefined, {
    token: "access",
  });

  assert.equal(requests[0].url, "https://api.example.test/graphql");
  assert.equal(requests[0].init.credentials, "include");
  assert.equal(requests[0].init.headers.Authorization, "Bearer access");
});

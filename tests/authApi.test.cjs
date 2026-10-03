const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");
const vm = require("node:vm");

// Run from any directory: node --test gutv_booker_ui/tests/authApi.test.cjs
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
const refreshResult = (accessToken, refreshToken) => ({
  refreshToken: { accessToken, refreshToken },
});

function environment(withLocks = true) {
  const values = new Map([
    ["access_token", "access-old"],
    ["refresh_token", "refresh-old"],
    ["auth_session_id", "session-old"],
  ]);
  const localStorage = {
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
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
      window: { location: { assign: (url) => redirects.push(url) } },
    });
    vm.runInContext(source, context, { filename: "authApi.js" });
    return module.exports;
  }
  return { localStorage, values, redirects, tab };
}

test("two tabs serialize rotation and reuse tokens written by the first tab", async () => {
  const env = environment();
  const response = deferred();
  let refreshes = 0;
  const request = () => {
    refreshes++;
    return response.promise;
  };
  const first = env.tab(request).authApi.refreshToken();
  const second = env.tab(request).authApi.refreshToken();
  await nextTurn();
  assert.equal(refreshes, 1);
  response.resolve(refreshResult("access-new", "refresh-new"));
  assert.deepEqual(await Promise.all([first, second]), [
    "access-new",
    "access-new",
  ]);
  assert.equal(refreshes, 1);
  assert.equal(env.localStorage.getItem("refresh_token"), "refresh-new");
});

test("late unauthorized data request reuses an existing rotation", async () => {
  const env = environment();
  const firstResponse = deferred();
  let refreshes = 0;
  const tokensUsed = [];
  const tab = env.tab((query, _variables, options) => {
    if (query.includes("mutation RefreshToken")) {
      refreshes++;
      return Promise.resolve(refreshResult("access-new", "refresh-new"));
    }
    tokensUsed.push(options.token);
    return tokensUsed.length === 1
      ? firstResponse.promise
      : Promise.resolve({ ok: true });
  });
  const data = tab.authenticatedGraphqlRequest("query Data { ok }");
  await tab.authApi.refreshToken();
  firstResponse.reject(new ApiError(401, "Unauthorized"));
  assert.deepEqual(await data, { ok: true });
  assert.equal(refreshes, 1);
  assert.deepEqual(tokensUsed, ["access-old", "access-new"]);
});

test("refresh-token change is recognized even if the access JWT is identical", async () => {
  const env = environment();
  let refreshes = 0;
  const request = () => {
    refreshes++;
    return Promise.resolve(refreshResult("access-old", "refresh-new"));
  };
  await Promise.all([
    env.tab(request).authApi.refreshToken(),
    env.tab(request).authApi.refreshToken(),
  ]);
  assert.equal(refreshes, 1);
});

test("without locks, a late refresh rejection preserves the newer tokens", async () => {
  const env = environment(false);
  const rejectedResponse = deferred();
  const first = env.tab(() =>
    Promise.resolve(refreshResult("access-new", "refresh-new")),
  );
  const second = env.tab(() => rejectedResponse.promise);
  const late = second.authApi.refreshToken();
  await first.authApi.refreshToken();
  rejectedResponse.reject(new ApiError(200, "Недействительный refresh token"));
  assert.equal(await late, "access-new");
  assert.equal(env.localStorage.getItem("access_token"), "access-new");
  assert.equal(env.localStorage.getItem("refresh_token"), "refresh-new");
  assert.equal(env.redirects.length, 0);
});

test("without locks, a late refresh success does not replace an applied rotation", async () => {
  const env = environment(false);
  const lateResponse = deferred();
  const late = env.tab(() => lateResponse.promise).authApi.refreshToken();
  await env
    .tab(() => Promise.resolve(refreshResult("access-new", "refresh-new")))
    .authApi.refreshToken();
  lateResponse.resolve(refreshResult("access-late", "refresh-late"));
  assert.equal(await late, "access-new");
  assert.equal(env.localStorage.getItem("refresh_token"), "refresh-new");
});

for (const outcome of ["success", "rejection"]) {
  test(`pending refresh ${outcome} cannot restore or redirect a logged-out session`, async () => {
    const env = environment(false);
    const response = deferred();
    const tab = env.tab((query) =>
      query.includes("mutation RefreshToken")
        ? response.promise
        : Promise.reject(new ApiError(401, "Unauthorized")),
    );
    const pending = tab.authenticatedGraphqlRequest("query Data { ok }");
    const rejected = assert.rejects(pending, { name: "SessionChangedError" });
    await nextTurn();
    // Older tabs may remove tokens directly, without invoking authApi.logout.
    env.localStorage.removeItem("access_token");
    env.localStorage.removeItem("refresh_token");
    if (outcome === "success")
      response.resolve(refreshResult("access-new", "refresh-new"));
    else response.reject(new ApiError(200, "Недействительный refresh token"));
    await rejected;
    assert.equal(env.localStorage.getItem("access_token"), null);
    assert.equal(env.localStorage.getItem("refresh_token"), null);
    assert.equal(env.redirects.length, 0);
  });
}

for (const outcome of ["success", "rejection"]) {
  test(`pending refresh ${outcome} cannot overwrite or retry a different account`, async () => {
    const env = environment(false);
    const response = deferred();
    let dataRequests = 0;
    const oldTab = env.tab((query) => {
      if (query.includes("mutation RefreshToken")) return response.promise;
      dataRequests++;
      return Promise.reject(new ApiError(401, "Unauthorized"));
    });
    const pending = oldTab.authenticatedGraphqlRequest(
      "mutation ChangeAccountData { ok }",
    );
    const rejected = assert.rejects(pending, { name: "SessionChangedError" });
    await nextTurn();
    await env
      .tab(() =>
        Promise.resolve({
          login: { accessToken: "access-other", refreshToken: "refresh-other" },
        }),
      )
      .authApi.login("other", "password");
    if (outcome === "success")
      response.resolve(refreshResult("access-stale", "refresh-stale"));
    else response.reject(new ApiError(200, "Недействительный refresh token"));
    await rejected;
    assert.equal(dataRequests, 1);
    assert.equal(env.localStorage.getItem("access_token"), "access-other");
    assert.equal(env.localStorage.getItem("refresh_token"), "refresh-other");
    assert.equal(env.redirects.length, 0);
  });
}

test("a real rejected refresh clears its own session and redirects to login", async () => {
  const env = environment();
  const tab = env.tab((query) =>
    Promise.reject(
      new ApiError(
        query.includes("mutation RefreshToken") ? 200 : 401,
        query.includes("mutation RefreshToken")
          ? "Недействительный refresh token"
          : "Unauthorized",
      ),
    ),
  );
  await assert.rejects(tab.authenticatedGraphqlRequest("query Data { ok }"));
  assert.equal(env.localStorage.getItem("access_token"), null);
  assert.equal(env.localStorage.getItem("refresh_token"), null);
  assert.deepEqual(env.redirects, ["/login"]);
});

test("login response cannot resurrect a session logged out while login was pending", async () => {
  const env = environment(false);
  const response = deferred();
  const tab = env.tab(() => response.promise);
  const pending = tab.authApi.login("other", "password");
  const rejected = assert.rejects(pending, { name: "SessionChangedError" });
  tab.authApi.clearSession();
  response.resolve({
    login: { accessToken: "access-other", refreshToken: "refresh-other" },
  });
  await rejected;
  assert.equal(env.localStorage.getItem("access_token"), null);
  assert.equal(env.localStorage.getItem("refresh_token"), null);
});

test("late login rejection belongs to the old session and preserves a new login", async () => {
  const env = environment(false);
  const response = deferred();
  const pending = env
    .tab(() => response.promise)
    .authApi.login("old", "password");
  const rejected = assert.rejects(pending, { name: "SessionChangedError" });
  await env
    .tab(() =>
      Promise.resolve({
        login: { accessToken: "access-other", refreshToken: "refresh-other" },
      }),
    )
    .authApi.login("other", "password");
  response.reject(new ApiError(200, "Неверный логин или пароль"));
  await rejected;
  assert.equal(env.localStorage.getItem("refresh_token"), "refresh-other");
});

test("temporary refresh network failure keeps the current session", async () => {
  const env = environment();
  const tab = env.tab(() => Promise.reject(new TypeError("Failed to fetch")));
  await assert.rejects(tab.authApi.refreshToken(), TypeError);
  assert.equal(env.localStorage.getItem("access_token"), "access-old");
  assert.equal(env.localStorage.getItem("refresh_token"), "refresh-old");
});

test("without locks, an early rejection waits for another tab's successful refresh", async () => {
  const env = environment(false);
  const response = deferred();
  const winner = env.tab(() => response.promise).authApi.refreshToken();
  const loser = env
    .tab(() =>
      Promise.reject(new ApiError(200, "Недействительный refresh token")),
    )
    .authApi.refreshToken();
  await nextTurn();
  assert.equal(env.localStorage.getItem("refresh_token"), "refresh-old");
  response.resolve(refreshResult("access-new", "refresh-new"));
  assert.deepEqual(await Promise.all([winner, loser]), [
    "access-new",
    "access-new",
  ]);
  assert.equal(env.localStorage.getItem("refresh_token"), "refresh-new");
  assert.equal(
    [...env.values.keys()].some((key) => key.includes("pending-refresh:")),
    false,
  );
});

test("without locks, a genuine rejection without another pending refresh clears the session", async () => {
  const env = environment(false);
  const tab = env.tab(() =>
    Promise.reject(new ApiError(200, "Недействительный refresh token")),
  );
  await assert.rejects(
    tab.authApi.refreshToken(),
    (error) => error.status === 200,
  );
  assert.equal(env.localStorage.getItem("access_token"), null);
  assert.equal(env.localStorage.getItem("refresh_token"), null);
  assert.equal(
    [...env.values.keys()].some((key) => key.includes("pending-refresh:")),
    false,
  );
});

test("logout while waiting for another tab rejects both refreshes without restoring tokens", async () => {
  const env = environment(false);
  const response = deferred();
  const tab = env.tab(() => response.promise);
  const winner = tab.authApi.refreshToken();
  const winnerRejected = assert.rejects(winner, {
    name: "SessionChangedError",
  });
  const loser = env
    .tab(() =>
      Promise.reject(new ApiError(200, "Недействительный refresh token")),
    )
    .authApi.refreshToken();
  const loserRejected = assert.rejects(loser, { name: "SessionChangedError" });
  await nextTurn();
  tab.authApi.clearSession();
  await loserRejected;
  response.resolve(refreshResult("access-new", "refresh-new"));
  await winnerRejected;
  assert.equal(env.localStorage.getItem("refresh_token"), null);
  assert.equal(env.redirects.length, 0);
});

test("bounded fallback wait preserves tokens while another refresh is still pending", async () => {
  const env = environment(false);
  const response = deferred();
  const winner = env.tab(() => response.promise).authApi.refreshToken();
  const loser = env
    .tab(() =>
      Promise.reject(new ApiError(200, "Недействительный refresh token")),
    )
    .authApi.refreshToken();
  await assert.rejects(loser, (error) => error.status === 503);
  assert.equal(env.localStorage.getItem("access_token"), "access-old");
  assert.equal(env.localStorage.getItem("refresh_token"), "refresh-old");
  response.resolve(refreshResult("access-new", "refresh-new"));
  assert.equal(await winner, "access-new");
  assert.equal(env.localStorage.getItem("refresh_token"), "refresh-new");
});

test("expired markers from a closed tab do not prevent rejecting an invalid session", async () => {
  const env = environment(false);
  const abandonedKey = "gutv-booker:pending-refresh:abandoned";
  env.localStorage.setItem(
    abandonedKey,
    JSON.stringify({
      sessionId: "session-old",
      refreshToken: "refresh-old",
      startedAt: Date.now() - 60_001,
    }),
  );
  const tab = env.tab(() =>
    Promise.reject(new ApiError(200, "Недействительный refresh token")),
  );
  await assert.rejects(tab.authApi.refreshToken());
  assert.equal(env.localStorage.getItem("refresh_token"), null);
  assert.equal(env.localStorage.getItem(abandonedKey), null);
});

for (const failure of ["network", "server"]) {
  for (const transition of ["login", "logout"]) {
    test(`late ${failure} data error after ${transition} belongs to the old session`, async () => {
      const env = environment();
      const response = deferred();
      const tab = env.tab(() => response.promise);
      const pending = tab.authenticatedGraphqlRequest("query Me { me { id } }");
      const rejected = assert.rejects(pending, { name: "SessionChangedError" });
      if (transition === "login") {
        await env
          .tab(() =>
            Promise.resolve({
              login: {
                accessToken: "access-other",
                refreshToken: "refresh-other",
              },
            }),
          )
          .authApi.login("other", "password");
      } else {
        tab.authApi.clearSession();
      }
      response.reject(
        failure === "network"
          ? new TypeError("Failed to fetch")
          : new ApiError(500, "Internal server error"),
      );
      await rejected;
      assert.equal(
        env.localStorage.getItem("refresh_token"),
        transition === "login" ? "refresh-other" : null,
      );
      assert.equal(env.redirects.length, 0);
    });
  }
}

test("late non-auth failure from the post-refresh retry preserves a newer login", async () => {
  const env = environment();
  const response = deferred();
  let dataRequests = 0;
  const tab = env.tab((query) => {
    if (query.includes("mutation RefreshToken")) {
      return Promise.resolve(refreshResult("access-new", "refresh-new"));
    }
    return ++dataRequests === 1
      ? Promise.reject(new ApiError(401, "Unauthorized"))
      : response.promise;
  });
  const pending = tab.authenticatedGraphqlRequest("query Me { me { id } }");
  const rejected = assert.rejects(pending, { name: "SessionChangedError" });
  await nextTurn();
  assert.equal(dataRequests, 2);
  await env
    .tab(() =>
      Promise.resolve({
        login: { accessToken: "access-other", refreshToken: "refresh-other" },
      }),
    )
    .authApi.login("other", "password");
  response.reject(new ApiError(500, "Internal server error"));
  await rejected;
  assert.equal(env.localStorage.getItem("refresh_token"), "refresh-other");
});

test("relogin with an identical access JWT does not share the previous session's query", async () => {
  const env = environment();
  const oldResponse = deferred();
  let dataRequests = 0;
  const tab = env.tab((query) => {
    if (query.includes("mutation Login")) {
      return Promise.resolve({
        login: { accessToken: "access-old", refreshToken: "refresh-other" },
      });
    }
    return ++dataRequests === 1
      ? oldResponse.promise
      : Promise.resolve({ id: "new-session" });
  });
  const oldQuery = tab.authenticatedGraphqlRequest("query Me { me { id } }");
  const oldRejected = assert.rejects(oldQuery, { name: "SessionChangedError" });
  await tab.authApi.login("same-account", "password");
  const newQuery = tab.authenticatedGraphqlRequest("query Me { me { id } }");
  assert.equal(dataRequests, 2);
  assert.deepEqual(await newQuery, { id: "new-session" });
  oldResponse.resolve({ id: "old-session" });
  await oldRejected;
});

test("logout revokes the server session before clearing local tokens", async () => {
  const env = environment();
  const response = deferred();
  const calls = [];
  const tab = env.tab((query, variables, options) => {
    calls.push({ query, variables, options });
    return response.promise;
  });
  const pending = tab.authApi.logout();
  assert.equal(env.localStorage.getItem("refresh_token"), "refresh-old");
  assert.match(calls[0].query, /mutation Logout \{ logout \}/);
  assert.equal(calls[0].options.token, "access-old");
  response.resolve({ logout: true });
  await pending;
  assert.equal(env.localStorage.getItem("access_token"), null);
  assert.equal(env.localStorage.getItem("refresh_token"), null);
  assert.notEqual(env.localStorage.getItem("auth_session_id"), "session-old");
});

test("logout refreshes expired access and then revokes the same server session", async () => {
  const env = environment();
  const calls = [];
  const tab = env.tab((query, _variables, options) => {
    calls.push({ query, token: options?.token });
    if (query.includes("mutation RefreshToken"))
      return Promise.resolve(refreshResult("access-new", "refresh-new"));
    return options.token === "access-old"
      ? Promise.reject(new ApiError(401, "Unauthorized"))
      : Promise.resolve({ logout: true });
  });
  await tab.authApi.logout();
  assert.equal(calls.length, 3);
  assert.equal(calls[2].token, "access-new");
  assert.equal(env.localStorage.getItem("refresh_token"), null);
});

for (const all of [false, true]) {
  test(`${all ? "logout-all" : "logout"} network failure keeps tokens and reports failure`, async () => {
    const env = environment();
    const tab = env.tab(() => Promise.reject(new TypeError("Failed to fetch")));
    await assert.rejects(
      all ? tab.authApi.logoutAll() : tab.authApi.logout(),
      TypeError,
    );
    assert.equal(env.localStorage.getItem("refresh_token"), "refresh-old");
    assert.equal(env.localStorage.getItem("auth_session_id"), "session-old");
  });

  test(`late ${all ? "logout-all" : "logout"} success cannot clear a newer login`, async () => {
    const env = environment();
    const response = deferred();
    const tab = env.tab(() => response.promise);
    const pending = all ? tab.authApi.logoutAll() : tab.authApi.logout();
    const rejected = assert.rejects(pending, { name: "SessionChangedError" });
    await env
      .tab(() =>
        Promise.resolve({
          login: { accessToken: "other-access", refreshToken: "other-refresh" },
        }),
      )
      .authApi.login("other", "password");
    response.resolve(all ? { logoutAll: true } : { logout: true });
    await rejected;
    assert.equal(env.localStorage.getItem("refresh_token"), "other-refresh");
  });
}

test("logout-all uses its own server mutation and clears the current browser", async () => {
  const env = environment();
  const tab = env.tab((query) => {
    assert.match(query, /mutation LogoutAll \{ logoutAll \}/);
    return Promise.resolve({ logoutAll: true });
  });
  await tab.authApi.logoutAll();
  assert.equal(env.localStorage.getItem("refresh_token"), null);
});

test("duplicate logout clicks share one server request", async () => {
  const env = environment();
  const response = deferred();
  let requests = 0;
  const tab = env.tab(() => {
    requests++;
    return response.promise;
  });
  const first = tab.authApi.logout();
  const second = tab.authApi.logout();
  response.resolve({ logout: true });
  await Promise.all([first, second]);
  assert.equal(requests, 1);
});

test("separate devices use independent storage and refresh both sessions", async () => {
  const first = environment();
  const second = environment();
  let firstRefreshes = 0;
  let secondRefreshes = 0;
  const firstTab = first.tab(() => {
    firstRefreshes++;
    return Promise.resolve(refreshResult("first-access", "first-refresh"));
  });
  const secondTab = second.tab(() => {
    secondRefreshes++;
    return Promise.resolve(refreshResult("second-access", "second-refresh"));
  });
  await Promise.all([
    firstTab.authApi.refreshToken(),
    secondTab.authApi.refreshToken(),
  ]);
  assert.equal(first.localStorage.getItem("refresh_token"), "first-refresh");
  assert.equal(second.localStorage.getItem("refresh_token"), "second-refresh");
  assert.equal(firstRefreshes, 1);
  assert.equal(secondRefreshes, 1);
});

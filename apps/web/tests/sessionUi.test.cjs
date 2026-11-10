const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");
const vm = require("node:vm");
const { createHookHarness, deferred } = require("./helpers/hookHarness.cjs");

const projectRoot = path.resolve(__dirname, "..");
const compiledDirectory = mkdtempSync(path.join(tmpdir(), "gutv-session-ui-"));
after(() => rmSync(compiledDirectory, { recursive: true, force: true }));
const configPath = path.join(compiledDirectory, "tsconfig.json");
writeFileSync(
  configPath,
  JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "Node16",
      moduleResolution: "Node16",
      lib: ["ES2022", "DOM"],
      strict: true,
      skipLibCheck: true,
      jsx: "react-jsx",
      typeRoots: [path.join(projectRoot, "node_modules/@types")],
      types: ["node", "react"],
      rootDir: path.join(projectRoot, "src"),
      outDir: compiledDirectory,
      paths: { "@/*": [path.join(projectRoot, "src/*")] },
    },
    files: [path.join(projectRoot, "src/contexts/AuthContext.tsx")],
  }),
);
execFileSync(
  path.join(projectRoot, "node_modules/.bin/tsc"),
  ["-p", configPath],
  {
    cwd: projectRoot,
    stdio: "pipe",
  },
);

const jwt = (id, overrides = {}) =>
  `header.${Buffer.from(
    JSON.stringify({
      sub: String(id),
      login: `user-${id}`,
      name: `Пользователь ${id}`,
      role: "User",
      exp: Date.now() / 1000 + 3600,
      ...overrides,
    }),
  ).toString("base64url")}.signature`;
const user = (id, overrides = {}) => ({
  id,
  login: `user-${id}`,
  name: `Fresh ${id}`,
  role: "User",
  avatarSeed: `avatar-${id}`,
  isTelegramLinked: false,
  ...overrides,
});

// The provider reads the session through authApi: an id that changes with every login and
// logout, a signed-in flag, and an access token that comes from the refresh cookie.
async function providerHarness(initialId = 1) {
  const harness = createHookHarness();
  const values = new Map();
  const requests = [];
  const listeners = new Set();
  let currentId = null;
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  function saveSession(id, marker = `session-${id}`) {
    values.set("auth_session_id", marker);
    currentId = id;
    if (id === null) values.delete("auth_signed_in");
    else values.set("auth_signed_in", "1");
  }
  if (initialId !== null) saveSession(initialId);
  const children = { sensitivePageState: "owned by this provider key" };
  const module = { exports: {} };
  vm.runInNewContext(
    readFileSync(
      path.join(compiledDirectory, "contexts/AuthContext.js"),
      "utf8",
    ),
    {
      module,
      exports: module.exports,
      require(name) {
        if (name === "react") return harness.react;
        if (name === "react-hot-toast")
          return { default: { error() {} }, Toaster: Symbol("Toaster") };
        if (name === "react/jsx-runtime")
          return {
            jsx: (type, props, key) => ({ type, props, key }),
            jsxs: (type, props, key) => ({ type, props, key }),
          };
        if (name === "@/lib/authApi")
          return {
            authApi: {
              readSession: () => ({
                sessionId: values.get("auth_session_id") ?? null,
                signedIn: values.get("auth_signed_in") === "1",
              }),
              getAccessToken: async () =>
                values.get("auth_signed_in") === "1" ? jwt(currentId) : null,
              clearSession: () => saveSession(null, "logged-out"),
              logout: async () => saveSession(null, "logged-out"),
            },
          };
        if (name === "@/lib/userApi")
          return {
            userApi: {
              get_me() {
                const request = deferred();
                requests.push(request);
                return request.promise;
              },
            },
          };
        throw new Error(`Unexpected dependency: ${name}`);
      },
      localStorage,
      window: {
        addEventListener: (_name, listener) => listeners.add(listener),
        removeEventListener: (_name, listener) => listeners.delete(listener),
        location: { replace() {} },
      },
      TextDecoder,
      Uint8Array,
      atob,
      console: { error() {} },
    },
  );
  harness.mount(() => module.exports.AuthProvider({ children }));
  // The access token arrives asynchronously, as it does from the refresh cookie.
  await harness.settle();
  return {
    ...harness,
    get view() {
      return harness.view.props.value;
    },
    get subtreeKey() {
      return harness.view.key;
    },
    requests,
    values,
    localStorage,
    saveSession,
    async storage(key = "auth_session_id", storageArea = localStorage) {
      harness.act(() => {
        for (const listener of listeners) listener({ key, storageArea });
      });
      await harness.settle();
    },
    async respond(index, result) {
      requests[index].resolve(result);
      await harness.settle();
    },
    async fail(index, error) {
      requests[index].reject(error);
      await harness.settle();
    },
  };
}

test("a page load shows the account from its access token, then the fresh profile", async () => {
  const harness = await providerHarness();
  assert.equal(harness.view.user.id, "1");
  assert.equal(harness.view.isLoading, true);
  await harness.respond(0, user(1));
  assert.equal(harness.view.user.name, "Fresh 1");
  assert.equal(harness.view.isLoading, false);
  harness.unmount();
});

test("an anonymous visit finishes loading without any request", async () => {
  const harness = await providerHarness(null);
  assert.equal(harness.view.user, null);
  assert.equal(harness.view.isLoading, false);
  assert.equal(harness.requests.length, 0);
  harness.unmount();
});

test("another tab's account change updates auth and remounts cart/page state", async () => {
  const harness = await providerHarness();
  await harness.respond(0, user(1));
  const oldKey = harness.subtreeKey;
  harness.saveSession(2);
  await harness.storage();
  assert.equal(harness.view.user.id, "2");
  assert.notEqual(harness.subtreeKey, oldKey);
  assert.equal(harness.view.isLoading, true);
  await harness.respond(1, user(2));
  assert.equal(harness.view.user.name, "Fresh 2");
  assert.equal(harness.view.isLoading, false);
  harness.unmount();
});

test("logout in another tab clears auth and invalidates a pending me response", async () => {
  const harness = await providerHarness();
  const oldKey = harness.subtreeKey;
  harness.saveSession(null, "logout-marker");
  await harness.storage("auth_signed_in");
  assert.equal(harness.view.user, null);
  assert.equal(harness.view.isAuth, false);
  assert.equal(harness.view.isLoading, false);
  assert.notEqual(harness.subtreeKey, oldKey);
  await harness.respond(0, user(1));
  assert.equal(harness.view.user, null);
  harness.unmount();
});

test("a stale me success or failure cannot replace a newly logged in user", async () => {
  for (const staleFailure of [false, true]) {
    const harness = await providerHarness();
    harness.saveSession(2);
    await harness.storage();
    await harness.respond(1, user(2));
    if (staleFailure) await harness.fail(0, new Error("old request failed"));
    else await harness.respond(0, user(1));
    assert.equal(harness.view.user.id, "2");
    assert.equal(harness.view.user.name, "Fresh 2");
    assert.equal(harness.view.isLoading, false);
    harness.unmount();
  }
});

test("response guards read storage even before its queued event is delivered", async () => {
  const harness = await providerHarness();
  harness.saveSession(2);
  await harness.respond(0, user(1));
  assert.notEqual(harness.view.user?.name, "Fresh 1");
  await harness.storage();
  await harness.respond(1, user(2));
  assert.equal(harness.view.user.id, "2");
  harness.unmount();
});

test("a new session for the same account resets children; unchanged storage does not", async () => {
  const harness = await providerHarness();
  await harness.respond(0, user(1));
  const originalKey = harness.subtreeKey;
  // Token rotation happens in memory; a storage event without a session change is ignored.
  await harness.storage("auth_signed_in");
  assert.equal(harness.subtreeKey, originalKey);
  assert.equal(harness.requests.length, 1);
  assert.equal(harness.view.isLoading, false);
  harness.saveSession(1, "new-login-same-account");
  await harness.storage();
  assert.notEqual(harness.subtreeKey, originalKey);
  await harness.respond(1, user(1));
  harness.unmount();
});

test("local login/profile setUser invalidates older me responses", async () => {
  const harness = await providerHarness();
  harness.saveSession(2);
  harness.act(() => harness.view.setUser({ ...user(2), id: "2" }));
  const loginKey = harness.subtreeKey;
  await harness.respond(0, user(1));
  assert.equal(harness.view.user.id, "2");
  assert.equal(harness.subtreeKey, loginKey);
  assert.equal(harness.view.isLoading, false);
  harness.unmount();
});

test("storage.clear logs out; unrelated storage and unmounted listeners do nothing", async () => {
  const harness = await providerHarness();
  await harness.respond(0, user(1));
  await harness.storage("theme");
  await harness.storage("auth_session_id", {});
  assert.equal(harness.requests.length, 1);
  harness.values.clear();
  await harness.storage(null);
  assert.equal(harness.view.user, null);
  harness.unmount();
  harness.saveSession(2);
  await harness.storage();
  assert.equal(harness.requests.length, 1);
});

test("session rejection in this tab clears auth even without a storage event", async () => {
  const harness = await providerHarness();
  harness.localStorage.removeItem("auth_signed_in");
  await harness.fail(0, new Error("rejected session"));
  assert.equal(harness.view.user, null);
  assert.equal(harness.view.isLoading, false);
  harness.unmount();
});

test("temporary me failure preserves the current login without leaving loading stuck", async () => {
  const harness = await providerHarness();
  await harness.fail(0, new Error("offline"));
  assert.equal(harness.view.user.id, "1");
  assert.equal(harness.view.isLoading, false);
  assert.equal(harness.localStorage.getItem("auth_signed_in"), "1");
  harness.unmount();
});

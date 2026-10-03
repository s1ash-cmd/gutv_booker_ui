const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");
const vm = require("node:vm");
const { createHookHarness, deferred } = require("./helpers/hookHarness.cjs");
const root = path.resolve(__dirname, "..");
const compiled = mkdtempSync(path.join(tmpdir(), "gutv-sessions-panel-"));
after(() => rmSync(compiled, { recursive: true, force: true }));
const config = path.join(compiled, "tsconfig.json");
writeFileSync(
  config,
  JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "Node16",
      moduleResolution: "Node16",
      lib: ["ES2022", "DOM"],
      strict: true,
      skipLibCheck: true,
      jsx: "react-jsx",
      esModuleInterop: true,
      typeRoots: [path.join(root, "node_modules/@types")],
      types: ["node", "react"],
      rootDir: path.join(root, "src"),
      outDir: compiled,
      paths: { "@/*": [path.join(root, "src/*")] },
    },
    files: [
      path.join(root, "src/components/profile/SessionsPanel.tsx"),
      path.join(root, "src/lib/sessionApi.ts"),
    ],
  }),
);
execFileSync(path.join(root, "node_modules/.bin/tsc"), ["-p", config], {
  cwd: root,
  stdio: "pipe",
});
const source = readFileSync(
  path.join(compiled, "components/profile/SessionsPanel.js"),
  "utf8",
);
const session = (id, isCurrent = false, overrides = {}) => ({
  id,
  isCurrent,
  userAgent: "Mozilla/5.0 (Macintosh) Chrome/130.0 Safari/537.36",
  createdAt: "2026-10-01T12:00:00Z",
  lastUsedAt: "2026-10-02T12:00:00Z",
  expiresAt: "2026-10-09T12:00:00Z",
  ...overrides,
});
function nodes(node) {
  if (node === null || node === undefined || typeof node === "boolean")
    return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (typeof node !== "object") return [node];
  return [node, ...nodes(node.props?.children)];
}
const content = (node) =>
  nodes(node)
    .filter((n) => typeof n === "string" || typeof n === "number")
    .join(" ");
function environment() {
  const harness = createHookHarness();
  const lists = [],
    revokes = [],
    all = [],
    changedUsers = [],
    redirects = [];
  const listeners = new Set();
  let localLogouts = 0;
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module,
    Error,
    localStorage: { getItem: () => null },
    exports: module.exports,
    require(name) {
      if (name === "react") return harness.react;
      if (name === "react/jsx-runtime")
        return {
          jsx: (type, props, key) => ({ type, props, key }),
          jsxs: (type, props, key) => ({ type, props, key }),
        };
      if (name === "@/components/ui/button") return { Button: "button" };
      if (name === "@/components/ui/dialog")
        return Object.fromEntries(
          [
            "Dialog",
            "DialogContent",
            "DialogDescription",
            "DialogFooter",
            "DialogHeader",
            "DialogTitle",
          ].map((n) => [n, n]),
        );
      if (name === "@/contexts/AuthContext")
        return {
          useAuth: () => ({
            setUser: (value) => changedUsers.push(value),
            logout: async () => {
              localLogouts++;
            },
          }),
        };
      if (name === "@/lib/authApi")
        return {
          authApi: {
            logoutAll: () => {
              const response = deferred();
              all.push(response);
              return response.promise;
            },
          },
        };
      if (name === "@/lib/sessionApi")
        return {
          sessionApi: {
            list: () => {
              const response = deferred();
              lists.push(response);
              return response.promise;
            },
            revoke: (id) => {
              const response = deferred();
              revokes.push({ id, ...response });
              return response.promise;
            },
          },
        };
      throw new Error(`Unexpected import: ${name}`);
    },
    window: {
      addEventListener: (_name, callback) => listeners.add(callback),
      removeEventListener: (_name, callback) => listeners.delete(callback),
      location: { replace: (url) => redirects.push(url) },
    },
  });
  harness.mount(() => module.exports.SessionsPanel());
  const button = (label) =>
    nodes(harness.view).find(
      (n) => n.type === "button" && content(n) === label,
    );
  return {
    harness,
    lists,
    revokes,
    all,
    changedUsers,
    redirects,
    listeners,
    button,
    click: (label) => harness.act(() => button(label).props.onClick()),
    text: () => content(harness.view),
    logouts: () => localLogouts,
    focus: () =>
      harness.act(() => {
        for (const callback of listeners) callback();
      }),
  };
}

test("sessions panel displays current browser and device information", async () => {
  const env = environment();
  env.lists[0].resolve([
    session("current", true),
    session("phone", false, {
      userAgent: "Mozilla/5.0 (iPhone) Version/18.0 Safari/605.1",
    }),
  ]);
  await env.harness.settle();
  assert.match(env.text(), /Текущая сессия/);
  assert.match(env.text(), /Chrome · macOS/);
  assert.match(env.text(), /Safari · iOS/);
  assert.equal(env.button("Выйти на всех устройствах").props.disabled, false);
});

test("revoke targets the selected remote session and reloads after success", async () => {
  const env = environment();
  env.lists[0].resolve([session("current", true), session("remote")]);
  await env.harness.settle();
  env.click("Завершить");
  assert.equal(env.revokes[0].id, "remote");
  assert.equal(env.button("Завершить").props.disabled, true);
  env.revokes[0].resolve(true);
  await env.harness.settle();
  env.lists[1].resolve([session("current", true)]);
  await env.harness.settle();
  assert.equal(env.button("Завершить"), undefined);
  assert.equal(env.logouts(), 0);
});

test("failed revocation keeps the session visible and displays an error", async () => {
  const env = environment();
  env.lists[0].resolve([session("remote")]);
  await env.harness.settle();
  env.click("Завершить");
  env.revokes[0].reject(new Error("Network unavailable"));
  await env.harness.settle();
  assert.match(env.text(), /Network unavailable/);
  assert.equal(env.button("Завершить").props.disabled, false);
});

test("current-session button uses normal server logout", async () => {
  const env = environment();
  env.lists[0].resolve([session("current", true)]);
  await env.harness.settle();
  env.click("Выйти");
  await env.harness.settle();
  assert.equal(env.logouts(), 1);
  assert.equal(env.revokes.length, 0);
});

test("logout-all requires confirmation and clears account only after server success", async () => {
  const env = environment();
  env.lists[0].resolve([session("current", true)]);
  await env.harness.settle();
  env.click("Выйти на всех устройствах");
  const dialog = nodes(env.harness.view).find((n) => n.type === "Dialog");
  assert.equal(dialog.props.open, true);
  const confirmation = nodes(dialog).find(
    (n) => n.type === "button" && content(n) === "Выйти на всех устройствах",
  );
  env.harness.act(() => confirmation.props.onClick());
  assert.equal(env.all.length, 1);
  assert.deepEqual(env.changedUsers, []);
  env.all[0].resolve();
  await env.harness.settle();
  assert.deepEqual(env.changedUsers, [null]);
  assert.deepEqual(env.redirects, ["/"]);
});

test("logout-all failure stays visible and preserves the current account", async () => {
  const env = environment();
  env.lists[0].resolve([session("current", true)]);
  await env.harness.settle();
  env.click("Выйти на всех устройствах");
  const dialog = nodes(env.harness.view).find((n) => n.type === "Dialog");
  env.harness.act(() =>
    nodes(dialog)
      .find(
        (n) =>
          n.type === "button" && content(n) === "Выйти на всех устройствах",
      )
      .props.onClick(),
  );
  env.all[0].reject(new Error("Server unavailable"));
  await env.harness.settle();
  assert.match(env.text(), /Server unavailable/);
  assert.deepEqual(env.changedUsers, []);
  assert.deepEqual(env.redirects, []);
});

test("focus reload ignores older success and error responses", async () => {
  for (const outcome of ["success", "failure"]) {
    const env = environment();
    env.focus();
    env.lists[1].resolve([session("latest", true)]);
    await env.harness.settle();
    if (outcome === "success") env.lists[0].resolve([session("stale")]);
    else env.lists[0].reject(new Error("Stale error"));
    await env.harness.settle();
    assert.match(env.text(), /Текущая сессия/);
    assert.doesNotMatch(env.text(), /Stale error/);
    assert.equal(env.button("Завершить"), undefined);
  }
});

test("unmount removes focus listener and prevents late logout-all navigation", async () => {
  const env = environment();
  env.lists[0].resolve([session("current", true)]);
  await env.harness.settle();
  env.click("Выйти на всех устройствах");
  const dialog = nodes(env.harness.view).find((n) => n.type === "Dialog");
  env.harness.act(() =>
    nodes(dialog)
      .find(
        (n) =>
          n.type === "button" && content(n) === "Выйти на всех устройствах",
      )
      .props.onClick(),
  );
  env.harness.unmount();
  env.all[0].resolve();
  await env.harness.settle();
  assert.equal(env.listeners.size, 0);
  assert.deepEqual(env.redirects, []);
  assert.deepEqual(env.changedUsers, []);
});

test("session API uses authenticated requests and UUID variables", async () => {
  const calls = [];
  const module = { exports: {} };
  vm.runInNewContext(
    readFileSync(path.join(compiled, "lib/sessionApi.js"), "utf8"),
    {
      module,
      exports: module.exports,
      require: () => ({
        authenticatedGraphqlRequest: async (query, variables) => {
          calls.push({ query, variables });
          return query.includes("mutation")
            ? { revokeMySession: true }
            : { mySessions: [session("mine", true)] };
        },
      }),
    },
  );
  assert.equal((await module.exports.sessionApi.list())[0].id, "mine");
  assert.match(calls[0].query, /mySessions/);
  assert.equal(
    await module.exports.sessionApi.revoke(
      "01234567-89ab-cdef-0123-456789abcdef",
    ),
    true,
  );
  assert.match(calls[1].query, /\$sessionId: UUID!/);
  assert.equal(
    calls[1].variables.sessionId,
    "01234567-89ab-cdef-0123-456789abcdef",
  );
});

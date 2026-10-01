const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const compiledDirectory = mkdtempSync(
  path.join(tmpdir(), "gutv-pagination-tests-"),
);
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
      typeRoots: [path.join(projectRoot, "node_modules/@types")],
      types: ["node"],
      rootDir: path.join(projectRoot, "src"),
      outDir: compiledDirectory,
      paths: { "@/*": [path.join(projectRoot, "src/*")] },
    },
    files: [
      path.join(projectRoot, "src/hooks/use-bookings-page.ts"),
      path.join(projectRoot, "src/lib/bookingApi.ts"),
    ],
  }),
);
execFileSync(
  path.join(projectRoot, "node_modules/.bin/tsc"),
  ["--project", configPath],
  {
    cwd: projectRoot,
    stdio: "pipe",
  },
);

function evaluate(file, dependencies, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(
    readFileSync(path.join(compiledDirectory, file), "utf8"),
    {
      module,
      exports: module.exports,
      Error,
      require: (name) => {
        if (!(name in dependencies))
          throw new Error(`Unexpected dependency: ${name}`);
        return dependencies[name];
      },
      ...globals,
    },
    { filename: file },
  );
  return module.exports;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const pageResult = (page = 1, items = [{ id: page }], totalCount = 90) => ({
  page,
  items,
  totalCount,
  pageSize: 30,
});
const plain = (value) => JSON.parse(JSON.stringify(value));
const sameDependencies = (old, next) =>
  old &&
  old.length === next.length &&
  old.every((item, index) => Object.is(item, next[index]));

// Execute the actual hook with deterministic batched state updates, effect cleanup,
// and a controllable clock. No DOM package or timing-dependent sleeps are required.
function hookHarness(initialScope = "all") {
  const slots = [];
  const timers = new Map();
  const requests = [];
  let now = 0;
  let timerId = 0;
  let cursor = 0;
  let needsRender = false;
  let effects = [];
  let scope = initialScope;
  let view;
  let mounted = true;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index])
        slots[index] = {
          value: typeof initial === "function" ? initial() : initial,
        };
      const set = (next) => {
        const value =
          typeof next === "function" ? next(slots[index].value) : next;
        if (!Object.is(value, slots[index].value)) {
          slots[index].value = value;
          needsRender = mounted;
        }
      };
      return [slots[index].value, set];
    },
    useRef(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { current: initial };
      return slots[index];
    },
    useCallback(callback, dependencies) {
      const index = cursor++;
      if (!sameDependencies(slots[index]?.dependencies, dependencies))
        slots[index] = { callback, dependencies };
      return slots[index].callback;
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (!sameDependencies(slots[index]?.dependencies, dependencies)) {
        const cleanup = slots[index]?.cleanup;
        slots[index] = { dependencies, cleanup };
        effects.push({ index, effect, cleanup });
      }
    },
  };
  const { useBookingsPage } = evaluate(
    "hooks/use-bookings-page.js",
    {
      react,
      "@/lib/bookingApi": {
        bookingApi: {
          get_page(requestScope, options) {
            const response = deferred();
            requests.push({
              scope: requestScope,
              options: plain(options),
              ...response,
            });
            return response.promise;
          },
        },
      },
    },
    {
      setTimeout(callback, delay) {
        const id = ++timerId;
        timers.set(id, { callback, at: now + delay });
        return id;
      },
      clearTimeout: (id) => timers.delete(id),
    },
  );

  function flush() {
    if (!mounted) return;
    let iterations = 0;
    do {
      if (++iterations > 30) throw new Error("Hook entered a render loop");
      needsRender = false;
      cursor = 0;
      effects = [];
      // biome-ignore lint/correctness/useHookAtTopLevel: This test runtime calls the compiled hook once per simulated render.
      view = useBookingsPage(scope);
      for (const entry of effects) entry.cleanup?.();
      for (const entry of effects) slots[entry.index].cleanup = entry.effect();
    } while (needsRender);
  }

  async function settle() {
    for (let i = 0; i < 4; i++) {
      await Promise.resolve();
      if (needsRender) flush();
    }
  }

  flush();
  return {
    requests,
    get view() {
      return view;
    },
    act(callback) {
      callback(view);
      if (needsRender) flush();
    },
    advance(milliseconds) {
      const until = now + milliseconds;
      while (true) {
        const next = [...timers]
          .filter(([, timer]) => timer.at <= until)
          .sort((left, right) => left[1].at - right[1].at)[0];
        if (!next) break;
        now = next[1].at;
        timers.delete(next[0]);
        next[1].callback();
        if (needsRender) flush();
      }
      now = until;
    },
    async respond(index, result) {
      requests[index].resolve(result);
      await settle();
    },
    async fail(index, error) {
      requests[index].reject(error);
      await settle();
    },
    setScope(next) {
      scope = next;
      flush();
    },
    unmount() {
      for (const slot of slots) slot?.cleanup?.();
      mounted = false;
    },
    settle,
  };
}

test("initial request fetches one page with the default pending filter", async () => {
  const harness = hookHarness("my");
  assert.deepEqual(
    harness.requests.map(({ scope, options }) => ({ scope, options })),
    [
      {
        scope: "my",
        options: { page: 1, search: "", status: "Pending", oldestFirst: false },
      },
    ],
  );
  await harness.respond(
    0,
    pageResult(
      1,
      Array.from({ length: 30 }, (_, id) => ({ id })),
      301,
    ),
  );
  assert.equal(harness.view.items.length, 30);
  assert.equal(harness.view.totalCount, 301);
  assert.equal(harness.view.loading, false);
  harness.unmount();
});

test("typing debounces global search, hides old results and resets the requested page", async () => {
  const harness = hookHarness();
  await harness.respond(0, pageResult());
  harness.act((view) => view.setPage(3));
  await harness.respond(1, pageResult(3));
  harness.act((view) => view.setSearchQuery("  cam  "));
  assert.equal(harness.view.loading, true);
  harness.advance(200);
  harness.act((view) => view.setSearchQuery("  camera  "));
  harness.advance(299);
  assert.equal(harness.requests.length, 2);
  harness.advance(1);
  assert.deepEqual(harness.requests[2].options, {
    page: 1,
    search: "camera",
    status: "Pending",
    oldestFirst: false,
  });
  await harness.respond(2, pageResult(1, [{ id: 301 }], 1));
  assert.deepEqual(plain(harness.view.items), [{ id: 301 }]);
  assert.equal(harness.view.loading, false);
  harness.unmount();
});

test("filter and sort changes reset the page and preserve a pending debounced search", async () => {
  const harness = hookHarness();
  await harness.respond(0, pageResult());
  harness.act((view) => view.setPage(3));
  await harness.respond(1, pageResult(3));
  harness.act((view) => {
    view.setSearchQuery("lens");
    view.setSelectedStatus("Approved");
    view.setSortOrder("createdAsc");
  });
  assert.deepEqual(harness.requests[2].options, {
    page: 1,
    search: "",
    status: "Approved",
    oldestFirst: true,
  });
  harness.advance(300);
  assert.deepEqual(harness.requests[3].options, {
    page: 1,
    search: "lens",
    status: "Approved",
    oldestFirst: true,
  });
  await harness.respond(3, pageResult(1, [{ id: 99 }], 1));
  await harness.respond(2, pageResult(1, [{ id: 88 }], 1));
  assert.deepEqual(plain(harness.view.items), [{ id: 99 }]);
  assert.equal(harness.view.loading, false);
  harness.unmount();
});

test("clear filters cancels pending search debounce and requests page one immediately", async () => {
  const harness = hookHarness();
  await harness.respond(0, pageResult());
  harness.act((view) => view.setSearchQuery("pending text"));
  harness.advance(100);
  harness.act((view) => view.clearFilters());
  assert.deepEqual(harness.requests[1].options, {
    page: 1,
    search: "",
    status: "all",
    oldestFirst: false,
  });
  await harness.respond(1, pageResult());
  harness.advance(300);
  assert.equal(harness.requests.length, 2);
  assert.equal(harness.view.searchQuery, "");
  assert.equal(harness.view.loading, false);
  harness.unmount();
});

test("stale success and stale error cannot replace a newer page or end its loading", async () => {
  const harness = hookHarness();
  harness.act((view) => view.setPage(2));
  harness.act((view) => view.setPage(3));
  await harness.respond(0, pageResult(1));
  assert.equal(harness.view.loading, true);
  await harness.fail(1, new Error("stale failure"));
  assert.equal(harness.view.loading, true);
  assert.equal(harness.view.error, null);
  await harness.respond(2, pageResult(3));
  assert.equal(harness.view.page, 3);
  assert.equal(harness.view.loading, false);
  harness.unmount();
});

test("an error can be retried with the same requested page and filters", async () => {
  const harness = hookHarness();
  await harness.respond(0, pageResult());
  harness.act((view) => view.setPage(2));
  await harness.fail(1, new Error("offline"));
  assert.equal(harness.view.error, "offline");
  assert.equal(harness.view.loading, false);
  harness.act((view) => {
    void view.loadBookings();
  });
  assert.deepEqual(harness.requests[2].options, harness.requests[1].options);
  assert.equal(harness.view.error, null);
  assert.equal(harness.view.loading, true);
  await harness.respond(2, pageResult(2));
  assert.equal(harness.view.page, 2);
  harness.unmount();
});

test("server-clamped page is displayed and navigation uses the returned page", async () => {
  const harness = hookHarness();
  await harness.respond(0, pageResult());
  harness.act((view) => view.setPage(4));
  await harness.respond(1, pageResult(2, [{ id: 31 }], 31));
  assert.equal(harness.view.page, 2);
  harness.act((view) => view.setPage(view.page - 1));
  assert.equal(harness.requests[2].options.page, 1);
  await harness.respond(2, pageResult(1));
  harness.unmount();
});

test("changing scope invalidates a pending all-bookings response", async () => {
  const harness = hookHarness("all");
  harness.setScope("my");
  await harness.respond(1, pageResult(1, [{ id: 5 }], 1));
  await harness.respond(0, pageResult(1, [{ id: 10 }], 1));
  assert.deepEqual(plain(harness.view.items), [{ id: 5 }]);
  assert.equal(harness.requests[1].scope, "my");
  harness.unmount();
});

test("unmount invalidates pending responses and cancels pending debounce timers", async () => {
  const harness = hookHarness();
  harness.act((view) => view.setSearchQuery("unfinished"));
  const before = harness.view;
  harness.unmount();
  harness.advance(500);
  await harness.respond(0, pageResult());
  assert.equal(harness.requests.length, 1);
  assert.equal(harness.view, before);
});

function apiHarness(response) {
  const calls = [];
  const equipment = require(
    path.join(compiledDirectory, "app/models/equipment/equipment.js"),
  );
  const mappers = evaluate("lib/graphqlMappers.js", {
    "@/app/models/equipment/equipment": equipment,
  });
  const { bookingApi } = evaluate("lib/bookingApi.js", {
    "@/app/models/booking/booking": require(
      path.join(compiledDirectory, "app/models/booking/booking.js"),
    ),
    "./api": {
      graphqlNamedEnumLiteral: (value, fallback) => value || fallback,
    },
    "./authApi": {
      async authenticatedGraphqlRequest(query, variables) {
        calls.push({ query, variables: plain(variables) });
        return response;
      },
    },
    "./graphqlMappers": mappers,
  });
  return { bookingApi, calls };
}

const graphqlBooking = {
  id: 101,
  reason: "shoot",
  creationTime: "2026-10-01T00:00:00Z",
  startTime: "2026-10-10T09:00:00Z",
  endTime: "2026-10-10T18:00:00Z",
  status: "Pending",
  user: { name: "User", login: "user", telegramUsername: null },
  bookingItems: [],
  warningsJson: "{}",
  comment: null,
  adminComment: null,
};

test("booking DTO preserves the owner's avatar and hides whitespace-only comments", async () => {
  const harness = apiHarness({
    bookingsPage: pageResult(1, [
      {
        ...graphqlBooking,
        user: {
          ...graphqlBooking.user,
          role: "Ronin",
          avatarSeed: "owner-avatar",
        },
        comment: " \n\t ",
        adminComment: " \n ",
      },
      {
        ...graphqlBooking,
        comment: "  Real comment\n",
        adminComment: "Admin: Reviewed",
      },
    ]),
  });
  const result = await harness.bookingApi.get_page("my", {
    page: 1,
    search: "",
    status: "all",
    oldestFirst: false,
  });
  assert.match(harness.calls[0].query, /user\s*\{[^}]*role[^}]*avatarSeed/);
  assert.equal(result.items[0].userRole, "Ronin");
  assert.equal(result.items[0].userAvatarSeed, "owner-avatar");
  assert.equal(result.items[0].comment, null);
  assert.equal(result.items[0].adminComment, null);
  assert.equal(result.items[1].comment, "  Real comment\n");
  assert.equal(result.items[1].adminComment, "Admin: Reviewed");
});

test("all page API requests server filtering/paging and preserves page metadata and DTO mapping", async () => {
  const harness = apiHarness({
    bookingsPage: pageResult(2, [graphqlBooking], 31),
  });
  const result = await harness.bookingApi.get_page("all", {
    page: 2,
    search: "  camera  ",
    status: "Approved",
    oldestFirst: true,
  });
  assert.match(harness.calls[0].query, /bookingsPage: allBookingsPage\(/);
  assert.match(
    harness.calls[0].query,
    /page: \$page, search: \$search, status: \$status, oldestFirst: \$oldestFirst/,
  );
  assert.deepEqual(harness.calls[0].variables, {
    page: 2,
    search: "camera",
    status: "Approved",
    oldestFirst: true,
  });
  assert.equal(result.page, 2);
  assert.equal(result.pageSize, 30);
  assert.equal(result.totalCount, 31);
  assert.equal(result.items[0].id, 101);
  assert.equal(result.items[0].userName, "User");
  assert.equal(result.items[0].telegramUsername, "");
});

test("my page API uses the authenticated personal endpoint and normalizes cleared filters", async () => {
  const harness = apiHarness({ bookingsPage: pageResult(1, [], 0) });
  await harness.bookingApi.get_page("my", {
    page: 1,
    search: "   ",
    status: "all",
    oldestFirst: false,
  });
  assert.match(harness.calls[0].query, /bookingsPage: myBookingsPage\(/);
  assert.deepEqual(harness.calls[0].variables, {
    page: 1,
    search: null,
    status: null,
    oldestFirst: false,
  });
  assert.equal(harness.calls.length, 1);
});

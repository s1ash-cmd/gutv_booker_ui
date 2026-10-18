const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..");
const compiledDirectory = mkdtempSync(path.join(tmpdir(), "gutv-cart-tests-"));
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
      rootDir: path.join(projectRoot, "src"),
      outDir: compiledDirectory,
      paths: { "@/*": [path.join(projectRoot, "src/*")] },
    },
    files: [path.join(projectRoot, "src/lib/cartStore.ts")],
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
const { createCartStore } = require(
  path.join(compiledDirectory, "lib/cartStore.js"),
);

const model = {
  id: 1,
  name: "Camera",
  description: "",
  category: 0,
  access: 0,
  attributes: {},
};
const secondModel = { ...model, id: 2, name: "Lens" };
const clone = (value) => structuredClone(value);
const nextTurn = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function environment(quantity = 3) {
  let session = "1:session-a:User";
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  let remote = {
    id: 1,
    editingBookingId: null,
    reason: "server reason",
    startTime: "2026-10-10T09:00:00Z",
    endTime: "2026-10-10T18:00:00Z",
    comment: "server comment",
    updatedAt: "2026-10-01T00:00:00Z",
    items: [{ id: 1, eqModelId: 1, quantity, model }],
  };
  const calls = [];
  const booking = { id: 42 };
  function snapshot() {
    return clone(remote);
  }
  function clear() {
    remote = {
      ...remote,
      reason: "",
      startTime: null,
      endTime: null,
      comment: null,
      editingBookingId: null,
      items: [],
    };
  }
  const api = {
    async get_my_cart() {
      calls.push("read");
      return snapshot();
    },
    async add_cart_item(id, quantityToAdd) {
      calls.push(`add:${id}`);
      const item = remote.items.find((item) => item.eqModelId === id);
      if (item) item.quantity += quantityToAdd;
      else
        remote.items.push({
          id,
          eqModelId: id,
          quantity: quantityToAdd,
          model: id === 1 ? model : secondModel,
        });
      return snapshot();
    },
    async update_cart_item_quantity(id, nextQuantity) {
      calls.push(`quantity:${id}:${nextQuantity}`);
      remote.items.find((item) => item.eqModelId === id).quantity =
        nextQuantity;
      return snapshot();
    },
    async remove_cart_item(id) {
      calls.push(`remove:${id}`);
      remote.items = remote.items.filter((item) => item.eqModelId !== id);
      return snapshot();
    },
    async clear_cart() {
      calls.push("clear");
      clear();
    },
    async add_booking_items_to_cart() {
      calls.push("repeat");
      return api.add_cart_item(1, 1);
    },
    async prepare_booking_edit(id) {
      calls.push(`edit:${id}`);
      remote = {
        ...remote,
        editingBookingId: id,
        reason: "edit reason",
        comment: "edit comment",
      };
      return snapshot();
    },
    async set_cart_details(details) {
      calls.push("save");
      remote = { ...remote, ...details };
      return snapshot();
    },
    async create_booking_from_cart() {
      calls.push("create");
      clear();
      return clone(booking);
    },
    async update_booking_from_cart(id) {
      calls.push(`update:${id}`);
      clear();
      return { id };
    },
  };
  function create() {
    return createCartStore(api, {
      getSessionKey: () => session,
      getDraftStorage: () => storage,
    });
  }
  return {
    api,
    calls,
    values,
    storage,
    create,
    snapshot,
    setRemote: (value) => {
      remote = value;
    },
    setSession: (value) => {
      session = value;
    },
  };
}

test("rapid decrements read the latest completed snapshot and reduce 3 to 1", async () => {
  const env = environment();
  const store = env.create();
  await store.refreshCart();
  const first = store.removeFromCart(1);
  const second = store.removeFromCart(1);
  assert.equal(store.getSnapshot().isCartUpdating, true);
  await Promise.all([first, second]);
  assert.deepEqual(env.calls, ["read", "quantity:1:2", "quantity:1:1"]);
  assert.equal(store.getSnapshot().cart[1].quantity, 1);
  assert.equal(store.getSnapshot().isCartUpdating, false);
});

test("a pending read cannot finish after a mutation and overwrite its snapshot", async () => {
  const env = environment();
  const gate = deferred();
  env.api.get_my_cart = async () => {
    env.calls.push("read");
    await gate.promise;
    return env.snapshot();
  };
  const store = env.create();
  const read = store.refreshCart();
  const add = store.addToCart(secondModel);
  await nextTurn();
  assert.deepEqual(env.calls, ["read"]);
  gate.resolve();
  await Promise.all([read, add]);
  assert.deepEqual(env.calls, ["read", "add:2"]);
  assert.equal(store.getSnapshot().cart[2].quantity, 1);
});

test("mutations to different models share one queue and preserve every item", async () => {
  const env = environment();
  const gate = deferred();
  const originalAdd = env.api.add_cart_item;
  env.api.add_cart_item = async (id, quantity) => {
    if (id === 1) await gate.promise;
    return originalAdd(id, quantity);
  };
  const store = env.create();
  const first = store.addToCart(model);
  const second = store.addToCart(secondModel);
  await nextTurn();
  assert.equal(env.calls.length, 0);
  gate.resolve();
  await Promise.all([first, second]);
  assert.equal(store.getSnapshot().cart[1].quantity, 4);
  assert.equal(store.getSnapshot().cart[2].quantity, 1);
});

test("one failed operation does not poison later work or leave pending stuck", async () => {
  const env = environment();
  const originalAdd = env.api.add_cart_item;
  env.api.add_cart_item = async (id, quantity) => {
    if (id === 1) throw new Error("offline");
    return originalAdd(id, quantity);
  };
  const store = env.create();
  const failed = store.addToCart(model);
  const rejected = assert.rejects(failed, /offline/);
  const next = store.addToCart(secondModel);
  await rejected;
  await next;
  assert.equal(store.getSnapshot().cart[2].quantity, 1);
  assert.equal(store.getSnapshot().isCartUpdating, false);
});

test("raw dirty draft survives add, read and a provider reload in the same session", async () => {
  const env = environment();
  const store = env.create();
  await store.refreshCart();
  const draft = {
    reason: "new reason",
    startTime: "2026-10-",
    endTime: "",
    comment: "typing...",
  };
  store.updateCartDraft(draft);
  await store.addToCart(secondModel);
  await store.refreshCart();
  assert.deepEqual(store.getSnapshot().cartDraft, draft);
  const restored = env.create();
  await restored.refreshCart();
  assert.deepEqual(restored.getSnapshot().cartDraft, draft);
});

test("only clean draft fields synchronize from a remote snapshot", async () => {
  const env = environment();
  const store = env.create();
  await store.refreshCart();
  store.updateCartDraft({ reason: "keep local" });
  await store.setCartDetails({
    reason: "server change",
    comment: "new server comment",
  });
  assert.equal(store.getSnapshot().cartDraft.reason, "keep local");
  assert.equal(store.getSnapshot().cartDraft.comment, "new server comment");
});

test("new authentication session does not inherit the previous draft", async () => {
  const env = environment();
  const store = env.create();
  await store.refreshCart();
  store.updateCartDraft({ reason: "private draft" });
  env.setSession("1:session-new:User");
  const restored = env.create();
  await restored.refreshCart();
  assert.equal(restored.getSnapshot().cartDraft.reason, "server reason");
});

test("stale response and queued actions cannot change or dispatch under a new account", async () => {
  const env = environment();
  const gate = deferred();
  const oldRemote = env.snapshot();
  env.api.get_my_cart = async () => {
    env.calls.push("read-old");
    return gate.promise;
  };
  const store = env.create();
  const oldRead = store.refreshCart();
  const oldReadRejected = assert.rejects(oldRead, {
    name: "SessionChangedError",
  });
  const oldAdd = store.addToCart(secondModel);
  const oldAddRejected = assert.rejects(oldAdd, {
    name: "SessionChangedError",
  });
  await nextTurn();
  env.setSession("2:session-other:User");
  env.setRemote({ ...oldRemote, reason: "other account", items: [] });
  env.api.get_my_cart = async () => {
    env.calls.push("read-new");
    return env.snapshot();
  };
  await store.refreshCart();
  store.updateCartDraft({ reason: "other draft" });
  gate.resolve(oldRemote);
  await Promise.all([oldReadRejected, oldAddRejected]);
  assert.deepEqual(env.calls, ["read-old", "read-new"]);
  assert.deepEqual(store.getSnapshot().cart, {});
  assert.equal(store.getSnapshot().cartDraft.reason, "other draft");
  assert.equal(store.getSnapshot().isCartUpdating, false);
});

test("clear removes the draft from memory and sessionStorage", async () => {
  const env = environment();
  const store = env.create();
  await store.refreshCart();
  store.updateCartDraft({ reason: "discard" });
  await store.clearCart();
  assert.equal(store.getSnapshot().cartDraft.reason, "");
  assert.deepEqual(store.getSnapshot().cart, {});
  assert.equal(env.values.size, 0);
});

test("preparing an edit resets dirty draft even for the same booking id", async () => {
  const env = environment();
  const store = env.create();
  await store.prepareBookingEdit(8);
  store.updateCartDraft({ reason: "discard" });
  await store.prepareBookingEdit(8);
  assert.equal(store.getSnapshot().editingBookingId, 8);
  assert.equal(store.getSnapshot().cartDraft.reason, "edit reason");
  assert.equal(env.values.size, 0);
});

test("atomic submit waits earlier operations and blocks changes between save and checkout", async () => {
  const env = environment();
  const saveGate = deferred();
  const originalSave = env.api.set_cart_details;
  env.api.set_cart_details = async (details) => {
    await saveGate.promise;
    return originalSave(details);
  };
  const store = env.create();
  await store.refreshCart();
  const previousAdd = store.addToCart(secondModel);
  const submit = store.submitBookingFromCart({
    reason: "submit",
    startTime: "2026-10-10T09:00:00Z",
    endTime: "2026-10-10T18:00:00Z",
  });
  const laterAdd = store.addToCart(model);
  await nextTurn();
  assert.deepEqual(env.calls, ["read", "add:2"]);
  saveGate.resolve();
  await previousAdd;
  assert.equal((await submit).id, 42);
  await laterAdd;
  assert.deepEqual(env.calls, ["read", "add:2", "save", "create", "add:1"]);
  assert.equal(store.getSnapshot().cart[1].quantity, 1);
  assert.equal(store.getSnapshot().cartDraft.reason, "");
});

test("successful checkout clears draft and edit mode; failed checkout preserves draft", async () => {
  const env = environment();
  const store = env.create();
  await store.prepareBookingEdit(8);
  store.updateCartDraft({ reason: "keep after error" });
  const originalUpdate = env.api.update_booking_from_cart;
  env.api.update_booking_from_cart = async () => {
    throw new Error("not available");
  };
  await assert.rejects(
    store.submitBookingFromCart({ reason: "submit" }, 8),
    /not available/,
  );
  assert.equal(store.getSnapshot().cartDraft.reason, "keep after error");
  assert.equal(store.getSnapshot().editingBookingId, 8);
  env.api.update_booking_from_cart = originalUpdate;
  assert.equal(
    (await store.submitBookingFromCart({ reason: "submit" }, 8)).id,
    8,
  );
  assert.equal(store.getSnapshot().cartDraft.reason, "");
  assert.equal(store.getSnapshot().editingBookingId, null);
  assert.equal(env.values.size, 0);
});

test("logout during details save prevents checkout and cannot resurrect old state", async () => {
  const env = environment();
  const gate = deferred();
  env.api.set_cart_details = () => gate.promise;
  const store = env.create();
  const submit = store.submitBookingFromCart({ reason: "submit" });
  const rejected = assert.rejects(submit, { name: "SessionChangedError" });
  await nextTurn();
  env.setSession(null);
  store.syncSession();
  gate.resolve(env.snapshot());
  await rejected;
  assert.equal(env.calls.includes("create"), false);
  assert.deepEqual(store.getSnapshot().cart, {});
  assert.equal(store.getSnapshot().cartDraft.reason, "");
  assert.equal(store.getSnapshot().isCartUpdating, false);
});

test("unauthenticated cart is not stuck loading and ignores invalid persisted drafts", async () => {
  const env = environment();
  env.setSession(null);
  const store = env.create();
  store.syncSession();
  assert.equal(store.getSnapshot().isCartLoading, false);
  await assert.rejects(store.refreshCart(), /войдите/);
  env.setSession("1:session-a:User");
  env.values.set(
    "gutv-booker:cart-draft:1:session-a:User",
    JSON.stringify({ sessionKey: "other", draft: { reason: "invalid" } }),
  );
  await store.refreshCart();
  assert.equal(store.getSnapshot().cartDraft.reason, "server reason");
});

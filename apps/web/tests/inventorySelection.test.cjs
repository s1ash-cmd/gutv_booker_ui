const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");
const vm = require("node:vm");
const { createHookHarness, deferred } = require("./helpers/hookHarness.cjs");

const root = path.resolve(__dirname, "..");
const compiled = mkdtempSync(path.join(tmpdir(), "gutv-inventory-ui-"));
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
      path.join(root, "src/components/equipment/InventorySelection.tsx"),
      path.join(root, "src/components/equipment/InventoryPickerDialog.tsx"),
    ],
  }),
);
execFileSync(path.join(root, "node_modules/.bin/tsc"), ["-p", config], {
  cwd: root,
  stdio: "pipe",
});
const source = readFileSync(
  path.join(compiled, "components/equipment/InventorySelection.js"),
  "utf8",
);
const clone = (value) => JSON.parse(JSON.stringify(value));
function nodes(node) {
  if (node == null || typeof node === "boolean") return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (typeof node !== "object") return [node];
  return [node, ...nodes(node.props?.children)];
}
const text = (node) =>
  nodes(node)
    .filter((n) => typeof n === "string" || typeof n === "number")
    .join(" ");
const option = (id, available = null, operable = true) => ({
  id,
  inventoryNumber: `HEAD-${id}`,
  available,
  operable,
});

function environment(overrides = {}) {
  const harness = createHookHarness();
  harness.react.useId = () => "inventory-options";
  const requests = [];
  const changes = [];
  let props = {
    modelId: 1,
    presentation: "list",
    selectedItemIds: [],
    startTime: "",
    endTime: "",
    editingBookingId: null,
    disabled: false,
    async onChange(ids) {
      changes.push(clone(ids));
    },
    ...overrides,
  };
  const module = { exports: {} };
  const jsx = (type, props, key) => ({ type, props, key });
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    require(name) {
      if (name === "lucide-react")
        return { ChevronDown: "icon", Search: "icon", RefreshCw: "icon" };
      if (name === "@/lib/utils")
        return { cn: (...values) => values.filter(Boolean).join(" ") };
      if (name === "react") return harness.react;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "@/components/ui/popover")
        return {
          Popover: "Popover",
          PopoverContent: "PopoverContent",
          PopoverTrigger: "PopoverTrigger",
        };
      if (name === "@/components/ui/button") return { Button: "button" };
      if (name === "@/lib/userFacingMessages")
        return { getErrorMessage: (error) => error.message };
      if (name === "@/lib/cartApi")
        return {
          cartApi: {
            get_equipment_options(...args) {
              const gate = deferred();
              requests.push({ args, ...gate });
              return gate.promise;
            },
          },
        };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  harness.mount(() => module.exports.InventorySelection(props));
  return {
    harness,
    requests,
    changes,
    text: () => text(harness.view),
    buttons: () => nodes(harness.view).filter((node) => node.type === "button"),
    checkboxes: () =>
      nodes(harness.view).filter(
        (node) => node.type === "input" && node.props.type === "checkbox",
      ),
    setProps(patch) {
      props = { ...props, ...patch };
      harness.rerender();
    },
    async respond(index, options) {
      requests[index].resolve(options);
      await harness.settle();
    },
  };
}

test("several inventory cards can be selected without a quantity limit", async () => {
  const env = environment();
  assert.deepEqual(env.requests[0].args, [1, null, null]);
  await env.respond(0, [option(1), option(2)]);
  env.harness.act(() => env.checkboxes()[1].props.onChange());
  assert.deepEqual(env.changes, [[2]]);
  env.setProps({ selectedItemIds: [2] });
  assert.equal(env.checkboxes()[0].props.disabled, false);
  env.harness.act(() => env.checkboxes()[0].props.onChange());
  assert.deepEqual(env.changes.at(-1), [2, 1]);
  assert.doesNotMatch(env.text(), /автомат|первый свободный/i);
});

test("bulk selection includes only available inventory and can be cleared explicitly", async () => {
  const env = environment();
  await env.respond(0, [
    option(1, true),
    option(2, true),
    option(3, false),
    option(4, true, false),
  ]);
  env.harness.act(() =>
    env
      .buttons()
      .find((b) => text(b) === "Выбрать все")
      .props.onClick(),
  );
  assert.deepEqual(env.changes, [[1, 2]]);
  env.setProps({ selectedItemIds: [1, 2] });
  env.harness.act(() =>
    env
      .buttons()
      .find((b) => text(b) === "Очистить")
      .props.onClick(),
  );
  assert.deepEqual(env.changes.at(-1), []);
});

test("dropdown keeps many inventory options off the cart until opened", async () => {
  const env = environment({
    presentation: "dropdown",
    selectedItemIds: [1, 2, 3, 4],
  });
  await env.respond(
    0,
    Array.from({ length: 30 }, (_, i) => option(i + 1)),
  );
  assert.equal(env.checkboxes().length, 0);
  assert.match(env.text(), /HEAD-1, HEAD-2 и ещё 2/);
  env.harness.act(() =>
    nodes(env.harness.view)
      .find((n) => n.type === "Popover")
      .props.onOpenChange(true),
  );
  assert.equal(env.checkboxes().length, 30);
  const search = nodes(env.harness.view).find(
    (n) => n.type === "input" && n.props.type === "search",
  );
  env.harness.act(() =>
    search.props.onChange({ target: { value: "HEAD-12" } }),
  );
  assert.equal(env.checkboxes().length, 1);
  env.harness.act(() => env.checkboxes()[0].props.onChange());
  assert.deepEqual(env.changes.at(-1), [1, 2, 3, 4, 12]);
  env.harness.act(() =>
    env
      .buttons()
      .find((b) => text(b) === "Готово")
      .props.onClick(),
  );
  assert.equal(env.checkboxes().length, 0);
  env.harness.act(() =>
    nodes(env.harness.view)
      .find((n) => n.type === "Popover")
      .props.onOpenChange(true),
  );
  assert.equal(env.checkboxes().length, 30);
});

test("search bulk selection adds matching available numbers and keeps hidden choices", async () => {
  const env = environment({ selectedItemIds: [2] });
  await env.respond(0, [option(1, true), option(2, true), option(10, false)]);
  const search = nodes(env.harness.view).find(
    (n) => n.type === "input" && n.props.type === "search",
  );
  env.harness.act(() => search.props.onChange({ target: { value: "head-1" } }));
  env.harness.act(() =>
    env
      .buttons()
      .find((b) => text(b) === "Выбрать найденные")
      .props.onClick(),
  );
  assert.deepEqual(env.changes.at(-1), [2, 1]);
  env.harness.act(() =>
    search.props.onChange({ target: { value: "missing-number" } }),
  );
  assert.match(env.text(), /Номер не найден/);
  assert.deepEqual(env.changes.at(-1), [2, 1]);
});

test("confirming an empty dropdown selection removes the position", async () => {
  let removed = false;
  const env = environment({
    presentation: "dropdown",
    onConfirmEmpty: async () => {
      removed = true;
    },
  });
  await env.respond(0, [option(1)]);
  env.harness.act(() =>
    nodes(env.harness.view)
      .find((n) => n.type === "Popover")
      .props.onOpenChange(true),
  );
  env.harness.act(() =>
    env
      .buttons()
      .find((b) => text(b) === "Удалить из брони")
      .props.onClick(),
  );
  await env.harness.settle();
  assert.equal(removed, true);
  assert.equal(env.checkboxes().length, 0);
});

test("occupied and faulty choices cannot be added but an existing selection can be removed", async () => {
  const env = environment({
    selectedItemIds: [2],
    startTime: "2030-01-10T10:00",
    endTime: "2030-01-10T12:00",
  });
  await env.respond(0, [
    option(1, false),
    option(2, false),
    option(3, true, false),
    option(4, true),
  ]);
  assert.equal(env.checkboxes()[0].props.disabled, true);
  assert.equal(env.checkboxes()[1].props.disabled, false);
  assert.equal(env.checkboxes()[2].props.disabled, true);
  assert.equal(env.checkboxes()[3].props.disabled, false);
  assert.match(env.text(), /Занят/);
  env.harness.act(() => env.checkboxes()[1].props.onChange());
  assert.deepEqual(env.changes, [[]]);
});

test("changing dates hides stale availability and ignores old responses without dropping selection", async () => {
  const env = environment({ selectedItemIds: [2] });
  env.setProps({ startTime: "2030-01-10T10:00", endTime: "2030-01-10T12:00" });
  assert.equal(env.requests.length, 2);
  await env.respond(1, [option(2, false)]);
  await env.respond(0, [option(2, true)]);
  assert.match(env.text(), /Занят/);
  assert.equal(env.checkboxes()[0].props.checked, true);
  assert.deepEqual(env.changes, []);
  env.setProps({ endTime: "2030-01-11T12:00" });
  assert.match(env.text(), /Загрузка номеров/);
  assert.equal(env.checkboxes().length, 0);
  env.harness.unmount();
  await env.respond(2, [option(2, true)]);
});

test("loading errors can be retried and deleted selected inventory remains removable", async () => {
  const env = environment({ selectedItemIds: [2] });
  env.requests[0].reject(new Error("Временная ошибка"));
  await env.harness.settle();
  assert.match(env.text(), /Временная ошибка/);
  env.harness.act(() =>
    env
      .buttons()
      .find((button) => button.props["aria-label"] === "Обновить доступность")
      .props.onClick(),
  );
  await env.respond(1, [option(1)]);
  assert.match(env.text(), /Экземпляр недоступен/);
  env.harness.act(() => env.checkboxes()[1].props.onChange());
  assert.deepEqual(env.changes, [[]]);
});

test("cart API preserves inventory preferences and sends typed selection and availability variables", async () => {
  const requests = [];
  const module = { exports: {} };
  const remote = {
    id: 1,
    editingBookingId: null,
    reason: "",
    startTime: null,
    endTime: null,
    comment: null,
    updatedAt: "2030-01-01T00:00:00Z",
    items: [
      {
        id: 1,
        eqModelId: 1,
        quantity: 2,
        selectedItemIds: [2],
        eqModel: { id: 1 },
      },
    ],
  };
  vm.runInNewContext(
    readFileSync(path.join(compiled, "lib/cartApi.js"), "utf8"),
    {
      module,
      exports: module.exports,
      require(name) {
        if (name === "./graphqlMappers")
          return {
            mapEquipmentModel: (model) => model,
            mapBooking: (booking) => booking,
          };
        if (name === "./authApi")
          return {
            authenticatedGraphqlRequest: async (query, variables) => {
              requests.push({ query, variables: clone(variables) });
              return {
                addCartItem: remote,
                setCartItemSelection: remote,
                cartEquipmentOptions: [option(2, true)],
              };
            },
          };
        throw new Error(`Unexpected import: ${name}`);
      },
    },
  );
  const api = module.exports.cartApi;
  const cart = await api.add_cart_item(1, 1, 2);
  assert.deepEqual(clone(cart.items[0].selectedItemIds), [2]);
  assert.deepEqual(requests[0].variables, {
    eqModelId: 1,
    quantity: 1,
    selectedItemId: 2,
  });
  await api.set_cart_item_selection(1, []);
  assert.deepEqual(requests[1].variables, {
    eqModelId: 1,
    selectedItemIds: [],
  });
  assert.match(requests[1].query, /\[Int!\]!/);
  await api.get_equipment_options(1, null, null);
  assert.deepEqual(requests[2].variables, {
    eqModelId: 1,
    start: null,
    end: null,
  });
});

function pickerEnvironment({ saved = [], fail = false } = {}) {
  const harness = createHookHarness();
  const calls = [];
  let closed = false;
  const model = { id: 1, name: "Headphones" };
  const cart = saved.length ? { 1: { model, selectedItemIds: saved } } : {};
  const module = { exports: {} };
  const jsx = (type, props, key) => ({ type, props, key });
  vm.runInNewContext(
    readFileSync(
      path.join(compiled, "components/equipment/InventoryPickerDialog.js"),
      "utf8",
    ),
    {
      module,
      exports: module.exports,
      require(name) {
        if (name === "react") return harness.react;
        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
        if (name === "@/components/equipment/InventorySelection")
          return { InventorySelection: "InventorySelection" };
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
            ].map((name) => [name, name]),
          );
        if (name === "@/lib/userFacingMessages")
          return { getErrorMessage: (error) => error.message };
        if (name === "@/contexts/CartContext")
          return {
            useCart: () => ({
              cart,
              cartDraft: { startTime: "", endTime: "" },
              editingBookingId: null,
              isCartUpdating: false,
              async setItemSelection(modelId, ids) {
                calls.push({ modelId, ids: clone(ids) });
                if (fail) throw new Error("Занят выбранный номер");
              },
              async updateQuantity(modelId, quantity) {
                calls.push({ modelId, quantity });
                if (fail) throw new Error("Не удалось удалить оборудование");
              },
            }),
          };
        throw new Error(`Unexpected import: ${name}`);
      },
    },
  );
  harness.mount(() =>
    module.exports.InventoryPickerDialog({
      model,
      onClose() {
        closed = true;
      },
    }),
  );
  return {
    harness,
    calls,
    cart,
    get closed() {
      return closed;
    },
    select: () =>
      nodes(harness.view).find((node) => node.type === "InventorySelection"),
    save: () => nodes(harness.view).find((node) => node.type === "button"),
    dialog: () => nodes(harness.view).find((node) => node.type === "Dialog"),
  };
}

test("picker stages multiple choices and saves them in one request", async () => {
  const env = pickerEnvironment();
  assert.equal(env.save().props.disabled, false);
  env.harness.act(() => env.select().props.onChange([1, 2]));
  assert.deepEqual(env.calls, []);
  assert.equal(env.save().props.disabled, false);
  env.harness.act(() => env.save().props.onClick());
  await env.harness.settle();
  assert.deepEqual(env.calls, [{ modelId: 1, ids: [1, 2] }]);
  assert.equal(env.closed, true);
});

test("saving zero selected inventory removes the existing cart position", async () => {
  const env = pickerEnvironment({ saved: [1, 2] });
  env.harness.act(() => env.select().props.onChange([]));
  assert.equal(env.save().props.disabled, false);
  assert.match(text(env.save()), /Удалить из брони/);
  env.harness.act(() => env.save().props.onClick());
  await env.harness.settle();
  assert.deepEqual(env.calls, [{ modelId: 1, quantity: 0 }]);
  assert.equal(env.closed, true);
});

test("saving an empty new selection closes without creating an empty cart item", async () => {
  const env = pickerEnvironment();
  env.harness.act(() => env.select().props.onChange([1]));
  env.harness.act(() => env.select().props.onChange([]));
  assert.equal(env.save().props.disabled, false);
  env.harness.act(() => env.save().props.onClick());
  await env.harness.settle();
  assert.deepEqual(env.calls, []);
  assert.equal(env.closed, true);
});

test("failed removal keeps the picker open and the saved position intact", async () => {
  const env = pickerEnvironment({ saved: [2], fail: true });
  env.harness.act(() => env.select().props.onChange([]));
  env.harness.act(() => env.save().props.onClick());
  await env.harness.settle();
  assert.equal(env.closed, false);
  assert.deepEqual(env.cart[1].selectedItemIds, [2]);
  assert.match(text(env.harness.view), /Не удалось удалить оборудование/);
});

test("cancelling a picker never changes saved inventory", () => {
  const env = pickerEnvironment({ saved: [2] });
  env.harness.act(() => env.select().props.onChange([1, 2]));
  env.harness.act(() => env.dialog().props.onOpenChange(false));
  assert.equal(env.closed, true);
  assert.deepEqual(env.calls, []);
  assert.deepEqual(env.cart[1].selectedItemIds, [2]);
});

test("failed selection save keeps the picker open and preserves the draft", async () => {
  const env = pickerEnvironment({ saved: [2], fail: true });
  env.harness.act(() => env.select().props.onChange([1, 2]));
  env.harness.act(() => env.save().props.onClick());
  await env.harness.settle();
  assert.equal(env.closed, false);
  assert.deepEqual(clone(env.select().props.selectedItemIds), [1, 2]);
  assert.deepEqual(env.cart[1].selectedItemIds, [2]);
  assert.match(text(env.harness.view), /Занят выбранный номер/);
});

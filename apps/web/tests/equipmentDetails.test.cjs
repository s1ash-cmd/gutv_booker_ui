const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");
const vm = require("node:vm");
const { createHookHarness, deferred } = require("./helpers/hookHarness.cjs");

const projectRoot = path.resolve(__dirname, "..");
const compiledDirectory = mkdtempSync(
  path.join(tmpdir(), "gutv-equipment-ui-"),
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
    files: [path.join(projectRoot, "src/hooks/use-equipment-details.ts")],
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

function equipmentHarness(hookName) {
  const harness = createHookHarness();
  const requests = [];
  let modelId = "1";
  const api = {};
  for (const method of [
    "get_model_by_id",
    "get_all_models",
    "get_items_by_model",
    "get_available_items_by_model",
  ]) {
    api[method] = (...args) => {
      const request = deferred();
      requests.push({ method, args, ...request });
      return request.promise;
    };
  }
  const module = { exports: {} };
  vm.runInNewContext(
    readFileSync(
      path.join(compiledDirectory, "hooks/use-equipment-details.js"),
      "utf8",
    ),
    {
      module,
      exports: module.exports,
      require(name) {
        if (name === "react") return harness.react;
        if (name === "@/lib/equipmentApi") return { equipmentApi: api };
        throw new Error(`Unexpected dependency: ${name}`);
      },
      Date,
      Error,
    },
  );
  harness.mount(() => module.exports[hookName](modelId));
  return {
    ...harness,
    get view() {
      return harness.view;
    },
    requests,
    changeModel(id) {
      modelId = id;
      harness.rerender();
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

async function respondToModel(harness, start, id) {
  await harness.respond(start, { id, name: `Model ${id}` });
  await harness.respond(start + 1, [{ id }]);
  await harness.respond(start + 2, [{ id: id * 10 }]);
}

function selectRange(harness, day = 10) {
  harness.act((view) => {
    view.setDate({
      from: new Date(2026, 9, day),
      to: new Date(2026, 9, day + 1),
    });
    view.setShowDatePicker(true);
  });
}

function checkEmptyRange(view) {
  assert.equal(view.date, undefined);
  assert.equal(view.appliedDate, undefined);
  assert.equal(view.startTime, "09:00");
  assert.equal(view.endTime, "18:00");
  assert.equal(view.rangeLoading, false);
  assert.equal(view.rangeAvailableItems, null);
  assert.equal(view.rangeError, null);
  assert.equal(view.showDatePicker, false);
}

test("changing models ignores a stale success or failure and keeps the new model loading", async () => {
  for (const oldFailure of [false, true]) {
    const harness = equipmentHarness("useEquipmentDetails");
    harness.changeModel("2");
    if (oldFailure) await harness.fail(0, new Error("old model failure"));
    else await respondToModel(harness, 0, 1);
    assert.equal(harness.view.model, null);
    assert.equal(harness.view.loading, true);
    assert.equal(harness.view.error, null);
    await respondToModel(harness, 3, 2);
    assert.equal(harness.view.model.id, 2);
    assert.equal(harness.view.items[0].id, 20);
    assert.equal(harness.view.loading, false);
    harness.unmount();
  }
});

test("a valid model after a failing route clears the previous error and old data", async () => {
  const harness = equipmentHarness("useEquipmentDetails");
  await harness.fail(0, new Error("not found"));
  assert.equal(harness.view.error, "not found");
  harness.changeModel("2");
  assert.equal(harness.view.error, null);
  assert.equal(harness.view.loading, true);
  await respondToModel(harness, 3, 2);
  assert.equal(harness.view.model.id, 2);
  assert.equal(harness.view.error, null);
  harness.unmount();
});

test("malformed model ids never request a different valid model", async () => {
  const harness = equipmentHarness("useEquipmentDetails");
  harness.changeModel("2garbage");
  assert.equal(harness.requests.length, 3);
  assert.match(harness.view.error, /идентификатор/);
  assert.equal(harness.view.loading, false);
  await respondToModel(harness, 0, 1);
  assert.equal(harness.view.model, null);
  harness.unmount();
});

test("changing model resets dates, time, modal and range results", async () => {
  const harness = equipmentHarness("useEquipmentAvailability");
  selectRange(harness);
  harness.act((view) => {
    view.setStartTime("11:00");
    view.setEndTime("20:00");
    void view.handleConfirmDates();
  });
  await harness.respond(0, [{ id: 11 }]);
  assert.equal(harness.view.rangeAvailableItems[0].id, 11);
  harness.act((view) => view.setShowDatePicker(true));
  harness.changeModel("2");
  checkEmptyRange(harness.view);
  harness.unmount();
});

test("old range completion cannot populate another model or close its new modal", async () => {
  const harness = equipmentHarness("useEquipmentAvailability");
  selectRange(harness);
  harness.act((view) => void view.handleConfirmDates());
  harness.changeModel("2");
  selectRange(harness, 20);
  harness.act((view) => void view.handleConfirmDates());
  await harness.respond(0, [{ id: 11 }]);
  assert.equal(harness.view.rangeAvailableItems, null);
  assert.equal(harness.view.rangeLoading, true);
  assert.equal(harness.view.showDatePicker, true);
  await harness.respond(1, [{ id: 22 }]);
  assert.equal(harness.requests[1].args[0], 2);
  assert.equal(harness.view.rangeAvailableItems[0].id, 22);
  assert.equal(harness.view.appliedDate.from.getDate(), 20);
  assert.equal(harness.view.rangeLoading, false);
  assert.equal(harness.view.showDatePicker, false);
  harness.unmount();
});

test("clearing a range invalidates its pending success or error", async () => {
  for (const failure of [false, true]) {
    const harness = equipmentHarness("useEquipmentAvailability");
    selectRange(harness);
    harness.act((view) => void view.handleConfirmDates());
    harness.act((view) => view.handleClearRange());
    if (failure) await harness.fail(0, new Error("old range failure"));
    else await harness.respond(0, [{ id: 11 }]);
    checkEmptyRange(harness.view);
    harness.unmount();
  }
});

test("newer period wins over an older success or error", async () => {
  for (const failure of [false, true]) {
    const harness = equipmentHarness("useEquipmentAvailability");
    selectRange(harness);
    harness.act((view) => void view.handleConfirmDates());
    selectRange(harness, 20);
    harness.act((view) => void view.handleConfirmDates());
    await harness.respond(1, [{ id: 22 }]);
    if (failure) await harness.fail(0, new Error("old range failure"));
    else await harness.respond(0, [{ id: 11 }]);
    assert.equal(harness.view.rangeAvailableItems[0].id, 22);
    assert.equal(harness.view.appliedDate.from.getDate(), 20);
    assert.equal(harness.view.rangeError, null);
    assert.equal(harness.view.rangeLoading, false);
    harness.unmount();
  }
});

test("a range error can recover and unmount ignores all pending updates", async () => {
  const harness = equipmentHarness("useEquipmentAvailability");
  selectRange(harness);
  harness.act((view) => void view.handleConfirmDates());
  await harness.fail(0, new Error("offline"));
  assert.equal(harness.view.rangeError, "offline");
  harness.act((view) => void view.handleConfirmDates());
  assert.equal(harness.view.rangeError, null);
  assert.equal(harness.view.rangeLoading, true);
  await harness.respond(1, [{ id: 11 }]);
  harness.act((view) => void view.handleConfirmDates());
  const before = harness.view;
  harness.unmount();
  await harness.respond(2, [{ id: 33 }]);
  assert.equal(harness.view, before);
});

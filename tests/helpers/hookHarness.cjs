const sameDependencies = (old, next) =>
  old &&
  old.length === next.length &&
  old.every((item, index) => Object.is(item, next[index]));

// Run the real provider/hook with batched updates and effect cleanup, as in
// bookingPagination.test.cjs. The caller controls request completion order.
function createHookHarness() {
  const slots = [];
  let cursor = 0;
  let needsRender = false;
  let effects = [];
  let render;
  let view;
  let mounted = true;
  const react = {
    createContext: () => ({ Provider: Symbol("Provider") }),
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
    useMemo(factory, dependencies) {
      const index = cursor++;
      if (!sameDependencies(slots[index]?.dependencies, dependencies))
        slots[index] = { value: factory(), dependencies };
      return slots[index].value;
    },
    useCallback(callback, dependencies) {
      return react.useMemo(() => callback, dependencies);
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

  function flush() {
    if (!mounted) return;
    let iterations = 0;
    do {
      if (++iterations > 30) throw new Error("Hook entered a render loop");
      needsRender = false;
      cursor = 0;
      effects = [];
      view = render();
      for (const entry of effects) entry.cleanup?.();
      for (const entry of effects) slots[entry.index].cleanup = entry.effect();
    } while (needsRender);
  }

  async function settle() {
    for (let i = 0; i < 8; i++) {
      await Promise.resolve();
      if (needsRender) flush();
    }
  }

  return {
    react,
    get view() {
      return view;
    },
    mount(callback) {
      render = callback;
      flush();
    },
    act(callback) {
      const result = callback(view);
      if (needsRender) flush();
      return result;
    },
    rerender: flush,
    settle,
    unmount() {
      mounted = false;
      for (const slot of slots) slot?.cleanup?.();
    },
  };
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

module.exports = { createHookHarness, deferred };

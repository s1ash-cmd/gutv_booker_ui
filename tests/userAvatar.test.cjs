const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const compiled = mkdtempSync(path.join(tmpdir(), "gutv-avatar-tests-"));
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
      typeRoots: [path.join(root, "node_modules/@types")],
      types: ["node"],
      rootDir: path.join(root, "src"),
      outDir: compiled,
      paths: { "@/*": [path.join(root, "src/*")] },
    },
    files: [path.join(root, "src/lib/userApi.ts")],
  }),
);
execFileSync(path.join(root, "node_modules/.bin/tsc"), ["-p", config], {
  cwd: root,
  stdio: "pipe",
});
const source = readFileSync(path.join(compiled, "lib/userApi.js"), "utf8");
function environment() {
  const values = new Map([
    ["auth_session_id", "session-one"],
    ["access_token", "token-one"],
  ]);
  const readers = [],
    requests = [];
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    Error,
    process: { env: {} },
    localStorage: { getItem: (key) => values.get(key) ?? null },
    FileReader: class {
      constructor() {
        readers.push(this);
      }
      readAsDataURL() {}
    },
    require(name) {
      if (name === "./api") return {};
      if (name === "./authApi")
        return {
          authenticatedGraphqlRequest: async (query, variables) => {
            requests.push({ query, variables });
            return {
              uploadMyAvatar: {
                id: 7,
                login: "person",
                name: "Person",
                role: "OSNOVA",
                banned: false,
                telegramChatId: null,
                telegramUsername: null,
                avatarSeed: "original-robot",
                avatarUrl: "/avatars/photo.webp",
              },
            };
          },
        };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return { values, readers, requests, api: module.exports.userApi };
}
test("photo reading cannot carry an upload into a different login session", async () => {
  const e = environment();
  const upload = e.api.upload_avatar({ size: 100 });
  const rejected = assert.rejects(upload, { name: "SessionChangedError" });
  e.values.set("auth_session_id", "session-two");
  e.values.set("access_token", "token-two");
  e.readers[0].result = "data:image/png;base64,cGhvdG8=";
  e.readers[0].onload();
  await rejected;
  assert.equal(e.requests.length, 0);
});
test("logout while reading a photo prevents the upload", async () => {
  const e = environment();
  const upload = e.api.upload_avatar({ size: 100 });
  const rejected = assert.rejects(upload, { name: "SessionChangedError" });
  e.values.delete("access_token");
  e.readers[0].result = "data:image/png;base64,cGhvdG8=";
  e.readers[0].onload();
  await rejected;
  assert.equal(e.requests.length, 0);
});
test("upload sends only image bytes and preserves the saved robot seed", async () => {
  const e = environment();
  await assert.rejects(
    e.api.upload_avatar({ size: 5 * 1024 * 1024 + 1 }),
    /5 МБ/,
  );
  assert.equal(e.readers.length, 0);
  const upload = e.api.upload_avatar({ size: 100 });
  e.readers[0].result = "data:image/png;base64,cGhvdG8=";
  e.readers[0].onload();
  const user = await upload;
  assert.equal(e.requests[0].variables.imageBase64, "cGhvdG8=");
  assert.equal(user.avatarUrl, "/avatars/photo.webp");
  assert.equal(user.avatarSeed, "original-robot");
  assert.equal(user.role, "Osnova");
});

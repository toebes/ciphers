const { FuseBox } = require("fuse-box");
const fuse = FuseBox.init({
    homeDir: "app",
    output: "dist/$name.js",
});
fuse.dev();
fuse.bundle("app")
    .instructions(`>index.ts`);

fuse.run();
const { FuseBox } = require("fuse-box");
const fuse = FuseBox.init({
  
    homeDir: "app",
    output: "dist/$name.js",
    useTypescriptCompiler : true
});
fuse.dev();
fuse.bundle("ciphers")
    .instructions(">ciphers.ts + **/**.ts");
fuse.run();

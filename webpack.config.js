const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const HardSourceWebpackPlugin = require("hard-source-webpack-plugin");
const TypedocWebpackPlugin = require("typedoc-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const WebpackAutoInject = require("webpack-auto-inject-version");

module.exports = {
    //    mode: "development", // "production" | "development" | "none"
    context: __dirname,
    // devtool: "inline-source-map",
    entry: path.join(__dirname, "app", "ciphers.ts"),
    output: {
        path: path.resolve(__dirname, "dist"),
        publicPath: "",
        filename: "ciphers-[hash].js",
        libraryTarget: "umd",
        library: "MyLib",
        umdNamedDefine: true,
    },
    resolve: {
        alias: {
            html5sortable: path.join(
                __dirname,
                "node_modules",
                "html5sortable",
                "dist",
                "html5sortable.cjs.js"
            ),
            "dataTables-zf": path.join(
                __dirname,
                "node_modules",
                "datatables.net-zf",
                "js",
                "dataTables.foundation.js"
            ),
            "dataTables-colReorder-zf": path.join(
                __dirname,
                "node_modules",
                "datatables.net-colreorder-zf",
                "js",
                "colReorder.foundation.js"
            ),
            "styles-css": path.join(__dirname, "styles.css"),
            "foundation.css": path.join(
                __dirname,
                "node_modules",
                "foundation-sites",
                "dist",
                "css",
                "foundation.css"
            ),
            mathjs: path.join(
                __dirname,
                "node_modules",
                "mathjs",
                "dist",
                "math.js"
            ),
            "katex.js": path.join(
                __dirname,
                "node_modules",
                "katex",
                "dist",
                "katex.js"
            ),
            "katex.css": path.join(
                __dirname,
                "node_modules",
                "katex",
                "dist",
                "katex.css"
            ),
        },
        modules: [__dirname, path.join(__dirname, "node_modules")],
        extensions: [
            ".ts",
            ".js",
            ".css",
            ".ttf",
            ".eot",
            ".woff",
            ".woff2",
            ".png",
            ".svg",
        ],
    },
    module: {
        rules: [
            // For the typescript files, we don't want anything in the node_modules directory
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
                include: [path.resolve(__dirname, "app")],
                exclude: [path.resolve(__dirname, "node_modules")],
            },
            // All .css files are processed with the css-loader, style-loader
            {
                test: /\.css$/,
                include: __dirname,
                use: ["style-loader", "css-loader"],
            },
            // All small .png files (mostly the icons for jqueryui) are inlined
            // with the URL loader
            {
                test: /\.(png)$/,
                use: {
                    loader: "url-loader",
                    options: {
                        limit: 8192,
                    },
                },
            },
            // All small .svg files (mostly the icons for the editor) are inlined
            // with the URL loader
            {
                test: /\.(svg)$/,
                use: {
                    loader: "url-loader",
                    options: {
                        limit: 20000,
                    },
                },
            },
            // All .woff and .woff2 fonts files are packed inline (unless they are
            // larger than 100,000)
            {
                test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader:
                    "url-loader?limit=100000&mimetype=application/font-woff",
            },
            // All ttf and eot files are kept in a standalone directory to load
            // Eventually they should go away
            {
                test: /\.(ttf|eot)$/,
                use: {
                    loader: "file-loader",
                    options: {
                        name: "font/[name].[ext]",
                    },
                },
            },
            {
                // Exposes jQuery for use outside Webpack build
                test: require.resolve("jquery"),
                use: [
                    {
                        loader: "expose-loader",
                        options: "jQuery",
                    },
                    {
                        loader: "expose-loader",
                        options: "$",
                    },
                ],
            },
        ],
    },
    plugins: [
        new CopyWebpackPlugin([
            {
                from: path.join(__dirname, "Languages", "*.js"),
                to: path.resolve(__dirname, "dist"),
            },
            {
                from: path.join(__dirname, "Languages", "*.txt"),
                to: path.resolve(__dirname, "dist"),
            },
        ]),
        new WebpackAutoInject({
            // specify the name of the tag in the outputed files eg
            // bundle.js: [SHORT]  Version: 0.13.36 ...
            SHORT: "CUSTOM",
            SILENT: false,
            PACKAGE_JSON_PATH: "./package.json",
            components: {
                AutoIncreaseVersion: true,
                InjectAsComment: false,
                InjectByTag: true,
            },
            componentsOptions: {
                AutoIncreaseVersion: {
                    runInWatchMode: false, // it will increase version with every single build!
                },
                InjectAsComment: {
                    tag: "Version: {version} - {date}",
                    dateFormat: "h:MM:ss TT",
                },
                InjectByTag: {
                    fileRegex: /\.+/,
                    // regexp to find [AIV] tag inside html, if you tag contains unallowed characters you can adjust the regex
                    // but also you can change [AIV] tag to anything you want
                    AIVTagRegexp: /(\[AIV])(([a-zA-Z{} ,:;!()_@\-"'\\\/])+)(\[\/AIV])/g,
                    dateFormat: "mmm d, yyyy @ HH:MM:ss o",
                },
            },
            LOGS_TEXT: {
                AIS_START: "DEMO AIV started",
            },
        }),
        // new HardSourceWebpackPlugin(),
        // new TypedocWebpackPlugin({
        //     target: "es5",
        //     ignoreCompilerErrors: true,
        //     includeDeclarations: true,
        // }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "ACAProblems.html",
            template: path.join(
                __dirname,
                "app",
                "pages",
                "TestQuestions.html"
            ),
            cipher: "ACAProblems",
            title: "ACA Problem Management",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "ACASubmit.html",
            template: path.join(
                __dirname,
                "app",
                "pages",
                "TestQuestions.html"
            ),
            cipher: "ACASubmit",
            title: "ACA Submission",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "TestGuidance.html",
            template: path.join(__dirname, "app", "pages", "TestGuidance.html"),
            cipher: "",
            title: "Test Guidance",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "AffineEncrypt.html",
            template: path.join(__dirname, "app", "pages", "StdEncoder.html"),
            cipher: "Affine",
            title: "Affine Encrypt",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "AristocratEncrypt.html",
            template: path.join(
                __dirname,
                "app",
                "pages",
                "AristocratEncrypt.html"
            ),
            cipher: "Encoder",
            title: "Aristocrat Encoder",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "AristocratSpanishEncrypt.html",
            template: path.join(
                __dirname,
                "app",
                "pages",
                "AristocratSpanishEncrypt.html"
            ),
            cipher: "Encoder",
            title: "Aristrocrat Spanish Encrypt",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "Atbash.html",
            template: path.join(__dirname, "app", "pages", "StdEncoder.html"),
            cipher: "Atbash",
            title: "Caesar/Atbash Encoder",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "Baconian.html",
            template: path.join(__dirname, "app", "pages", "StdEncoder.html"),
            cipher: "Baconian",
            title: "Baconian Cipher",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "Caesar.html",
            template: path.join(__dirname, "app", "pages", "StdEncoder.html"),
            cipher: "Caesar",
            title: "Caesar/Atbash Encoder",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "CheckerboardSolver.html",
            template: path.join(__dirname, "app", "pages", "Solver.html"),
            cipher: "Checkerboard",
            title: "Checkerboard Assistant",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "CipherCounter.html",
            template: path.join(
                __dirname,
                "app",
                "pages",
                "CipherCounter.html"
            ),
            cipher: "Counter",
            title: "Cipher Counter",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "ColumnarSolver.html",
            template: path.join(__dirname, "app", "pages", "Solver.html"),
            cipher: "CompleteColumnarSolver",
            title: "Complete/Incomplete Columnar Asssistant",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "PortaxSolver.html",
            template: path.join(__dirname, "app", "pages", "Solver.html"),
            cipher: "PortaxSolver",
            title: "Portax Asssistant",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "CryptarithmSolver.html",
            template: path.join(
                __dirname,
                "app",
                "pages",
                "CryptarithmSolver.html"
            ),
            cipher: "Cryptarithm",
            title: "Cryptarithm Assistant",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "CryptogramDocuments.html",
            template: path.join(
                __dirname,
                "app",
                "pages",
                "CryptogramDocuments.html"
            ),
            cipher: "None",
            title: "Index to Cryptogram issues",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "HomophonicSolver.html",
            template: path.join(__dirname, "app", "pages", "Solver.html"),
            cipher: "HomophonicSolver",
            title: "Homophonic Asssistant",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "KeyPhraseSolver.html",
            template: path.join(__dirname, "app", "pages", "Solver.html"),
            cipher: "KeyPhraseSolver",
            title: "Key Phrase Asssistant",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "RSAEncrypt.html",
            template: path.join(__dirname, "app", "pages", "StdEncoder.html"),
            cipher: "RSA",
            title: "RSA Encoder",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "EditRunningKeys.html",
            template: path.join(
                __dirname,
                "app",
                "pages",
                "EditRunningKeys.html"
            ),
            cipher: "RunningKeyEdit",
            title: "Edit Running Key Values",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "RunningKeyEncoder.html",
            template: path.join(__dirname, "app", "pages", "StdEncoder.html"),
            cipher: "RunningKey",
            title: "Running Key Encoder",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "FractionatedMorseSolver.html",
            template: path.join(
                __dirname,
                "app",
                "pages",
                "FractionatedMorseSolver.html"
            ),
            cipher: "FractionatedMorse",
            title: "Fractionated Morse Assistant",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "FullIndex.html",
            template: path.join(__dirname, "app", "pages", "FullIndex.html"),
            cipher: "None",
            title: "Index to Cryptogram issues",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "GenLanguage.html",
            template: path.join(__dirname, "app", "pages", "GenLanguage.html"),
            cipher: "",
            title: "Language Template Processor",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "GromarkSolver.html",
            template: path.join(
                __dirname,
                "app",
                "pages",
                "GromarkSolver.html"
            ),
            cipher: "Gromark",
            title: "Gromark Assistant",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "HillEncrypt.html",
            template: path.join(__dirname, "app", "pages", "StdEncoder.html"),
            cipher: "Hill",
            title: "Hill Encrypt (2x2 and 3x3)",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "HillKeys.html",
            template: path.join(__dirname, "app", "pages", "HillKeys.html"),
            cipher: "",
            title: "Known Valid Hill Encryption Keys",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "index.html",
            template: path.join(__dirname, "app", "pages", "index.html"),
            cipher: "",
            title: "Science Olympiad Code Busters",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "acaindex.html",
            template: path.join(__dirname, "app", "pages", "acaindex.html"),
            cipher: "",
            title: "ACA Cipher Tools",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "MorbitSolver.html",
            template: path.join(__dirname, "app", "pages", "MorbitSolver.html"),
            cipher: "Morbit",
            title: "Morbit Assistant",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "PatristocratEncrypt.html",
            template: path.join(
                __dirname,
                "app",
                "pages",
                "PatristocratEncrypt.html"
            ),
            cipher: "Patristocrat",
            title: "Patristocrat Encrypt",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "RagbabySolver.html",
            template: path.join(
                __dirname,
                "app",
                "pages",
                "RagbabySolver.html"
            ),
            cipher: "RagbabySolver",
            title: "Ragbaby Assistant",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "RailfenceSolver.html",
            template: path.join(
                __dirname,
                "app",
                "pages",
                "RailfenceSolver.html"
            ),
            cipher: "RailfenceSolver",
            title: "Railfence and Redefence Assistant",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "Solver.html",
            template: path.join(__dirname, "app", "pages", "Solver.html"),
            cipher: "",
            title: "Aristocrat/Patristocrat Assistant",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "TestAnswers.html",
            template: path.join(__dirname, "app", "pages", "TestAnswers.html"),
            cipher: "TestAnswers",
            title: "Test Answer Key",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "TestGenerator.html",
            template: path.join(
                __dirname,
                "app",
                "pages",
                "TestGenerator.html"
            ),
            cipher: "TestGenerator",
            title: "Test Generator",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "TestManage.html",
            template: path.join(__dirname, "app", "pages", "TestManage.html"),
            cipher: "TestManage",
            title: "Test Management",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "TestPrint.html",
            template: path.join(__dirname, "app", "pages", "TestPrint.html"),
            cipher: "TestPrint",
            title: "Test",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "TestQuestions.html",
            template: path.join(
                __dirname,
                "app",
                "pages",
                "TestQuestions.html"
            ),
            cipher: "TestQuestions",
            title: "Test Question Management",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "VigenereEncrypt.html",
            template: path.join(__dirname, "app", "pages", "StdEncoder.html"),
            cipher: "Vigenere",
            title: "Vigen&egrave;re Encoder",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "VigenereSolver.html",
            template: path.join(
                __dirname,
                "app",
                "pages",
                "VigenereSolver.html"
            ),
            cipher: "VigenereSolver",
            title:
                "Vigen&egrave;re, Variant, Beaufort, Gronsfeld, Porta Assistant",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "XenocryptEncrypt.html",
            template: path.join(
                __dirname,
                "app",
                "pages",
                "XenocryptEncrypt.html"
            ),
            cipher: "Encoder",
            title: "Xenocrypt Encrypt",
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: "XenocryptSolver.html",
            template: path.join(
                __dirname,
                "app",
                "pages",
                "XenocryptSolver.html"
            ),
            cipher: "YYYY",
            title: "Xenocrypt Assistant",
        }),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            "global.$": "jquery",
        }),
        new webpack.DefinePlugin({
            "require.specified": "require.resolve",
        }),
    ],
};

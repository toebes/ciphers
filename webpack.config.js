const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebpackAutoInject = require('webpack-auto-inject-version');
const WebpackShellPlugin = require('webpack-shell-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const package = require('./package.json');
var toolsVersion = package.version;
const argv = require('yargs').argv;
var ZIP = argv.zip || false;
var ANALYZE = argv.analyze || false;
// process.traceDeprecation = true;

module.exports = {
    stats: 'errors-warnings',
    //    mode: "development", // "production" | "development" | "none"
    context: __dirname,
    // devtool: "inline-source-map",
    entry: {
        aca: path.join(__dirname, 'app', 'aca', 'ciphers.ts'),
        codebusters: path.join(__dirname, 'app', 'codebusters', 'ciphers.ts'),
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        publicPath: '',
        filename: '[name]-[hash].js',
        libraryTarget: 'umd',
        library: 'MyLib',
        umdNamedDefine: true,
        devtoolModuleFilenameTemplate: "[absolute-resource-path]"
    },
    resolve: {
        alias: {
            html5sortable: path.join(
                __dirname,
                'node_modules',
                'html5sortable',
                'dist',
                'html5sortable.cjs.js'
            ),
            'datatables.css': path.join(
                __dirname,
                'node_modules',
                'datatables.net-dt',
                'css',
                'jquery.dataTables.min.css'
            ),
            'styles-css': path.join(__dirname, 'styles.css'),
            'flatpickr.css': path.join(
                __dirname,
                'node_modules',
                'flatpickr',
                'dist',
                'flatpickr.css'
            ),
            'foundation.css': path.join(
                __dirname,
                'node_modules',
                'foundation-sites',
                'dist',
                'css',
                'foundation.css'
            ),
            'katex.js': path.join(
                __dirname,
                'node_modules',
                'katex',
                'dist',
                'katex.js'
            ),
            'katex.css': path.join(
                __dirname,
                'node_modules',
                'katex',
                'dist',
                'katex.css'
            ),
            'syllable.js': path.join(
                __dirname,
                'node_modules',
                'syllable',
                'index.js'
            ),
            'charmap.js': path.join(
                __dirname,
                'node_modules',
                'charmap',
                'src',
                'index.js'
            ),
            'charmap.json': path.join(
                __dirname,
                'node_modules',
                'normalize-strings',
                'charmap.json'
            ),
        },
        modules: [__dirname, path.join(__dirname, 'node_modules')],
        extensions: [
            '.ts',
            '.js',
            '.css',
            '.ttf',
            '.eot',
            '.woff',
            '.woff2',
            '.png',
            '.svg',
            '.json'
        ],
    },
    module: {
        rules: [
            // For the typescript files, we don't want anything in the node_modules directory
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                include: [path.resolve(__dirname, 'app')],
                exclude: [path.resolve(__dirname, 'node_modules')],
            },
            // All .css files are processed with the css-loader, style-loader
            {
                test: /\.css$/,
                include: __dirname,
                use: ['style-loader', 'css-loader'],
            },
            // All small .png files (mostly the icons for jqueryui) are inlined
            // with the URL loader
            {
                test: /\.(png)$/,
                use: {
                    loader: 'url-loader',
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
                    loader: 'url-loader',
                    options: {
                        limit: 20000,
                    },
                },
            },
            // All .woff and .woff2 fonts files are packed inline (unless they are
            // larger than 1,000)
            {
                test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                // loader: "url-loader?limit=1000&mimetype=application/font-woff",
                use: {
                    loader: 'file-loader',
                    options: {
                        name: 'font/[name].[ext]',
                    },
                },
            },
            // All ttf and eot files are kept in a standalone directory to load
            // Eventually they should go away
            {
                test: /\.(ttf)$/,
                use: {
                    loader: 'file-loader',
                    options: {
                        name: 'font/[name].[ext]',
                    },
                },
            },
            {
                // Exposes jQuery for use outside Webpack build
                test: require.resolve('jquery'),
                use: [
                    {
                        loader: 'expose-loader',
                        options: 'jQuery',
                    },
                    {
                        loader: 'expose-loader',
                        options: '$',
                    },
                ],
            },
        ],
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.join(__dirname, 'app', 'codebusters', 'pages', 'time.php'),
                    to: path.resolve(__dirname, 'dist'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'de.js'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'en.js'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'eo.js'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'es.js'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'fr.js'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'it.js'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'la.js'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'nl.js'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'no.js'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'pt.js'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'sv.js'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'de.txt'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'en.txt'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'eo.txt'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'es.txt'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'fr.txt'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'it.txt'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'la.txt'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'nl.txt'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'no.txt'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'pt.txt'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'sv.txt'),
                    to: path.resolve(__dirname, 'dist', 'Languages'),
                },
                {
                    from: path.join(__dirname, 'app', 'images', 'BaconianA.png'),
                    to: path.resolve(__dirname, 'dist', 'images',),
                    flatten: true,
                },
                {
                    from: path.join(__dirname, 'app', 'images', 'BaconianB.png'),
                    to: path.resolve(__dirname, 'dist', 'images',),
                    flatten: true,
                },
                {
                    from: path.join(__dirname, 'app', 'images', 'pigpen1.png'),
                    to: path.resolve(__dirname, 'dist', 'images',),
                    flatten: true,
                },
                {
                    from: path.join(__dirname, 'app', 'images', 'pigpen2.png'),
                    to: path.resolve(__dirname, 'dist', 'images',),
                    flatten: true,
                },
                {
                    from: path.join(__dirname, 'app', 'images', 'tapcode.png'),
                    to: path.resolve(__dirname, 'dist', 'images',),
                    flatten: true,
                },
                {
                    from: path.join(__dirname, 'app', 'images', 'Twitter_Logo.png'),
                    to: path.resolve(__dirname, 'dist', 'images',),
                    flatten: true,
                },
                {
                    from: path.join(__dirname, 'app', 'common', 'fonts', 'OFL.txt'),
                    to: path.resolve(__dirname, 'dist', 'font'),
                    flatten: true,
                },
                {
                    from: path.join(__dirname, 'app', 'siteVersion.txt'),
                    to: path.resolve(__dirname, 'dist', 'siteVersion.txt'),
                    flatten: true,
                },
            ]
        }),
        new WebpackAutoInject({
            // specify the name of the tag in the outputed files eg
            // bundle.js: [SHORT]  Version: 0.13.36 ...
            SHORT: 'CUSTOM',
            SILENT: true,
            PACKAGE_JSON_PATH: './package.json',
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
                    tag: 'Version: {version} - {date}',
                    dateFormat: 'h:MM:ss TT',
                },
                InjectByTag: {
                    fileRegex: /\.+/,
                    // regexp to find [AIV] tag inside html, if you tag contains unallowed characters you can adjust the regex
                    // but also you can change [AIV] tag to anything you want
                    AIVTagRegexp: /(\[AIV])(([a-zA-Z{} ,:;!()_@\-"'\\\/])+)(\[\/AIV])/g,
                    dateFormat: 'mmm d, yyyy @ HH:MM:ss o',
                },
            },
        }),
        //=====================================================================
        //
        // ACA HTML Files
        //
        //=====================================================================
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'acaindex.html',
            template: path.join(__dirname, 'app', 'aca', 'pages', 'index.html'),
            chunks: ['aca'],
            cipher: '',
            title: 'ACA Cipher Tools',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'ACAProblems.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'TestQuestions.html'
            ),
            chunks: ['aca'],
            cipher: 'ACAProblems',
            title: 'ACA Problem Management',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'ACASubmit.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'TestQuestions.html'
            ),
            chunks: ['aca'],
            cipher: 'ACASubmit',
            title: 'ACA Submission',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'CheckerboardSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages',
                'Solver.html'
            ),
            chunks: ['aca'],
            cipher: 'Checkerboard',
            title: 'Checkerboard Assistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'ColumnarSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages',
                'Solver.html'
            ),
            chunks: ['aca'],
            cipher: 'CompleteColumnarSolver',
            title: 'Complete/Incomplete Columnar Asssistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'PortaxSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages',
                'Solver.html'
            ),
            chunks: ['aca'],
            cipher: 'PortaxSolver',
            title: 'Portax Asssistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'CryptarithmSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages',
                'CryptarithmSolver.html'
            ),
            chunks: ['aca'],
            cipher: 'Cryptarithm',
            title: 'Cryptarithm Assistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'CryptogramDocuments.html',
            template: path.join(__dirname, 'app', 'aca', 'pages',
                'CryptogramDocuments.html'
            ),
            chunks: ['aca'],
            cipher: 'None',
            title: 'Index to Cryptogram issues',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'HomophonicSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages',
                'Solver.html'
            ),
            chunks: ['aca'],
            cipher: 'HomophonicSolver',
            title: 'Homophonic Asssistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'KeyPhraseSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages',
                'Solver.html'
            ),
            chunks: ['aca'],
            cipher: 'KeyPhraseSolver',
            title: 'Key Phrase Asssistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'FractionatedMorseSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages',
                'FractionatedMorseSolver.html'
            ),
            chunks: ['aca'],
            cipher: 'FractionatedMorse',
            title: 'Fractionated Morse Assistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'FullIndex.html',
            template: path.join(__dirname, 'app', 'aca', 'pages',
                'FullIndex.html'
            ),
            chunks: ['aca'],
            cipher: 'None',
            title: 'Index to Cryptogram issues',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'GenLanguage.html',
            template: path.join(__dirname, 'app', 'aca', 'pages',
                'GenLanguage.html'
            ),
            chunks: ['aca'],
            cipher: '',
            title: 'Language Template Processor',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'GromarkSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages',
                'GromarkSolver.html'
            ),
            chunks: ['aca'],
            cipher: 'Gromark',
            title: 'Gromark Assistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'MorbitSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages',
                'MorbitSolver.html'
            ),
            chunks: ['aca'],
            cipher: 'Morbit',
            title: 'Morbit Assistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'RagbabySolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages',
                'RagbabySolver.html'
            ),
            chunks: ['aca'],
            cipher: 'RagbabySolver',
            title: 'Ragbaby Assistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'RailfenceSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages',
                'RailfenceSolver.html'
            ),
            chunks: ['aca'],
            cipher: 'RailfenceSolver',
            title: 'Railfence and Redefence Assistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Solver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages',
                'Solver.html'
            ),
            chunks: ['aca'],
            cipher: '',
            title: 'Aristocrat/Patristocrat Assistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'VigenereSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages',
                'VigenereSolver.html'
            ),
            chunks: ['aca'],
            cipher: 'VigenereSolver',
            title:
                'Vigen&egrave;re, Variant, Beaufort, Gronsfeld, Porta Assistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'XenocryptSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages',
                'XenocryptSolver.html'
            ),
            chunks: ['aca'],
            cipher: 'YYYY',
            title: 'Xenocrypt Assistant',
        }),
        //=====================================================================
        //
        // CODEBUSTERS HTML Files
        //
        //=====================================================================
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'index.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'index.html'
            ),
            chunks: ['codebusters'],
            cipher: '',
            title: 'Science Olympiad Code Busters',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'samples.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'samples.html'
            ),
            chunks: ['codebusters'],
            cipher: 'TestManage',
            title: 'Science Olympiad Code Busters Samples',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'versions.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'versions.html'
            ),
            chunks: ['codebusters'],
            cipher: 'TestManage',
            title: 'Science Olympiad Code Busters Version History',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'HowTo.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'HowTo.html'
            ),
            chunks: ['codebusters'],
            cipher: '',
            title: 'How To',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestGuidance.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'TestGuidance.html'
            ),
            chunks: ['codebusters'],
            cipher: '',
            title: 'Test Guidance',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'QuoteAnalyze.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'StdEncoder.html'
            ),
            chunks: ['codebusters'],
            cipher: 'QuoteAnalyze',
            title: 'Quote Analyzer',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'GenerateHomophones.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'StdEncoder.html'
            ),
            chunks: ['codebusters'],
            cipher: 'GenerateHomophone',
            title: 'Homophone Generator',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'AffineEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'StdEncoder.html'
            ),
            chunks: ['codebusters'],
            cipher: 'Affine',
            title: 'Affine Encrypt',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'AristocratEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'AristocratEncrypt.html'
            ),
            chunks: ['codebusters'],
            cipher: 'Encoder',
            title: 'Aristocrat Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'PigPenEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'StdEncoder.html'
            ),
            chunks: ['codebusters'],
            cipher: 'PigPen',
            title: 'PigPen/Masonic Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'MorbitEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'StdEncoder.html'
            ),
            chunks: ['codebusters'],
            cipher: 'Morbit',
            title: 'Morbit Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'PolluxEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'StdEncoder.html'
            ),
            chunks: ['codebusters'],
            cipher: 'Pollux',
            title: 'Pollux Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'RailFenceEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'StdEncoder.html'
            ),
            chunks: ['codebusters'],
            cipher: 'RailFence',
            title: 'RailFence Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TapCodeEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'StdEncoder.html'
            ),
            chunks: ['codebusters'],
            cipher: 'TapCode',
            title: 'Tap Code Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'AristocratSpanishEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'AristocratSpanishEncrypt.html'
            ),
            chunks: ['codebusters'],
            cipher: 'Encoder',
            title: 'Aristrocrat Spanish Encrypt',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Atbash.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'StdEncoder.html'
            ),
            chunks: ['codebusters'],
            cipher: 'Atbash',
            title: 'Caesar/Atbash Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Baconian.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'StdEncoder.html'
            ),
            chunks: ['codebusters'],
            cipher: 'Baconian',
            title: 'Baconian Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Caesar.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'StdEncoder.html'
            ),
            chunks: ['codebusters'],
            cipher: 'Caesar',
            title: 'Caesar/Atbash Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'RSAEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'StdEncoder.html'
            ),
            chunks: ['codebusters'],
            cipher: 'RSA',
            title: 'RSA Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'EditRunningKeys.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'EditRunningKeys.html'
            ),
            chunks: ['codebusters'],
            cipher: 'RunningKeyEdit',
            title: 'Edit Running Key Values',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'RunningKeyEncoder.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'StdEncoder.html'
            ),
            chunks: ['codebusters'],
            cipher: 'RunningKey',
            title: 'Running Key Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'HillEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'StdEncoder.html'
            ),
            chunks: ['codebusters'],
            cipher: 'Hill',
            title: 'Hill Encrypt (2x2 and 3x3)',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'HillKeys.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'HillKeys.html'
            ),
            chunks: ['codebusters'],
            cipher: '',
            title: 'Known Valid Hill Encryption Keys',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'PatristocratEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'AristocratEncrypt.html'
            ),
            chunks: ['codebusters'],
            cipher: 'Patristocrat',
            title: 'Patristocrat Encrypt',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestAnswers.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'TestAnswers.html'
            ),
            chunks: ['codebusters'],
            cipher: 'TestAnswers',
            title: 'Test Answer Key',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestGenerator.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'TestGenerator.html'
            ),
            chunks: ['codebusters'],
            cipher: 'TestGenerator',
            title: 'Test Generator',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestManage.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'TestManage.html'
            ),
            chunks: ['codebusters'],
            cipher: 'TestManage',
            title: 'Test Management',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestPublished.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'TestManage.html'
            ),
            chunks: ['codebusters'],
            cipher: 'TestPublished',
            title: 'Test Management',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestPermissions.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'TestManage.html'
            ),
            chunks: ['codebusters'],
            cipher: 'TestPermissions',
            title: 'Test Permissions',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestSchedule.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'TestManage.html'
            ),
            chunks: ['codebusters'],
            cipher: 'TestSchedule',
            title: 'Schedule Test',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TakeTest.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'TestManage.html'
            ),
            chunks: ['codebusters'],
            cipher: 'TakeTest',
            title: 'Take a Test',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestResults.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'TestManage.html'
            ),
            chunks: ['codebusters'],
            cipher: 'TestResults',
            title: 'View Test Results',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestPrint.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'TestPrint.html'
            ),
            chunks: ['codebusters'],
            cipher: 'TestPrint',
            title: 'Test',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestInteractive.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'TestInteractive.html'
            ),
            chunks: ['codebusters'],
            cipher: 'TestInteractive',
            title: 'Interactive Test',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestTimed.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'TestTimed.html'
            ),
            chunks: ['codebusters'],
            cipher: 'TestTimed',
            title: 'Interactive Test',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestQuestions.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'TestQuestions.html'
            ),
            chunks: ['codebusters'],
            cipher: 'TestQuestions',
            title: 'Test Question Management',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'VigenereEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'StdEncoder.html'
            ),
            chunks: ['codebusters'],
            cipher: 'Vigenere',
            title: 'Vigen&egrave;re Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'XenocryptEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages',
                'XenocryptEncrypt.html'
            ),
            chunks: ['codebusters'],
            cipher: 'Encoder',
            title: 'Xenocrypt Encrypt',
        }),
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            'global.$': 'jquery',
        }),
        new webpack.DefinePlugin({
            'require.specified': 'require.resolve',
        }),
        // see https://intellij-support.jetbrains.com/hc/en-us/community/posts/206339799-Webstorm-Webpack-debugging
        new webpack.SourceMapDevToolPlugin({
            filename: "[file].map",
        }),
    ],
};

// The concept for this was taken from https://stackoverflow.com/questions/28572380/conditional-build-based-on-environment-using-webpack
// 'offhouse' answer.
if (ZIP) {
    module.exports.plugins.push(
        // The webpack-shell-plugin is installed with "npm install --save-dev webpack-shell-plugin"
        new WebpackShellPlugin({
            onBuildExit: ['python zip-ct.py ' + toolsVersion],
        }),
    );
}

if (ANALYZE) {
    module.exports.plugins.push(
        new BundleAnalyzerPlugin(),
    )

}
/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebpackShellPlugin = require('webpack-shell-plugin-next');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const { styles } = require('@ckeditor/ckeditor5-dev-utils');

const package = require('./package.json');
const toolsVersion = package.version;
const datebuilt = new Date().toLocaleString();

const dist = path.resolve(__dirname, 'dist-aca')

process.traceDeprecation = true;

config = {
    stats: 'errors-warnings',
    mode: "production",
    context: __dirname,
    entry: [path.join(__dirname, 'app', 'aca', 'ciphers.ts')],
    output: {
        path: dist,
        publicPath: '',
        filename: '[name]-[fullhash].js',
        libraryTarget: 'umd',
        library: 'MyLib',
        umdNamedDefine: true,
        devtoolModuleFilenameTemplate: '[absolute-resource-path]',
        clean: true
    },
    resolve: {
        alias: {
            html5sortable: path.join(__dirname, 'node_modules', 'html5sortable', 'dist', 'html5sortable.cjs.js'),
            'datatables.css': path.join(__dirname, 'node_modules', 'datatables.net-dt', 'css', 'jquery.dataTables.min.css'),
            'datatables.foundation.css': path.join(__dirname, 'node_modules', 'datatables.net-zf', 'css', 'dataTables.foundation.min.css'),
            'flatpickr.css': path.join(__dirname, 'node_modules', 'flatpickr', 'dist', 'flatpickr.css'),
            'foundation.css': path.join(__dirname, 'node_modules', 'foundation-sites', 'dist', 'css', 'foundation.css'),
            'katex.js': path.join(__dirname, 'node_modules', 'katex', 'dist', 'katex.js'),
            'katex.css': path.join(__dirname, 'node_modules', 'katex', 'dist', 'katex.css'),
            'syllable.js': path.join(__dirname, 'node_modules', 'syllable', 'index.js'),
            'charmap.js': path.join(__dirname, 'node_modules', 'charmap', 'src', 'index.js'),
            'charmap.json': path.join(__dirname, 'node_modules', 'normalize-strings', 'charmap.json'),
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
            '.json',
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
            // With the special case of allowing the qr-code-generator to sit in the
            // npm directory it was installed from.
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                include: [
                    path.join(__dirname, 'node_modules', 'qr-code-generator', 'typescript-javascript', 'qrcodegen.ts'),
                ],
                options: { allowTsInNodeModules: true }
            },
            // All .css files are processed with the css-loader, style-loader
            {
                test: /\.css$/,
                include: __dirname,
                use: ['style-loader',
                    'css-loader',
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: styles.getPostCssConfig({
                                themeImporter: {
                                    themePath: require.resolve('@ckeditor/ckeditor5-theme-lark')
                                },
                                minify: true
                            })
                        }
                    },
                ],
            },
            // All small .png files (mostly the icons for jqueryui) are inlined
            // with the URL loader
            {
                test: /\.(png)$/,
                use: {
                    loader: 'url-loader',
                    options: {
                        limit: 8192,
                        esModule: false
                    },
                },
            },
            // All small .svg files (mostly the icons for the editor) are inlined
            // with the URL loader
            {
                test: /\.(svg)$/,
                use: {
                    loader: 'svg-inline-loader',
                    options: {
                        limit: 20000,
                        esModule: false
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
                use:
                {
                    loader: 'expose-loader',
                    options: {
                        exposes: ["$", "jQuery"],
                    },
                },
            },
        ],
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.join(__dirname, 'Languages', 'de.js'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'en.js'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'eo.js'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'es.js'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'fr.js'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'it.js'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'la.js'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'nl.js'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'no.js'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'pt.js'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'sv.js'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'de.txt'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'en.txt'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'eo.txt'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'es.txt'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'fr.txt'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'it.txt'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'la.txt'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'nl.txt'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'no.txt'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'pt.txt'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'Languages', 'sv.txt'),
                    to: path.resolve(dist, 'Languages'),
                },
                {
                    from: path.join(__dirname, 'app', 'images', 'Twitter_Logo.png'),
                    to: path.resolve(dist, 'images'),
                },
                {
                    from: path.join(__dirname, 'app', 'common', 'fonts', 'OFL.txt'),
                    to: path.resolve(dist, 'font'),
                },
                {
                    from: path.join(__dirname, 'app', 'siteVersion.txt'),
                    to: path.resolve(dist, 'siteVersion.txt'),
                    transform(content) {
                        return content
                            .toString()
                            .replace('__VERSION__', JSON.stringify(toolsVersion));
                    },
                },
            ],
        }),
        new webpack.DefinePlugin({
            __VERSION__: JSON.stringify(toolsVersion),
            __DATE_BUILT__: JSON.stringify(datebuilt)
        }),
        //=====================================================================
        //
        // ACA HTML Files
        //
        //=====================================================================
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'index.html',
            template: path.join(__dirname, 'app', 'aca', 'pages', 'index.html'),
            cipher: '',
            title: 'ACA Cipher Tools',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'ACAProblems.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'TestQuestions.html'),
            cipher: 'ACAProblems',
            title: 'ACA Problem Management',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'ACAManage.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'TestManage.html'),
            cipher: 'ACAManage',
            title: 'ACA Imported Issue List',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'ACASubmit.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'TestQuestions.html'),
            cipher: 'ACASubmit',
            title: 'ACA Submission',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'CheckerboardSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages', 'Solver.html'),
            cipher: 'Checkerboard',
            title: 'Checkerboard Assistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'ColumnarSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages', 'Solver.html'),
            cipher: 'CompleteColumnarSolver',
            title: 'Complete/Incomplete Columnar Asssistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'PortaxSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages', 'Solver.html'),
            cipher: 'PortaxSolver',
            title: 'Portax Asssistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'CryptarithmSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages', 'CryptarithmSolver.html'),
            cipher: 'Cryptarithm',
            title: 'Cryptarithm Assistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'CryptogramDocuments.html',
            template: path.join(__dirname, 'app', 'aca', 'pages', 'CryptogramDocuments.html'),
            cipher: 'None',
            title: 'Index to Cryptogram issues',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'HomophonicSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages', 'Solver.html'),
            cipher: 'HomophonicSolver',
            title: 'Homophonic Asssistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'KeyPhraseSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages', 'Solver.html'),
            cipher: 'KeyPhraseSolver',
            title: 'Key Phrase Asssistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'FractionatedMorseSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages', 'FractionatedMorseSolver.html'),
            cipher: 'FractionatedMorse',
            title: 'Fractionated Morse Assistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'FullIndex.html',
            template: path.join(__dirname, 'app', 'aca', 'pages', 'FullIndex.html'),
            cipher: 'None',
            title: 'Index to Cryptogram issues',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'GenLanguage.html',
            template: path.join(__dirname, 'app', 'aca', 'pages', 'GenLanguage.html'),
            cipher: '',
            title: 'Language Template Processor',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'GromarkSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages', 'GromarkSolver.html'),
            cipher: 'Gromark',
            title: 'Gromark Assistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'MorbitSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages', 'MorbitSolver.html'),
            cipher: 'Morbit',
            title: 'Morbit Assistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'RagbabySolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages', 'RagbabySolver.html'),
            cipher: 'RagbabySolver',
            title: 'Ragbaby Assistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'RailfenceSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages', 'RailfenceSolver.html'),
            cipher: 'RailfenceSolver',
            title: 'Railfence and Redefence Assistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Solver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages', 'Solver.html'),
            cipher: '',
            title: 'Aristocrat/Patristocrat Assistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'VigenereSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages', 'VigenereSolver.html'),
            cipher: 'VigenereSolver',
            title: 'Vigen&egrave;re, Variant, Beaufort, Gronsfeld, Porta Assistant',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'XenocryptSolver.html',
            template: path.join(__dirname, 'app', 'aca', 'pages', 'XenocryptSolver.html'),
            cipher: 'YYYY',
            title: 'Xenocrypt Assistant',
        }),
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            'global.$': 'jquery',
        }),
        new webpack.DefinePlugin({
            'require.specified': 'require.resolve',
        }),
    ],
};

module.exports = (env, argv) => {
    if (argv.mode === 'development') {
        config.mode = "development";
        config.devtool = "inline-source-map";
        // see https://intellij-support.jetbrains.com/hc/en-us/community/posts/206339799-Webstorm-Webpack-debugging
        config.plugins.push(new webpack.SourceMapDevToolPlugin({
            filename: '[file].map',
        }));
        console.log("Building Development");
    }

    if (env.zip) {
        // The concept for this was taken from https://stackoverflow.com/questions/28572380/conditional-build-based-on-environment-using-webpack
        // 'offhouse' answer.
        config.plugins.push(
            // The webpack-shell-plugin is installed with "npm install --save-dev webpack-shell-plugin"
            new WebpackShellPlugin({
                onBuildExit: ['python zip-ct.py ' + toolsVersion],
            })
        );
    }

    if (env.analyze) {
        config.plugins.push(new BundleAnalyzerPlugin());
    }
    return config
}
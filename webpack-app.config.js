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
    // stats: 'errors-warnings',
    mode: "production",
    context: __dirname,
    entry: [path.join(__dirname, 'app', 'app', 'ciphers.ts')],
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
            template: path.join(__dirname, 'app', 'app', 'pages', 'index.html'),
            cipher: '',
            title: 'CodeBusters Daily',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Affine.html',
            template: path.join(__dirname, 'app', 'app', 'pages', 'stdapp.html'),
            cipher: 'Affine',
            title: 'Solve an Affine Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Aristocrat.html',
            template: path.join(__dirname, 'app', 'app', 'pages', 'stdapp.html'),
            cipher: 'Aristocrat',
            title: 'Solve an Aristocrat Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Atbash.html',
            template: path.join(__dirname, 'app', 'app', 'pages', 'stdapp.html'),
            cipher: 'Atbash',
            title: 'Solve an Atbash Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Baconian.html',
            template: path.join(__dirname, 'app', 'app', 'pages', 'stdapp.html'),
            cipher: 'Baconian',
            title: 'Solve a Baconian Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Checkerboard.html',
            template: path.join(__dirname, 'app', 'app', 'pages', 'stdapp.html'),
            cipher: 'Checkerboard',
            title: 'Solve a Checkerboard Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'DancingMen.html',
            template: path.join(__dirname, 'app', 'app', 'pages', 'stdapp.html'),
            cipher: 'DancingMen',
            title: 'Solve a DancingMen Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Caesar.html',
            template: path.join(__dirname, 'app', 'app', 'pages', 'stdapp.html'),
            cipher: 'Caesar',
            title: 'Solve an Caesar Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Checkerboard.html',
            template: path.join(__dirname, 'app', 'app', 'pages', 'stdapp.html'),
            cipher: 'Checkerboard',
            title: 'Solve an Checkerboard Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'CompleteColumnar.html',
            template: path.join(__dirname, 'app', 'app', 'pages', 'stdapp.html'),
            cipher: 'CompleteColumnar',
            title: 'Solve an CompleteColumnar Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Cryptarithm.html',
            template: path.join(__dirname, 'app', 'app', 'pages', 'stdapp.html'),
            cipher: 'Cryptarithm',
            title: 'Solve an Cryptarithm Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'FractionatedMorse.html',
            template: path.join(__dirname, 'app', 'app', 'pages', 'stdapp.html'),
            cipher: 'FractionatedMorse',
            title: 'Solve an FractionatedMorse Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Hill.html',
            template: path.join(__dirname, 'app', 'app', 'pages', 'stdapp.html'),
            cipher: 'Hill',
            title: 'Solve an Hill Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'KnightsTemplar.html',
            template: path.join(__dirname, 'app', 'app', 'pages', 'stdapp.html'),
            cipher: 'KnightsTemplar',
            title: 'Solve an KnightsTemplar Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'NihilistSubstitution.html',
            template: path.join(__dirname, 'app', 'app', 'pages', 'stdapp.html'),
            cipher: 'NihilistSubstitution',
            title: 'Solve an NihilistSubstitution Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Patristocrat.html',
            template: path.join(__dirname, 'app', 'app', 'pages', 'stdapp.html'),
            cipher: 'Patristocrat',
            title: 'Solve an Patristocrat Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'PigPen.html',
            template: path.join(__dirname, 'app', 'app', 'pages', 'stdapp.html'),
            cipher: 'PigPen',
            title: 'Solve an PigPen Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Porta.html',
            template: path.join(__dirname, 'app', 'app', 'pages', 'stdapp.html'),
            cipher: 'Porta',
            title: 'Solve an Porta Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TapCode.html',
            template: path.join(__dirname, 'app', 'app', 'pages', 'stdapp.html'),
            cipher: 'TapCode',
            title: 'Solve an TapCode Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Vigenere.html',
            template: path.join(__dirname, 'app', 'app', 'pages', 'stdapp.html'),
            cipher: 'Vigenere',
            title: 'Solve an Vigenere Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Xenocrypt.html',
            template: path.join(__dirname, 'app', 'app', 'pages', 'stdapp.html'),
            cipher: 'Xenocrypt',
            title: 'Solve an Xenocrypt Cipher',
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
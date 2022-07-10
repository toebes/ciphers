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

const dist = path.resolve(__dirname, 'dist')

process.traceDeprecation = true;

config = {
    stats: 'errors-warnings',
    mode: "production",
    context: __dirname,
    entry: [path.join(__dirname, 'app', 'codebusters', 'ciphers.ts')],
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
                    from: path.join(__dirname, 'app', 'codebusters', 'pages', 'time.php'),
                    to: dist,
                },
                {
                    from: path.join(__dirname, 'app', 'images', 'ncso-main-fullcolor-rgb.jpg'),
                    to: path.resolve(__dirname, 'dist', 'images'),
                },
                {
                    from: path.join(__dirname, 'app', 'images', 'ms-symbollockup_signin_dark.svg'),
                    to: path.resolve(__dirname, 'dist', 'images'),
                },
                {
                    from: path.join(__dirname, 'app', 'images', 'BaconianA.png'),
                    to: path.resolve(__dirname, 'dist', 'images'),
                },
                {
                    from: path.join(__dirname, 'app', 'images', 'BaconianB.png'),
                    to: path.resolve(__dirname, 'dist', 'images'),
                },
                {
                    from: path.join(__dirname, 'app', 'images', 'pigpen1.png'),
                    to: path.resolve(__dirname, 'dist', 'images'),
                },
                {
                    from: path.join(__dirname, 'app', 'images', 'pigpen2.png'),
                    to: path.resolve(__dirname, 'dist', 'images'),
                },
                {
                    from: path.join(__dirname, 'app', 'images', 'tapcode.png'),
                    to: path.resolve(__dirname, 'dist', 'images'),
                },
                {
                    from: path.join(__dirname, 'app', 'images', 'Twitter_Logo.png'),
                    to: path.resolve(__dirname, 'dist', 'images'),
                },
                {
                    from: path.join(__dirname, 'app', 'common', 'fonts', 'OFL.txt'),
                    to: path.resolve(__dirname, 'dist', 'font'),
                },
                {
                    from: path.join(__dirname, 'app', 'siteVersion.txt'),
                    to: path.resolve(__dirname, 'dist', 'siteVersion.txt'),
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
        // CODEBUSTERS HTML Files
        //
        //=====================================================================
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'index.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'index.html'),
            cipher: '',
            title: 'Science Olympiad Code Busters',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'samples.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'samples.html'),
            cipher: 'TestManage',
            title: 'Science Olympiad Code Busters Samples',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'versions.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'versions.html'),
            cipher: 'TestManage',
            title: 'Science Olympiad Code Busters Version History',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'HowTo.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'HowTo.html'),
            cipher: '',
            title: 'How To',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Maintenance.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'Maintenance.html'),
            cipher: 'Maintenance',
            title: 'Maintenance',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Policies.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'Policies.html'),
            cipher: 'TestManage',
            title: 'Policies',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Rule-Summary-2022.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'Rule-Summary-2022.html'),
            cipher: 'TestManage',
            title: '2021-2020 Season Science Olympiad Rules Summary',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestGuidance.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'TestGuidance.html'),
            cipher: '',
            title: 'Test Guidance',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'QuoteAnalyze.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'StdEncoder.html'),
            cipher: 'QuoteAnalyze',
            title: 'Quote Analyzer',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'GenerateHomophones.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'StdEncoder.html'),
            cipher: 'GenerateHomophone',
            title: 'Homophone Generator',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'AffineEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'StdEncoder.html'),
            cipher: 'Affine',
            title: 'Affine Encrypt',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'AristocratEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'AristocratEncrypt.html'),
            cipher: 'Encoder',
            title: 'Aristocrat Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'CryptarithmEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'StdEncoder.html'),
            cipher: 'Cryptarithm',
            title: 'Cryptarithm Encrypt',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'DancingManEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'StdEncoder.html'),
            cipher: 'DancingMan',
            title: 'Dancing Man Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'FractionatedMorseEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'StdEncoder.html'),
            cipher: 'FractionatedMorse',
            title: 'Fractionated Morse Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'PigPenEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'StdEncoder.html'),
            cipher: 'PigPen',
            title: 'PigPen/Masonic Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'MorbitEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'StdEncoder.html'),
            cipher: 'Morbit',
            title: 'Morbit Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'PolluxEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'StdEncoder.html'),
            cipher: 'Pollux',
            title: 'Pollux Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'RailFenceEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'StdEncoder.html'),
            cipher: 'RailFence',
            title: 'RailFence Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TapCodeEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'StdEncoder.html'),
            cipher: 'TapCode',
            title: 'Tap Code Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'AristocratSpanishEncrypt.html',
            template: path.join(
                __dirname,
                'app',
                'codebusters',
                'pages',
                'AristocratSpanishEncrypt.html'
            ),
            cipher: 'Encoder',
            title: 'Aristrocrat Spanish Encrypt',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Atbash.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'StdEncoder.html'),
            cipher: 'Atbash',
            title: 'Caesar/Atbash Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Baconian.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'StdEncoder.html'),
            cipher: 'Baconian',
            title: 'Baconian Cipher',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Caesar.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'StdEncoder.html'),
            cipher: 'Caesar',
            title: 'Caesar/Atbash Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'RSAEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'StdEncoder.html'),
            cipher: 'RSA',
            title: 'RSA Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'EditRunningKeys.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'EditRunningKeys.html'),
            cipher: 'RunningKeyEdit',
            title: 'Edit Running Key Values',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'RunningKeyEncoder.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'StdEncoder.html'),
            cipher: 'RunningKey',
            title: 'Running Key Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'HillEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'StdEncoder.html'),
            cipher: 'Hill',
            title: 'Hill Encrypt (2x2 and 3x3)',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'HillKeys.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'HillKeys.html'),
            cipher: '',
            title: 'Known Valid Hill Encryption Keys',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'PatristocratEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'AristocratEncrypt.html'),
            cipher: 'Patristocrat',
            title: 'Patristocrat Encrypt',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestAnswers.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'TestAnswers.html'),
            cipher: 'TestAnswers',
            title: 'Test Answer Key',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestGenerator.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'TestGenerator.html'),
            cipher: 'TestGenerator',
            title: 'Test Generator',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestManage.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'TestManage.html'),
            cipher: 'TestManage',
            title: 'Test Management',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestPublished.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'TestManage.html'),
            cipher: 'TestPublished',
            title: 'Test Management',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestPermissions.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'TestManage.html'),
            cipher: 'TestPermissions',
            title: 'Test Permissions',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestSchedule.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'TestManage.html'),
            cipher: 'TestSchedule',
            title: 'Schedule Test',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TakeTest.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'TestManage.html'),
            cipher: 'TakeTest',
            title: 'Take a Test',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Scilympiad.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'TestManage.html'),
            cipher: 'Scilympiad',
            title: 'Take a Scilympiad Test',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'Login.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'Login.html'),
            cipher: 'Login',
            title: 'Login',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestResults.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'TestManage.html'),
            cipher: 'TestResults',
            title: 'View Test Results',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestPrint.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'TestPrint.html'),
            cipher: 'TestPrint',
            title: 'Test',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestInteractive.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'TestInteractive.html'),
            cipher: 'TestInteractive',
            title: 'Interactive Test',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestAttach.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'TestManage.html'),
            cipher: 'TestAttach',
            title: 'Attach Paper Work Images',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestPlayback.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'TestPlayback.html'),
            cipher: 'TestPlayback',
            title: 'Test Playback',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestTimed.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'TestTimed.html'),
            cipher: 'TestTimed',
            title: 'Interactive Test',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'TestQuestions.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'TestQuestions.html'),
            cipher: 'TestQuestions',
            title: 'Test Question Management',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'VigenereEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'StdEncoder.html'),
            cipher: 'Vigenere',
            title: 'Vigen&egrave;re/Porta Encoder',
        }),
        new HtmlWebpackPlugin({
            inject: false,
            filename: 'XenocryptEncrypt.html',
            template: path.join(__dirname, 'app', 'codebusters', 'pages', 'XenocryptEncrypt.html'),
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
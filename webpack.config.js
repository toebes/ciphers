const path = require('path');
const webpack = require('webpack');

module.exports = {
    mode: "development", // "production" | "development" | "none"
    plugins: [
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            "global.$": "jquery"
        }),
        new webpack.DefinePlugin({
            "require.specified": "require.resolve"
        })
    ],
    entry: [
        path.join(__dirname, 'app', 'ciphers.ts'),
    ],
    output: {
        filename: 'ciphers.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        library: 'MyLib',
        umdNamedDefine: true
    },

    resolve: {
        alias: {
            "jquery-ui": path.join(__dirname, "jquery-ui.min.js"),
            "summernote": path.join(__dirname, "summernote-lite.js"),
            "dataTables": path.join(__dirname, "node_modules", "datatables.net", "js", "jquery.dataTables.js"),
            "dataTables-colReorder": path.join(__dirname, "node_modules", "datatables.net-colreorder", "js", "dataTables.colReorder.min.js"),
            "jquery-css": path.join(__dirname, "jquery-ui.min.css"),
            "styles-css": path.join(__dirname, "styles.css"),
            "summernote-css": path.join(__dirname, "summernote-lite.css"),
        },
        modules: [__dirname, path.join(__dirname, 'node_modules'),],
        extensions: ['.ts', '.js', '.css', '.ttf', '.eot','.woff','.woff2','.png']
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                include: [
                    path.resolve(__dirname, 'app')
                ],
                exclude: [path.resolve(__dirname, 'node_modules'),
                ]
            },
            {
                test: /\.css$/,
                include: __dirname,
                use: [
                    'style-loader', 'css-loader',
                    // 'style-loader',
                    // {
                    //     loader: 'typings-for-css-modules-loader',
                    //     options: {
                    //         modules: true,
                    //         namedExport: true,
                    //         camelCase: true,
                    //         sourceMap: true
                    //     }
                    // }
                ]
            },
            {
                test: /\.(png)$/,
                use: {
                    loader: "file-loader",
                    options: {
                        name: "images/[name].[ext]",
                    },
                }
            },
            {
                test: /\.(ttf|eot|woff|woff2)$/,
                use: {
                    loader: "file-loader",
                    options: {
                        name: "font/[name].[ext]",
                    },
                }
            },
            {
                // Exposes jQuery for use outside Webpack build
                test: require.resolve('jquery'),
                use: [{
                    loader: 'expose-loader',
                    options: 'jQuery'
                }, {
                    loader: 'expose-loader',
                    options: '$'
                }]
            }
        ]
    },

    devtool: 'source-map',

    devServer: {
        publicPath: path.join('/out/')
    }
};
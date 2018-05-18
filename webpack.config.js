const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: "development", // "production" | "development" | "none"
  plugins: [
    new webpack.ProvidePlugin({
        $: "jquery",
        jQuery: "jquery"
    }),
    new webpack.DefinePlugin({
      "require.specified": "require.resolve"
    })
],
  entry: [
    path.join(__dirname, 'jquery-3.1.1.min.js'),
    path.join(__dirname, 'jquery-ui.min.js'),
    path.join(__dirname, 'summernote-lite.js'),    
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
    modules: [path.join(__dirname, 'node_modules')],
    extensions: ['.ts']
  },
  module: {
    rules: [{
      test: /\.tsx?$/,
      loader: 'ts-loader',
      include: [
        path.resolve(__dirname, 'app')
      ],
      exclude: [path.resolve(__dirname, 'node_modules'),
      ]
         }]
  },

  devtool: 'source-map',

  devServer: {
    publicPath: path.join('/out/')
  }
};
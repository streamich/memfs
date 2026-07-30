const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const root = require('app-root-path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: {
    bundle: __dirname + '/main',
  },
  plugins: [
    new webpack.NormalModuleReplacementPlugin(/^node:/, resource => {
      resource.request = resource.request.slice(5);
    }),
    new HtmlWebpackPlugin({
      title: 'Git in a real folder',
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'ts-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      assert: require.resolve('assert'),
      buffer: require.resolve('buffer/'),
      events: require.resolve('events/'),
      path: require.resolve('path-browserify'),
      process: require.resolve('process/browser'),
      stream: require.resolve('readable-stream'),
      url: require.resolve('url/'),
      util: require.resolve('util'),
    },
  },
  externals: {
    fs: 'window.fs',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(root.path, 'dist'),
  },
  devServer: {
    port: 9876,
    hot: false,
  },
};

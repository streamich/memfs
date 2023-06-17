const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const root = require('app-root-path');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: __dirname + '/main',
  plugins: [
    // new ForkTsCheckerWebpackPlugin(),
    new HtmlWebpackPlugin({
      title: 'Development',
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
      buffer: require.resolve('buffer'),
      path: require.resolve('path-browserify'),
      process: require.resolve('process/browser'),
      stream: require.resolve('streamx'),
      url: require.resolve('url'),
      util: require.resolve('util'),
    },
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(root.path, 'dist'),
  },
  devServer: {
    port: 9876,
    hot: false,
  },
};

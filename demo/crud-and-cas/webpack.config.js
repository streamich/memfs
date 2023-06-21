const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const root = require('app-root-path');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: {
    bundle: __dirname + '/main',
  },
  plugins: [
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

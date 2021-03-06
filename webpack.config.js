const path = require('path');

const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const miniApps = ['blocks', 'gantt'];

const entries = { 'shared-styles': 'shared/shared.scss' };
const generatedHTMLFiles = [];
for (const miniApp of miniApps) {
  entries[miniApp] = `${miniApp}/app.ts`;
  generatedHTMLFiles.push(
    new HtmlWebpackPlugin({
      filename: `${miniApp}.html`,
      template: `${miniApp}/index.html`,
      scriptLoading: 'defer',
      chunks: [miniApp],
      title: miniApp,
    })
  );
}

module.exports = (env, argv) => ({
  entry: entries,

  context: path.join(process.cwd(), 'src'),

  output: {
    publicPath: (argv || {}).mode === 'production' ? '/d3-chart-samples' : '/',
    path: path.join(process.cwd(), 'dist'),
    filename: 'scripts/[name].[hash].js',
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
      },
      {
        test: /\.(css|sass|scss)$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
          },
          {
            loader: 'sass-loader',
          },
        ],
      },
      {
        test: /\.(svg|eot|woff|woff2|ttf)$/,
        use: ['file-loader'],
      },
      {
        test: /\.ts$/,
        exclude: [path.resolve(__dirname, '__tests__')],
        enforce: 'post',
        use: {
          loader: 'istanbul-instrumenter-loader',
          options: { esModules: true },
        },
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'shared/index.html',
      scriptLoading: 'defer',
      chunks: ['shared-styles'],
      title: 'd3 samples',
    }),

    ...generatedHTMLFiles,
    new MiniCssExtractPlugin({
      filename: 'css/[name].[hash].css',
      chunkFilename: 'css/[id].[hash].css',
    }),

    new CopyPlugin({
      patterns: [{ from: 'public' }],
      options: {
        concurrency: 100,
      },
    }),
  ],

  resolve: {
    modules: ['node_modules', path.resolve(__dirname, 'src')],
    extensions: ['.ts', '.js', 'scss'],
  },

  devServer: {
    contentBase: './dist',
    clientLogLevel: 'info',
    port: 8080,
    inline: true,
    historyApiFallback: false,
    watchOptions: {
      aggregateTimeout: 300,
      poll: 500,
    },
  },

  optimization: {
    splitChunks: {
      cacheGroups: {
        commons: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'all',
        },
      },
    },
  },

  devtool: 'inline-source-map',

  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
});

const webpack = require('webpack');

module.exports = function (options, webpack) {
  return {
    ...options,
    plugins: [
      ...options.plugins,
      new webpack.BannerPlugin({
        banner: "const crypto = require('crypto'); if (!global.crypto) { global.crypto = crypto.webcrypto; }",
        raw: true,
        entryOnly: true,
      }),
    ],
  };
};

// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      // Suppress baseline-browser-mapping warnings in development
      // These warnings are informational - the data is outdated but doesn't affect functionality
      overrideBrowserslist: ['defaults', 'not dead', 'not op_mini all'],
    },
  },
};

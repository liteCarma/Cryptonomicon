const tailwindFormPlugin = require('@tailwindcss/forms');

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx,vue,html}'],
  theme: {
    extend: {},
  },
  plugins: [
    tailwindFormPlugin,
  ],
};

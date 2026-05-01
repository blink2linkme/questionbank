module.exports = {
  content: [
    './**/*.razor',
    './wwwroot/index.html',
    './Pages/**/*.razor',
    './Shared/**/*.razor'
  ],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light', 'dark'],
  },
};

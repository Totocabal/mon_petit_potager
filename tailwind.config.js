/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fond: '#EAF2E3',
        encre: '#23402B',
        gris: '#55625A',
        trait: '#D5E3CB',
        vert: { DEFAULT: '#2E6B3F', fonce: '#1F4D2C', doux: '#E1EFD6' },
        soleil: { DEFAULT: '#F6C445', doux: '#FFF1C7', encre: '#4A3A10' },
        ciel: { DEFAULT: '#D3EAEE', encre: '#1F4D5A' },
        eau: '#3F7DA0',
        terre: { DEFAULT: '#C08B5C', bord: '#A7724A', case: '#7A4E33', libre: '#6A432C' },
        alerte: { DEFAULT: '#B8402C', doux: '#FBE3DC' }
      },
      fontFamily: {
        titre: ['Fredoka', '"Trebuchet MS"', 'system-ui', 'sans-serif'],
        corps: ['Nunito', '"Segoe UI"', 'system-ui', 'sans-serif']
      },
      borderRadius: { carte: '24px' }
    }
  },
  plugins: []
};

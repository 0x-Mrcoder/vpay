export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#fff9e6',
                    100: '#ffedd8',
                    200: '#ffdcb3',
                    300: '#ffc580',
                    400: '#ffaf4d',
                    500: '#F9A81B', // VTStack Orange
                    600: '#db8e0e',
                    700: '#b87008',
                    800: '#945609',
                    900: '#7a450b',
                    950: '#452303',
                },
                brand: {
                    dark: '#1a1a1a',
                    green: '#F9A81B', // Matching naming from green-900 references
                }
            },
            fontFamily: {
                sans: ['SN Pro', 'sans-serif'],
            },
        },
    },
    plugins: [],
}

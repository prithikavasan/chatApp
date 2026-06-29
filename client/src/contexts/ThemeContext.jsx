import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('themeColor') || '#6366f1');
  const [chatBackground, setChatBackground] = useState(() => localStorage.getItem('chatBackground') || '');

  useEffect(() => {
    // Set theme attribute
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Dynamically update CSS variables for colors
    document.documentElement.style.setProperty('--primary', themeColor);
    
    // Generate a slightly darker variant for hover state
    const darkColor = adjustColorBrightness(themeColor, -20);
    document.documentElement.style.setProperty('--primary-hover', darkColor);
    
    // Generate a lighter variant for shadows/glows/background tints
    const lightColor = adjustColorBrightness(themeColor, 40) + '26'; // add alpha
    document.documentElement.style.setProperty('--primary-light', lightColor);

    localStorage.setItem('themeColor', themeColor);
  }, [themeColor]);

  useEffect(() => {
    localStorage.setItem('chatBackground', chatBackground);
  }, [chatBackground]);

  // Utility to lighten or darken a hex color
  function adjustColorBrightness(hex, percent) {
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);

    R = parseInt((R * (100 + percent)) / 100);
    G = parseInt((G * (100 + percent)) / 100);
    B = parseInt((B * (100 + percent)) / 100);

    R = R < 255 ? R : 255;
    G = G < 255 ? G : 255;
    B = B < 255 ? B : 255;

    R = R > 0 ? R : 0;
    G = G > 0 ? G : 0;
    B = B > 0 ? B : 0;

    const rr = R.toString(16).padStart(2, '0');
    const gg = G.toString(16).padStart(2, '0');
    const bb = B.toString(16).padStart(2, '0');

    return `#${rr}${gg}${bb}`;
  }

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeColor,
        chatBackground,
        setTheme,
        setThemeColor,
        setChatBackground,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

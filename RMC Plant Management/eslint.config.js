export default [
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        FormData: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        Math: 'readonly',
        Number: 'readonly',
        String: 'readonly',
        Boolean: 'readonly',
        Date: 'readonly',
        Array: 'readonly',
        Object: 'readonly',
        Set: 'readonly',
        Map: 'readonly',
        Promise: 'readonly',
        RegExp: 'readonly',
        Error: 'readonly',
        JSON: 'readonly',
        parseInt: 'readonly',
        parseFloat: 'readonly',
        isNaN: 'readonly',
        isFinite: 'readonly',
        encodeURIComponent: 'readonly',
        decodeURIComponent: 'readonly',
        React: 'readonly'
      }
    },
    rules: {
      'no-undef': 'error'
    }
  }
];

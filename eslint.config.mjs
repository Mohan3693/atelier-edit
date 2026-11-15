import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'dist-api/**/*', 'node_modules/**/*', 'src/**/*', 'api/**/*', 'server.ts'],
  },
  firebaseRulesPlugin.configs['flat/recommended'],
];

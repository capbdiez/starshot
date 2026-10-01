/**
 * Architecture boundaries from ARCHITECTURE §7. `npm run lint:deps` fails on any violation.
 * @type {import('dependency-cruiser').IConfiguration}
 */
const MODULES = ['app', 'sim', 'content', 'presentation', 'ui', 'platform', 'shared', 'debug'];

/** Only a module's own files, or another module's index.ts, may be imported. */
const publicApiRules = MODULES.map((mod) => ({
  name: `public-api-only-${mod}`,
  comment: `Import src/${mod} only through src/${mod}/index.ts (AGENTS §2).`,
  severity: 'error',
  from: { path: '^src/', pathNot: `^src/${mod}/` },
  to: { path: `^src/${mod}/`, pathNot: `^src/${mod}/index\\.ts$` },
}));

/** [module, forbidden-internal-modules, forbidden-npm-packages] */
const LAYERS = [
  ['shared', 'app|sim|content|presentation|ui|platform|debug', 'phaser|zod'],
  ['content', 'app|sim|presentation|ui|platform|debug', 'phaser'],
  ['sim', 'app|presentation|ui|platform|debug', 'phaser'],
  ['platform', 'app|sim|presentation|ui|debug', 'phaser'],
  ['presentation', 'app|ui|platform|debug', ''],
  ['ui', 'app|sim|platform|debug', ''],
];

const layerRules = LAYERS.flatMap(([mod, internal, packages]) => {
  const rules = [
    {
      name: `${mod}-layer`,
      comment: `src/${mod} must not import src/(${internal}) (ARCHITECTURE §7).`,
      severity: 'error',
      from: { path: `^src/${mod}/` },
      to: { path: `^src/(${internal})/` },
    },
  ];
  if (packages) {
    rules.push({
      name: `${mod}-no-${packages.replace(/\|/g, '-')}`,
      comment: `src/${mod} must not depend on ${packages} (ARCHITECTURE §7).`,
      severity: 'error',
      from: { path: `^src/${mod}/` },
      to: { path: `node_modules/(${packages})/` },
    });
  }
  return rules;
});

module.exports = {
  forbidden: [
    ...layerRules,
    ...publicApiRules,
    {
      name: 'debug-only-from-app',
      comment: 'src/debug may only be loaded by src/app (behind import.meta.env.DEV).',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/(app|debug)/' },
      to: { path: '^src/debug/' },
    },
    {
      name: 'tools-not-in-game',
      comment: 'Game code must not import build tooling.',
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '^tools/' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'no-non-package-json',
      comment: 'Every npm import must be declared in package.json.',
      severity: 'error',
      from: {},
      to: { dependencyTypes: ['npm-no-pkg', 'npm-unknown'] },
    },
    {
      name: 'no-dev-deps-in-game',
      comment: 'The shipped game may only use runtime dependencies (phaser, zod).',
      severity: 'error',
      from: { path: '^src/' },
      to: { dependencyTypes: ['npm-dev'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types'],
    },
    exclude: { path: '\\.(css|json|png)$' },
  },
};

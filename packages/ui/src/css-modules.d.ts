// Ambient declarations for SCSS / CSS modules. Bundlers (Vite) generate the
// real exports at build time; this just satisfies tsc.

declare module '*.module.scss' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

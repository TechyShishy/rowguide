#!/usr/bin/env node
const fs = require("fs");

function main() {
  let { index_html, styles_css, polyfills_js, main_js } = readFiles();
  index_html = index_html
    .replace(
      /<link rel="stylesheet" href="styles-[a-zA-Z0-9]+\.css">/,
      `<style>${styles_css}</style>`
    )
    .replace(
      /<script src="polyfills-[a-zA-Z0-9]+\.js" type="module"><\/script>/,
      `<script type="module">${polyfills_js}</script>`
    )
    .replace(
      /<script src="main-[a-zA-Z0-9]+\.js" type="module"><\/script>/,
      `<script type="module">${main_js}</script>`
    );

  fs.writeFileSync(
    `${__dirname}/../../../dist/rowguide/browser/index.html`,
    index_html
  );
}

function readFiles() {
  let index_html;
  let styles_css;
  let polyfills_js;
  let main_js;

  index_html = fs
    .readFileSync(`${__dirname}/../../../dist/rowguide/browser/index.html`)
    .toString();

  files = fs.readdirSync(`${__dirname}/../../../dist/rowguide/browser/`);
  files.forEach((file) => {
    if (file.startsWith("styles-") && file.endsWith(".css")) {
      styles_css = fs
        .readFileSync(`${__dirname}/../../../dist/rowguide/browser/${file}`)
        .toString();
    }
    if (file.startsWith("main-") && file.endsWith(".js")) {
      main_js = fs
        .readFileSync(`${__dirname}/../../../dist/rowguide/browser/${file}`)
        .toString();
    }
    if (file.startsWith("polyfills-") && file.endsWith(".js")) {
      polyfills_js = fs
        .readFileSync(`${__dirname}/../../../dist/rowguide/browser/${file}`)
        .toString();
    }
  });

  return { index_html, styles_css, polyfills_js, main_js };
}

main();

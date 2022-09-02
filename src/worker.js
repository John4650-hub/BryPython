let inputCount = 0;

async function loadBrythonAndPackages(baseUrl = '', packages) {
  importScripts(`${baseUrl}/lib/brython.js`);
  self.brython = await loadBrython({
    stdout: (msg) => { stdout(msg) },
    stderr: (msg) => { stdout(msg) },
    stdin: () => { return stdin() },
  });
  if (Array.isArray(packages)) {
    await self.brython.installPackages(packages);
  }
}

const actions = {
  async init(data) {
    const { packages, baseUrl, cacheFileUrl } = data;
    self.cacheFileUrl = cacheFileUrl;
    try {
      await loadBrythonAndPackages(baseUrl, packages);

      self.postMessage({
        action: 'init',
        success: true,
      });
    } catch (error) {
      self.postMessage({
        action: 'init',
        success: false,
        error,
      });
    }
  },
  async run(data) {
    const { code } = data;
    try {
      await self.brython.loadPackagesFromImports(code);
      self.postMessage({
        action: 'run',
        success: true,
        output: output?.toString() ?? output ?? '',
      });
    } catch (error) {
      self.postMessage({
        action: 'run',
        success: false,
        error: error?.message ?? error?.toString(),
      });
    }
  },
  input(data) {
    const { line } = data;
    self.line = line;
  }
}

self.onmessage = async function (e) {
  const {
    action
  } = e.data;

  if (actions[action]) {
    await actions[action](e.data);
  }
};

self.line = '';

function stdout(msg) {
  self.postMessage({
    action: 'stdout',
    text: msg.message ?? msg.toString(),
  });
}

function stderr(msg) {
  self.postMessage({
    action: 'stderr',
    text: msg.message ?? msg.toString(),
  });
}

function stdin(str = '') {
  self.postMessage({
    action: 'input',
    text: str,
  });
  let line = '';
  while (!line) {
    line = read();
  }
  return line.replace('\0', '');
}

function read() {
  const xhr = new XMLHttpRequest();
  xhr.timeout = 1000;
  xhr.open('GET', self.cacheFileUrl, false);
  try {
    xhr.send();
    const text = xhr.responseText;
    if (text.endsWith(`\0${inputCount}`)) {
      ++inputCount;
      return text.slice(0, -(`${inputCount}`.length));
    } else {
      return '';
    }
  } catch (err) {
    throw err instanceof Error ? err : new Error(err);
  }
}

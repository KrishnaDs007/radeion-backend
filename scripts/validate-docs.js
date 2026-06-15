const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STATUS_PATH = path.join(ROOT, 'docs', 'project-status.md');
const EXAMPLES_PATH = path.join(ROOT, 'docs', 'api-examples.md');
const POSTMAN_PATH = path.join(
  ROOT,
  'docs',
  'postman',
  'radeion-backend.postman_collection.json',
);

const PUBLIC_ROUTES = new Set([
  'GET /',
  'GET /health',
  'GET /health/config',
  'GET /health/database',
  'GET /auth/methods',
  'POST /access-requests/users',
  'POST /access-requests/organizations',
  'POST /invites/accept',
]);

const DEFAULT_METHOD = 'GET';

function main() {
  const errors = [];
  const postman = readJson(POSTMAN_PATH, errors);
  const examples = readText(EXAMPLES_PATH, errors);
  const status = readText(STATUS_PATH, errors);

  if (!postman || !examples || !status) {
    report(errors);
  }

  validatePostmanShape(postman, errors);

  const postmanRequests = collectPostmanRequests(postman);
  const documentedRoutes = extractCurrentApiRoutes(status);
  const exampleRoutes = extractExampleRoutes(examples);
  const representedRoutes = new Set([
    ...postmanRequests.map((request) => request.routeKey),
    ...exampleRoutes,
  ]);

  for (const route of documentedRoutes) {
    if (!representedRoutes.has(route)) {
      errors.push(`Missing API example or Postman request for ${route}`);
    }
  }

  validatePostmanRequests(postmanRequests, errors);

  report(errors);
}

function readText(filePath, errors) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    errors.push(`Unable to read ${relative(filePath)}: ${error.message}`);
    return null;
  }
}

function readJson(filePath, errors) {
  const content = readText(filePath, errors);

  if (!content) {
    return null;
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    errors.push(`Invalid JSON in ${relative(filePath)}: ${error.message}`);
    return null;
  }
}

function validatePostmanShape(collection, errors) {
  if (collection.info?.schema !== 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json') {
    errors.push('Postman collection must use schema v2.1.0');
  }

  if (!Array.isArray(collection.item) || collection.item.length === 0) {
    errors.push('Postman collection must contain request folders');
  }
}

function collectPostmanRequests(collection) {
  const requests = [];

  function walk(items, folderPath = []) {
    for (const item of items ?? []) {
      if (item.request) {
        const method = item.request.method ?? DEFAULT_METHOD;
        const rawUrl =
          typeof item.request.url === 'string'
            ? item.request.url
            : item.request.url?.raw;
        const routeKey = toRouteKey(method, rawUrl ?? '');
        requests.push({
          name: item.name,
          folderPath,
          method,
          rawUrl,
          routeKey,
          headers: item.request.header ?? [],
          body: item.request.body,
        });
        continue;
      }

      walk(item.item, [...folderPath, item.name]);
    }
  }

  walk(collection.item);
  return requests;
}

function validatePostmanRequests(requests, errors) {
  const seenNames = new Set();

  for (const request of requests) {
    const nameKey = [...request.folderPath, request.name].join(' / ');

    if (seenNames.has(nameKey)) {
      errors.push(`Duplicate Postman request name: ${nameKey}`);
    }
    seenNames.add(nameKey);

    if (!request.rawUrl) {
      errors.push(`Postman request ${nameKey} is missing a URL`);
    }

    if (!PUBLIC_ROUTES.has(request.routeKey) && !hasHeader(request, 'Authorization')) {
      errors.push(`Protected Postman request ${nameKey} is missing Authorization header`);
    }

    if (request.body?.mode === 'raw' && !hasHeader(request, 'Content-Type')) {
      errors.push(`Raw-body Postman request ${nameKey} is missing Content-Type header`);
    }
  }
}

function hasHeader(request, headerName) {
  return request.headers.some(
    (header) => header.key?.toLowerCase() === headerName.toLowerCase(),
  );
}

function extractCurrentApiRoutes(status) {
  const currentShape = status.match(/## Current API Shape[\s\S]*?(?=\n## To Do|\n## )/);

  if (!currentShape) {
    return [];
  }

  return Array.from(currentShape[0].matchAll(/- `(GET|POST|PATCH|DELETE) ([^`]+)`/g)).map(
    ([, method, routePath]) => normalizeRoute(method, routePath),
  );
}

function extractExampleRoutes(examples) {
  const routes = new Set();
  const curlBlocks = examples.match(/```bash\n([\s\S]*?)```/g) ?? [];

  for (const block of curlBlocks) {
    const methodMatch = block.match(/curl\s+-X\s+(GET|POST|PATCH|DELETE)/);
    const method = methodMatch?.[1] ?? DEFAULT_METHOD;

    for (const urlMatch of block.matchAll(/\$API_BASE_URL([^"&\s]+)/g)) {
      routes.add(normalizeRoute(method, urlMatch[1]));
    }
  }

  return routes;
}

function toRouteKey(method, rawUrl) {
  const withoutBase = rawUrl
    .replace('{{baseUrl}}', '')
    .replace(/^https?:\/\/[^/]+/, '');

  return normalizeRoute(method, withoutBase);
}

function normalizeRoute(method, routePath) {
  const pathOnly = routePath.split('?')[0] || '/';
  const normalizedPath = pathOnly
    .replace(/<[^>]+>/g, ':param')
    .replace(/\{\{[^}]+}}/g, ':param')
    .replace(/:[A-Za-z0-9_]+/g, ':param')
    .replace(/\/+/g, '/');

  return `${method.toUpperCase()} ${normalizedPath}`;
}

function relative(filePath) {
  return path.relative(ROOT, filePath);
}

function report(errors) {
  if (errors.length > 0) {
    console.error('Documentation validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('Documentation validation passed');
}

main();

import querystring from 'querystring';
import normalizeUrl from 'normalize-url';
import stringHash from 'string-hash';
import debug from 'debug';
import { normalize } from 'normalizr';
import { computePayload } from '../actions';
import invariant from 'invariant';

/**
 * Sorts object alphabetically
 */
function _sortObject(obj = {}) {
  return Object.keys(obj)
    .sort()
    .reduce((_obj, key) => {
      _obj[key] = typeof obj[key] === 'object'
        ? _sortObject(obj[key])
        : obj[key];
      return _obj;
    }, {});
}

/**
 * Returns the normalizr schema key (ie 'item'/'items', etc)
 */
export function schemaKey({ schema }) {
  return schema.getKey
    ? schema.getKey()
    : schema.getItemSchema().getKey();
}

export function normalizeParams(params = {}) {
  // querystring has a weird way of dealing w/ object and arrays, so we just
  // stringify here instead of letting it f it up.
  Object.keys(params).forEach((key) => {
    if (typeof params[key] === 'object') {
      params[key] = JSON.stringify(params[key]);
    }
  });
  return querystring.stringify(_sortObject(params));
}

export function requestKey({ url, headers, method, body }) {
  return stringHash([
    method,
    url,
    normalizeParams(headers), // TODO: lowercase header keys
    normalizeParams(body)
  ].map(encodeURIComponent).join('|'));
}

export function findInState(state, resourceDefinition) {
  const { paramsToResources = {}, resources = {} } = state.connect;
  const { isArray, defaultValue } = resourceDefinition;
  const key = schemaKey(resourceDefinition);
  const resourceMap = paramsToResources[resourceDefinition.requestKey];
  const resourceKeys = resourceMap &&
    paramsToResources[resourceDefinition.requestKey].data[key];

  if (!resourceKeys || resourceMap.meta.didInvalidate) {
    return false;
  }

  let mappedResources = resources[key]
    ? resourceKeys.map((id) => resources[key][id])
    : resourceMap.data[key];

  if (!mappedResources) {
    mappedResources = defaultValue;
  } else if (!isArray) {
    mappedResources = mappedResources[0];
  }

  return {
    meta: resourceMap.meta,
    value: mappedResources
  };
}

export function fullUrl(url, params) {
  url = url.replace(/\/+$/, '');
  params && (url = `${url}/?${normalizeParams(params)}`);
  return normalizeUrl(url, { stripWWW: false });
}

export const logger = (function () {
  const namespace = 'tptconnect';
  const error = debug(`${namespace}:error`);
  const info = debug(`${namespace}:info`);
  error.log = (...args) => (
    console.error
      ? Function.apply.call(console.error, console, args)
      : Function.apply.call(console.log, console, args)
  );
  info.log = (...args) => (
    console.info
      ? Function.apply.call(console.info, console, args)
      : Function.apply.call(console.log, console, args)
  );
  return { error, info };
}());

const definitionDefaults = {
  method: 'GET',
  normalize,
  actions: {},
  extends: {},
  clientOnly: false
};

export function normalizeResourceDefinition(definition) {
  definition = { ...definitionDefaults, ...(definition.extends || {}), ...definition };

  invariant(definition.schema !== undefined, 'Resource definition must have a schema.');
  invariant(
    !/\?[^#]/.test(definition.url),
    'Include query parameters under `params` in your resource definition ' +
    'instead of directly in the URL.'
  );

  definition.url = fullUrl(definition.url, definition.params);
  definition.method = definition.method.toUpperCase();
  definition.isArray = !definition.schema.getKey;
  definition.requestKey = requestKey(definition);

  if (definition.defaultValue === undefined) {
    definition.defaultValue = definition.isArray ? [] : {};
  }

  if (definition.method === 'GET') {
    if (definition.auto === undefined) {
      definition.auto = true;
    }
    if (definition.store === undefined) {
      definition.store = true;
    }
  }

  return definition;
}

export function computeExternalPayload(resourceDefinition, json) {
  return computePayload(
    normalizeResourceDefinition(resourceDefinition),
    { isError: false, isSuccess: true },
    json
  );
}

export function extendFunction(...functions) {
  return (...args) => {
    for (const func of functions) {
      typeof func === 'function' && func.apply(this, args);
    }
  };
}


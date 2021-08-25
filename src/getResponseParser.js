import base64url from 'base64url';
import { HttpError } from 'ra-core';
import {
  GET_LIST,
  GET_MANY,
  GET_MANY_REFERENCE,
  GET_ONE,
  CREATE,
  UPDATE,
  DELETE,
  UPDATE_MANY,
  DELETE_MANY,
} from './fetchActions';
import { createId } from './util/base64Ids';

const getSanitizeResource = (primaryKeys) => (data) => {
  if (data == null) return undefined;
  var sanitizeResource = getSanitizeResource(primaryKeys);
  var result = Object.keys(data).reduce((acc, key) => {
    if (key.startsWith('_')) {
      return acc;
    }

    const dataKey = data[key];

    if (dataKey === null || dataKey === undefined) {
      return acc;
    }
    if (Array.isArray(dataKey)) {
      if (dataKey[0] && typeof dataKey[0] === 'object') {
        // if var is an array of reference objects with id properties
        if (dataKey[0].id != null) {
          return {
            ...acc,
            [key]: dataKey.map(sanitizeResource),
            [`${key}Ids`]: dataKey.map((d) => d.id),
          };
        } else {
          return {
            ...acc,
            [key]: dataKey.map(sanitizeResource),
          };
        }
      } else {
        return { ...acc, [key]: dataKey };
      }
    }

    if (typeof dataKey === 'object') {
      return {
        ...acc,
        ...(dataKey &&
          dataKey.id && {
            [`${key}.id`]: dataKey.id,
          }),
        [key]: sanitizeResource(dataKey),
      };
    }
    return { ...acc, [key]: dataKey };
  }, {});

  if (primaryKeys.every(pk => result[pk.name] != null)) {
    let id = {};
    primaryKeys.map((pk) => {
      id[pk.name] = result[pk.name];
    });
    result._originalId = result.id;
    result.id = createId(id);
  }
  console.log(result);

  return result;
};

export default (introspectionResults) => (aorFetchType, resource) => (res) => {
  const response = res.data;
  const primaryKeys = introspectionResults.types.find(obj => obj.name === `${resource.type.name}_pk_columns_input`).inputFields;
  var sanitizeResource = getSanitizeResource(primaryKeys);

  switch (aorFetchType) {
    case GET_MANY_REFERENCE:
    case GET_LIST:
      if(response.items.length == 0) throw new HttpError("Empty response", 404);
      return {
        data: response.items.map(sanitizeResource),
        total: response.total.aggregate.count,
      };

    case GET_MANY:
      return { data: response.items.map(sanitizeResource) };

    case GET_ONE:
      if(response.returning.length == 0) throw new HttpError("Empty response", 404);
      return { data: sanitizeResource(response.returning[0]) };

    case CREATE:
    case UPDATE:
    case DELETE:
      if(response.data.returning.length == 0) throw new HttpError("Empty response", 404);
      return { data: sanitizeResource(response.data.returning[0]) };

    case UPDATE_MANY:
    case DELETE_MANY:
      return { data: response.data.returning.map((x) => x.id) };

    default:
      throw Error('Expected a propper fetchType, got: ', aorFetchType);
  }
};

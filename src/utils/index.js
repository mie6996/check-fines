import pino from 'pino';
import axios from 'axios';
import { nanoid } from 'nanoid';
import curlirize from 'axios-curlirize';
import { config } from '../config/index.js';

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    }
  }
})

const axiosInstance = axios.create({
  baseURL: config.baseUrl,
  headers: { ...config.headers }
});

curlirize(axiosInstance, (req, error) => {
  const { command } = req;
  const reqId = req?.object?.request?.headers?.['x-custom-req-id'];
  if (error) {
    logger.error(`reqId_${reqId} error, message: ${error.message}`);
  } else {
    logger.info(`reqId_${reqId}, ${command}`);
  }
});

const getCookieValue = (cookies, cookieName) => {
  if (!cookies) return null;

  const cookiesArray = Array.isArray(cookies)
    ? cookies
    : [cookies];

  for (const header of cookiesArray) {
    if (typeof header !== 'string') continue;
    const parts = header.split(';');
    const [cookiePair] = parts;
    if (!cookiePair.startsWith(`${cookieName}=`)) continue;
    return cookiePair
  }

  return null;
}

const sleep = (time) => new Promise(resolve => setTimeout(resolve, time));

const retryWrapper = async ({
  fn,
  validateFn,
  onRetryCallback,
  maxRetries = config.maxRetries,
  delay = 1000,
  debug = false,
  args
}) => {
  let attempt = 0;
  let shouldContinue = true;
  let response;

  do {
    let fnResponse;
    try {
      if (Array.isArray(args)) {
        fnResponse = await fn(...args);
      } else if (typeof args === 'object' && args !== null) {
        fnResponse = await fn({ ...args });
      } else {
        fnResponse = await fn();
      }
    } catch (err) {
      if (debug) logger.error(`${fn.name} failed, error: ${err.stack}`);
    }

    if (debug) logger.info(`${fn.name} response ->`, fnResponse);

    if (validateFn(fnResponse)) {
      shouldContinue = false;
      response = fnResponse;
    } else {
      attempt++;
      await sleep(delay);
      if (onRetryCallback) await onRetryCallback();
      logger.info(`${fn.name} retry ${attempt}/${maxRetries}`);
      shouldContinue = attempt < maxRetries;
    }
  } while (shouldContinue);

  return response;
}

const stringToObject = (text) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    return {};
  }
}

const request = async ({
  url,
  method = 'GET',
  headers,
  data,
  timeout = 10000,
  responseType = 'json',
  keepRawResponse = false,
  logResponse = false,
  reqId = nanoid()
}) => {
  try {
    const response = await axiosInstance({
      url,
      method,
      headers: {
        'x-custom-req-id': reqId,
        ...headers
      },
      timeout,
      responseType,
      ...(data ?
        method === 'GET' ?
          { params: data } :
          { data } :
        {}
      ),
    })

    const results = keepRawResponse ? response : response.data;

    logger.info(`reqId_${reqId} done${logResponse ? `, data: ${JSON.stringify(results)}` : ''}`);

    return results;

  } catch (err) {
    logger.error(`reqId_${reqId} error: ${err.stack}`);
    return null;
  }
}

const cleanPlate = (plate = '') => plate.replace(/[^a-z0-9]/gi, '');

const detectVehicleType = (plate = '') => plate.length === 8 ? '1' : '2';

const isValidCaptcha = (captcha = '') => !!captcha && captcha.length === 6;

const cleanCaptcha = (captcha = '') => captcha.trim().toLowerCase().replace(/[^a-z0-9]/gi, '');

const isValidFinesUrl = (finesUrl = '') => !!finesUrl && finesUrl.startsWith('https:\/\/www.csgt.vn');

export {
  logger,
  getCookieValue,
  sleep,
  stringToObject,
  retryWrapper,
  request,
  isValidCaptcha,
  cleanCaptcha,
  isValidFinesUrl,
  cleanPlate,
  detectVehicleType
};

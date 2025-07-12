import qs from "qs";
import sharp from "sharp";
import { createWorker } from "tesseract.js";
import { parse } from "node-html-parser";
import { config } from "../config/index.js";
import { getCache, setCache } from "./mem-cache.js";
import {
  logger,
  getCookieValue,
  retryWrapper,
  request,
  cleanCaptcha,
  isValidCaptcha,
  isValidFinesUrl,
  cleanPlate,
  detectVehicleType,
} from "../utils/index.js";

let worker;

const resolverCaptcha = async () => {
  const response = await request({
    url: config.captchaUrl,
    responseType: "arraybuffer",
    keepRawResponse: true,
  });

  const sessionId = getCookieValue(response.headers["set-cookie"], "PHPSESSID");
  let captcha = response.data;

  if (!captcha) return null;

  captcha = Buffer.from(captcha, "binary");
  // Resize to increase accuracy
  captcha = await sharp(captcha).resize(300, 66).jpeg().toBuffer();

  if (!worker) worker = await createWorker("eng");

  try {
    const ret = await worker.recognize(captcha);
    return { sessionId, captcha: cleanCaptcha(ret.data.text) };
  } catch (er) {
    logger.error(`Can not resolve captcha, error: ${er.message}, ${er.stack}`);
    return null;
  }
};

const resolverCaptchaRetry = () =>
  retryWrapper({
    fn: resolverCaptcha,
    validateFn: (result) => {
      if (!result) return false;
      const { sessionId, captcha } = result;
      return !!sessionId && isValidCaptcha(captcha);
    },
  });

const getFinesUrl = async (plate, vehicleType) => {
  const { sessionId, captcha } = await resolverCaptchaRetry();

  const response = await request({
    url: config.finesUrl,
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      cookie: sessionId,
    },
    data: qs.stringify({
      BienKS: plate,
      Xe: vehicleType,
      captcha,
      ipClient: "9.9.9.91",
      cUrl: "1",
    }),
    logResponse: true,
  });

  return { url: response?.["href"], sessionId };
};

const getFinesUrlRetry = async (plate, vehicleType) =>
  retryWrapper({
    fn: getFinesUrl,
    validateFn: (result) => {
      if (!result) return false;
      const { url, sessionId } = result;
      return !!sessionId && isValidFinesUrl(url);
    },
    args: [plate, vehicleType],
  });

const parseFinesUrl = async (finesUrl, sessionId) => {
  const pageContent = await request({
    url: finesUrl,
    headers: { cookie: sessionId },
  });
  if (!pageContent) return { retry: true, data: [] };

  const root = parse(pageContent);
  const wrapper = root.querySelector("#bodyPrint123");
  if (!wrapper) return { retry: true, data: [] };

  if (
    wrapper?.innerText
      ?.trim()
      ?.toLowerCase()
      .includes("Không tìm thấy kết quả".toLowerCase())
  )
    return { retry: false, data: [] };

  const separateEl = '<hr style="margin-bottom: 25px;">';

  const wrappers = wrapper.innerHTML
    ?.split(separateEl)
    ?.filter((i) => !!i.trim());

  if (!wrappers) return { retry: true, data: [] };

  const KEYS = [
    "plate",
    "plateColor",
    "vehicleType",
    "violationTime",
    "location",
    "violationType",
    "status",
    "detectingUnit",
  ];

  let data = [];

  for (let wrapper of wrappers) {
    let dom = parse(wrapper);
    let allElements = Array.from(dom.querySelectorAll(".form-group"));
    if (!allElements) continue;

    let item = {};
    for (let [idx, element] of allElements.entries()) {
      const label = element.querySelector(".col-md-3")?.innerText?.trim();
      const value = element.querySelector(".col-md-9")?.innerText?.trim();

      if (!value && label) continue;

      if (value && KEYS[idx]) {
        item[KEYS[idx]] = value;
      } else {
        item["resolvingUnit"] ||= [];
        item["resolvingUnit"].push(element?.innerText?.trim());
      }
    }

    data.push(item);
  }

  return { retry: data.length === 0 && wrappers.length > 0, data };
};

const parseFinesUrlRetry = (finesUrl, sessionId) =>
  retryWrapper({
    fn: parseFinesUrl,
    validateFn: (result) => {
      if (!result) return false;
      const { retry } = result;
      return !retry;
    },
    args: [finesUrl, sessionId],
  });

const checkFines = async (plate, vehicleType) => {
  plate = cleanPlate(plate);
  if (!vehicleType) vehicleType = detectVehicleType(plate);

  const cacheValue = getCache(`${plate}_${vehicleType}`);
  if (cacheValue) return cacheValue;

  const { url, sessionId } = (await getFinesUrlRetry(plate, vehicleType)) || {};
  if (!url) return { error: true, message: "Can not get fines url" };
  if (!sessionId) return { error: true, message: "Can not get session id" };

  const finesData = await parseFinesUrlRetry(url, sessionId);
  if (!finesData) return { error: true, message: "Can not get fines data" };

  const response = { error: false, data: finesData.data };
  if (response.data.length > 0) {
    setCache(`${plate}_${vehicleType}`, response);
  }

  return response;
};

export { checkFines };

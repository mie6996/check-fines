import NodeCache from 'node-cache';

const globalCache = new NodeCache({ stdTTL: 5 * 60, checkperiod: 120 });

const getCache = (key) => globalCache.get(key);

const setCache = (key, value, ttl) => {
  if (ttl) {
    globalCache.set(key, value, time)
  } else {
    globalCache.set(key, value)
  }
};

export { getCache, setCache };
import * as fs from 'fs';
import * as path from 'path';

const __dirname = path.resolve();

export const sleep = async (millis) => new Promise((resolve) => setTimeout(resolve, millis));

export const getAbiByRelativePath = (relativePath) => {
  return JSON.parse(fs.readFileSync(path.join(__dirname, relativePath), 'utf-8'));
};

export const randomIntInRange = (min, max) => {
  return Math.floor(Math.random() * (max - min) + min);
};

export const getCurrentTimestamp = () => {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;
}

export const formatSlippageToPerTenThousand = (slippage) => {
  let slippageNum = +slippage
  slippageNum *= 100
  return slippageNum+''
}

export const sortParams = (params, evmAddress) => {
  let keys = Object.keys(params)
  if(!keys.length) return undefined
  keys = keys.sort();
  const keyValList = []
  for (const key of keys) {
      const val = params[key];
      if(val) {
          keyValList.push(`${key}=${val}`)
      }
  }
  const data = keyValList.join('&')
  const raw = `EvmAddress=${evmAddress}&${data}`
  return raw
}

export const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; 
  }
  return array;
}
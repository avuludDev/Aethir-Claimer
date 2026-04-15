export const extractNumbersFromString = (str) => {
  return str.match(/\d+/g);
};

export const makeURIWithParams = (baseURI, endpoint, params) => {
  const url = new URL(baseURI+endpoint);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
  return url.toString();
}
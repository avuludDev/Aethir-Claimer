import UserAgent from "user-agents";
import { parse } from "useragent";
import pkg from 'uuid';
const { v4: uuidV4 } = pkg;

export class UserAgentClient {
  constructor(ua) {
    this.uaInstance = ua ?? new UserAgent();
    this.uaData = this.setupData();
  }

  updateUserAgent(filters) {
    this.uaInstance = new UserAgent(filters);
    this.uaData = this.setupData();
  }

  setupData() {
    const browser = parse(this.uaInstance.data.userAgent);
    const secChUaTemplate =
      this.uaInstance.data.deviceCategory === "mobile"
        ? ``
        : `"Chromium";v="${browser.major},${browser.minor},${browser.patch}", "${browser.family}";v="${browser.major}", "Not-A.Brand";v="99"`;

    return {
      os: parse(this.uaInstance.data.userAgent).os,
      ua: this.uaInstance.data.userAgent,
      platform: parse(this.uaInstance.data.userAgent).os.family,
      mobile:
        `?${this.uaInstance.data.deviceCategory === "mobile" ? "1" : "0"}`,
      fetchMode: "cors",
      fetchSite: "same-site",
      fetchDest: "empty",
      secUa: secChUaTemplate,
    };
  }

  setHeadersPrivy() {
    this.headersPrivy = {
      "Privy-App-Id": "clwuim50w05b9h9ufagnyxso5",
      "Privy-Ca-Id": uuidV4(),
      "Privy-Client": "react-auth:1.80.0",
    };
    return this.headersPrivy
  }

  setHeadersOriginRef(host) {
    this.headersOrigin = {
      Origin: host,
      Referer: host + "/",
    };
    return this.headersOrigin
  }

  setHeadersContent() {
    this.headersContent = {
      "Accept": "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
      "Content-Type": "application/json",
    };
    return this.headersContent
  }

  setHeadersSec() {
    this.headersSec = {
      "Sec-Ch-Ua": this.uaData.secUa,
      "Sec-Ch-Ua-Mobile": this.uaData.mobile,
      "Sec-Ch-Ua-Platform": this.uaData.platform,
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
    };
    return this.headersSec
  }

  getHeaders(){
    this.allHeaders = {...this.headersContent,...this.headersOrigin,...this.headersPrivy,...this.headersSec,"User-Agent": this.uaData.ua}
    return this.allHeaders
  }

  updateHeaders(newHeader){
    this.allHeaders = {...this.allHeaders,...newHeader}
  }
}

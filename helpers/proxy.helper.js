
import fetch from "node-fetch";
import { logger } from "./logger.helper.js";
import { HttpsProxyAgent } from "https-proxy-agent";
import { sleep } from "./general.helper.js";
import { changeURL } from "../const/config.const.js";


export class Proxy {
    constructor(proxy){
        this.proxy = proxy || '';
        this.changeURL = changeURL;
        this.proxyAgent = this.proxy === ''? undefined : new HttpsProxyAgent(this.proxy);
    }

    async changeIP() {
        if(this.changeURL != ''){
            const response = await fetch(this.changeURL, {method: 'GET', headers: {
                'Content-Type': 'application/json',
            }})
            const resp = await response.text()
            logger.proxy('Change URL | '+ resp);
            logger.proxy('Change URL | Triggered. Sleep 60 sec');
            await sleep(60*1000);
            await this.getIP();
        }
    }

    async getIP() {
        const response = await fetch('https://api.ipify.org',{method:'GET', headers: {
            'Content-Type': 'application/json',
        }, agent: this.proxyAgent})
        if(response.status === 407) {
            throw new Error('Invalid Authentification')
        }
        logger.proxy(`Current IP: ${await response.text()}`)
    }

    async sendRequest(url, options) {
        const response = await fetch(url,{...options, agent: this.proxyAgent});
        return await response.json();
    }
}


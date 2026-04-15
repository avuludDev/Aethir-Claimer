import Web3 from "web3";
import { Contract, ethers } from "ethers";
import {
  getAbiByRelativePath,
  randomIntInRange,
  sleep,
} from "../../helpers/general.helper.js";
import { logger } from "../../helpers/logger.helper.js";
import { ARB, ETH } from "../../const/networks.const.js";
import { UserAgentClient } from "../../helpers/userAgent.helper.js";
import axios from "axios";
import { writeOrUpdateStatsToFileGlobal } from "../../helpers/stat.helper.js";
import {
  CLAIM_PRIORITY,
  MIN_CLAIM,
  MIN_WITHDRAW,
  RANGE_PERCENT,
  RETRY_ATTEMPTS,
  TYPE_CLAIM,
} from "../../const/config.const.js";

export class AethirModule {
  constructor(privateKey, proxy) {
    this.proxy = proxy;
    this.host = "https://app.aethir.com";
    this.ua = new UserAgentClient();
    this.headers = this.setupHeaders();
    this.web3 = new Web3(ARB.rpc);
    this.web3Eth = new Web3(ETH.rpc);
    this.privateKey = privateKey;
    this.account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
    this.walletAddress = this.account.address;
    this.signatureData = {
      nonce: "",
      issuedTime: new Date().toISOString(),
    };
    this.signer = new ethers.Wallet(
      privateKey,
      new ethers.providers.JsonRpcProvider(ETH.rpc)
    );
    this.signerArb = new ethers.Wallet(
      privateKey,
      new ethers.providers.JsonRpcProvider(ARB.rpc)
    );
    this.abi = getAbiByRelativePath("./const/claimerABI.json");
    this.contract = new Contract(
      "0xEf90d0B328dC5896d10c54ECa93F1AB764F64367",
      this.abi,
      this.signerArb
    );
    this.errorCounter = 0;
    this.status = {
      auth: false,
      claim: false,
      withdraw: false,
    }
    logger.info(`Wallet | ${this.walletAddress}`);
  }

  setupHeaders() {
    this.ua.setHeadersContent();
    this.ua.setHeadersSec();
    this.ua.setHeadersOriginRef(this.host);
    this.ua.setHeadersPrivy();
    return this.ua.getHeaders();
  }

  async makeSignature() {
    const message = `app.aethir.com wants you to sign in with your Ethereum account:\n${this.walletAddress}\n\nBy signing, you are proving you own this wallet and logging in. This does not initiate a transaction or cost any fees.\n\nURI: https://app.aethir.com\nVersion: 1\nChain ID: 1\nNonce: ${this.signatureData.nonce}\nIssued At: ${this.signatureData.issuedTime}\nResources:\n- https://privy.io`;
    const signature = await this.signer.signMessage(message);
    this.signatureData.sign = signature;
    this.signatureData.message = message;
  }

  changeProxy(proxy){
    this.proxy = proxy;
  }

  dropErrorCounter(){
    this.errorCounter = 0;
  }

  calculateClaimData() {
    let currentAmount = Math.floor(Number(
      (
        (this.claimable / 100) *
        randomIntInRange(RANGE_PERCENT.from, RANGE_PERCENT.to)
      )) * 100) / 100;
    if (currentAmount < MIN_CLAIM) {
      if (CLAIM_PRIORITY && this.claimable > MIN_CLAIM) {
        currentAmount = MIN_CLAIM;
      } else {
        throw new Error(
          `Insufficient balance for claim | Range ${currentAmount} | Balance ${this.claimable} | Min ${MIN_CLAIM}`
        );
      }
    }
    const fee = 5;
    const typePercent = TYPE_CLAIM === "1" ? 25 : 100;
    const athToClaim =
      Math.floor(Number(((currentAmount / 100) * typePercent)) * 100) / 100 - fee;
    logger.info(
      `Claim | ATH Bal  ${currentAmount} | ATH Claim  ${athToClaim} | ATH Fee ${fee} | Type percentage ${typePercent}`
    );
    return {
      athForm: currentAmount,
      athToClaim: athToClaim,
      athToFee: fee,
      type: TYPE_CLAIM,
    };
  }

  calculateWithdrawData() {
    let currentAmount = this.withdrawable
    if (currentAmount < MIN_WITHDRAW) {
      throw new Error(
        `Insufficient balance for withdraw | Can withdraw ${currentAmount} | Min ${MIN_WITHDRAW}`
      );
    }

    logger.info(
      `Withdraw | ATH Bal  ${currentAmount} `
    );
    return {
      athForm: currentAmount,
    };
  }

  async claimTx() {
    const tx = await this.contract.claim(
      this.signature.orderId,
      this.signature.cliffSecond,
      this.signature.expiryTimestamp,
      this.signature.amount,
      this.signature.signs,
      { value: 0 }
    );
    logger.info(`TX | ${ARB.explorer}/${tx.hash}`);
  }

  async withdrawTx() {
    const tx = await this.contract.withdraw(
      this.signatureWithdraw.orderIds,
      this.signatureWithdraw.expiryTimestamp,
      this.signatureWithdraw.signs,
      { value: 0 }
    );
    logger.info(`TX | ${ARB.explorer}/${tx.hash}`);
  }

  async apiInit() {
    const data = { address: this.walletAddress };
    const response = await this.sendRequest(
      "https://privy.aethir.com/api/v1/siwe/init",
      data,
      undefined,
      "Post",
      {}
    );
    this.signatureData.nonce = response.data.nonce;
  }

  async apiAuth() {
    const data = {
      chainId: "eip155:1",
      connectorType: "injected",
      message: this.signatureData.message,
      signature: this.signatureData.sign,
      walletClientType: "metamask",
    };

    const response = await this.sendRequest(
      "https://privy.aethir.com/api/v1/siwe/authenticate",
      data,
      undefined,
      "POST",
      {}
    );
    this.ua.updateHeaders({ "Privy-Token": response.data.token, Cookie: `privy-token=${response.data.token}; privy-session=privy.aethir.com`,});
    this.headers = this.ua.allHeaders;
  }

  async apiApps() {
    await this.sendRequest(
      "https://auth.privy.io/api/v1/apps/clwuim50w05b9h9ufagnyxso5",
      undefined,
      undefined,
      "GET",
      {}
    );
  }

  async apiVerify() {
    const data = { pubAddress: "0x1e71fF2a4B5C506A406857cB5EFde2FbA67FC59A" };
    await this.sendRequest(
      "https://app.aethir.com/console-api/owner/verify",
      data,
      undefined,
      "POST",
      {}
    );
  }

  async apiThirdLogin() {
    const response = await this.sendRequest(
      "https://app.aethir.com/console-api/owner/third-login",
      undefined,
      undefined,
      "POST",
      {
        "Sec-Fetch-Site": "same-origin",
        Priority: "u=1, i",
        Cookie: `privy-token=${this.ua.allHeaders["Privy-Token"]}; privy-session=t`,
      }
    );
    this.ua.updateHeaders({'Global-Token': response.data.data.globalToken});
    this.headers = this.ua.allHeaders;
  }

  async apiAnalyticsEvent(target) {
    const data = {
      client_id: this.ua.headersPrivy["Privy-Client"],
      event_name: target,
      payload: {},
    };
    switch (target) {
      case "modal_open":
        data.payload = {
          clientTimestamp: new Date().toISOString(),
          initialScreen: "LANDING",
        };
        break;
      case "sdk_authenticate":
        data.payload = {
          clientTimestamp: new Date().toISOString(),
          isNewUser: false,
          method: "siwe",
        };
        break;
      case "sdk_authenticate_siwe":
        data.payload = {
          clientTimestamp: new Date().toISOString(),
          connectorType: "injected",
          walletClientType: "metamask",
        };
      case "modal_closed":
        data.payload = { clientTimestamp: new Date().toISOString() };
        break;
      default:
        break;
    }
    const headers = this.headers["Privy-Token"]
      ? {
        ...this.ua.headersPrivy,
        Authorization: `Bearer ${this.headers["Privy-Token"]}`,
      }
      : undefined;
  }

  async apiDashboardQuerySession(location) {
    await this.sendRequest(
      "https://app.aethir.com/console-api/kyc/querySessionStatus",
      undefined,
      undefined,
      "GET",
      { Referer: this.host + "/" + location + "/" }
    );
  }

  async apiDashboardMy(location) {
    const response = await this.sendRequest(
      "https://app.aethir.com/console-api/account/my",
      undefined,
      undefined,
      "POST",
      { Referer: this.host + "/" + location + "/" }
    );
    this.claimable = response.data.data.claimable;
    this.withdrawable = Number(response.data.data.withdrawable);
    const data = response.data.data;
    data.wallet = this.walletAddress;
    logger.info(
      `Balance | Claimable: ${data.claimable}, Claimed: ${data.claimed}, Withdrawable: ${data.withdrawable}, Withdraw: ${data.withdraw} `
    );
    writeOrUpdateStatsToFileGlobal(data)
    return response.data.data;
  }

  async apiDashboardNoticeForUser(location) {
    const response = await this.sendRequest(
      "https://app.aethir.com/console-api/index/noticeForUser",
      undefined,
      undefined,
      "POST",
      { Referer: this.host + "/" + location + "/" }
    );
    return response.data.data;
  }

  async apiDashboardLastPeriodReward() {
    const response = await this.sendRequest(
      "https://app.aethir.com/console-api/statis/last-period-reward",
      undefined,
      undefined,
      "POST",
      { Referer: this.host + "/dashboard/" }
    );
    return response.data.data;
  }

  async apiDashboardTotalReward() {
    const response = await this.sendRequest(
      "https://app.aethir.com/console-api/statis/total-reward",
      undefined,
      undefined,
      "POST",
      { Referer: this.host + "/dashboard/" }
    );
    return response.data.data;
  }

  async apiDashboardTotalWithdraw() {
    const response = await this.sendRequest(
      "https://app.aethir.com/console-api/statis/total-withdraw",
      undefined,
      undefined,
      "POST",
      { Referer: this.host + "/dashboard/" }
    );
    return response.data.data;
  }

  async apiDashboardDelegation() {
    const response = await this.sendRequest(
      "https://app.aethir.com/console-api/statis/delegation",
      undefined,
      undefined,
      "POST",
      { Referer: this.host + "/dashboard/" }
    );
    return response.data.data;
  }

  async apiDashboardRunningStatus() {
    const response = await this.sendRequest(
      "https://app.aethir.com/console-api/statis/running-status",
      undefined,
      undefined,
      "POST",
      { Referer: this.host + "/dashboard/" }
    );
    return response.data.data;
  }

  async apiDashboardTop10Rewards() {
    const response = await this.sendRequest(
      "https://app.aethir.com/console-api/statis/license/total-reward/top10",
      undefined,
      undefined,
      "POST",
      { Referer: this.host + "/dashboard/" }
    );
    return response.data.data;
  }

  async apiDashboardTop10Proof() {
    const response = await this.sendRequest(
      "https://app.aethir.com/console-api/statis/license/total-proof/top10",
      undefined,
      undefined,
      "POST",
      { Referer: this.host +"/dashboard/" }
    );
    return response.data.data;
  }

  async apiDashboardDailyRewards() {
    const response = await this.sendRequest(
      "https://app.aethir.com/console-api/daily-reward/client/list?type=1",
      undefined,
      undefined,
      "GET",
      { Referer: this.host + "/dashboard/" }
    );
    return response.data.data;
  }

  async apiClaimGetAddress() {
    const response = await this.sendRequest(
      "https://app.aethir.com/console-api/owner/get-adress",
      undefined,
      undefined,
      "GET",
      { Referer: this.host + "/claim/" }
    );
    return response.data.data;
  }

  async apiClaimConfig() {
    const response = await this.sendRequest(
      "https://app.aethir.com/console-api/conf/common/claim-config",
      undefined,
      undefined,
      "POST",
      { Referer: this.host + "/claim/" }
    );
    return response.data.data;
  }

  async apiClaimBlocking(location) {
    const response = await this.sendRequest(
      "https://app.aethir.com/console-api/ip/blocking",
      undefined,
      undefined,
      "POST",
      { Referer: this.host + "/" + location + "/" }
    );
    return response.data.data;
  }

  async apiClaimSubmit() {
    const response = await this.sendRequest(
      "https://app.aethir.com/console-api/account/submit-claim",
      this.calculateClaimData(), //PARAMS
      undefined,
      "POST",
      { Referer: this.host + "/claim/" }
    );
    this.signature = response.data.data.data.signature;
    if(String(response.data.data.msg).includes('KYC')) throw new Error(response.data.data.msg);
    console.log(response.data);
  }

  async apiWithdrawSubmit() {
    const response = await this.sendRequest(
      "https://app.aethir.com/console-api/account/withdraw",
      this.calculateWithdrawData(), //PARAMS
      undefined,
      "POST",
      { Referer: this.host + "/claim/" }
    );
    this.signatureWithdraw = response.data.data.data.signature;
    this.billWithdrawId = response.data.data.data.bill_withdraw_id;
    if(String(response.data.data.msg).includes('KYC')) throw new Error(response.data.data.msg);
    console.log(response.data.data.data);
  }

  async collectData() {
    logger.info("Collect data and headers...");
    await this.apiApps();
    await sleep(500);
    await this.apiAnalyticsEvent("modal_open");
    await sleep(1500);
    await this.apiInit();
    await this.makeSignature();
    await this.apiAuth();
    await sleep(500);
    await this.apiAnalyticsEvent("sdk_authenticate");
    await this.apiAnalyticsEvent("sdk_authenticate_siwe");
    await this.apiAnalyticsEvent("modal_closed");
    await sleep(500);
    await this.apiVerify();
    await this.apiThirdLogin();
    await sleep(500);
    await this.apiDashboardQuerySession("dashboard");
    await this.apiDashboardMy("dashboard");
    await this.apiDashboardNoticeForUser("dashboard");
    await this.apiDashboardLastPeriodReward();
    await this.apiDashboardTotalReward();
    await this.apiDashboardTotalWithdraw();
    await this.apiDashboardDelegation();
    await this.apiDashboardRunningStatus();
    await this.apiDashboardTop10Rewards();
    await this.apiDashboardTop10Proof();
    await this.apiDashboardDailyRewards();
    return {claim: this.claimable < MIN_CLAIM ? false : true, withdraw: this.withdrawable < MIN_WITHDRAW ? false : true}
  }

  async claim() {
    logger.info(`Claiming...`)
    await sleep(5000);
    await this.apiDashboardQuerySession("claim");
    await this.apiClaimGetAddress();
    await this.apiDashboardMy("claim");
    await this.apiClaimConfig();
    await sleep(randomIntInRange(20, 40) * 1000);
    await this.apiClaimBlocking("claim");
    await sleep(1000);
    await this.apiClaimSubmit();
    await this.claimTx();
    await this.apiDashboardMy("claim");
    this.status.claim = true;
  }

  async withdraw() {
    logger.info(`Withdraw...`)
    await sleep(5000);
    await this.apiDashboardQuerySession("withdraw");
    await this.apiClaimGetAddress();
    await this.apiDashboardMy("withdraw");
    await sleep(randomIntInRange(20, 40) * 1000);
    await this.apiClaimBlocking("withdraw");
    await sleep(1000);
    await this.apiWithdrawSubmit();
    await this.withdrawTx();
    await this.apiDashboardMy("withdraw");
    this.status.withdraw = true;
  }

  async checkIp() {
    const response = await this.sendRequest(
      "https://api.ipify.org",
      undefined,
      undefined,
      "GET",
      { "Content-Type": "application/json" }
    );
    logger.proxy(`Current IP: ${response.data}`);
  }

  async sendRequest(path, data, params, method, headers) {
    const response = await axios({
      headers: { ...this.headers, ...headers },
      data: data,
      params: params,
      method: method,
      url: path,
      httpAgent: this.proxy.proxyAgent,
      httpsAgent: this.proxy.proxyAgent,
    }).catch(async (e) => {
      logger.error(`ERROR | #${this.errorCounter} | ${e} | ${path}`); 
      this.errorCounter++;
      if(this.errorCounter < RETRY_ATTEMPTS) {
        logger.warn("Retry attempt to send request");
        await sleep(15000)
        return await this.sendRequest(path, data, params, method, headers);
      } else {
        logger.error(`Max limit retry attempts reached, skip action`);
        return
      }
    });
    if (response?.data?.msg === "The system is busy. Please try again later") {
      logger.warn("RETRY");
      await sleep(3000);
      return await this.sendRequest(path, data, params, method, headers);
    }
    return response;
  }
}

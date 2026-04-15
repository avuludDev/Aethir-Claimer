import { read } from "read";
import {
  sleepFrom,
  sleepTo,
  proxyURL,
  mixWallets,
  CLAIM,
  WITHDRAW,
  mixProxy,
  overRunProxy,
  MAX_PROXY_RETRIES,
  scriptSleep,
} from "./const/config.const.js";
import { importPrivatesKeys, importProxies } from "./helpers/accs.helper.js";
import { randomIntInRange, shuffleArray } from "./helpers/general.helper.js";
import { waitForGas } from "./helpers/gas.helper.js";
import { decryptPrivateKey } from "./helpers/decryption.helper.js";
import { banner, logger } from "./helpers/logger.helper.js";
import { Proxy } from "./helpers/proxy.helper.js";
import { AethirModule } from "./modules/aethir/aethir.module.js";
import { writeOrUpdateStatsToFile } from "./helpers/stat.helper.js";

export const moduleName = "Aethir";

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
let privatesKeys = await importPrivatesKeys();
let proxy = await importProxies();

console.log(banner);

if (!(Array.isArray(privatesKeys) && privatesKeys.length)) {
  logger.warn(`${moduleName}. No wallets found.`);
  process.exit(0);
}

if (proxy.length < privatesKeys.length && proxy.length != 0) {
  logger.warn(`${moduleName}. Proxy count less than wallets.`);
  process.exit(0);
}

if (proxy.length == 0) {
  privatesKeys.forEach((el, i) => {
    proxy[i] = proxyURL;
  });
}

const password = await read({
  prompt: "Enter password for decryption or skip: ",
  silent: true,
  replace: "*",
});
if (password !== "") {
  privatesKeys.forEach((privateKey, i) => {
    try {
      privatesKeys[i] = decryptPrivateKey(privateKey, password);
      if (privateKey === "") throw new Error();
      logger.info(`PrivateKey[${i}] is decrypted successfull!`);
    } catch (e) {
      logger.warn(`PrivateKey[${i}] is can not decrypted!`);
    }
  });
}
while (true) {
  try {
    if (mixWallets) privatesKeys = shuffleArray(privatesKeys);

    if (mixProxy) proxy = shuffleArray(proxy);

    // main loop
    for (let privateKey of privatesKeys) {

      let proxyChanges = 0;
      let proxyInstanse = new Proxy(proxy[privatesKeys.indexOf(privateKey)]);
      let proxySet = true;

      while (true) {
        try {
          await proxyInstanse.getIP(); // Попытка получить IP через прокси
          await proxyInstanse.changeIP(); // Если успешно, меняем IP
          break; // Выход из цикла, если все прошло успешно
        } catch (e) {
          logger.error(
            `ERROR | Can't get response from proxy | ${proxyInstanse.proxy}`
          );
          if (overRunProxy) {
            const proxyIndex = privatesKeys.indexOf(privateKey);
            proxy.splice(proxyIndex, 1);
            if (proxy.length > 0 && proxyIndex < proxy.length) {
              proxyInstanse = new Proxy(proxy[proxyIndex]);
            } else {
              logger.error("No more proxies available.");
              throw new Error();
            }
          } else {
            logger.error("No more retries allowed.");
            proxySet = false;
            break;
          }
        }
      }

      if (!proxySet) continue;

      const claimInstance = new AethirModule(privateKey, proxyInstanse);
      let skipPause = false;
      let canAction = { claim: false, withdraw: false };

      // check gas
      await waitForGas(claimInstance.web3Eth, claimInstance.walletAddress);

      while (true) {
        try {
          if (proxyChanges >= MAX_PROXY_RETRIES) break;
          canAction = await claimInstance.collectData();
          claimInstance.status.auth = true;
          break;
        } catch (error) {
          logger.error(error);
          logger.warn("RETRY ATTEMPT | CHANGE PROXY");

          const proxyIndex = privatesKeys.indexOf(privateKey);
          proxy.splice(proxyIndex, 1);
          proxyInstanse = new Proxy(proxy[proxyIndex]);

          while (true) {
            try {
              await proxyInstanse.getIP();  // Попытка получить IP через прокси
              await proxyInstanse.changeIP(); // Если успешно, меняем IP 
              break;  // Выход из цикла, если все прошло успешно
            } catch (e) {
              logger.error(`ERROR | Can't get response from proxy | ${proxyInstanse.proxy}`);
              if (overRunProxy) {
                const proxyIndex = privatesKeys.indexOf(privateKey);
                proxy.splice(proxyIndex, 1);
                if (proxy.length > 0 && proxyIndex < proxy.length) {
                  proxyInstanse = new Proxy(proxy[proxyIndex]);
                } else {
                  logger.error("No more proxies available.");
                  throw new Error();
                }
              } else {
                logger.error("No more retries allowed.");
                throw new Error();
              }
            }
          }
          claimInstance.changeProxy(proxyInstanse);
          claimInstance.dropErrorCounter();
          proxyChanges++;
          logger.warn(`Change proxy ${proxyChanges} times for this wallet`);
          continue;
        }
      }

      if (proxyChanges >= MAX_PROXY_RETRIES) {
        logger.error(`Max proxy changes reached on this wallet, skip them`)
        continue;
      }

      //init
      if (CLAIM) {
        while (true) {
          try {
            if (!canAction.claim) {
              logger.error(`Insufficient balance for MIN_CLAIM`);
              skipPause = true;
              claimInstance.status.claim = true;
              break;
            }
            if (proxyChanges >= MAX_PROXY_RETRIES) break;
            await claimInstance.claim();
            break;
          } catch (error) {
            if (String(error).includes('Insufficient balance') || String(error).includes('KYC')) {
              logger.error(error);
              skipPause = true;
              break;
            } else {
              logger.error(error);
              logger.warn("RETRY ATTEMPT | CHANGE PROXY");
              const proxyIndex = privatesKeys.indexOf(privateKey);
              proxy.splice(proxyIndex, 1);
              proxyInstanse = new Proxy(proxy[proxyIndex]);

              while (true) {
                try {
                  await proxyInstanse.getIP();  // Попытка получить IP через прокси
                  await proxyInstanse.changeIP(); // Если успешно, меняем IP 
                  break;  // Выход из цикла, если все прошло успешно
                } catch (e) {
                  logger.error(`ERROR | Can't get response from proxy | ${proxyInstanse.proxy}`);
                  if (overRunProxy) {
                    const proxyIndex = privatesKeys.indexOf(privateKey);
                    proxy.splice(proxyIndex, 1);
                    if (proxy.length > 0 && proxyIndex < proxy.length) {
                      proxyInstanse = new Proxy(proxy[proxyIndex]);
                    } else {
                      logger.error("No more proxies available.");
                      throw new Error();
                    }
                  } else {
                    logger.error("No more retries allowed.");
                    throw new Error();
                  }
                }
              }
              claimInstance.changeProxy(proxyInstanse);
              claimInstance.dropErrorCounter();
              proxyChanges++;
              logger.warn(`Change proxy ${proxyChanges} times for this wallet`);
              continue;
            }
          }
        }
        if (WITHDRAW && !skipPause) {
          const timing = randomIntInRange(sleepFrom, sleepTo);
          logger.info(
            `${moduleName}. Waiting for ${timing} seconds before withdraw...`
          );
          await sleep(timing * 1000);
        }
      }

      if (proxyChanges >= MAX_PROXY_RETRIES) {
        logger.error(`Max proxy changes reached on this wallet, skip them`)
        continue;
      }

      if (WITHDRAW) {
        skipPause = false;
        while (true) {
          try {
            if (!canAction.withdraw) { logger.error(`Insufficient balance for MIN_WITHDRAW`); claimInstance.status.withdraw = true; skipPause = true; break; }
            if (proxyChanges >= MAX_PROXY_RETRIES) break;
            await claimInstance.withdraw();
            break;
          } catch (error) {
            if (String(error).includes('Insufficient balance') || String(error).includes('KYC')) {
              logger.error(error);
              skipPause = true;
              break;
            } else {
              logger.error(error);
              logger.warn("RETRY ATTEMPT | CHANGE PROXY");
              const proxyIndex = privatesKeys.indexOf(privateKey);
              proxy.splice(proxyIndex, 1);
              proxyInstanse = new Proxy(proxy[proxyIndex]);
              while (true) {
                try {
                  await proxyInstanse.getIP();  // Попытка получить IP через прокси
                  await proxyInstanse.changeIP(); // Если успешно, меняем IP 
                  break;  // Выход из цикла, если все прошло успешно
                } catch (e) {
                  logger.error(`ERROR | Can't get response from proxy | ${proxyInstanse.proxy}`);
                  if (overRunProxy) {
                    const proxyIndex = privatesKeys.indexOf(privateKey);
                    proxy.splice(proxyIndex, 1);
                    if (proxy.length > 0 && proxyIndex < proxy.length) {
                      proxyInstanse = new Proxy(proxy[proxyIndex]);
                    } else {
                      logger.error("No more proxies available.");
                      throw new Error();
                    }
                  } else {
                    logger.error("No more retries allowed.");
                    throw new Error();
                  }
                }
              }
              claimInstance.changeProxy(proxyInstanse);
              claimInstance.dropErrorCounter();
              proxyChanges++;
              logger.warn(`Change proxy ${proxyChanges} times for this wallet`);
              continue;
            }
          }
        }
      }

      if (proxyChanges >= MAX_PROXY_RETRIES) {
        logger.error(`Max proxy changes reached on this wallet, skip them`)
        continue;
      }
      writeOrUpdateStatsToFile({ wallet: claimInstance.account.address, ...claimInstance.status })
      if ((CLAIM || WITHDRAW) && !skipPause) {
        const timing = randomIntInRange(sleepFrom, sleepTo);
        logger.info(
          `${moduleName}. Waiting for ${timing} seconds before next mint...`
        );
        await sleep(timing * 1000);
      }
    }
    logger.info("All wallets are made!");
    if (scriptSleep > 0) {
      logger.info(`Pause between scripts: ${scriptSleep} hours`)
      await sleep(scriptSleep * 60 * 60 * 1000)
    } else {
      break;
    }
  } catch (e) {
    logger.error(e);
    if (scriptSleep > 0) {
      logger.info(`Pause between scripts: ${scriptSleep} hours`)
      await sleep(scriptSleep * 60 * 60 * 1000)
    } else {
      break;
    }
  }
}

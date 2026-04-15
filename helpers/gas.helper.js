import { maxGwei, sleepOnHighGas } from '../const/config.const.js';
import { moduleName } from '../main.js';
import { sleep } from './general.helper.js';

export const isGasOkay = async (web3, ethAddress) => {
  const gasPrice = await web3.eth.getGasPrice();
  const currentGas = Number(web3.utils.fromWei(String(gasPrice), 'Gwei'));

  const isGasHigher = currentGas <= maxGwei;

  if (!isGasHigher) {
    console.log(
      `${moduleName}. ${ethAddress}: gas is too high. ${currentGas} gwei now vs ${maxGwei} gwei limit. Waiting for ${sleepOnHighGas} seconds...`
    );

    await sleep(sleepOnHighGas * 1000);
  }

  return isGasHigher;
};

export const waitForGas = async (web3, walletAddress) => {
  let gasOkay = false;
  while (!gasOkay) {
    try {
      gasOkay = await isGasOkay(web3, walletAddress);
    } catch (error) {
      console.log(
        `${moduleName}. Can't get gas price. Error ${error}. Sleep ${sleepOnHighGas} seconds`
      );
      await sleep(sleepOnHighGas * 1000);
    }
   
  }

  return;
};
